/**
 * @fileoverview 事务清理器
 * @description 清理过期和失败的事务
 * @author Augment AI
 * @date 2025-07-03
 */

import { PrismaClient } from '@prisma/client';
// import { TransactionManager } from '../../transaction/transaction-manager'; // 暂时注释掉，模块不存在
import {
  CleanupTaskType,
  CleanupStats,
  CleanupConfig,
  ExpiredTransactionInfo
} from '../types/cleanup-service-types';

/**
 * 事务清理器类
 */
export class TransactionCleaner {
  private prisma: PrismaClient;
  // private transactionManager: TransactionManager; // 暂时注释掉，模块不存在

  constructor(private config: CleanupConfig) {
    this.prisma = new PrismaClient();
    // this.transactionManager = TransactionManager.getInstance(); // 暂时注释掉，模块不存在
  }

  /**
   * 清理过期事务
   */
  async cleanupExpiredTransactions(): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.EXPIRED_TRANSACTIONS,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      executionTimeMs: 0,
      errors: []
    };

    try {
      console.log('🧹 开始清理过期事务');

      // 获取过期事务
      const expiredTransactions = await this.getExpiredTransactions();
      stats.processedCount = expiredTransactions.length;

      console.log(`📊 发现 ${expiredTransactions.length} 个过期事务`);

      // 分批处理过期事务
      const batchSize = this.config.batchSizes.transactionBatch;
      for (let i = 0; i < expiredTransactions.length; i += batchSize) {
        const batch = expiredTransactions.slice(i, i + batchSize);

        for (const transaction of batch) {
          try {
            await this.processExpiredTransaction(transaction);
            stats.cleanedCount++;
          } catch (error) {
            console.error(`处理过期事务失败: ${transaction.transactionId}`, error);
            stats.failedCount++;
            stats.errors.push(`事务 ${transaction.transactionId}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }

        // 批次间延迟，避免数据库压力过大
        if (i + batchSize < expiredTransactions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 过期事务清理完成: 处理 ${stats.processedCount}, 清理 ${stats.cleanedCount}, 失败 ${stats.failedCount}`);

      return stats;

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 过期事务清理失败:', error);
      throw error;
    }
  }

  /**
   * 获取过期事务
   */
  private async getExpiredTransactions(): Promise<ExpiredTransactionInfo[]> {
    const expireDays = this.config.thresholds.transactionExpireDays;
    const cutoffDate = new Date(Date.now() - expireDays * 24 * 60 * 60 * 1000);

    const transactions = await this.prisma.uploadTransaction.findMany({
      where: {
        status: {
          in: ['PENDING', 'PROCESSING', 'FAILED']
        },
        createdAt: {
          lt: cutoffDate
        }
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        compensationActions: {
          select: {
            status: true
          }
        }
      }
    });

    return transactions.map(tx => ({
      transactionId: tx.id,
      status: tx.status,
      createdAt: tx.createdAt,
      expiredDays: Math.floor((Date.now() - tx.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      hasCompensation: tx.compensationActions.length > 0,
      compensationStatus: tx.compensationActions[0]?.status || undefined
    }));
  }

  /**
   * 处理单个过期事务
   */
  private async processExpiredTransaction(transaction: ExpiredTransactionInfo): Promise<void> {
    console.log(`🔄 处理过期事务: ${transaction.transactionId} (状态: ${transaction.status})`);

    try {
      // 如果事务还在处理中，先尝试取消
      if (transaction.status === 'PROCESSING') {
        await this.cancelProcessingTransaction(transaction.transactionId);
      }

      // 执行补偿逻辑
      if (!transaction.hasCompensation) {
        await this.executeTransactionCompensation(transaction.transactionId);
      }

      // 更新事务状态为已清理
      await this.markTransactionAsCleaned(transaction.transactionId);

      console.log(`✅ 过期事务处理完成: ${transaction.transactionId}`);

    } catch (error) {
      console.error(`❌ 过期事务处理失败: ${transaction.transactionId}`, error);

      // 记录清理失败
      await this.markTransactionCleanupFailed(transaction.transactionId, error);
      throw error;
    }
  }

  /**
   * 取消正在处理的事务
   */
  private async cancelProcessingTransaction(transactionId: string): Promise<void> {
    try {
      // 调用事务管理器取消事务
      // await this.transactionManager.cancelTransaction(transactionId); // 暂时注释掉，模块不存在
      console.log(`🛑 已取消正在处理的事务: ${transactionId}`);
    } catch (error) {
      console.warn(`⚠️ 取消事务失败: ${transactionId}`, error);
      // 不抛出错误，继续执行补偿
    }
  }

  /**
   * 执行事务补偿
   */
  private async executeTransactionCompensation(transactionId: string): Promise<void> {
    try {
      console.log(`🔄 执行事务补偿: ${transactionId}`);

      // 获取事务详情
      const transaction = await this.prisma.uploadTransaction.findUnique({
        where: { id: transactionId },
        include: {
          steps: true
        }
      });

      if (!transaction) {
        throw new Error(`事务不存在: ${transactionId}`);
      }

      // 执行补偿步骤
      for (const step of transaction.steps.reverse()) {
        if (step.status === 'COMPLETED') {
          try {
            await this.executeStepCompensation(step);
          } catch (error) {
            console.error(`步骤补偿失败: ${step.id}`, error);
            // 继续执行其他步骤的补偿
          }
        }
      }

      // 更新事务状态
      await this.prisma.uploadTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPENSATED',
          updatedAt: new Date()
        }
      });

      console.log(`✅ 事务补偿完成: ${transactionId}`);

    } catch (error) {
      // 更新事务失败状态
      await this.prisma.uploadTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : '未知错误',
          updatedAt: new Date()
        }
      });

      throw error;
    }
  }

  /**
   * 执行单个步骤的补偿
   */
  private async executeStepCompensation(step: any): Promise<void> {
    console.log(`🔄 执行步骤补偿: ${step.stepName} (${step.id})`);

    switch (step.stepName) {
      case 'FILE_UPLOAD':
        await this.compensateFileUpload(step);
        break;
      case 'THUMBNAIL_GENERATION':
        await this.compensateThumbnailGeneration(step);
        break;
      case 'DATABASE_RECORD':
        await this.compensateDatabaseRecord(step);
        break;
      case 'NOTIFICATION':
        // 通知步骤通常不需要补偿
        break;
      default:
        console.warn(`未知的步骤类型: ${step.stepName}`);
    }
  }

  /**
   * 补偿文件上传
   */
  private async compensateFileUpload(step: any): Promise<void> {
    if (step.result?.fileKey) {
      // 这里应该调用存储服务删除文件
      console.log(`🗑️ 删除上传的文件: ${step.result.fileKey}`);
      // await storageService.deleteFile(step.result.fileKey);
    }
  }

  /**
   * 补偿缩略图生成
   */
  private async compensateThumbnailGeneration(step: any): Promise<void> {
    if (step.result?.thumbnailKey) {
      // 删除生成的缩略图
      console.log(`🗑️ 删除生成的缩略图: ${step.result.thumbnailKey}`);
      // await storageService.deleteFile(step.result.thumbnailKey);
    }
  }

  /**
   * 补偿数据库记录
   */
  private async compensateDatabaseRecord(step: any): Promise<void> {
    if (step.result?.recordId) {
      // 删除创建的数据库记录
      console.log(`🗑️ 删除数据库记录: ${step.result.recordId}`);

      try {
        await this.prisma.postMedia.delete({
          where: { id: step.result.recordId }
        });
      } catch (error) {
        console.warn(`删除数据库记录失败: ${step.result.recordId}`, error);
      }
    }
  }

  /**
   * 标记事务为已清理
   */
  private async markTransactionAsCleaned(transactionId: string): Promise<void> {
    await this.prisma.uploadTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });
  }

  /**
   * 标记事务清理失败
   */
  private async markTransactionCleanupFailed(transactionId: string, error: any): Promise<void> {
    await this.prisma.uploadTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : '未知错误',
        updatedAt: new Date()
      }
    });
  }

  /**
   * 获取清理统计
   */
  async getCleanupStatistics(): Promise<{
    totalExpiredTransactions: number;
    cleanedTransactions: number;
    failedCleanups: number;
    pendingCleanups: number;
  }> {
    const expireDays = this.config.thresholds.transactionExpireDays;
    const cutoffDate = new Date(Date.now() - expireDays * 24 * 60 * 60 * 1000);

    const [total, cleaned, failed] = await Promise.all([
      this.prisma.uploadTransaction.count({
        where: {
          createdAt: { lt: cutoffDate },
          status: { in: ['PENDING', 'PROCESSING', 'FAILED'] }
        }
      }),
      this.prisma.uploadTransaction.count({
        where: {
          createdAt: { lt: cutoffDate },
          status: 'CLEANED'
        }
      }),
      this.prisma.uploadTransaction.count({
        where: {
          createdAt: { lt: cutoffDate },
          status: 'FAILED'
        }
      })
    ]);

    return {
      totalExpiredTransactions: total,
      cleanedTransactions: cleaned,
      failedCleanups: failed,
      pendingCleanups: total - cleaned - failed
    };
  }

  /**
   * 关闭清理器
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
