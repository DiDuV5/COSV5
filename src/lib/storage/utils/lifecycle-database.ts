/**
 * @fileoverview 生命周期数据库操作
 * @description 处理清理规则和结果的数据库操作
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import type { CleanupRule, CleanupResult, CleanupStats } from './lifecycle-types';

/**
 * 生命周期数据库管理器
 */
export class LifecycleDatabase {
  /**
   * 保存清理规则到数据库
   */
  public async saveCleanupRule(rule: CleanupRule): Promise<void> {
    try {
      await prisma.cleanupRule.upsert({
        where: { name: rule.name },
        update: {
          pattern: rule.pattern,
          maxAge: rule.maxAge,
          maxSize: rule.maxSize,
          maxCount: rule.maxCount,
          action: rule.action,
          enabled: rule.enabled,
          excludePatterns: rule.excludePatterns ? JSON.stringify(rule.excludePatterns) : null,
          schedule: rule.schedule,
          priority: rule.priority,
          updatedAt: new Date(),
        },
        create: {
          name: rule.name,
          pattern: rule.pattern,
          maxAge: rule.maxAge,
          maxSize: rule.maxSize,
          maxCount: rule.maxCount,
          action: rule.action,
          enabled: rule.enabled,
          excludePatterns: rule.excludePatterns ? JSON.stringify(rule.excludePatterns) : null,
          schedule: rule.schedule,
          priority: rule.priority,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`💾 Saved cleanup rule to database: ${rule.name}`);
    } catch (error) {
      console.error(`Failed to save cleanup rule ${rule.name}:`, error);
      throw new Error(`Failed to save cleanup rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 从数据库加载清理规则
   */
  public async loadCleanupRules(): Promise<CleanupRule[]> {
    try {
      const dbRules = await prisma.cleanupRule.findMany({
        orderBy: [
          { priority: 'desc' },
          { name: 'asc' }
        ]
      });

      return dbRules.map(dbRule => ({
        name: dbRule.name,
        pattern: dbRule.pattern,
        maxAge: dbRule.maxAge || undefined,
        maxSize: dbRule.maxSize || undefined,
        maxCount: dbRule.maxCount || undefined,
        action: dbRule.action as 'delete' | 'archive' | 'compress',
        enabled: dbRule.enabled,
        excludePatterns: dbRule.excludePatterns ? JSON.parse(dbRule.excludePatterns) : undefined,
        schedule: dbRule.schedule || undefined,
        priority: dbRule.priority || undefined,
      }));
    } catch (error) {
      console.error('Failed to load cleanup rules:', error);
      throw new Error(`Failed to load cleanup rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 从数据库删除清理规则
   */
  public async deleteCleanupRule(ruleName: string): Promise<void> {
    try {
      await prisma.cleanupRule.delete({
        where: { name: ruleName },
      });
      console.log(`🗑️ Deleted cleanup rule from database: ${ruleName}`);
    } catch (error) {
      console.error(`Failed to delete cleanup rule ${ruleName}:`, error);
      throw new Error(`Failed to delete cleanup rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 保存清理结果到数据库
   */
  public async saveCleanupResult(result: CleanupResult): Promise<void> {
    try {
      await prisma.cleanupLog.create({
        data: {
          ruleName: result.ruleName,
          scannedFiles: result.scannedFiles,
          processedFiles: result.processedFiles,
          deletedFiles: result.deletedFiles,
          archivedFiles: result.archivedFiles,
          compressedFiles: result.compressedFiles,
          freedSpace: result.freedSpace,
          startTime: result.startTime,
          endTime: result.endTime,
          errors: result.errors.length > 0 ? JSON.stringify(result.errors) : undefined,
          duration: result.endTime.getTime() - result.startTime.getTime(),
          success: result.errors.length === 0,
        },
      });
      console.log(`📊 Saved cleanup result to database: ${result.ruleName}`);
    } catch (error) {
      console.error(`Failed to save cleanup result for ${result.ruleName}:`, error);
      throw new Error(`Failed to save cleanup result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取清理历史记录
   */
  public async getCleanupHistory(
    ruleName?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<CleanupResult[]> {
    try {
      const logs = await prisma.cleanupLog.findMany({
        where: ruleName ? { ruleName } : undefined,
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs.map(log => ({
        ruleName: log.ruleName,
        scannedFiles: log.scannedFiles,
        processedFiles: log.processedFiles,
        deletedFiles: log.deletedFiles,
        archivedFiles: log.archivedFiles,
        compressedFiles: log.compressedFiles,
        freedSpace: log.freedSpace,
        startTime: log.startTime,
        endTime: log.endTime || new Date(),
        errors: log.errors ? JSON.parse(log.errors) : [],
      }));
    } catch (error) {
      console.error('Failed to get cleanup history:', error);
      throw new Error(`Failed to get cleanup history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取清理统计信息
   */
  public async getCleanupStats(ruleName?: string): Promise<CleanupStats[]> {
    try {
      const whereClause = ruleName ? { ruleName } : {};

      const stats = await prisma.cleanupLog.groupBy({
        by: ['ruleName'],
        where: whereClause,
        _count: {
          id: true,
        },
        _sum: {
          processedFiles: true,
          freedSpace: true,
        },
        _avg: {
          processedFiles: true,
        },
        _max: {
          startTime: true,
        },
      });

      const result: CleanupStats[] = [];

      for (const stat of stats) {
        // 计算成功率
        const successCount = await prisma.cleanupLog.count({
          where: {
            ruleName: stat.ruleName,
            success: true,
          },
        });

        const executionCount = stat._count?.id || 0;
        const successRate = executionCount > 0 ? (successCount / executionCount) * 100 : 0;

        result.push({
          ruleName: stat.ruleName,
          executionCount,
          totalProcessedFiles: stat._sum?.processedFiles || 0,
          totalFreedSpace: Number(stat._sum?.freedSpace || 0),
          averageExecutionTime: stat._avg?.processedFiles || 0,
          lastExecutionTime: stat._max?.startTime || new Date(),
          successRate,
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to get cleanup stats:', error);
      throw new Error(`Failed to get cleanup stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 清理旧的日志记录
   */
  public async cleanupOldLogs(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - maxAge);

      const result = await prisma.cleanupLog.deleteMany({
        where: {
          startTime: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`🧹 Cleaned up ${result.count} old log records`);
      return result.count;
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
      throw new Error(`Failed to cleanup old logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取规则执行摘要
   */
  public async getRuleSummary(ruleName: string, days: number = 30): Promise<{
    ruleName: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalProcessedFiles: number;
    totalFreedSpace: number;
    averageExecutionTime: number;
    lastExecution?: Date;
    recentErrors: string[];
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const logs = await prisma.cleanupLog.findMany({
        where: {
          ruleName,
          startTime: {
            gte: since,
          },
        },
        orderBy: { startTime: 'desc' },
      });

      const totalExecutions = logs.length;
      const successfulExecutions = logs.filter(log => log.success).length;
      const failedExecutions = totalExecutions - successfulExecutions;
      const totalProcessedFiles = logs.reduce((sum, log) => sum + log.processedFiles, 0);
      const totalFreedSpace = logs.reduce((sum, log) => sum + Number(log.freedSpace), 0);
      const averageExecutionTime = logs.length > 0
        ? logs.reduce((sum, log) => sum + (log.duration || 0), 0) / logs.length
        : 0;
      const lastExecution = logs.length > 0 ? logs[0].startTime : undefined;

      // 获取最近的错误
      const recentErrors: string[] = [];
      logs.slice(0, 10).forEach(log => {
        if (log.errors) {
          const errors = JSON.parse(log.errors);
          recentErrors.push(...errors);
        }
      });

      return {
        ruleName,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        totalProcessedFiles,
        totalFreedSpace,
        averageExecutionTime,
        lastExecution,
        recentErrors: recentErrors.slice(0, 5), // 只返回最近5个错误
      };
    } catch (error) {
      console.error(`Failed to get rule summary for ${ruleName}:`, error);
      throw new Error(`Failed to get rule summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 检查规则是否存在
   */
  public async ruleExists(ruleName: string): Promise<boolean> {
    try {
      const count = await prisma.cleanupRule.count({
        where: { name: ruleName },
      });
      return count > 0;
    } catch (error) {
      console.error(`Failed to check if rule exists: ${ruleName}`, error);
      return false;
    }
  }

  /**
   * 获取活跃规则数量
   */
  public async getActiveRuleCount(): Promise<number> {
    try {
      return await prisma.cleanupRule.count({
        where: { enabled: true },
      });
    } catch (error) {
      console.error('Failed to get active rule count:', error);
      return 0;
    }
  }

  /**
   * 批量更新规则状态
   */
  public async updateRulesStatus(ruleNames: string[], enabled: boolean): Promise<number> {
    try {
      const result = await prisma.cleanupRule.updateMany({
        where: {
          name: {
            in: ruleNames,
          },
        },
        data: {
          enabled,
          updatedAt: new Date(),
        },
      });

      console.log(`📝 Updated ${result.count} rules status to ${enabled ? 'enabled' : 'disabled'}`);
      return result.count;
    } catch (error) {
      console.error('Failed to update rules status:', error);
      throw new Error(`Failed to update rules status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * 导出单例实例
 */
export const lifecycleDatabase = new LifecycleDatabase();
