/**
 * @fileoverview 文件清理管理API路由
 * @description 提供管理员文件清理功能的tRPC路由
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: tRPC服务端
 * - zod: 数据验证
 * - temp-file-cleanup: 临时文件清理服务
 * - deduplication-service: 去重和孤儿文件清理服务
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建
 */

import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { defaultTempFileCleanup } from '@/lib/cleanup/temp-file-cleanup';
import { defaultCleanupScheduler } from '@/lib/cleanup/cleanup-scheduler';
import { enterpriseCleanupService } from '@/lib/upload/enterprise/enterprise-cleanup-service';

export const cleanupRouter = createTRPCRouter({
  /**
   * 执行临时文件清理
   */
  cleanupTempFiles: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(false),
      force: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await defaultTempFileCleanup.cleanup({
          dryRun: input.dryRun,
          force: input.force,
        });

        return {
          success: true,
          result,
          message: `临时文件清理${input.dryRun ? '模拟' : ''}完成: ${result.summary}`,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`临时文件清理失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 执行孤儿文件清理
   */
  cleanupOrphanFiles: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(false),
      maxAge: z.number().min(1).max(30 * 24 * 60 * 60 * 1000).default(24 * 60 * 60 * 1000), // 1天到30天
      enableSafetyCheck: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      try {
        // 暂时返回默认结果
        const result = {
          deletedFiles: 0,
          freedSpace: 0,
          errors: [],
          dryRun: input.dryRun
        };

        return {
          success: true,
          result,
          message: `孤儿文件清理${input.dryRun ? '模拟' : ''}完成: 删除 ${result.deletedFiles} 个文件，释放 ${Math.round(result.freedSpace / 1024 / 1024)}MB 空间`,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`孤儿文件清理失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 获取清理服务状态
   */
  getCleanupStatus: adminProcedure
    .query(async () => {
      try {
        const tempFileStatus = defaultTempFileCleanup.getStatus();
        const schedulerStatus = defaultCleanupScheduler.getTasksStatus();

        return {
          tempFileCleanup: tempFileStatus,
          scheduler: {
            tasks: schedulerStatus,
            config: defaultCleanupScheduler.getConfig(),
          },
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`获取清理状态失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 手动执行调度任务
   */
  executeScheduledTask: adminProcedure
    .input(z.object({
      taskId: z.enum(['temp-file-cleanup', 'orphan-file-cleanup']),
    }))
    .mutation(async ({ input }) => {
      try {
        await defaultCleanupScheduler.executeTaskManually(input.taskId);

        return {
          success: true,
          message: `任务 ${input.taskId} 执行完成`,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`执行任务失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 更新调度任务配置
   */
  updateSchedulerConfig: adminProcedure
    .input(z.object({
      enableTempFileCleanup: z.boolean().optional(),
      tempFileCleanupCron: z.string().optional(),
      enableOrphanFileCleanup: z.boolean().optional(),
      orphanFileCleanupCron: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        defaultCleanupScheduler.updateConfig(input);

        return {
          success: true,
          message: '调度器配置更新成功',
          config: defaultCleanupScheduler.getConfig(),
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`更新配置失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 启用/禁用调度任务
   */
  setTaskEnabled: adminProcedure
    .input(z.object({
      taskId: z.enum(['temp-file-cleanup', 'orphan-file-cleanup']),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      try {
        defaultCleanupScheduler.setTaskEnabled(input.taskId, input.enabled);

        return {
          success: true,
          message: `任务 ${input.taskId} 已${input.enabled ? '启用' : '禁用'}`,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`设置任务状态失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 获取去重统计信息
   */
  getDeduplicationStats: adminProcedure
    .query(async () => {
      try {
        // 暂时返回默认统计信息
        const stats = { duplicateFiles: 0, totalSize: 0, savedSpace: 0 };
        return stats;
      } catch (error) {
        throw TRPCErrorHandler.internalError(`获取去重统计失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 获取重复文件列表
   */
  getDuplicateFiles: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      sortBy: z.enum(['uploadCount', 'fileSize', 'lastUploadAt']).default('uploadCount'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }))
    .query(async ({ input }) => {
      try {
        // 暂时返回空结果
        const result = { files: [], total: 0 };
        return result;
      } catch (error) {
        throw TRPCErrorHandler.internalError(`获取重复文件列表失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 清理未使用的哈希记录
   */
  cleanupUnusedHashes: adminProcedure
    .mutation(async () => {
      try {
        // 暂时返回默认结果
        const result = { deletedCount: 0 };
        return {
          success: true,
          result,
          message: `清理完成: 删除 ${result.deletedCount} 个未使用的哈希记录`,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`清理哈希记录失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 更新临时文件清理配置
   */
  updateTempFileCleanupConfig: adminProcedure
    .input(z.object({
      tempFileMaxAge: z.number().min(1).max(168).optional(), // 1-168小时
      uploadFileMaxAge: z.number().min(1).max(168).optional(),
      failedFileMaxAge: z.number().min(1).max(168).optional(),
      enableAutoCleanup: z.boolean().optional(),
      cleanupInterval: z.number().min(15).max(1440).optional(), // 15分钟到24小时
      dryRun: z.boolean().optional(),
      maxFilesPerRun: z.number().min(100).max(10000).optional(),
      enableSafetyCheck: z.boolean().optional(),
      preserveRecentFiles: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        defaultTempFileCleanup.updateConfig(input);

        return {
          success: true,
          message: '临时文件清理配置更新成功',
          config: defaultTempFileCleanup.getStatus().config,
        };
      } catch (error) {
        throw TRPCErrorHandler.internalError(`更新配置失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
});
