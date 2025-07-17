/**
 * @fileoverview Post管理查询和统计相关的tRPC路由
 * @description 处理已删除内容查询和统计功能
 */

import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";

export const postAdminQueryRouter = createTRPCRouter({
  /**
   * 管理员：获取已删除的内容列表
   */
  getDeletedPosts: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      search: z.string().optional(),
      authorId: z.string().optional(),
      deletedBy: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor, search, authorId, deletedBy } = input;

      // 构建查询条件
      const where: any = {
        isDeleted: true, // 只查询已删除的内容
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (authorId) {
        where.authorId = authorId;
      }

      if (deletedBy) {
        where.deletedBy = deletedBy;
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              mediaType: true,
              filename: true,
            },
            take: 3, // 只显示前3个媒体文件
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          deletedAt: 'desc', // 按删除时间倒序
        },
      });

      let nextCursor: string | undefined = undefined;
      if (posts.length > limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return {
        posts: posts.map((post: any) => ({
          ...post,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
        })),
        nextCursor,
      };
    }),

  /**
   * 管理员：获取删除统计信息
   */
  getDeletedStats: adminProcedure
    .query(async ({ ctx }) => {
      const [
        totalDeleted,
        deletedToday,
        deletedThisWeek,
        deletedThisMonth,
        deletedByType,
        topDeleters,
      ] = await Promise.all([
        // 总删除数
        ctx.db.post.count({
          where: { isDeleted: true },
        }),

        // 今日删除数
        ctx.db.post.count({
          where: {
            isDeleted: true,
            deletedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),

        // 本周删除数
        ctx.db.post.count({
          where: {
            isDeleted: true,
            deletedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // 本月删除数
        ctx.db.post.count({
          where: {
            isDeleted: true,
            deletedAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),

        // 按内容类型分组的删除统计
        ctx.db.post.groupBy({
          by: ['contentType'],
          where: { isDeleted: true },
          _count: { id: true },
        }),

        // 删除操作最多的用户
        ctx.db.post.groupBy({
          by: ['deletedBy'],
          where: {
            isDeleted: true,
            deletedBy: { not: null },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),
      ]);

      return {
        totalDeleted,
        deletedToday,
        deletedThisWeek,
        deletedThisMonth,
        deletedByType: deletedByType.map((item: any) => ({
          type: item.contentType,
          count: item._count.id,
        })),
        topDeleters: topDeleters.map((item: any) => ({
          userId: item.deletedBy,
          count: item._count.id,
        })),
      };
    }),
});
