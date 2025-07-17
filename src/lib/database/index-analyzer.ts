/**
 * @fileoverview 数据库索引分析器
 * @description 分析数据库索引使用情况和性能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

/**
 * 索引使用统计接口
 */
export interface IndexUsageStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_tup_read: number;
  idx_tup_fetch: number;
  idx_scan: number;
  size_mb: number;
  usage_ratio: number;
}

/**
 * 慢查询信息接口
 */
export interface SlowQueryInfo {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  rows: number;
}

/**
 * 表统计信息接口
 */
export interface TableStats {
  schemaname: string;
  tablename: string;
  n_tup_ins: number;
  n_tup_upd: number;
  n_tup_del: number;
  n_live_tup: number;
  n_dead_tup: number;
  last_vacuum: Date | null;
  last_analyze: Date | null;
}

/**
 * 数据库索引分析器类
 */
export class DatabaseIndexAnalyzer {
  constructor(private db: PrismaClient) {}

  /**
   * 获取索引使用统计
   */
  async getIndexUsageStats(): Promise<IndexUsageStats[]> {
    const result = await this.db.$queryRaw<IndexUsageStats[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid))::text as size_mb,
        CASE 
          WHEN idx_scan = 0 THEN 0
          ELSE ROUND((idx_tup_read::numeric / idx_scan), 2)
        END as usage_ratio
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC, idx_tup_read DESC;
    `;

    return result.map(row => ({
      ...row,
      size_mb: parseFloat(row.size_mb.toString().replace(/[^\d.]/g, '')),
    }));
  }

  /**
   * 获取未使用的索引
   */
  async getUnusedIndexes(): Promise<IndexUsageStats[]> {
    const result = await this.db.$queryRaw<IndexUsageStats[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan,
        pg_size_pretty(pg_relation_size(indexrelid))::text as size_mb,
        0 as usage_ratio
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexname NOT LIKE '%_pkey'  -- 排除主键
        AND indexname NOT LIKE '%_key'   -- 排除唯一约束
      ORDER BY pg_relation_size(indexrelid) DESC;
    `;

    return result.map(row => ({
      ...row,
      size_mb: parseFloat(row.size_mb.toString().replace(/[^\d.]/g, '')),
    }));
  }

  /**
   * 获取慢查询信息（需要启用pg_stat_statements扩展）
   */
  async getSlowQueries(limit: number = 10): Promise<SlowQueryInfo[]> {
    try {
      const result = await this.db.$queryRaw<SlowQueryInfo[]>`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_statements%'
          AND query NOT LIKE '%information_schema%'
        ORDER BY mean_time DESC 
        LIMIT ${limit};
      `;

      return result;
    } catch (error) {
      console.warn('pg_stat_statements扩展未启用，无法获取慢查询信息');
      return [];
    }
  }

  /**
   * 获取表统计信息
   */
  async getTableStats(): Promise<TableStats[]> {
    const result = await this.db.$queryRaw<TableStats[]>`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_live_tup,
        n_dead_tup,
        last_vacuum,
        last_analyze
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC;
    `;

    return result;
  }

  /**
   * 分析缺失的索引建议
   */
  async getMissingIndexSuggestions(): Promise<string[]> {
    const suggestions: string[] = [];

    // 检查用户表的查询模式
    const userStats = await this.db.$queryRaw<any[]>`
      SELECT COUNT(*) as total_users,
             COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
             COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users
      FROM users;
    `;

    if (userStats[0]?.total_users > 1000) {
      suggestions.push('建议为users表添加复合索引: (user_level, is_verified, is_active)');
    }

    // 检查帖子表的查询模式
    const postStats = await this.db.$queryRaw<any[]>`
      SELECT COUNT(*) as total_posts,
             COUNT(CASE WHEN is_public = true THEN 1 END) as public_posts,
             COUNT(CASE WHEN published_at IS NOT NULL THEN 1 END) as published_posts
      FROM posts;
    `;

    if (postStats[0]?.total_posts > 500) {
      suggestions.push('建议为posts表添加复合索引: (is_public, published_at, like_count)');
    }

    // 检查评论表的查询模式
    const commentStats = await this.db.$queryRaw<any[]>`
      SELECT COUNT(*) as total_comments,
             COUNT(CASE WHEN is_deleted = false THEN 1 END) as active_comments
      FROM comments;
    `;

    if (commentStats[0]?.total_comments > 1000) {
      suggestions.push('建议为comments表添加复合索引: (post_id, parent_id, created_at)');
    }

    return suggestions;
  }

  /**
   * 生成索引性能报告
   */
  async generateIndexReport(): Promise<{
    summary: {
      totalIndexes: number;
      unusedIndexes: number;
      totalIndexSize: string;
      avgUsageRatio: number;
    };
    topUsedIndexes: IndexUsageStats[];
    unusedIndexes: IndexUsageStats[];
    slowQueries: SlowQueryInfo[];
    tableStats: TableStats[];
    suggestions: string[];
  }> {
    const [
      allIndexes,
      unusedIndexes,
      slowQueries,
      tableStats,
      suggestions
    ] = await Promise.all([
      this.getIndexUsageStats(),
      this.getUnusedIndexes(),
      this.getSlowQueries(),
      this.getTableStats(),
      this.getMissingIndexSuggestions()
    ]);

    // 计算总索引大小
    const totalSizeResult = await this.db.$queryRaw<{ total_size: string }[]>`
      SELECT pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_size
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public';
    `;

    const avgUsageRatio = allIndexes.length > 0 
      ? allIndexes.reduce((sum, idx) => sum + idx.usage_ratio, 0) / allIndexes.length 
      : 0;

    return {
      summary: {
        totalIndexes: allIndexes.length,
        unusedIndexes: unusedIndexes.length,
        totalIndexSize: totalSizeResult[0]?.total_size || '0 bytes',
        avgUsageRatio: Math.round(avgUsageRatio * 100) / 100,
      },
      topUsedIndexes: allIndexes.slice(0, 10),
      unusedIndexes,
      slowQueries,
      tableStats,
      suggestions,
    };
  }

  /**
   * 检查索引健康状态
   */
  async checkIndexHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const report = await this.generateIndexReport();
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查未使用的索引
    if (report.unusedIndexes.length > 5) {
      status = 'warning';
      issues.push(`发现${report.unusedIndexes.length}个未使用的索引`);
      recommendations.push('考虑删除未使用的索引以节省存储空间');
    }

    // 检查慢查询
    if (report.slowQueries.length > 0) {
      const slowestQuery = report.slowQueries[0];
      if (slowestQuery && slowestQuery.mean_time > 1000) {
        status = status === 'healthy' ? 'warning' : 'critical';
        issues.push(`发现平均执行时间超过1秒的慢查询`);
        recommendations.push('优化慢查询或添加相应索引');
      }
    }

    // 检查表统计信息
    const tablesNeedingVacuum = report.tableStats.filter(table => 
      table.n_dead_tup > table.n_live_tup * 0.1
    );

    if (tablesNeedingVacuum.length > 0) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`${tablesNeedingVacuum.length}个表需要清理死元组`);
      recommendations.push('运行VACUUM ANALYZE清理数据库');
    }

    return { status, issues, recommendations };
  }
}
