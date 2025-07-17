/**
 * @fileoverview 用户资料管理路由
 * @description 处理用户资料更新、头像上传、隐私设置等功能
 */

import { createTRPCRouter, authProcedure } from "@/server/api/trpc";
import { TransactionManager } from "@/lib/transaction-manager";
import {
  updatePrivacySettingsSchema,
  updateProfileSchema,
  updateAvatarSchema,
} from "../schemas";
import { filterUndefinedValues } from "../utils";
import { UserAvatarService } from "../services";

export const profileMutationsRouter = createTRPCRouter({
  /**
   * 更新用户隐私设置
   */
  updatePrivacySettings: authProcedure
    .input(updatePrivacySettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 过滤掉undefined值
      const updateData = filterUndefinedValues(input);

      const updatedUser = await ctx.db.user.update({
        where: { id: userId },
        data: updateData as any,
        select: {
          id: true,
          profileVisibility: true,
          showVisitorHistory: true,
          showSocialLinks: true,
          allowDirectMessages: true,
        },
      });

      return {
        success: true,
        message: "隐私设置更新成功",
        settings: updatedUser,
      };
    }),

  /**
   * 更新用户资料（使用事务保护）
   */
  updateProfile: authProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 使用事务确保数据一致性
      const result = await TransactionManager.executeTransaction(async (tx) => {
        // 更新用户资料
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            ...input,
            website: input.website === "" ? null : input.website,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            location: true,
            website: true,
            profileVisibility: true,
            showVisitorHistory: true,
            showSocialLinks: true,
            allowDirectMessages: true,
          },
        });

        // 记录审计日志
        await tx.auditLog.create({
          data: {
            action: 'USER_PROFILE_UPDATE',
            userId: userId,
            message: `用户 ${ctx.session.user.username} 更新了个人资料`,
            level: 'INFO',
            ipAddress: ctx.req?.ip || 'unknown',
            userAgent: ctx.req?.headers['user-agent'] || 'unknown',
          },
        });

        return updatedUser;
      }, {
        maxRetries: 2,
        timeout: 10000,
        transactionId: `profile_update_${userId}`,
      });

      if (!result.success) {
        throw new Error(result.error || '更新用户资料失败');
      }

      return result.data;
    }),

  /**
   * 更新用户头像
   */
  updateAvatar: authProcedure
    .input(updateAvatarSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { avatarData, filename } = input;

      return await UserAvatarService.updateAvatar(
        ctx.db,
        userId,
        avatarData,
        filename
      );
    }),
});
