/**
 * @fileoverview 用户审批核心路由模块
 * @description 处理用户审批的核心路由逻辑
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  getPendingUsersInputSchema,
  approveUserInputSchema,
  batchApproveUsersInputSchema,
  getApprovalLogsInputSchema,
} from "../schemas";
import { 
  getPendingUsersList, 
  processSingleUserApproval, 
  processBatchUserApproval 
} from '../approval-handler';
import { getApprovalLogsList } from '../stats-handler';
import { ApprovalErrorHandler } from '../middleware/error-handler';

/**
 * 审批核心路由
 */
export const approvalRoutes = createTRPCRouter({
  /**
   * 获取待审核用户列表（管理员）
   */
  getPendingUsers: adminProcedure
    .input(getPendingUsersInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, sortBy, sortOrder, search } = input;

      try {
        const result = await getPendingUsersList(
          ctx.db,
          limit,
          cursor,
          sortBy,
          sortOrder,
          search
        );

        return {
          users: result.items,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        };
      } catch (error: unknown) {
        ApprovalErrorHandler.handleGetPendingUsersError(error, {
          limit,
          cursor,
          sortBy,
          sortOrder,
          search
        });
      }
    }),

  /**
   * 审核用户（管理员）
   */
  approveUser: adminProcedure
    .input(approveUserInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, action, reason, notifyUser } = input;
      const adminId = ctx.session.user.id;

      try {
        return await processSingleUserApproval(
          ctx.db,
          null, // ctx.req 在 tRPC 中不可用
          userId,
          action,
          reason,
          notifyUser,
          adminId,
          ctx.session.user.userLevel || 'ADMIN' // 提供默认值，因为adminProcedure确保用户有管理员权限
        );
      } catch (error: unknown) {
        ApprovalErrorHandler.handleApproveUserError(error, {
          userId,
          action,
          reason,
          notifyUser,
          adminId,
          adminLevel: ctx.session.user.userLevel
        });
      }
    }),

  /**
   * 批量审核用户（管理员）
   */
  batchApproveUsers: adminProcedure
    .input(batchApproveUsersInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { userIds, action, reason, notifyUsers } = input;
      const adminId = ctx.session.user.id;

      try {
        return await processBatchUserApproval(
          ctx.db,
          null, // ctx.req 在 tRPC 中不可用
          userIds,
          action,
          reason,
          notifyUsers,
          adminId,
          ctx.session.user.userLevel || 'ADMIN' // 提供默认值，因为adminProcedure确保用户有管理员权限
        );
      } catch (error: unknown) {
        ApprovalErrorHandler.handleBatchApprovalError(error, {
          userIds,
          action,
          reason,
          notifyUsers,
          adminId
        });
      }
    }),

  /**
   * 获取审核日志（管理员）
   */
  getApprovalLogs: adminProcedure
    .input(getApprovalLogsInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, userId, adminId, action, startDate, endDate } = input;

      try {
        const result = await getApprovalLogsList(
          ctx.db,
          limit || 10,
          cursor,
          userId,
          adminId,
          action,
          startDate,
          endDate
        );

        return {
          logs: result.items,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        };
      } catch (error) {
        ApprovalErrorHandler.handleGenericError(
          error,
          'getApprovalLogs',
          '获取审核日志失败'
        );
      }
    }),
});
