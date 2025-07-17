/**
 * @fileoverview 事务核心执行器
 * @description 提供事务执行的核心功能，包括重试机制和错误处理
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  TransactionResult,
  TransactionOptions,
  TransactionOperation,
  DEFAULT_TRANSACTION_OPTIONS,
  RETRYABLE_ERRORS,
  TransactionErrorType
} from './types';
import { TransactionMonitor } from './monitor';

/**
 * 事务核心执行器
 */
export class TransactionCore {
  private static monitor = TransactionMonitor.getInstance();

  /**
   * 执行数据库事务（增强版本，支持重试和监控）
   */
  static async executeTransaction<T>(
    operation: TransactionOperation<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const finalOptions = { ...DEFAULT_TRANSACTION_OPTIONS, ...options };
    const transactionId = finalOptions.transactionId || this.generateTransactionId();
    const startTime = Date.now();
    let retryCount = 0;

    // 更新指标
    if (finalOptions.enableMonitoring) {
      this.monitor.incrementTotal();
    }

    while (retryCount <= finalOptions.maxRetries) {
      try {
        if (finalOptions.enableMonitoring && retryCount > 0) {
          console.log(`🔄 重试事务 ${transactionId}，第 ${retryCount} 次重试...`);
          this.monitor.incrementRetried();
        } else if (finalOptions.enableMonitoring) {
          console.log(`🔄 开始执行事务 ${transactionId}...`);
        }

        const result = await prisma.$transaction(
          operation,
          {
            maxWait: finalOptions.maxWait,
            timeout: finalOptions.timeout,
            isolationLevel: finalOptions.isolationLevel,
          }
        );

        const executionTime = Date.now() - startTime;

        // 更新成功指标
        if (finalOptions.enableMonitoring) {
          this.monitor.recordSuccess(executionTime);
          console.log(`✅ 事务 ${transactionId} 执行成功，耗时 ${executionTime}ms`);
        }

        return {
          success: true,
          data: result,
          executionTime,
          retryCount,
          transactionId,
        };

      } catch (error) {
        const executionTime = Date.now() - startTime;

        if (finalOptions.enableMonitoring) {
          console.error(`❌ 事务 ${transactionId} 执行失败 (第 ${retryCount + 1} 次尝试):`, error);
        }

        // 检查是否应该重试
        if (retryCount < finalOptions.maxRetries && this.shouldRetry(error)) {
          retryCount++;

          // 等待重试延迟
          if (finalOptions.retryDelay > 0) {
            await this.sleep(finalOptions.retryDelay * retryCount); // 指数退避
          }

          continue; // 重试
        }

        // 不再重试，返回失败结果
        if (finalOptions.enableMonitoring) {
          this.monitor.recordFailure(executionTime);
        }

        const { errorMessage, rollbackReason } = this.analyzeError(error);

        return {
          success: false,
          error: errorMessage,
          rollbackReason,
          executionTime,
          retryCount,
          transactionId,
        };
      }
    }

    // 这里不应该到达，但为了类型安全
    throw new Error('事务执行异常结束');
  }

  /**
   * 生成事务ID
   */
  private static generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 判断错误是否应该重试
   */
  private static shouldRetry(error: any): boolean {
    if (!(error instanceof Error)) return false;

    return RETRYABLE_ERRORS.some(errorType =>
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  }

  /**
   * 分析错误类型和原因
   */
  private static analyzeError(error: any): { errorMessage: string; rollbackReason: string } {
    let errorMessage = '事务执行失败';
    let rollbackReason = '';

    if (error instanceof Error) {
      errorMessage = error.message;

      // 分析错误类型
      if (error.message.includes('timeout')) {
        rollbackReason = '事务超时';
      } else if (error.message.includes('deadlock')) {
        rollbackReason = '死锁检测';
      } else if (error.message.includes('constraint')) {
        rollbackReason = '约束违反';
      } else if (error.message.includes('connection')) {
        rollbackReason = '连接问题';
      } else {
        rollbackReason = '未知错误';
      }
    }

    return { errorMessage, rollbackReason };
  }

  /**
   * 睡眠函数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取错误类型
   */
  static getErrorType(error: any): TransactionErrorType {
    if (!(error instanceof Error)) return TransactionErrorType.UNKNOWN;

    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return TransactionErrorType.TIMEOUT;
    if (message.includes('deadlock')) return TransactionErrorType.DEADLOCK;
    if (message.includes('constraint')) return TransactionErrorType.CONSTRAINT;
    if (message.includes('connection')) return TransactionErrorType.CONNECTION;

    return TransactionErrorType.UNKNOWN;
  }

  /**
   * 批量操作的事务
   */
  static async batchOperation<T>(
    operations: Array<TransactionOperation<T>>
  ): Promise<TransactionResult<T[]>> {
    return this.executeTransaction(async (tx) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }

      console.log(`📦 事务成功执行 ${operations.length} 个批量操作`);

      return results;
    });
  }

  /**
   * 健康检查事务
   */
  static async healthCheck(): Promise<TransactionResult<{ status: string; timestamp: Date }>> {
    return this.executeTransaction(async (tx) => {
      // 执行一个简单的查询来测试事务
      await tx.user.count();

      return {
        status: 'healthy',
        timestamp: new Date(),
      };
    });
  }
}
