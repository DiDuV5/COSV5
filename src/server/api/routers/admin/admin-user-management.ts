/**
 * @fileoverview 管理员用户管理路由（重构版）
 * @description 处理用户的CRUD操作，包括创建、查询、更新、删除用户，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { z } from 'zod';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { createTRPCRouter, adminProcedure } from '@/server/api/trpc';

// 导入重构后的服务
import { userQueryService, userManagementService } from './admin-services';

// 导入输入验证schemas
import {
  getUsersSchema,
  getUserByIdSchema,
  createUserSchema,
  createUsersBatchSchema,
  updateUserSchema,
  resetUserPasswordSchema,
  deleteUserSchema,
} from './admin-input-schemas';

export const adminUserManagementRouter = createTRPCRouter({
  /**
   * 获取用户列表（重构版 - 使用查询服务）
   */
  getUsers: adminProcedure
    .input(getUsersSchema)
    .query(async ({ ctx, input }) => {
      try {
        const queryService = userQueryService(ctx.db);
        return await queryService.getUsers(input);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          '获取用户列表失败，请稍后重试',
          {
            context: {
              error: errorMessage,
              queryParams: input,
              adminId: ctx.session.user.id,
              operation: 'getUsers',
              timestamp: new Date().toISOString()
            },
            recoveryActions: [
              '检查查询参数是否正确',
              '刷新页面重试',
              '联系技术支持'
            ]
          }
        );
      }
    }),

  /**
   * 获取单个用户详情（重构版 - 使用查询服务）
   */
  getUserById: adminProcedure
    .input(getUserByIdSchema)
    .query(async ({ ctx, input }) => {
      const queryService = userQueryService(ctx.db);
      return await queryService.getUserById(input.userId);
    }),

  /**
   * 创建用户（重构版 - 使用管理服务）
   */
  createUser: adminProcedure
    .input(createUserSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const managementService = userManagementService(ctx.db);
        return await managementService.createUser(input as any, ctx.session.user.id);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 检查是否是业务逻辑错误（已经是TRPCError）
        if (error instanceof Error && 'code' in error) {
          throw error; // 重新抛出已处理的业务错误
        }

        // 根据错误类型提供具体的错误处理
        if (errorMessage.includes('用户名') && errorMessage.includes('已存在')) {
          throw TRPCErrorHandler.businessError(
            'CONFLICT' as any,
            '用户名已被使用，请选择其他用户名',
            {
              context: {
                username: input.username,
                adminId: ctx.session.user.id,
                operation: 'createUser'
              },
              recoveryActions: [
                '尝试使用不同的用户名',
                '检查用户名是否符合规范',
                '联系管理员处理'
              ]
            }
          );
        }

        if (errorMessage.includes('邮箱') && errorMessage.includes('已存在')) {
          throw TRPCErrorHandler.businessError(
            'CONFLICT' as any,
            '邮箱地址已被注册，请使用其他邮箱',
            {
              context: {
                email: input.email,
                adminId: ctx.session.user.id,
                operation: 'createUser'
              },
              recoveryActions: [
                '使用不同的邮箱地址',
                '检查邮箱格式是否正确',
                '确认邮箱是否已被其他用户使用'
              ]
            }
          );
        }

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          '创建用户失败，请检查输入信息并重试',
          {
            context: {
              error: errorMessage,
              userInput: { ...input, password: '[REDACTED]' },
              adminId: ctx.session.user.id,
              operation: 'createUser'
            },
            recoveryActions: [
              '检查所有必填字段是否完整',
              '确认用户名和邮箱格式正确',
              '稍后重试创建操作'
            ]
          }
        );
      }
    }),

  /**
   * 批量创建用户（重构版 - 使用管理服务）
   */
  createUsersBatch: adminProcedure
    .input(createUsersBatchSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // 验证批量操作限制
        if (input.users.length > 100) {
          throw TRPCErrorHandler.businessError(
            'BAD_REQUEST' as any,
            `批量创建用户数量超出限制，最多可同时创建100个用户，当前：${input.users.length}个`,
            {
              context: {
                requestCount: input.users.length,
                maxAllowed: 100,
                adminId: ctx.session.user.id,
                operation: 'createUsersBatch'
              },
              recoveryActions: [
                '减少用户数量到100个以内',
                '分批次进行用户创建',
                '联系管理员调整批量限制'
              ]
            }
          );
        }

        const managementService = userManagementService(ctx.db);
        return await managementService.createUsersBatch(input as any, ctx.session.user.id);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 检查是否是业务逻辑错误（已经是TRPCError）
        if (error instanceof Error && 'code' in error) {
          throw error; // 重新抛出已处理的业务错误
        }

        // 根据错误类型提供具体的错误处理
        if (errorMessage.includes('事务') || errorMessage.includes('transaction')) {
          throw TRPCErrorHandler.businessError(
            'INTERNAL_SERVER_ERROR' as any,
            '批量创建过程中发生数据库事务错误，部分用户可能未创建成功',
            {
              context: {
                error: errorMessage,
                userCount: input.users.length,
                adminId: ctx.session.user.id,
                operation: 'createUsersBatch',
                timestamp: new Date().toISOString()
              },
              recoveryActions: [
                '检查哪些用户已成功创建',
                '对未创建的用户重新执行操作',
                '联系技术支持检查数据一致性'
              ]
            }
          );
        }

        if (errorMessage.includes('重复') || errorMessage.includes('duplicate')) {
          throw TRPCErrorHandler.businessError(
            'CONFLICT' as any,
            '批量创建失败：存在重复的用户名或邮箱',
            {
              context: {
                error: errorMessage,
                userCount: input.users.length,
                adminId: ctx.session.user.id,
                operation: 'createUsersBatch'
              },
              recoveryActions: [
                '检查CSV文件中是否有重复的用户名或邮箱',
                '确认用户名和邮箱在系统中是否已存在',
                '修正重复数据后重新上传'
              ]
            }
          );
        }

        throw TRPCErrorHandler.businessError(
          'INTERNAL_SERVER_ERROR' as any,
          '批量创建用户失败，请检查数据格式并重试',
          {
            context: {
              error: errorMessage,
              userCount: input.users.length,
              adminId: ctx.session.user.id,
              operation: 'createUsersBatch'
            },
            recoveryActions: [
              '检查CSV文件格式是否正确',
              '确认所有必填字段都已填写',
              '尝试减少批量数量后重试'
            ]
          }
        );
      }
    }),

  /**
   * 更新用户（重构版 - 使用管理服务）
   */
  updateUser: adminProcedure
    .input(updateUserSchema)
    .mutation(async ({ ctx, input }) => {
      const managementService = userManagementService(ctx.db);
      return await managementService.updateUser(input, ctx.session.user.id);
    }),

  /**
   * 重置用户密码（重构版 - 使用管理服务）
   */
  resetUserPassword: adminProcedure
    .input(resetUserPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const managementService = userManagementService(ctx.db);
      return await managementService.resetUserPassword(input, ctx.session.user.id);
    }),

  /**
   * 删除用户（重构版 - 使用管理服务）
   */
  deleteUser: adminProcedure
    .input(deleteUserSchema)
    .mutation(async ({ ctx, input }) => {
      const managementService = userManagementService(ctx.db);
      return await managementService.deleteUser(input.userId, ctx.session.user.id);
    }),

  /**
   * 搜索用户（新增 - 使用查询服务）
   */
  searchUsers: adminProcedure
    .input(getUsersSchema.pick({ search: true, userLevel: true, isActive: true }).extend({
      limit: getUsersSchema.shape.limit.optional(),
    }))
    .query(async ({ ctx, input }) => {
      const queryService = userQueryService(ctx.db);

      if (!input.search) {
        throw TRPCErrorHandler.validationError('搜索关键词不能为空');
      }

      return await queryService.searchUsers({
        query: input.search,
        limit: input.limit,
        userLevel: input.userLevel,
        isActive: input.isActive,
      });
    }),

  /**
   * 获取用户统计信息（新增 - 使用查询服务）
   */
  getUserStats: adminProcedure.query(async ({ ctx }) => {
    const queryService = userQueryService(ctx.db);
    return await queryService.getUserStats();
  }),

  /**
   * 获取用户活动统计（新增 - 使用查询服务）
   */
  getUserActivity: adminProcedure
    .input(getUserByIdSchema.extend({
      timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
    }))
    .query(async ({ ctx, input }) => {
      const queryService = userQueryService(ctx.db);
      return await queryService.getUserActivity({
        userId: input.userId,
        timeRange: input.timeRange,
      });
    }),

  /**
   * 批量更新用户状态（新增 - 使用管理服务）
   */
  batchUpdateUserStatus: adminProcedure
    .input(z.object({
      userIds: z.array(z.string()).min(1).max(100),
      isActive: z.boolean().optional(),
      isVerified: z.boolean().optional(),
      userLevel: z.enum(['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const managementService = userManagementService(ctx.db);
      const { userIds, ...updateData } = input;

      const results = await Promise.allSettled(
        userIds.map(userId =>
          managementService.updateUser(
            { userId, ...updateData },
            ctx.session.user.id
          )
        )
      );

      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result, index) => ({
          userId: userIds[index],
          error: result.reason?.message || '更新失败',
        }));

      return {
        successful: successful.length,
        failed: failed.length,
        results: { successful, failed },
      };
    }),

  /**
   * 批量删除用户（新增 - 使用管理服务）
   */
  batchDeleteUsers: adminProcedure
    .input(z.object({
      userIds: z.array(z.string()).min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      const managementService = userManagementService(ctx.db);
      const { userIds } = input;

      const results = await Promise.allSettled(
        userIds.map(userId =>
          managementService.deleteUser(userId, ctx.session.user.id)
        )
      );

      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result, index) => ({
          userId: userIds[index],
          error: result.reason?.message || '删除失败',
        }));

      return {
        successful: successful.length,
        failed: failed.length,
        results: { successful, failed },
      };
    }),
});
