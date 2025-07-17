/**
 * @fileoverview 转码任务清理服务
 * @description 处理转码任务的清理和维护操作
 */

import { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  CleanupTasksResponse,
  TranscodingStatus,
  TaskType as _TaskType,
  TRANSCODING_CONSTANTS,
} from '../types/transcoding-types';

export class TranscodingCleanupService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 清理旧的转码任务记录
   */
  async cleanupOldTasks(daysOld?: number): Promise<CleanupTasksResponse> {
    const actualDaysOld = daysOld ?? TRANSCODING_CONSTANTS.DEFAULT_CLEANUP_DAYS;
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - actualDaysOld);

      const deletedTasks = await this.prisma.mediaProcessingTask.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          status: {
            in: [TranscodingStatus.COMPLETED, TranscodingStatus.FAILED],
          },
        },
      });

      return {
        success: true,
        deletedCount: deletedTasks.count,
        message: `已清理 ${deletedTasks.count} 个旧的转码任务记录`,
      };
    } catch (error) {
      console.error('清理旧转码任务失败:', error);
      throw TRPCErrorHandler.internalError('清理旧转码任务失败');
    }
  }

  /**
   * 清理孤立的任务记录（没有对应媒体文件的任务）
   */
  async cleanupOrphanedTasks(): Promise<CleanupTasksResponse> {
    try {
      // 查找没有对应媒体文件的任务
      const orphanedTasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          mediaId: undefined,
        },
        select: {
          id: true,
        },
      });

      if (orphanedTasks.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: '没有发现孤立的任务记录',
        };
      }

      // 删除孤立的任务
      const deletedTasks = await this.prisma.mediaProcessingTask.deleteMany({
        where: {
          id: {
            in: orphanedTasks.map(task => task.id),
          },
        },
      });

      return {
        success: true,
        deletedCount: deletedTasks.count,
        message: `已清理 ${deletedTasks.count} 个孤立的任务记录`,
      };
    } catch (error) {
      console.error('清理孤立任务失败:', error);
      throw TRPCErrorHandler.internalError('清理孤立任务失败');
    }
  }

  /**
   * 清理长时间处理中的任务（可能已经死锁）
   */
  async cleanupStuckTasks(timeoutHours = 24): Promise<CleanupTasksResponse> {
    try {
      const timeoutDate = new Date();
      timeoutDate.setHours(timeoutDate.getHours() - timeoutHours);

      // 查找长时间处理中的任务
      const stuckTasks = await this.prisma.mediaProcessingTask.findMany({
        where: {
          status: TranscodingStatus.PROCESSING,
          startedAt: {
            lt: timeoutDate,
          },
        },
      });

      if (stuckTasks.length === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: '没有发现卡住的任务',
        };
      }

      // 将卡住的任务标记为失败
      const updatedTasks = await this.prisma.mediaProcessingTask.updateMany({
        where: {
          id: {
            in: stuckTasks.map(task => task.id),
          },
        },
        data: {
          status: TranscodingStatus.FAILED,
          errorMessage: `任务超时（超过${timeoutHours}小时）`,
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        deletedCount: updatedTasks.count,
        message: `已处理 ${updatedTasks.count} 个卡住的任务`,
      };
    } catch (error) {
      console.error('清理卡住任务失败:', error);
      throw TRPCErrorHandler.internalError('清理卡住任务失败');
    }
  }

  /**
   * 清理重复的任务记录
   */
  async cleanupDuplicateTasks(): Promise<CleanupTasksResponse> {
    try {
      // 查找重复的任务（同一媒体文件的多个相同类型任务）
      const duplicateTasks = await this.prisma.mediaProcessingTask.groupBy({
        by: ['mediaId', 'taskType'],
        _count: {
          id: true,
        },
        having: {
          id: {
            _count: {
              gt: 1,
            },
          },
        },
      });

      let totalDeleted = 0;

      for (const group of duplicateTasks) {
        // 保留最新的任务，删除其他的
        const tasks = await this.prisma.mediaProcessingTask.findMany({
          where: {
            mediaId: group.mediaId,
            taskType: group.taskType,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (tasks.length > 1) {
          const tasksToDelete = tasks.slice(1); // 保留第一个（最新的）

          const deleted = await this.prisma.mediaProcessingTask.deleteMany({
            where: {
              id: {
                in: tasksToDelete.map(task => task.id),
              },
            },
          });

          totalDeleted += deleted.count;
        }
      }

      return {
        success: true,
        deletedCount: totalDeleted,
        message: `已清理 ${totalDeleted} 个重复的任务记录`,
      };
    } catch (error) {
      console.error('清理重复任务失败:', error);
      throw TRPCErrorHandler.internalError('清理重复任务失败');
    }
  }

  /**
   * 执行完整的清理操作
   */
  async performFullCleanup(options: {
    daysOld?: number;
    cleanupOrphaned?: boolean;
    cleanupStuck?: boolean;
    cleanupDuplicates?: boolean;
    stuckTimeoutHours?: number;
  } = {}): Promise<{
    success: boolean;
    message: string;
    details: {
      oldTasks: number;
      orphanedTasks: number;
      stuckTasks: number;
      duplicateTasks: number;
    };
  }> {
    try {
      const results = {
        oldTasks: 0,
        orphanedTasks: 0,
        stuckTasks: 0,
        duplicateTasks: 0,
      };

      // 清理旧任务
      if (options.daysOld !== undefined) {
        const oldTasksResult = await this.cleanupOldTasks(options.daysOld);
        results.oldTasks = oldTasksResult.deletedCount;
      }

      // 清理孤立任务
      if (options.cleanupOrphaned !== false) {
        const orphanedResult = await this.cleanupOrphanedTasks();
        results.orphanedTasks = orphanedResult.deletedCount;
      }

      // 清理卡住的任务
      if (options.cleanupStuck !== false) {
        const stuckResult = await this.cleanupStuckTasks(options.stuckTimeoutHours);
        results.stuckTasks = stuckResult.deletedCount;
      }

      // 清理重复任务
      if (options.cleanupDuplicates !== false) {
        const duplicateResult = await this.cleanupDuplicateTasks();
        results.duplicateTasks = duplicateResult.deletedCount;
      }

      const totalCleaned = Object.values(results).reduce((sum, count) => sum + count, 0);

      return {
        success: true,
        message: `清理完成，共处理 ${totalCleaned} 个任务记录`,
        details: results,
      };
    } catch (error) {
      console.error('执行完整清理失败:', error);
      throw TRPCErrorHandler.internalError('执行完整清理失败');
    }
  }

  /**
   * 获取清理统计信息
   */
  async getCleanupStats() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        totalTasks,
        oldTasks,
        orphanedTasks,
        stuckTasks,
        recentTasks,
      ] = await Promise.all([
        // 总任务数
        this.prisma.mediaProcessingTask.count(),

        // 30天前的已完成/失败任务
        this.prisma.mediaProcessingTask.count({
          where: {
            createdAt: { lt: thirtyDaysAgo },
            status: { in: [TranscodingStatus.COMPLETED, TranscodingStatus.FAILED] },
          },
        }),

        // 孤立任务
        this.prisma.mediaProcessingTask.count({
          where: { mediaId: undefined },
        }),

        // 卡住的任务（处理中超过24小时）
        this.prisma.mediaProcessingTask.count({
          where: {
            status: TranscodingStatus.PROCESSING,
            startedAt: { lt: oneDayAgo },
          },
        }),

        // 最近24小时的任务
        this.prisma.mediaProcessingTask.count({
          where: {
            createdAt: { gte: oneDayAgo },
          },
        }),
      ]);

      return {
        totalTasks,
        cleanupCandidates: {
          oldTasks,
          orphanedTasks,
          stuckTasks,
        },
        recentActivity: {
          tasksLast24Hours: recentTasks,
        },
        recommendations: this.generateCleanupRecommendations({
          totalTasks,
          oldTasks,
          orphanedTasks,
          stuckTasks,
        }),
      };
    } catch (error) {
      console.error('获取清理统计失败:', error);
      throw TRPCErrorHandler.internalError('获取清理统计失败');
    }
  }

  /**
   * 生成清理建议
   */
  private generateCleanupRecommendations(stats: {
    totalTasks: number;
    oldTasks: number;
    orphanedTasks: number;
    stuckTasks: number;
  }) {
    const recommendations: any[] = [];

    if (stats.oldTasks > 100) {
      recommendations.push({
        type: 'cleanup_old',
        priority: 'medium',
        message: `建议清理 ${stats.oldTasks} 个旧的任务记录`,
      });
    }

    if (stats.orphanedTasks > 0) {
      recommendations.push({
        type: 'cleanup_orphaned',
        priority: 'high',
        message: `发现 ${stats.orphanedTasks} 个孤立的任务记录，建议立即清理`,
      });
    }

    if (stats.stuckTasks > 0) {
      recommendations.push({
        type: 'cleanup_stuck',
        priority: 'high',
        message: `发现 ${stats.stuckTasks} 个可能卡住的任务，建议检查并清理`,
      });
    }

    if (stats.totalTasks > 10000) {
      recommendations.push({
        type: 'regular_cleanup',
        priority: 'low',
        message: '任务记录较多，建议定期执行清理操作',
      });
    }

    return recommendations;
  }
}
