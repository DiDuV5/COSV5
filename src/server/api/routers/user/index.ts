/**
 * @fileoverview 用户路由组合文件
 * @description 组合所有用户相关的子路由，提供统一的用户API接口
 */

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { userQueriesRouter } from "./queries/user-queries";
import { searchQueriesRouter } from "./queries/search-queries";
import { followMutationsRouter } from "./mutations/follow-mutations";
import { profileMutationsRouter } from "./mutations/profile-mutations";
import { socialLinksMutationsRouter } from "./mutations/social-links-mutations";
import { getByIdSchema, publicUserSelect, getRecommendedSchema, basicUserSelect, getSocialLinksSchema, getByUsernameSchema } from "./schemas";
import { processPaginationCursor } from "./utils";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

/**
 * 用户路由 - 模块化重构版本
 *
 * 路由结构：
 * - 查询路由：用户信息、列表、统计、搜索推荐
 * - 变更路由：关注系统、资料管理、社交链接
 */
export const userRouter = createTRPCRouter({
  // 用户查询相关路由
  queries: userQueriesRouter,

  // 搜索推荐相关路由
  search: searchQueriesRouter,

  // 关注系统相关路由
  follow: followMutationsRouter,

  // 用户资料管理相关路由
  profile: profileMutationsRouter,

  // 社交链接管理相关路由
  socialLinks: socialLinksMutationsRouter,

  // 兼容性方法：直接暴露常用的查询方法
  getById: publicProcedure
    .input(getByIdSchema)
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: publicUserSelect,
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      return user;
    }),

  // 兼容性方法：根据用户名获取用户
  getByUsername: publicProcedure
    .input(getByUsernameSchema)
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { username: input.username },
        select: publicUserSelect,
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      return user;
    }),

  // 兼容性方法：获取推荐用户
  getRecommended: publicProcedure
    .input(getRecommendedSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      // 简单的推荐算法：获取活跃的创作者
      const users = await ctx.db.user.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: {
          isActive: true,
          postsCount: {
            gt: 0, // 至少发布过内容
          },
        },
        select: basicUserSelect,
        orderBy: [
          { followersCount: "desc" },
          { postsCount: "desc" },
          { createdAt: "desc" },
        ],
      });

      const { items, nextCursor } = processPaginationCursor(users, limit);

      return {
        users: items,
        nextCursor,
      };
    }),

  // 重定向到queries子路由，避免重复实现
  getDetailedStats: userQueriesRouter.getDetailedStats,

  // 兼容性方法：获取用户社交链接
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

  // 兼容性方法：检查是否关注了某个用户
  isFollowing: followMutationsRouter.isFollowing,
});
