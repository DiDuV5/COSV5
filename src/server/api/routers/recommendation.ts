/**
 * @fileoverview 推荐系统API路由
 * @description 处理精选推荐、热门内容、个性化推荐等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.0.0
 * - zod: ^3.22.0
 * - prisma: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，实现精选推荐和简化热门算法
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
// import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";

export const recommendationRouter = createTRPCRouter({
  /**
   * 获取精选推荐内容
   */
  getFeatured: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(20).default(10),
        includeInactive: z.boolean().default(false), // 管理员可查看未激活内容
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const { limit = 10, includeInactive = false } = input;
      const now = new Date();

      // 构建查询条件
      const whereClause: any = {};

      if (!includeInactive) {
        whereClause.isActive = true;
        whereClause.OR = [
          { startDate: null },
          { startDate: { lte: now } }
        ];
        whereClause.AND = [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ];
      }

      const featuredContents = await ctx.db.featuredContent.findMany({
        where: {
          ...whereClause,
          content: {
            isDeleted: false, // 排除软删除的内容
            isPublic: true,   // 只显示公开内容
            publishedAt: { not: null }, // 只显示已发布内容
          },
        },
        include: {
          content: {
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
                orderBy: { order: 'asc' },
                take: 5,
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          },
          admin: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
        orderBy: { position: 'asc' },
        take: limit,
      });

      return featuredContents.map((featured) => ({
        id: featured.id,
        contentType: featured.contentType,
        title: featured.title || featured.content?.title,
        description: featured.description || featured.content?.excerpt,
        coverImage: featured.coverImage || featured.content?.coverImage,
        position: featured.position,
        isActive: featured.isActive,
        startDate: featured.startDate,
        endDate: featured.endDate,
        viewCount: featured.viewCount,
        clickCount: featured.clickCount,
        reason: featured.reason,
        createdAt: featured.createdAt,
        content: featured.content,
        admin: featured.admin,
      }));
    }),

  /**
   * 获取简化的热门推荐内容
   */
  getTrending: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        period: z.enum(["today", "week", "month", "all"]).default("week"),
        contentType: z.enum(["all", "POST", "MOMENT"]).default("all"),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const { limit = 20, period = "week", contentType = "all" } = input;

      // 计算时间范围
      const now = new Date();
      let dateFilter: any = {};

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

      // 构建查询条件
      const whereClause: any = {
        isPublic: true,
        publishedAt: { not: null }, // 只获取已发布的内容
        isDeleted: false, // 排除软删除的内容
      };

      if (contentType !== "all") {
        whereClause.contentType = contentType;
      }

      if (Object.keys(dateFilter).length > 0) {
        whereClause.publishedAt = dateFilter;
      }

      // 获取内容并计算简化热度分数
      const posts = await ctx.db.post.findMany({
        where: whereClause,
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
            orderBy: { order: 'asc' },
            take: 5,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        take: limit * 2, // 获取更多数据用于排序
      });

      // 计算简化热度分数并排序
      const postsWithHeatScore = posts.map((post) => {
        // 基础热度 = 点赞数 × 1 + 评论数 × 2 + 分享数 × 3 + 基础分数 1 (确保所有内容都有基础分数)
        const baseScore = (post._count.likes * 1) + (post._count.comments * 2) + (0 * 3) + 1; // 暂时分享数为0，但给所有内容基础分数1

        // 时间衰减因子
        const publishedAt = new Date(post.publishedAt || post.createdAt);
        const daysSincePublished = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

        let timeDecayFactor = 1.0;
        if (daysSincePublished <= 1) {
          timeDecayFactor = 1.0;
        } else if (daysSincePublished <= 3) {
          timeDecayFactor = 0.8;
        } else if (daysSincePublished <= 7) {
          timeDecayFactor = 0.6;
        } else if (daysSincePublished <= 30) {
          timeDecayFactor = 0.4;
        } else {
          timeDecayFactor = 0.2;
        }

        const heatScore = baseScore * timeDecayFactor;

        return {
          ...post,
          heatScore,
          baseScore,
          timeDecayFactor,
          daysSincePublished: Math.round(daysSincePublished),
        };
      });

      // 按热度分数排序，如果热度分数相同则按发布时间排序
      return postsWithHeatScore
        .sort((a, b) => {
          if (b.heatScore === a.heatScore) {
            // 热度分数相同时，按发布时间倒序排序
            return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
          }
          return b.heatScore - a.heatScore;
        })
        .slice(0, limit);
    }),

  /**
   * 获取近期发布内容 (简化版)
   */
  getRecent: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
        contentType: z.enum(["all", "POST", "MOMENT"]).default("all"),
      }).optional().default({})
    )
    .query(async ({ ctx, input }) => {
      const { limit = 20, cursor, contentType = "all" } = input;

      // 构建查询条件
      const whereClause: any = {
        isPublic: true,
        publishedAt: { not: null }, // 只获取已发布的内容
        isDeleted: false, // 排除软删除的内容
      };

      if (contentType !== "all") {
        whereClause.contentType = contentType;
      }

      const posts = await ctx.db.post.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: whereClause,
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
            orderBy: { order: 'asc' },
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
        posts,
        nextCursor,
      };
    }),

  /**
   * 更新精选内容点击统计
   */
  updateFeaturedClick: publicProcedure
    .input(
      z.object({
        featuredId: z.string(),
        type: z.enum(["view", "click"]).default("click"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { featuredId, type } = input;

      const updateData: any = {};
      if (type === "view") {
        updateData.viewCount = { increment: 1 };
      } else {
        updateData.clickCount = { increment: 1 };
      }

      await ctx.db.featuredContent.update({
        where: { id: featuredId },
        data: updateData,
      });

      return { success: true };
    }),

  /**
   * 管理员：添加精选内容
   */
  addFeatured: adminProcedure
    .input(
      z.object({
        contentId: z.string().optional(),
        contentType: z.enum(["POST", "ANNOUNCEMENT", "TUTORIAL"]),
        title: z.string().optional(),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        position: z.number().default(0),
        isActive: z.boolean().default(true),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;

      const featuredContent = await ctx.db.featuredContent.create({
        data: {
          ...input,
          adminId,
        },
        include: {
          content: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          admin: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      return featuredContent;
    }),

  /**
   * 管理员：更新精选内容
   */
  updateFeatured: adminProcedure
    .input(
      z.object({
        id: z.string(),
        contentId: z.string().optional(),
        contentType: z.enum(["POST", "ANNOUNCEMENT", "TUTORIAL"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        coverImage: z.string().optional(),
        position: z.number().optional(),
        isActive: z.boolean().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const featuredContent = await ctx.db.featuredContent.update({
        where: { id },
        data: updateData,
        include: {
          content: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          admin: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      return featuredContent;
    }),

  /**
   * 管理员：删除精选内容
   */
  deleteFeatured: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.featuredContent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
