/**
 * @fileoverview 存储管理tRPC路由
 * @description 提供存储监控、清理和管理的API接口
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: tRPC服务端
 * - zod: 数据验证
 * - @/lib/storage/storage-monitor-service: 存储监控服务
 * - @/lib/storage/auto-cleanup-service: 自动清理服务
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持存储监控和清理API
 */

import { z } from 'zod';
// import { TRPCError } from '@trpc/server';
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, authProcedure } from '@/server/api/trpc';
import { storageMonitor } from '@/lib/storage/storage-monitor-service';
import { autoCleanupService } from '@/lib/storage/auto-cleanup-service';

export const storageRouter = createTRPCRouter({
  // 获取当前存储状态
  getCurrentStatus: authProcedure.query(async ({ ctx }) => {
    // 只有管理员可以查看存储状态
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const status = await storageMonitor.getCurrentStorageStatus();
      return status;
    } catch (error) {
      console.error('获取存储状态失败:', error);
      throw TRPCErrorHandler.internalError("获取存储状态失败");
    }
  }),

  // 获取存储使用趋势
  getUsageTrend: authProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const trend = await storageMonitor.getStorageUsageTrend(input.days);
        return trend;
      } catch (error) {
        console.error('获取存储趋势失败:', error);
        throw TRPCErrorHandler.internalError("获取存储趋势失败");
      }
    }),

  // 手动触发存储检查
  triggerMonitorCheck: authProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const diskInfo = await storageMonitor.getDiskSpaceInfo();
      const directoryInfos = await storageMonitor.getDirectorySpaceInfos();

      return {
        success: true,
        diskInfo,
        directoryInfos,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('手动存储检查失败:', error);
      throw TRPCErrorHandler.internalError("存储检查失败");
    }
  }),

  // 启动/停止存储监控
  toggleMonitoring: authProcedure
    .input(z.object({
      enable: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        if (input.enable) {
          await storageMonitor.startMonitoring();
        } else {
          storageMonitor.stopMonitoring();
        }

        return {
          success: true,
          monitoring: input.enable,
        };
      } catch (error) {
        console.error('切换监控状态失败:', error);
        throw TRPCErrorHandler.internalError("切换监控状态失败");
      }
    }),

  // 更新监控配置
  updateMonitorConfig: authProcedure
    .input(z.object({
      checkInterval: z.number().min(60000).optional(), // 最小1分钟
      warningThreshold: z.number().min(50).max(100).optional(),
      criticalThreshold: z.number().min(50).max(100).optional(),
      emergencyThreshold: z.number().min(50).max(100).optional(),
      alertCooldown: z.number().min(300000).optional(), // 最小5分钟
      enableEmailNotification: z.boolean().optional(),
      enableWebhookNotification: z.boolean().optional(),
      webhookUrl: z.string().url().optional(),
      adminEmails: z.array(z.string().email()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        storageMonitor.updateConfig(input);
        return {
          success: true,
          config: storageMonitor.getConfig(),
        };
      } catch (error) {
        console.error('更新监控配置失败:', error);
        throw TRPCErrorHandler.internalError("更新监控配置失败");
      }
    }),

  // 标记预警为已解决
  resolveAlert: authProcedure
    .input(z.object({
      alertId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        await storageMonitor.resolveAlert(input.alertId);
        return { success: true };
      } catch (error) {
        console.error('标记预警为已解决失败:', error);
        throw TRPCErrorHandler.internalError("标记预警为已解决失败");
      }
    }),

  // 执行清理任务
  performCleanup: authProcedure
    .input(z.object({
      dryRun: z.boolean().default(false),
      taskTypes: z.array(z.enum([
        'chunkFiles',
        'orphanFiles',
        'logFiles',
        'backupFiles',
        'failedUploads',
        'tempProcessingFiles'
      ])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        // 如果指定了特定任务类型，临时更新策略
        if (input.taskTypes) {
          const currentStrategy = autoCleanupService.getStrategy();
          const tempStrategy = { ...currentStrategy };

          // 禁用所有任务
          Object.keys(tempStrategy).forEach(key => {
            (tempStrategy as any)[key].enabled = false;
          });

          // 启用指定的任务
          input.taskTypes.forEach(taskType => {
            if ((tempStrategy as any)[taskType]) {
              (tempStrategy as any)[taskType].enabled = true;
            }
          });

          autoCleanupService.updateStrategy(tempStrategy);
        }

        const report = await autoCleanupService.performFullCleanup(input.dryRun);

        return {
          success: true,
          report,
        };
      } catch (error) {
        console.error('执行清理任务失败:', error);
        throw TRPCErrorHandler.internalError("执行清理任务失败");
      }
    }),

  // 获取清理历史
  getCleanupHistory: authProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        const history = await autoCleanupService.getCleanupHistory(input.limit);
        return history;
      } catch (error) {
        console.error('获取清理历史失败:', error);
        throw TRPCErrorHandler.internalError("获取清理历史失败");
      }
    }),

  // 更新清理策略
  updateCleanupStrategy: authProcedure
    .input(z.object({
      chunkFiles: z.object({
        maxAge: z.number().min(1).max(168), // 1小时到7天
        enabled: z.boolean(),
      }).optional(),
      orphanFiles: z.object({
        maxAge: z.number().min(1).max(168),
        enabled: z.boolean(),
        safetyCheck: z.boolean(),
      }).optional(),
      logFiles: z.object({
        maxAge: z.number().min(1).max(365), // 1天到1年
        enabled: z.boolean(),
        keepCount: z.number().min(1).max(100),
      }).optional(),
      backupFiles: z.object({
        maxAge: z.number().min(1).max(365),
        enabled: z.boolean(),
        keepCount: z.number().min(1).max(50),
      }).optional(),
      failedUploads: z.object({
        maxAge: z.number().min(1).max(72), // 1小时到3天
        enabled: z.boolean(),
      }).optional(),
      tempProcessingFiles: z.object({
        maxAge: z.number().min(1).max(24), // 1小时到1天
        enabled: z.boolean(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("权限不足");
      }

      try {
        autoCleanupService.updateStrategy(input);
        return {
          success: true,
          strategy: autoCleanupService.getStrategy(),
        };
      } catch (error) {
        console.error('更新清理策略失败:', error);
        throw TRPCErrorHandler.internalError("更新清理策略失败");
      }
    }),

  // 获取服务状态
  getServiceStatus: authProcedure.query(async ({ ctx }) => {
    if (ctx.user.userLevel !== 'ADMIN') {
      throw TRPCErrorHandler.forbidden("权限不足");
    }

    try {
      const monitorStatus = storageMonitor.getStatus();
      const cleanupStatus = autoCleanupService.getStatus();

      return {
        monitor: monitorStatus,
        cleanup: cleanupStatus,
      };
    } catch (error) {
      console.error('获取服务状态失败:', error);
      throw TRPCErrorHandler.internalError("获取服务状态失败");
    }
  }),
});
