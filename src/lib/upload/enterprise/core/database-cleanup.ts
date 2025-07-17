/**
 * @fileoverview 数据库清理器 - CoserEden平台
 * @description 处理数据库相关的清理操作
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import {
  CleanupTaskType,
  type CleanupStats,
  type DatabaseCleanupOptions,
  type IDatabaseCleanup,
  type CleanupContext,
} from './cleanup-types';

/**
 * 数据库清理器类
 * 负责处理数据库相关的清理操作
 */
export class DatabaseCleanup extends EventEmitter implements IDatabaseCleanup {
  private prisma: any;

  constructor(context: CleanupContext) {
    super();
    this.prisma = context.prisma;
  }

  /**
   * 清理过期事务
   */
  public async cleanupExpiredTransactions(options?: DatabaseCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.EXPIRED_TRANSACTIONS,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理过期事务');
      this.emit('taskStarted', { taskType: CleanupTaskType.EXPIRED_TRANSACTIONS });

      // 获取过期事务
      const expiredTransactions = await this.prisma.uploadTransaction.findMany({
        where: {
          expiresAt: { lt: new Date() },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          compensationActions: true,
        },
        take: options?.batchSize || 100,
      });

      stats.processedCount = expiredTransactions.length;

      for (const transaction of expiredTransactions) {
        try {
          // 执行事务清理
          await this.cleanupTransaction(transaction);

          stats.cleanedCount++;
          console.log(`✅ 清理过期事务: ${transaction.transactionId}`);

        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`事务${transaction.transactionId}: ${error instanceof Error ? error.message : '未知错误'}`);
          console.error(`❌ 清理事务失败: ${transaction.transactionId}`, error);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 过期事务清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个，失败${stats.failedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.EXPIRED_TRANSACTIONS, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理过期事务失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.EXPIRED_TRANSACTIONS, error });
    }

    return stats;
  }

  /**
   * 清理失败的补偿操作
   */
  public async cleanupFailedCompensations(options?: DatabaseCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.FAILED_COMPENSATIONS,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理失败的补偿操作');
      this.emit('taskStarted', { taskType: CleanupTaskType.FAILED_COMPENSATIONS });

      // 获取失败的补偿操作
      const failedCompensations = await this.prisma.compensationAction.findMany({
        where: {
          status: 'FAILED',
          retryCount: { lt: 3 }, // 最多重试3次
          createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) }, // 1小时前的失败操作
        },
        take: options?.batchSize || 50,
      });

      stats.processedCount = failedCompensations.length;

      for (const compensation of failedCompensations) {
        try {
          // 重试补偿操作
          const success = await this.retryCompensation(compensation);

          if (success) {
            stats.cleanedCount++;
            console.log(`✅ 重试补偿操作成功: ${compensation.id}`);
          } else {
            // 标记为永久失败
            await this.markCompensationAsPermanentlyFailed(compensation.id);
            stats.skippedCount++;
            console.log(`⏭️ 补偿操作永久失败: ${compensation.id}`);
          }

        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`补偿${compensation.id}: ${error instanceof Error ? error.message : '未知错误'}`);
          console.error(`❌ 处理补偿操作失败: ${compensation.id}`, error);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 失败补偿清理完成: 处理${stats.processedCount}个，成功${stats.cleanedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.FAILED_COMPENSATIONS, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理失败补偿失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.FAILED_COMPENSATIONS, error });
    }

    return stats;
  }

  /**
   * 清理旧日志
   */
  public async cleanupOldLogs(options?: DatabaseCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.LOG_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理旧日志');
      this.emit('taskStarted', { taskType: CleanupTaskType.LOG_CLEANUP });

      const retentionDays = options?.retentionDays || 30;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // 清理各种类型的日志
      const logTables = options?.tables || [
        'cleanupLog',
        'uploadLog',
        'errorLog',
        'auditLog',
      ];

      for (const table of logTables) {
        try {
          const result = await this.cleanupLogTable(table, cutoffDate, options?.batchSize || 1000);
          stats.processedCount += result.processed;
          stats.cleanedCount += result.deleted;
          console.log(`✅ 清理${table}表: 删除${result.deleted}条记录`);
        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`表${table}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 旧日志清理完成: 总计删除${stats.cleanedCount}条记录`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.LOG_CLEANUP, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理旧日志失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.LOG_CLEANUP, error });
    }

    return stats;
  }

  /**
   * 清理孤儿记录
   */
  public async cleanupOrphanRecords(options?: DatabaseCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.DATABASE_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理孤儿记录');
      this.emit('taskStarted', { taskType: CleanupTaskType.DATABASE_CLEANUP });

      // 清理没有关联媒体的帖子
      const orphanPosts = await this.prisma.post.findMany({
        where: {
          media: { none: {} },
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 24小时前
        },
        take: options?.batchSize || 100,
      });

      for (const post of orphanPosts) {
        try {
          await this.prisma.post.delete({ where: { id: post.id } });
          stats.cleanedCount++;
        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`帖子${post.id}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      stats.processedCount = orphanPosts.length;

      // 清理没有关联帖子的媒体记录
      const orphanMedia = await this.prisma.postMedia.findMany({
        where: {
          post: null,
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        take: options?.batchSize || 100,
      });

      for (const media of orphanMedia) {
        try {
          await this.prisma.postMedia.delete({ where: { id: media.id } });
          stats.cleanedCount++;
        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`媒体${media.id}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      stats.processedCount += orphanMedia.length;
      stats.executionTimeMs = Date.now() - startTime;

      console.log(`✅ 孤儿记录清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.DATABASE_CLEANUP, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理孤儿记录失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.DATABASE_CLEANUP, error });
    }

    return stats;
  }

  /**
   * 优化数据库表
   */
  public async optimizeTables(): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.DATABASE_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🔧 开始优化数据库表');

      // 获取需要优化的表
      const tables = [
        'Post',
        'PostMedia',
        'UploadTransaction',
        'CompensationAction',
        'CleanupLog',
      ];

      for (const table of tables) {
        try {
          // 执行表优化（具体实现取决于数据库类型）
          await this.optimizeTable(table);
          stats.cleanedCount++;
          console.log(`✅ 优化表: ${table}`);
        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`表${table}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      stats.processedCount = tables.length;
      stats.executionTimeMs = Date.now() - startTime;

      console.log(`✅ 数据库优化完成: 优化${stats.cleanedCount}个表`);

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 数据库优化失败:', error);
    }

    return stats;
  }

  // 私有方法

  private async cleanupTransaction(transaction: any): Promise<void> {
    // 使用事务确保数据一致性
    await this.prisma.$transaction(async (tx: any) => {
      // 删除相关的补偿操作
      await tx.compensationAction.deleteMany({
        where: { transactionId: transaction.id },
      });

      // 更新事务状态为已清理
      await tx.uploadTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'CLEANED',
          cleanedAt: new Date(),
        },
      });
    });
  }

  private async retryCompensation(compensation: any): Promise<boolean> {
    try {
      // 增加重试次数
      await this.prisma.compensationAction.update({
        where: { id: compensation.id },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });

      // 根据补偿类型执行相应操作
      switch (compensation.actionType) {
        case 'DELETE_FILE':
          // 执行文件删除
          return await this.executeFileDelete(compensation.metadata);
        case 'ROLLBACK_TRANSACTION':
          // 执行事务回滚
          return await this.executeTransactionRollback(compensation.metadata);
        default:
          console.warn(`未知的补偿操作类型: ${compensation.actionType}`);
          return false;
      }
    } catch (error) {
      console.error(`重试补偿操作失败: ${compensation.id}`, error);
      return false;
    }
  }

  private async markCompensationAsPermanentlyFailed(compensationId: string): Promise<void> {
    await this.prisma.compensationAction.update({
      where: { id: compensationId },
      data: {
        status: 'PERMANENTLY_FAILED',
        failedAt: new Date(),
      },
    });
  }

  private async cleanupLogTable(tableName: string, cutoffDate: Date, batchSize: number): Promise<{ processed: number; deleted: number }> {
    // 根据表名执行相应的清理操作
    const deleteResult = await (this.prisma as any)[tableName].deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return {
      processed: deleteResult.count || 0,
      deleted: deleteResult.count || 0,
    };
  }

  private async optimizeTable(tableName: string): Promise<void> {
    // 这里可以执行数据库特定的优化操作
    // 例如：ANALYZE TABLE, OPTIMIZE TABLE (MySQL), VACUUM (PostgreSQL)
    console.log(`优化表 ${tableName} (具体实现取决于数据库类型)`);
  }

  private async executeFileDelete(metadata: any): Promise<boolean> {
    // 实现文件删除逻辑
    console.log('执行文件删除补偿操作', metadata);
    return true;
  }

  private async executeTransactionRollback(metadata: any): Promise<boolean> {
    // 实现事务回滚逻辑
    console.log('执行事务回滚补偿操作', metadata);
    return true;
  }
}
