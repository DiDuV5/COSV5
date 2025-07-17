/**
 * @fileoverview 超时处理器
 * @description 处理超时用户的自动拒绝和相关操作
 * @author Augment AI
 * @date 2025-07-03
 */

import { prisma } from '@/lib/prisma';
import { ApprovalAuditLogger } from '../approval-audit-logger';
import {
  TimeoutUser,
  TimeoutProcessingOptions,
  TimeoutBatchResult
} from '../types/timeout-types';

/**
 * 超时处理器类
 */
export class TimeoutProcessor {
  private static readonly SYSTEM_ADMIN_ID = 'system';
  private static readonly DEFAULT_BATCH_SIZE = 50;

  /**
   * 自动拒绝超时用户
   */
  static async autoRejectTimeoutUsers(
    users: TimeoutUser[],
    options: TimeoutProcessingOptions = {}
  ): Promise<number> {
    const {
      dryRun = false,
      batchSize = this.DEFAULT_BATCH_SIZE,
      customReason
    } = options;

    if (dryRun) {
      console.log(`🔍 干运行模式: 将拒绝 ${users.length} 个超时用户`);
      return users.length;
    }

    try {
      const userIds = users.map(user => user.id);
      const batchId = `timeout_${Date.now()}`;
      const reason = customReason || `账户注册超过规定时间未获得审批，系统自动拒绝 (批次: ${batchId})`;

      console.log(`🚫 开始自动拒绝 ${users.length} 个超时用户`);

      // 分批处理用户
      let processedCount = 0;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);

        try {
          // 批量更新用户状态为拒绝
          await prisma.user.updateMany({
            where: {
              id: { in: batch }
            },
            data: {
              userLevel: 'REJECTED',
              rejectedAt: new Date(),
              rejectionReason: reason,
              rejectedBy: this.SYSTEM_ADMIN_ID
            }
          });

          processedCount += batch.length;

          // 记录审计日志
          for (const userId of batch) {
            const user = users.find(u => u.id === userId);
            if (user) {
              await ApprovalAuditLogger.logUserAction(
                userId,
                'REJECT_USER',
                this.SYSTEM_ADMIN_ID,
                {
                  reason,
                  batchId,
                  hoursOverdue: user.hoursOverdue,
                  autoRejection: true
                }
              );
            }
          }

          console.log(`✅ 已处理批次 ${Math.floor(i / batchSize) + 1}: ${batch.length} 个用户`);

        } catch (error) {
          console.error(`❌ 批次处理失败:`, error);
          // 继续处理下一批次
        }

        // 批次间延迟，避免数据库压力过大
        if (i + batchSize < userIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`✅ 自动拒绝完成: ${processedCount}/${users.length} 个用户`);
      return processedCount;

    } catch (error) {
      console.error('自动拒绝超时用户失败:', error);
      throw error;
    }
  }

  /**
   * 批量处理超时用户
   */
  static async processBatch(
    users: TimeoutUser[],
    options: TimeoutProcessingOptions = {}
  ): Promise<TimeoutBatchResult> {
    const batchId = `batch_${Date.now()}`;
    const startTime = Date.now();

    const result: TimeoutBatchResult = {
      batchId,
      totalUsers: users.length,
      processedUsers: 0,
      successfulUsers: 0,
      failedUsers: 0,
      skippedUsers: 0,
      errors: [],
      processingTime: 0
    };

    try {
      console.log(`📦 开始批量处理: ${users.length} 个超时用户 (批次: ${batchId})`);

      for (const user of users) {
        try {
          // 检查用户是否仍然需要处理
          const currentUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { userLevel: true, rejectedAt: true }
          });

          if (!currentUser || currentUser.userLevel !== 'GUEST') {
            result.skippedUsers++;
            console.log(`⏭️ 跳过用户 ${user.username}: 状态已变更`);
            continue;
          }

          // 处理单个用户
          await this.processSingleUser(user, options);
          result.successfulUsers++;

        } catch (error) {
          result.failedUsers++;
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          result.errors.push({
            userId: user.id,
            error: errorMsg
          });

          console.error(`❌ 处理用户失败 ${user.username}:`, error);
        }

        result.processedUsers++;
      }

      result.processingTime = Date.now() - startTime;

      console.log(`✅ 批量处理完成: 成功 ${result.successfulUsers}, 失败 ${result.failedUsers}, 跳过 ${result.skippedUsers}`);

      // 记录批处理日志
      await this.logBatchProcessing(result, options);

      return result;

    } catch (error) {
      result.processingTime = Date.now() - startTime;
      console.error('批量处理失败:', error);
      throw error;
    }
  }

  /**
   * 处理单个用户
   */
  private static async processSingleUser(
    user: TimeoutUser,
    options: TimeoutProcessingOptions
  ): Promise<void> {
    const { enableAutoRejection = true, customReason } = options;

    if (enableAutoRejection) {
      // 自动拒绝用户
      await this.rejectSingleUser(user, customReason);
    }

    // 这里可以添加其他处理逻辑，如发送通知等
  }

  /**
   * 拒绝单个用户
   */
  private static async rejectSingleUser(user: TimeoutUser, customReason?: string): Promise<void> {
    const reason = customReason || `账户注册超过规定时间未获得审批，系统自动拒绝 (超时 ${user.hoursOverdue} 小时)`;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        userLevel: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
        rejectedBy: this.SYSTEM_ADMIN_ID
      }
    });

    // 记录审计日志
    await ApprovalAuditLogger.logUserAction(
      user.id,
      'REJECT_USER',
      this.SYSTEM_ADMIN_ID,
      {
        reason,
        hoursOverdue: user.hoursOverdue,
        autoRejection: true,
        username: user.username
      }
    );

    console.log(`🚫 已拒绝用户: ${user.username} (超时 ${user.hoursOverdue} 小时)`);
  }

  /**
   * 撤销超时处理
   */
  static async undoTimeoutProcessing(userIds: string[], reason: string): Promise<number> {
    try {
      console.log(`🔄 撤销超时处理: ${userIds.length} 个用户`);

      let restoredCount = 0;

      for (const userId of userIds) {
        try {
          // 检查用户当前状态
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              userLevel: true,
              rejectedAt: true,
              rejectionReason: true,
              username: true
            }
          });

          if (!user || user.userLevel !== 'REJECTED') {
            console.log(`⏭️ 跳过用户 ${userId}: 不是被拒绝状态`);
            continue;
          }

          // 检查是否是超时自动拒绝
          if (!user.rejectionReason?.includes('超时') && !user.rejectionReason?.includes('timeout')) {
            console.log(`⏭️ 跳过用户 ${user.username}: 不是超时拒绝`);
            continue;
          }

          // 恢复用户状态
          await prisma.user.update({
            where: { id: userId },
            data: {
              userLevel: 'GUEST',
              rejectedAt: null,
              rejectionReason: null,
              rejectedBy: null
            }
          });

          // 记录审计日志
          await ApprovalAuditLogger.logUserAction(
            userId,
            'SYSTEM_ACTION',
            this.SYSTEM_ADMIN_ID,
            {
              reason,
              previousRejectionReason: user.rejectionReason,
              restoredAt: new Date()
            }
          );

          restoredCount++;
          console.log(`✅ 已恢复用户: ${user.username}`);

        } catch (error) {
          console.error(`❌ 恢复用户失败 ${userId}:`, error);
        }
      }

      console.log(`✅ 撤销超时处理完成: ${restoredCount}/${userIds.length} 个用户已恢复`);
      return restoredCount;

    } catch (error) {
      console.error('撤销超时处理失败:', error);
      throw error;
    }
  }

  /**
   * 获取处理统计
   */
  static async getProcessingStatistics(days: number = 7): Promise<{
    totalProcessed: number;
    autoRejected: number;
    restored: number;
    averageProcessingTime: number;
    successRate: number;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [processedLogs, rejectedUsers, restoredUsers] = await Promise.all([
        // 注意：timeoutProcessingLog模型不存在，使用auditLog替代
        prisma.auditLog.findMany({
          where: {
            action: 'TIMEOUT_REJECT',
            createdAt: { gte: startDate }
          }
        }),

        prisma.user.count({
          where: {
            userLevel: 'REJECTED',
            rejectedAt: { gte: startDate },
            rejectionReason: { contains: '超时' }
          }
        }),

        prisma.auditLog.count({
          where: {
            action: 'TIMEOUT_PROCESSING_UNDONE',
            createdAt: { gte: startDate }
          }
        })
      ]);

      const totalProcessed = processedLogs.reduce((sum: number, log: any) => sum + (log.processedCount || 1), 0);
      const totalProcessingTime = processedLogs.reduce((sum: number, log: any) => sum + (log.processingTimeMs || 0), 0);
      const averageProcessingTime = processedLogs.length > 0 ? totalProcessingTime / processedLogs.length : 0;

      const totalErrors = processedLogs.reduce((sum: number, log: any) => sum + (log.errors?.length || 0), 0);
      const successRate = totalProcessed > 0 ? (totalProcessed - totalErrors) / totalProcessed : 1;

      return {
        totalProcessed,
        autoRejected: rejectedUsers,
        restored: restoredUsers,
        averageProcessingTime,
        successRate
      };

    } catch (error) {
      console.error('获取处理统计失败:', error);
      throw error;
    }
  }

  /**
   * 记录批处理日志
   */
  private static async logBatchProcessing(
    result: TimeoutBatchResult,
    options: TimeoutProcessingOptions
  ): Promise<void> {
    try {
      // 注意：timeoutProcessingLog模型不存在，使用auditLog记录
      await prisma.auditLog.create({
        data: {
          action: 'TIMEOUT_REJECT',
          level: 'INFO',
          message: `批量超时处理完成: ${result.batchId}`,
          details: JSON.stringify({
            batchId: result.batchId,
            processedCount: result.processedUsers,
            successfulCount: result.successfulUsers,
            failedCount: result.failedUsers,
            skippedCount: result.skippedUsers,
            processingTimeMs: result.processingTime,
            errors: result.errors.map(e => `${e.userId}: ${e.error}`),
            options: JSON.stringify(options),
            triggeredBy: 'MANUAL' // 这里可以根据调用方式动态设置
          })
        }
      });
    } catch (error) {
      console.error('记录批处理日志失败:', error);
      // 不抛出错误，避免影响主要处理流程
    }
  }
}
