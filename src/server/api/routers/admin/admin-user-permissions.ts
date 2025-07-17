/**
 * @fileoverview 管理员用户权限管理路由
 * @description 处理用户权限和等级管理功能
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  updateUserLevelSchema,
  batchUpdateUserLevelSchema,
} from "./admin-input-schemas";

export const adminUserPermissionsRouter = createTRPCRouter({
  /**
   * 更新用户等级（管理员）
   */
  updateUserLevel: adminProcedure
    .input(updateUserLevelSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, userLevel, canPublish, reason } = input;
      const adminId = ctx.session.user.id;

      // 检查用户是否存在
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          userLevel: true,
          canPublish: true,
        },
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      // 防止降级管理员
      if (user.userLevel === 'ADMIN' && userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden("不能降级管理员账户");
      }

      // 更新用户等级
      const updatedUser = await ctx.db.user.update({
        where: { id: userId },
        data: {
          userLevel,
          canPublish: canPublish ?? (userLevel === 'CREATOR' || userLevel === 'ADMIN'),
        },
        select: {
          id: true,
          username: true,
          userLevel: true,
          canPublish: true,
        },
      });

      // 记录等级变更日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: "UPDATE_USER_LEVEL",
          message: `更新用户等级：${user.username} (${user.userLevel} → ${userLevel})${reason ? ` - ${reason}` : ''}`,
          resource: "USER",
          resourceId: userId,
          details: JSON.stringify({
            username: user.username,
            oldLevel: user.userLevel,
            newLevel: userLevel,
            oldCanPublish: user.canPublish,
            newCanPublish: updatedUser.canPublish,
            reason,
          }),
        },
      });

      return {
        success: true,
        message: "用户等级更新成功",
        user: updatedUser,
      };
    }),

  /**
   * 批量更新用户等级（管理员）
   */
  batchUpdateUserLevel: adminProcedure
    .input(batchUpdateUserLevelSchema)
    .mutation(async ({ ctx, input }) => {
      const { userIds, userLevel, reason } = input;
      const adminId = ctx.session.user.id;

      // 获取要更新的用户
      const users = await ctx.db.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          username: true,
          userLevel: true,
          canPublish: true,
        },
      });

      if (users.length === 0) {
        throw TRPCErrorHandler.notFound("没有找到要更新的用户");
      }

      // 检查是否包含管理员账户
      const adminUsers = users.filter((user: any) => user.userLevel === 'ADMIN');
      if (adminUsers.length > 0 && userLevel !== 'ADMIN') {
        throw TRPCErrorHandler.forbidden(`不能降级管理员账户: ${adminUsers.map((u: any) => u.username).join(', ')}`);
      }

      // 批量更新用户等级
      const updateResult = await ctx.db.user.updateMany({
        where: {
          id: { in: userIds },
        },
        data: {
          userLevel,
          canPublish: userLevel === 'CREATOR' || userLevel === 'ADMIN',
        },
      });

      // 记录批量更新日志
      for (const user of users) {
        await ctx.db.auditLog.create({
          data: {
            userId: adminId,
            action: "BATCH_UPDATE_USER_LEVEL",
            message: `批量更新用户等级：${user.username} (${user.userLevel} → ${userLevel})${reason ? ` - ${reason}` : ''}`,
            resource: "USER",
            resourceId: user.id,
            details: JSON.stringify({
              username: user.username,
              oldLevel: user.userLevel,
              newLevel: userLevel,
              reason,
              batchOperation: true,
            }),
          },
        });
      }

      return {
        success: true,
        message: `成功更新 ${updateResult.count} 个用户的等级`,
        updatedCount: updateResult.count,
      };
    }),

  /**
   * 获取用户权限配置
   */
  getUserPermissions: adminProcedure
    .input(updateUserLevelSchema.pick({ userId: true }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          username: true,
          userLevel: true,
          canPublish: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
        },
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      // 获取用户的权限历史记录
      const permissionHistory = await ctx.db.auditLog.findMany({
        where: {
          resourceId: input.userId,
          action: {
            in: ["UPDATE_USER_LEVEL", "BATCH_UPDATE_USER_LEVEL", "CREATE_USER"],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          message: true,
          details: true,
          createdAt: true,
          user: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      // 定义权限级别 - 统一为CoserEden 6级权限体系
      const permissionLevels = {
        GUEST: {
          level: 0,
          name: "访客",
          permissions: ["view_public_content"],
        },
        USER: {
          level: 1,
          name: "入馆用户",
          permissions: ["view_public_content", "comment", "like", "follow"],
        },
        VIP: {
          level: 2,
          name: "VIP会员",
          permissions: ["view_public_content", "comment", "like", "follow", "view_vip_content"],
        },
        CREATOR: {
          level: 3,
          name: "荣誉创作者",
          permissions: [
            "view_public_content",
            "comment",
            "like",
            "follow",
            "view_vip_content",
            "publish_content",
            "manage_own_content",
            "bulk_upload",
          ],
        },
        ADMIN: {
          level: 4,
          name: "守馆管理员",
          permissions: [
            "view_public_content",
            "comment",
            "like",
            "follow",
            "view_vip_content",
            "publish_content",
            "manage_own_content",
            "bulk_upload",
            "manage_all_content",
            "manage_users",
            "view_admin_panel",
          ],
        },
        SUPER_ADMIN: {
          level: 5,
          name: "超级管理员",
          permissions: [
            "view_public_content",
            "comment",
            "like",
            "follow",
            "view_vip_content",
            "publish_content",
            "manage_own_content",
            "bulk_upload",
            "manage_all_content",
            "manage_users",
            "view_admin_panel",
            "system_config",
            "user_approval",
          ],
        },
      };

      const currentPermissions = permissionLevels[user.userLevel as keyof typeof permissionLevels];

      return {
        user,
        currentPermissions,
        permissionHistory,
        availableLevels: Object.entries(permissionLevels).map(([key, value]) => ({
          key,
          ...value,
        })),
      };
    }),

  /**
   * 获取权限变更统计
   */
  getPermissionChangeStats: adminProcedure.query(async ({ ctx }) => {
    // 获取最近30天的权限变更统计
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const permissionChanges = await ctx.db.auditLog.findMany({
      where: {
        action: {
          in: ["UPDATE_USER_LEVEL", "BATCH_UPDATE_USER_LEVEL"],
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
    });

    // 统计权限变更
    const stats = {
      totalChanges: permissionChanges.length,
      upgradeCount: 0,
      downgradeCount: 0,
      levelChanges: {} as Record<string, number>,
      dailyChanges: {} as Record<string, number>,
    };

    const levelOrder = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN'];

    permissionChanges.forEach((change: any) => {
      try {
        const details = JSON.parse(change.details || '{}');
        const oldLevel = details.oldLevel;
        const newLevel = details.newLevel;

        if (oldLevel && newLevel) {
          const oldIndex = levelOrder.indexOf(oldLevel);
          const newIndex = levelOrder.indexOf(newLevel);

          if (newIndex > oldIndex) {
            stats.upgradeCount++;
          } else if (newIndex < oldIndex) {
            stats.downgradeCount++;
          }

          const changeKey = `${oldLevel}_to_${newLevel}`;
          stats.levelChanges[changeKey] = (stats.levelChanges[changeKey] || 0) + 1;
        }

        // 按日期统计
        const dateKey = change.createdAt.toISOString().split('T')[0];
        stats.dailyChanges[dateKey] = (stats.dailyChanges[dateKey] || 0) + 1;
      } catch (error) {
        // 忽略解析错误
      }
    });

    return stats;
  }),
});
