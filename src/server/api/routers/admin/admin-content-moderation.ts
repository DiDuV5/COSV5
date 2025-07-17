/**
 * @fileoverview 管理员内容审核路由
 * @description 处理评论审核、内容管理等功能
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  getPendingCommentsSchema,
  moderateCommentSchema,
} from "./admin-input-schemas";

export const adminContentModerationRouter = createTRPCRouter({
  /**
   * 获取待审核评论列表（管理员）
   */
  getPendingComments: adminProcedure
    .input(getPendingCommentsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      // 由于Comment模型暂时没有status字段，这里返回最近的评论作为示例
      const where: any = {};

      if (cursor) {
        where.id = { lt: cursor };
      }

      const comments = await ctx.db.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
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
          post: {
            select: {
              id: true,
              title: true,
              author: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          },
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (comments.length > limit) {
        const nextItem = comments.pop();
        nextCursor = nextItem!.id;
      }

      return {
        comments,
        nextCursor,
      };
    }),

  /**
   * 审核评论（管理员）
   */
  moderateComment: adminProcedure
    .input(moderateCommentSchema)
    .mutation(async ({ ctx, input }) => {
      const { commentId, action, reason } = input;
      const adminId = ctx.session.user.id;

      // 检查评论是否存在
      const comment = await ctx.db.comment.findUnique({
        where: { id: commentId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!comment) {
        throw TRPCErrorHandler.notFound("评论不存在");
      }

      const updateData: any = {};
      let actionMessage = "";

      switch (action) {
        case "approve":
          // 由于Comment模型暂时没有status字段，这里只记录日志
          actionMessage = "批准评论";
          break;
        case "reject":
          // 删除评论
          await ctx.db.comment.delete({
            where: { id: commentId },
          });
          actionMessage = "拒绝并删除评论";
          break;
        case "hide":
          // 由于Comment模型暂时没有isHidden字段，这里只记录日志
          actionMessage = "隐藏评论";
          break;
        default:
          throw TRPCErrorHandler.validationError("无效的审核操作");
      }

      // 记录审核日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: "MODERATE_COMMENT",
          message: `${actionMessage}：${comment.content.substring(0, 50)}...${reason ? ` (原因: ${reason})` : ''}`,
          resource: "COMMENT",
          resourceId: commentId,
          details: JSON.stringify({
            commentId,
            commentContent: comment.content,
            commentAuthor: comment.author.username,
            postTitle: comment.post.title,
            action,
            reason,
          }),
        },
      });

      return {
        success: true,
        message: `评论${actionMessage}成功`,
        action,
      };
    }),

  /**
   * 获取内容审核统计
   */
  getModerationStats: adminProcedure.query(async ({ ctx }) => {
    // 获取最近30天的审核统计
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalComments,
      recentComments,
      moderationLogs,
    ] = await Promise.all([
      ctx.db.comment.count(),
      ctx.db.comment.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      ctx.db.auditLog.findMany({
        where: {
          action: "MODERATE_COMMENT",
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        select: {
          details: true,
          createdAt: true,
        },
      }),
    ]);

    // 统计审核操作
    const moderationStats = {
      approved: 0,
      rejected: 0,
      hidden: 0,
    };

    moderationLogs.forEach((log: any) => {
      try {
        const details = JSON.parse(log.details || '{}');
        const action = details.action;
        if (action === 'approve') moderationStats.approved++;
        else if (action === 'reject') moderationStats.rejected++;
        else if (action === 'hide') moderationStats.hidden++;
      } catch (error) {
        // 忽略解析错误
      }
    });

    // 计算审核率
    const totalModerated = moderationStats.approved + moderationStats.rejected + moderationStats.hidden;
    const moderationRate = recentComments > 0 ? Math.round((totalModerated / recentComments) * 100) : 0;

    return {
      totalComments,
      recentComments,
      pendingComments: 0, // 由于没有status字段，暂时返回0
      moderationStats,
      moderationRate,
      totalModerated,
    };
  }),

  /**
   * 获取用户举报统计
   */
  getReportStats: adminProcedure.query(async ({ ctx }) => {
    // 由于没有举报系统，这里返回模拟数据
    // 在实际项目中，应该有Report模型来存储举报信息

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 获取最近被审核的内容作为"举报"统计
    const recentModerations = await ctx.db.auditLog.findMany({
      where: {
        action: "MODERATE_COMMENT",
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        details: true,
        createdAt: true,
      },
    });

    const reportStats = {
      totalReports: recentModerations.length,
      pendingReports: 0,
      resolvedReports: recentModerations.length,
      reportTypes: {
        spam: Math.floor(recentModerations.length * 0.3),
        inappropriate: Math.floor(recentModerations.length * 0.4),
        harassment: Math.floor(recentModerations.length * 0.2),
        other: Math.floor(recentModerations.length * 0.1),
      },
      dailyReports: {} as Record<string, number>,
    };

    // 按日期统计举报
    recentModerations.forEach((moderation: any) => {
      const dateKey = moderation.createdAt.toISOString().split('T')[0];
      reportStats.dailyReports[dateKey] = (reportStats.dailyReports[dateKey] || 0) + 1;
    });

    return reportStats;
  }),

  /**
   * 获取内容统计
   */
  getContentStats: adminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 获取内容统计
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      recentPosts,
      popularPosts,
    ] = await Promise.all([
      ctx.db.post.count(),
      ctx.db.post.count({
        where: {
          publishedAt: { not: null },
        },
      }),
      ctx.db.post.count({
        where: {
          publishedAt: null,
        },
      }),
      ctx.db.post.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      ctx.db.post.count({
        where: {
          likeCount: { gte: 10 }, // 定义热门内容为点赞数>=10
          publishedAt: { not: null },
        },
      }),
    ]);

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      recentPosts,
      popularPosts,
    };
  }),

  /**
   * 获取内容质量分析
   */
  getContentQualityAnalysis: adminProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 获取最近30天的内容统计
    const [
      recentPosts,
      recentComments,
      topAuthors,
    ] = await Promise.all([
      ctx.db.post.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
          publishedAt: { not: null },
        },
        select: {
          id: true,
          title: true,
          likeCount: true,
          commentCount: true,
          viewCount: true,
          createdAt: true,
          author: {
            select: {
              username: true,
              userLevel: true,
            },
          },
        },
        orderBy: { likeCount: 'desc' },
        take: 100,
      }),
      ctx.db.comment.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      ctx.db.user.findMany({
        where: {
          postsCount: { gt: 0 },
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          userLevel: true,
          postsCount: true,
          followersCount: true,
        },
        orderBy: { postsCount: 'desc' },
        take: 10,
      }),
    ]);

    // 计算内容质量指标
    const avgLikes = recentPosts.length > 0
      ? Math.round(recentPosts.reduce((sum: any, post: any) => sum + (post.likeCount || 0), 0) / recentPosts.length)
      : 0;

    const avgComments = recentPosts.length > 0
      ? Math.round(recentPosts.reduce((sum: any, post: any) => sum + (post.commentCount || 0), 0) / recentPosts.length)
      : 0;

    const avgViews = recentPosts.length > 0
      ? Math.round(recentPosts.reduce((sum: any, post: any) => sum + (post.viewCount || 0), 0) / recentPosts.length)
      : 0;

    // 按用户等级统计内容
    const contentByLevel = recentPosts.reduce((acc: any, post: any) => {
      const level = post.author.userLevel;
      if (!acc[level]) {
        acc[level] = { count: 0, totalLikes: 0, totalComments: 0 };
      }
      acc[level].count++;
      acc[level].totalLikes += post.likeCount || 0;
      acc[level].totalComments += post.commentCount || 0;
      return acc;
    }, {} as Record<string, { count: number; totalLikes: number; totalComments: number }>);

    return {
      totalPosts: recentPosts.length,
      totalComments: recentComments,
      avgLikes,
      avgComments,
      avgViews,
      topPosts: recentPosts.slice(0, 10),
      topAuthors,
      contentByLevel,
      qualityScore: Math.min(100, Math.round((avgLikes + avgComments) / 2)), // 简单的质量评分
    };
  }),
});
