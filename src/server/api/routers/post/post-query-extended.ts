/**
 * @fileoverview Post查询扩展路由
 * @description 处理推荐、热门、搜索等高级查询功能
 */

import { createTRPCRouter, publicProcedure, authProcedure } from "@/server/api/trpc";
import {
  getRecommendedInputSchema,
  getFollowingInputSchema,
  getTrendingInputSchema,
  getLatestInputSchema,
  getInfiniteInputSchema,
} from "./schemas/post-input-schemas";

export const postQueryExtendedRouter = createTRPCRouter({
  /**
   * 获取推荐内容
   */
  getRecommended: publicProcedure
    .input(getRecommendedInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit = 10, cursor } = input;

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: {
          isPublic: true,
          publishedAt: { not: null },
          isDeleted: false, // 排除软删除的帖子
          likeCount: {
            gte: 1,
          },
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          media: {
            orderBy: { order: "asc" },
            take: 5,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: [
          { likeCount: "desc" },
          { publishedAt: "desc" },
        ],
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return posts.map((post) => ({
        ...post,
        viewCount: post.viewCount,
      }));
    }),

  /**
   * 获取关注用户的内容
   */
  getFollowing: authProcedure
    .input(getFollowingInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const userId = ctx.session.user.id;

      const followings = await ctx.db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });

      const followingIds = followings.map((f: any) => f.followingId);

      if (followingIds.length === 0) {
        return [];
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: {
          authorId: { in: followingIds },
          isPublic: true,
          publishedAt: { not: null },
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          media: {
            orderBy: { order: "asc" },
            take: 5,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return posts.map((post: any) => ({
        ...post,
        viewCount: post.viewCount,
      }));
    }),

  /**
   * 获取热门内容
   */
  getTrending: publicProcedure
    .input(getTrendingInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit, period, cursor } = input;

      let dateFilter: any = {};
      const now = new Date();

      if (period === "today") {
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        dateFilter = { gte: today };
      } else if (period === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = { gte: weekAgo };
      } else if (period === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = { gte: monthAgo };
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: {
          isPublic: true,
          publishedAt: { not: null },
          isDeleted: false, // 排除软删除的帖子
          ...(period !== "all" && { publishedAt: dateFilter }),
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          media: {
            orderBy: { order: "asc" },
            take: 5,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: [
          { likeCount: "desc" },
          { viewCount: "desc" },
          { publishedAt: "desc" },
        ],
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return posts.map((post) => ({
        ...post,
        viewCount: post.viewCount,
        trendingScore: (post.likeCount * 2) + (post.viewCount * 0.1) + (post._count.comments * 3),
      }));
    }),

  /**
   * 获取最新内容
   */
  getLatest: publicProcedure
    .input(getLatestInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, type } = input;

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: {
          isPublic: true,
          publishedAt: { not: null },
          isDeleted: false, // 排除软删除的帖子
          ...(type !== "all" && { contentType: type }),
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          media: {
            orderBy: { order: "asc" },
            take: 5,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return posts.map((post) => ({
        ...post,
        viewCount: post.viewCount,
      }));
    }),

  /**
   * 获取无限滚动内容列表
   */
  getInfinite: publicProcedure
    .input(getInfiniteInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor, type, sortBy } = input;

      let orderBy: any = { publishedAt: "desc" };
      if (sortBy === "popular") {
        orderBy = { likeCount: "desc" };
      } else if (sortBy === "trending") {
        orderBy = [
          { likeCount: "desc" },
          { viewCount: "desc" },
          { publishedAt: "desc" },
        ];
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor } }),
        where: {
          isPublic: true,
          publishedAt: { not: null },
          isDeleted: false, // 排除软删除的帖子
          ...(type !== "all" && { contentType: type }),
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          media: {
            orderBy: { order: "asc" },
            take: 5,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy,
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts: posts.map((post) => ({
          ...post,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          viewCount: post.viewCount,
          media: post.media,
        })),
        nextCursor,
      };
    }),
});
