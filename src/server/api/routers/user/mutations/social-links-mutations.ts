/**
 * @fileoverview 社交链接管理路由
 * @description 处理用户社交账号链接的增删改查功能
 */

import { createTRPCRouter, publicProcedure, authProcedure } from "@/server/api/trpc";
import {
  updateSocialLinksSchema,
  getSocialLinksSchema,
} from "../schemas";
import { validateSocialLinksPermission } from "../utils";

export const socialLinksMutationsRouter = createTRPCRouter({
  /**
   * 管理用户社交账号链接
   */
  updateSocialLinks: authProcedure
    .input(updateSocialLinksSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 检查用户权限
      const userConfig = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel: ctx.session.user.userLevel },
      });

      // 检查自定义链接权限
      const hasCustomLinks = input.links.some(link => link.platform === 'CUSTOM');

      validateSocialLinksPermission(
        userConfig,
        input.links.length,
        hasCustomLinks
      );

      // 删除现有的社交链接
      await ctx.db.userSocialLink.deleteMany({
        where: { userId },
      });

      // 创建新的社交链接
      if (input.links.length > 0) {
        await ctx.db.userSocialLink.createMany({
          data: input.links.map((link) => ({
            userId,
            platform: link.platform,
            username: link.username,
            url: link.url,
            isPublic: link.isPublic,
            order: link.order,
            customTitle: link.customTitle,
            customIcon: link.customIcon,
          })),
        });
      }

      return {
        success: true,
        message: "社交账号链接更新成功",
      };
    }),

  /**
   * 获取用户社交账号链接
   */
  getSocialLinks: publicProcedure
    .input(getSocialLinksSchema)
    .query(async ({ ctx, input }) => {
      // 如果是当前用户，返回所有链接
      const isCurrentUser = ctx.session?.user?.id === input.userId;

      const links = await ctx.db.userSocialLink.findMany({
        where: {
          userId: input.userId,
          ...(isCurrentUser ? {} : { isPublic: true }),
        },
        orderBy: { order: "asc" },
      });

      return links;
    }),
});
