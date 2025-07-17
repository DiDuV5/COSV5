/**
 * @fileoverview WebP转换API路由
 * @description 提供WebP转换管理和监控的API接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure, adminProcedure } from '@/server/api/trpc';
import { WebPConversionManager, WebPTaskStatus } from '@/lib/services/webp-conversion-manager';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * WebP转换路由
 */
export const webpConversionRouter = createTRPCRouter({
  /**
   * 获取WebP转换配置
   */
  getConfig: publicProcedure.query(async () => {
    try {
      const manager = WebPConversionManager.getInstance();
      const config = manager.getConfig();

      return {
        success: true,
        config: {
          enabled: config.enabled,
          lossyQuality: config.lossyQuality,
          largeLossyQuality: config.largeLossyQuality,
          losslessQuality: config.losslessQuality,
          effort: config.effort,
          largeSizeThreshold: config.largeSizeThreshold,
          convertAnimated: config.convertAnimated,
          animatedQuality: config.animatedQuality,
          supportedInputFormats: config.supportedInputFormats,
          asyncProcessing: config.asyncProcessing,
          asyncDelay: config.asyncDelay,
        },
      };
    } catch (error) {
      return TRPCErrorHandler.handleError(error, {
        context: { context: { operation: 'getWebPConfig' } },
        message: '获取WebP配置失败',
      });
    }
  }),

  /**
   * 获取WebP转换统计
   */
  getStats: adminProcedure.query(async () => {
    try {
      const manager = WebPConversionManager.getInstance();
      const stats = manager.getStats();

      return {
        success: true,
        stats: {
          ...stats,
          totalSavingsMB: (stats.totalSavings / 1024 / 1024).toFixed(2),
          averageCompressionRatio: stats.averageCompressionRatio.toFixed(1),
          averageProcessingTimeMs: Math.round(stats.averageProcessingTime),
        },
      };
    } catch (error) {
      return TRPCErrorHandler.handleError(error, {
        context: { context: { operation: 'getWebPStats' } },
        message: '获取WebP统计失败',
      });
    }
  }),

  /**
   * 获取转换任务列表
   */
  getTasks: adminProcedure
    .input(z.object({
      status: z.nativeEnum(WebPTaskStatus).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      try {
        const manager = WebPConversionManager.getInstance();
        const allTasks = manager.getTasks(input.status);

        // 分页处理
        const total = allTasks.length;
        const tasks = allTasks
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(input.offset, input.offset + input.limit);

        return {
          success: true,
          data: {
            tasks: tasks.map(task => ({
              id: task.id,
              filename: task.filename,
              mimeType: task.mimeType,
              fileSize: task.fileSize,
              fileSizeMB: (task.fileSize / 1024 / 1024).toFixed(2),
              status: task.status,
              createdAt: task.createdAt,
              startedAt: task.startedAt,
              completedAt: task.completedAt,
              error: task.error,
              result: task.result ? {
                webpSize: task.result.webpSize,
                webpSizeMB: (task.result.webpSize / 1024 / 1024).toFixed(2),
                compressionRatio: task.result.compressionRatio.toFixed(1),
                processingTime: Math.round(task.result.processingTime),
                savings: task.fileSize - task.result.webpSize,
                savingsMB: ((task.fileSize - task.result.webpSize) / 1024 / 1024).toFixed(2),
              } : undefined,
            })),
            pagination: {
              total,
              limit: input.limit,
              offset: input.offset,
              hasMore: input.offset + input.limit < total,
            },
          },
        };
      } catch (error) {
        return TRPCErrorHandler.handleError(error, {
          context: { context: { operation: 'getWebPTasks' } },
          message: '获取WebP任务列表失败',
        });
      }
    }),

  /**
   * 获取单个任务详情
   */
  getTask: adminProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const manager = WebPConversionManager.getInstance();
        const task = manager.getTask(input.taskId);

        if (!task) {
          return TRPCErrorHandler.handleError(new Error('Task not found'), {
            context: { context: { operation: 'getWebPTask' } },
            message: '任务不存在',
          });
        }

        return {
          success: true,
          task: {
            id: task.id,
            filename: task.filename,
            mimeType: task.mimeType,
            fileSize: task.fileSize,
            fileSizeMB: (task.fileSize / 1024 / 1024).toFixed(2),
            status: task.status,
            createdAt: task.createdAt,
            startedAt: task.startedAt,
            completedAt: task.completedAt,
            error: task.error,
            result: task.result ? {
              webpSize: task.result.webpSize,
              webpSizeMB: (task.result.webpSize / 1024 / 1024).toFixed(2),
              compressionRatio: task.result.compressionRatio.toFixed(1),
              processingTime: Math.round(task.result.processingTime),
              savings: task.fileSize - task.result.webpSize,
              savingsMB: ((task.fileSize - task.result.webpSize) / 1024 / 1024).toFixed(2),
            } : undefined,
          },
        };
      } catch (error) {
        return TRPCErrorHandler.handleError(error, {
          context: { context: { operation: 'getWebPTask' } },
          message: '获取WebP任务详情失败',
        });
      }
    }),

  /**
   * 取消转换任务
   */
  cancelTask: adminProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const manager = WebPConversionManager.getInstance();
        const success = manager.cancelTask(input.taskId);

        if (!success) {
          return TRPCErrorHandler.handleError(new Error('Cannot cancel task'), {
            context: { context: { operation: 'cancelWebPTask' } },
            message: '无法取消任务，任务可能已经开始处理',
          });
        }

        return {
          success: true,
          message: '任务已取消',
        };
      } catch (error) {
        return TRPCErrorHandler.handleError(error, {
          context: { context: { operation: 'cancelWebPTask' } },
          message: '取消WebP任务失败',
        });
      }
    }),

  /**
   * 清理已完成的任务
   */
  cleanupTasks: adminProcedure
    .input(z.object({
      olderThanHours: z.number().min(1).max(168).default(24), // 1小时到7天
    }))
    .mutation(async ({ input }) => {
      try {
        const manager = WebPConversionManager.getInstance();
        const cleanedCount = manager.cleanupCompletedTasks(input.olderThanHours);

        return {
          success: true,
          message: `已清理 ${cleanedCount} 个任务记录`,
          cleanedCount,
        };
      } catch (error) {
        return TRPCErrorHandler.handleError(error, {
          context: { context: { operation: 'cleanupWebPTasks' } },
          message: '清理WebP任务失败',
        });
      }
    }),

  /**
   * 重置统计数据
   */
  resetStats: adminProcedure.mutation(async () => {
    try {
      const manager = WebPConversionManager.getInstance();
      manager.resetStats();

      return {
        success: true,
        message: '统计数据已重置',
      };
    } catch (error) {
      return TRPCErrorHandler.handleError(error, {
        context: { context: { operation: 'resetWebPStats' } },
        message: '重置WebP统计失败',
      });
    }
  }),

  /**
   * 更新WebP配置
   */
  updateConfig: adminProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      lossyQuality: z.number().min(1).max(100).optional(),
      largeLossyQuality: z.number().min(1).max(100).optional(),
      losslessQuality: z.number().min(0).max(100).optional(),
      effort: z.number().min(0).max(6).optional(),
      largeSizeThreshold: z.number().min(1024 * 1024).optional(), // 最小1MB
      convertAnimated: z.boolean().optional(),
      animatedQuality: z.number().min(1).max(100).optional(),
      asyncProcessing: z.boolean().optional(),
      asyncDelay: z.number().min(0).max(10000).optional(), // 最大10秒
    }))
    .mutation(async ({ input }) => {
      try {
        const manager = WebPConversionManager.getInstance();
        manager.updateConfig(input);

        return {
          success: true,
          message: 'WebP配置已更新',
          config: manager.getConfig(),
        };
      } catch (error) {
        return TRPCErrorHandler.handleError(error, {
          context: { context: { operation: 'updateWebPConfig' } },
          message: '更新WebP配置失败',
        });
      }
    }),

  /**
   * 获取队列状态
   */
  getQueueStatus: adminProcedure.query(async () => {
    try {
      const manager = WebPConversionManager.getInstance();
      const stats = manager.getStats();

      return {
        success: true,
        status: {
          queueLength: stats.queueLength,
          processingCount: stats.processingCount,
          pendingTasks: manager.getTasks(WebPTaskStatus.PENDING).length,
          processingTasks: manager.getTasks(WebPTaskStatus.PROCESSING).length,
          completedTasks: manager.getTasks(WebPTaskStatus.COMPLETED).length,
          failedTasks: manager.getTasks(WebPTaskStatus.FAILED).length,
        },
      };
    } catch (error) {
      return TRPCErrorHandler.handleError(error, {
        context: { context: { operation: 'getWebPQueueStatus' } },
        message: '获取WebP队列状态失败',
      });
    }
  }),
});
