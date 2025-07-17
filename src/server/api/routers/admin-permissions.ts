/**
 * @fileoverview 管理员权限管理路由
 * @description 提供权限同步、检查、修复等管理功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.0.0
 * - zod: ^3.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，权限管理API
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  syncUserPermissions,
  checkPermissionIntegrity,
  initializeMissingConfigs,
  fixAllPermissions
} from "@/lib/sync-permissions";

export const adminPermissionsRouter = createTRPCRouter({
  /**
   * 检查权限配置完整性
   */
  checkIntegrity: adminProcedure
    .query(async () => {
      return await checkPermissionIntegrity();
    }),

  /**
   * 同步用户权限
   */
  syncPermissions: adminProcedure
    .mutation(async () => {
      return await syncUserPermissions();
    }),

  /**
   * 初始化缺失的权限配置
   */
  initializeMissingConfigs: adminProcedure
    .input(z.object({
      userLevels: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      return await initializeMissingConfigs(input.userLevels);
    }),

  /**
   * 完整的权限修复流程
   */
  fixAllPermissions: adminProcedure
    .mutation(async () => {
      return await fixAllPermissions();
    }),

  /**
   * 获取权限配置概览
   */
  getPermissionOverview: adminProcedure
    .query(async ({ ctx }) => {
      // 获取所有用户等级统计
      const userLevelStats = await ctx.db.user.groupBy({
        by: ['userLevel'],
        _count: {
          id: true,
        },
        orderBy: {
          userLevel: 'asc',
        },
      });

      // 获取所有权限配置
      const permissionConfigs = await ctx.db.userPermissionConfig.findMany({
        orderBy: {
          userLevel: 'asc',
        },
      });

      // 获取权限不一致的用户数量
      const users = await ctx.db.user.findMany({
        select: {
          userLevel: true,
          canPublish: true,
        },
      });

      const configMap = new Map(
        permissionConfigs.map((config: any) => [config.userLevel, config])
      );

      let inconsistentCount = 0;
      for (const user of users) {
        const config = configMap.get(user.userLevel);
        if (config) {
          const shouldCanPublish = (config as any).canPublishPosts || (config as any).canPublishMoments;
          if (user.canPublish !== shouldCanPublish) {
            inconsistentCount++;
          }
        }
      }

      return {
        userLevelStats,
        permissionConfigs,
        inconsistentCount,
        totalUsers: users.length,
      };
    }),

  /**
   * 获取特定用户的权限详情
   */
  getUserPermissionDetails: adminProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          username: true,
          email: true,
          userLevel: true,
          canPublish: true,
          isActive: true,
          isVerified: true,
        },
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      const permissionConfig = await ctx.db.userPermissionConfig.findUnique({
        where: { userLevel: user.userLevel },
      });

      return {
        user,
        permissionConfig,
        isConsistent: permissionConfig ?
          user.canPublish === (permissionConfig.canPublishPosts || permissionConfig.canPublishMoments) :
          false,
      };
    }),

  /**
   * 手动更新用户权限
   */
  updateUserPermission: adminProcedure
    .input(z.object({
      userId: z.string(),
      canPublish: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.db.user.update({
        where: { id: input.userId },
        data: { canPublish: input.canPublish },
        select: {
          id: true,
          username: true,
          canPublish: true,
          userLevel: true,
        },
      });

      return {
        success: true,
        user: updatedUser,
        message: `用户 ${updatedUser.username} 的发布权限已更新为 ${input.canPublish ? '开启' : '关闭'}`,
      };
    }),

  /**
   * 批量更新用户权限
   */
  batchUpdatePermissions: adminProcedure
    .input(z.object({
      userLevel: z.string(),
      canPublish: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.user.updateMany({
        where: { userLevel: input.userLevel },
        data: { canPublish: input.canPublish },
      });

      return {
        success: true,
        updatedCount: result.count,
        message: `已更新 ${result.count} 个 ${input.userLevel} 等级用户的发布权限`,
      };
    }),
});
