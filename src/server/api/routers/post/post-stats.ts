/**
 * @fileoverview Post统计和搜索相关路由
 * @description 处理统计数据和搜索功能
 */

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  getTrendingStatsInputSchema,
  searchInputSchema,
} from "./schemas/post-input-schemas";

export const postStatsRouter = createTRPCRouter({
  /**
   * 获取首页统计数据
   */
  getHomeStats: publicProcedure.query(async ({ ctx }) => {
    const [totalPosts, totalUsers, todayPosts, activeUsers] = await Promise.all([
      ctx.db.post.count({
        where: {
          isPublic: true,
          publishedAt: { not: null },
          isDeleted: false, // 排除软删除的内容
        },
      }),
      ctx.db.user.count({
        where: {
          isActive: true,
        },
      }),
      ctx.db.post.count({
        where: {
          isPublic: true,
          publishedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          isDeleted: false, // 排除软删除的内容
        },
      }),
      ctx.db.user.count({
        where: {
          isActive: true,
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      totalPosts,
      totalUsers,
      todayPosts,
      activeUsers,
    };
  }),

  /**
   * 获取热门统计数据
   */
  getTrendingStats: publicProcedure
    .input(getTrendingStatsInputSchema)
    .query(async ({ ctx, input }) => {
      const { period } = input;

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

      const whereClause = {
        isPublic: true,
        publishedAt: { not: null },
        isDeleted: false, // 排除软删除的内容
        ...(period !== "all" && { publishedAt: dateFilter }),
      };

      const [totalPosts, totalViews, totalLikes, totalComments] = await Promise.all([
        ctx.db.post.count({ where: whereClause }),
        ctx.db.post.aggregate({
          where: whereClause,
          _sum: { viewCount: true },
        }),
        ctx.db.post.aggregate({
          where: whereClause,
          _sum: { likeCount: true },
        }),
        ctx.db.comment.count({
          where: {
            post: whereClause,
          },
        }),
      ]);

      return {
        totalPosts,
        totalViews: totalViews._sum.viewCount || 0,
        totalLikes: totalLikes._sum.likeCount || 0,
        totalComments,
      };
    }),

  /**
   * 搜索内容
   */
  search: publicProcedure
    .input(searchInputSchema)
    .query(async ({ ctx, input }) => {
      const { query, type, limit, cursor } = input;

      if (!type || type === "posts") {
        const posts = await ctx.db.post.findMany({
          take: limit + 1,
          ...(cursor && { cursor: { id: cursor } }),
          where: {
            isPublic: true,
            publishedAt: { not: null },
            isDeleted: false, // 排除软删除的内容
            OR: [
              { title: { contains: query } },
              { content: { contains: query } },
              { tags: { contains: query } },
            ],
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

        return {
          posts: posts.map((post) => ({
            ...post,
            viewCount: post.viewCount,
            likeCount: post._count.likes,
            commentCount: post._count.comments,
            media: post.media,
            author: post.author,
          })),
          nextCursor,
        };
      }

      return { posts: [], nextCursor: undefined };
    }),
});
