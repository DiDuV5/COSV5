/**
 * @fileoverview 用户审批统计路由模块
 * @description 处理审批统计和分析相关的路由逻辑
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { createTRPCRouter, adminProcedure, publicProcedure } from "@/server/api/trpc";
import { getApprovalStatistics } from '../stats-handler';
import { ApprovalAuditLogger } from '@/lib/approval/approval-audit-logger';
import { ApprovalErrorHandler } from '../middleware/error-handler';
import { z } from 'zod';

/**
 * 统计分析路由
 */
export const statsRoutes = createTRPCRouter({
  /**
   * 获取审核统计信息（管理员）
   */
  getApprovalStats: publicProcedure
    .query(async ({ ctx }) => {
      // 检查是否为管理员
      if (!ctx.session?.user || !["ADMIN", "SUPER_ADMIN"].includes(ctx.session.user.userLevel)) {
        throw ApprovalErrorHandler.handleGenericError(
          new Error('权限不足'),
          'getApprovalStats',
          '需要管理员权限才能查看审核统计'
        );
      }

      try {
        return await getApprovalStatistics(ctx.db);
      } catch (error) {
        ApprovalErrorHandler.handleGenericError(
          error,
          'getApprovalStats',
          '获取审核统计失败'
        );
      }
    }),

  /**
   * 获取审批历史记录
   */
  getApprovalHistory: adminProcedure
    .input(z.object({
      userId: z.string().optional(),
      adminId: z.string().optional(),
      action: z.enum([
        'APPROVE_USER', 'REJECT_USER', 'BATCH_APPROVE', 'BATCH_REJECT',
        'AUTO_APPROVE', 'AUTO_REJECT', 'TIMEOUT_REJECT', 'REVERT_APPROVAL'
      ]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      try {
        return await ApprovalAuditLogger.getApprovalHistory(input);
      } catch (error: unknown) {
        ApprovalErrorHandler.handleApprovalHistoryError(error, {
          queryParams: input,
          operation: 'getApprovalHistory'
        });
      }
    }),

  /**
   * 获取审批统计信息（增强版）
   */
  getApprovalStatisticsEnhanced: adminProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await ApprovalAuditLogger.getApprovalStatistics(input);
      } catch (error) {
        console.error('获取审批统计信息失败:', error);

        if (error instanceof Error && 'code' in error) {
          throw error;
        }

        ApprovalErrorHandler.handleGenericError(
          error,
          'getApprovalStatisticsEnhanced',
          '获取审批统计信息失败'
        );
      }
    }),
});
