/**
 * @fileoverview 查询性能监控器
 * @description 提供查询性能监控、慢查询分析和指标收集功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { QueryOptimizerConfig, QueryMetrics, SlowQuery } from './types';

// 临时logger
const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  debug: (message: string, data?: any) => console.log(message, data),
  warn: (message: string, data?: any) => console.warn(message, data),
  error: (message: string, data?: any) => console.error(message, data)
};

/**
 * 查询性能监控器
 */
export class QueryPerformanceMonitor {
  private metrics: QueryMetrics;
  private slowQueries: SlowQuery[] = [];
  private queryPatterns: Map<string, number> = new Map();

  constructor(private config: QueryOptimizerConfig) {
    this.metrics = this.initializeMetrics();
  }

  /**
   * 记录查询指标
   */
  recordQuery(queryKey: string, duration: number, error?: any): void {
    this.metrics.totalQueries++;

    // 更新平均查询时间
    this.metrics.avgQueryTime =
      (this.metrics.avgQueryTime * (this.metrics.totalQueries - 1) + duration) /
      this.metrics.totalQueries;

    // 记录慢查询
    if (duration > this.config.slowQueryThreshold) {
      this.metrics.slowQueryCount++;
      this.metrics.slowestQueryTime = Math.max(this.metrics.slowestQueryTime, duration);
    }

    // 更新查询类型分布
    const queryType = this.extractQueryType(queryKey);
    this.metrics.queryTypeDistribution[queryType] =
      (this.metrics.queryTypeDistribution[queryType] || 0) + 1;

    // 更新缓存命中率
    this.updateCacheHitRate();

    // 记录错误
    if (error) {
      logger.error('查询执行失败', { queryKey, duration, error });
    }
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(duration: number): void {
    this.metrics.totalQueries++;
    this.metrics.cacheHits++;
    this.updateCacheHitRate();
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(sql: string, duration: number, params: any): void {
    const suggestions = this.generateQuerySuggestions(sql, duration);

    this.slowQueries.push({
      sql,
      duration,
      timestamp: new Date(),
      params,
      suggestions
    });

    // 保持慢查询列表大小
    if (this.slowQueries.length > 100) {
      this.slowQueries = this.slowQueries.slice(-50);
    }
  }

  /**
   * 记录查询模式
   */
  recordQueryPattern(pattern: string): void {
    this.queryPatterns.set(pattern, (this.queryPatterns.get(pattern) || 0) + 1);
  }

  /**
   * 分析慢查询并生成优化建议
   */
  analyzeSlowQueries(): SlowQuery[] {
    return this.slowQueries
      .filter(query => query.duration > this.config.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // 返回最慢的10个查询
  }

  /**
   * 获取查询性能指标
   */
  getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取查询模式统计
   */
  getQueryPatterns(): Map<string, number> {
    return new Map(this.queryPatterns);
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.slowQueries = [];
    this.queryPatterns.clear();
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): {
    summary: string;
    recommendations: string[];
    metrics: QueryMetrics;
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    // 分析缓存命中率
    if (metrics.cacheHitRate < 70) {
      recommendations.push('缓存命中率较低，考虑优化缓存策略或增加缓存TTL');
    }

    // 分析平均查询时间
    if (metrics.avgQueryTime > 200) {
      recommendations.push('平均查询时间过长，建议优化查询或添加索引');
    }

    // 分析慢查询
    if (metrics.slowQueryCount > metrics.totalQueries * 0.1) {
      recommendations.push('慢查询比例过高，需要重点优化查询性能');
    }

    const summary = `
总查询数: ${metrics.totalQueries}
缓存命中率: ${metrics.cacheHitRate.toFixed(2)}%
平均查询时间: ${metrics.avgQueryTime.toFixed(2)}ms
慢查询数量: ${metrics.slowQueryCount}
最慢查询: ${metrics.slowestQueryTime}ms
    `.trim();

    return {
      summary,
      recommendations,
      metrics
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    this.metrics.cacheHitRate = this.metrics.totalQueries > 0
      ? (this.metrics.cacheHits / this.metrics.totalQueries) * 100
      : 0;
  }

  /**
   * 生成查询优化建议
   */
  private generateQuerySuggestions(sql: string, duration: number): string[] {
    const suggestions: string[] = [];

    if (duration > 1000) {
      suggestions.push('考虑添加适当的数据库索引');
    }

    if (sql.includes('findMany') && duration > 500) {
      suggestions.push('考虑添加分页限制或使用游标分页');
    }

    if (sql.includes('include') && duration > 300) {
      suggestions.push('考虑使用select优化查询字段');
    }

    return suggestions;
  }

  /**
   * 提取查询类型
   */
  private extractQueryType(queryKey: string): string {
    const parts = queryKey.split(':');
    return parts[0] || 'unknown';
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): QueryMetrics {
    return {
      totalQueries: 0,
      cacheHits: 0,
      cacheHitRate: 0,
      avgQueryTime: 0,
      slowQueryCount: 0,
      slowestQueryTime: 0,
      queryTypeDistribution: {}
    };
  }
}
