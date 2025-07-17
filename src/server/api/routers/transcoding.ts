/**
 * @fileoverview 转码API路由 (重构版)
 * @description 提供转码进度查询和管理功能，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server
 * - zod
 * - @prisma/client
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

import { createTRPCRouter, publicProcedure, authProcedure } from '../trpc';

// 导入拆分的模块
import { TranscodingQueryService } from './transcoding/services/transcoding-query-service';
import { TranscodingStatsService } from './transcoding/services/transcoding-stats-service';
import { TranscodingManagementService } from './transcoding/services/transcoding-management-service';
import { TranscodingCleanupService } from './transcoding/services/transcoding-cleanup-service';
import {
  GetTaskStatusInputSchema,
  GetMediaProcessingTasksInputSchema,
  RetryTaskInputSchema,
  CancelTaskInputSchema,
  CleanupOldTasksInputSchema,
} from './transcoding/types/transcoding-types';

/**
 * 重构后的转码路由
 */
export const transcodingRouter = createTRPCRouter({
  // 获取转码任务状态
  getTaskStatus: publicProcedure
    .input(GetTaskStatusInputSchema)
    .query(async ({ ctx, input }) => {
      const queryService = new TranscodingQueryService(ctx.prisma);
      return await queryService.getTaskStatus(input.mediaId);
    }),

  // 获取媒体文件的所有处理任务
  getMediaProcessingTasks: publicProcedure
    .input(GetMediaProcessingTasksInputSchema)
    .query(async ({ ctx, input }) => {
      const queryService = new TranscodingQueryService(ctx.prisma);
      return await queryService.getMediaProcessingTasks(input.mediaId);
    }),

  // 获取转码统计信息
  getTranscodingStats: authProcedure
    .query(async ({ ctx }) => {
      const statsService = new TranscodingStatsService(ctx.prisma);
      return await statsService.getTranscodingStats();
    }),

  // 重试失败的转码任务
  retryFailedTask: authProcedure
    .input(RetryTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      const managementService = new TranscodingManagementService(ctx.prisma);
      return await managementService.retryFailedTask(input.taskId);
    }),

  // 取消正在进行的转码任务
  cancelTask: authProcedure
    .input(CancelTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      const managementService = new TranscodingManagementService(ctx.prisma);
      return await managementService.cancelTask(input.taskId);
    }),

  // 清理旧的转码任务记录
  cleanupOldTasks: authProcedure
    .input(CleanupOldTasksInputSchema)
    .mutation(async ({ ctx, input }) => {
      const cleanupService = new TranscodingCleanupService(ctx.prisma);
      return await cleanupService.cleanupOldTasks(input.daysOld);
    }),

  // 获取转码性能统计
  getPerformanceStats: authProcedure
    .query(async ({ ctx }) => {
      const statsService = new TranscodingStatsService(ctx.prisma);
      return await statsService.getPerformanceStats();
    }),

  // 获取每日转码统计
  getDailyStats: authProcedure
    .query(async ({ ctx }) => {
      const statsService = new TranscodingStatsService(ctx.prisma);
      return await statsService.getDailyStats();
    }),

  // 获取错误分析
  getErrorAnalysis: authProcedure
    .query(async ({ ctx }) => {
      const statsService = new TranscodingStatsService(ctx.prisma);
      return await statsService.getErrorAnalysis();
    }),

  // 执行完整清理
  performFullCleanup: authProcedure
    .mutation(async ({ ctx }) => {
      const cleanupService = new TranscodingCleanupService(ctx.prisma);
      return await cleanupService.performFullCleanup();
    }),

  // 获取清理统计信息
  getCleanupStats: authProcedure
    .query(async ({ ctx }) => {
      const cleanupService = new TranscodingCleanupService(ctx.prisma);
      return await cleanupService.getCleanupStats();
    }),
});
