/**
 * @fileoverview Comment统计相关的 tRPC 路由
 * @description 处理评论统计数据查询功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";

export const commentStatsRouter = createTRPCRouter({
  /**
   * 获取全局评论统计数据（管理员）
   */
  getGlobalStats: adminProcedure
    .query(async ({ ctx }) => {
      // 获取基础统计数据
      const [
        totalComments,
        pendingComments,
        approvedComments,
        rejectedComments,
        deletedComments,
        guestComments,
        userComments,
        totalLikes,
        totalReplies,
      ] = await Promise.all([
        // 总评论数
        ctx.db.comment.count(),

        // 待审核评论数
        ctx.db.comment.count({
          where: { status: "PENDING", isDeleted: false },
        }),

        // 已审核通过评论数
        ctx.db.comment.count({
          where: { status: "APPROVED", isDeleted: false },
        }),

        // 已拒绝评论数
        ctx.db.comment.count({
          where: { status: "REJECTED", isDeleted: false },
        }),

        // 已删除评论数
        ctx.db.comment.count({
          where: { isDeleted: true },
        }),

        // 游客评论数
        ctx.db.comment.count({
          where: { authorId: null, isDeleted: false },
        }),

        // 注册用户评论数
        ctx.db.comment.count({
          where: { authorId: { not: null }, isDeleted: false },
        }),

        // 总点赞数
        ctx.db.commentLike.count(),

        // 总回复数
        ctx.db.comment.count({
          where: { parentId: { not: null }, isDeleted: false },
        }),
      ]);

      // 获取今日统计
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        todayComments,
        todayPendingComments,
        todayApprovedComments,
        todayRejectedComments,
        todayLikes,
      ] = await Promise.all([
        // 今日评论数
        ctx.db.comment.count({
          where: {
            createdAt: { gte: today, lt: tomorrow },
            isDeleted: false,
          },
        }),

        // 今日待审核评论数
        ctx.db.comment.count({
          where: {
            createdAt: { gte: today, lt: tomorrow },
            status: "PENDING",
            isDeleted: false,
          },
        }),

        // 今日审核通过评论数
        ctx.db.comment.count({
          where: {
            reviewedAt: { gte: today, lt: tomorrow },
            status: "APPROVED",
            isDeleted: false,
          },
        }),

        // 今日拒绝评论数
        ctx.db.comment.count({
          where: {
            reviewedAt: { gte: today, lt: tomorrow },
            status: "REJECTED",
            isDeleted: false,
          },
        }),

        // 今日点赞数
        ctx.db.commentLike.count({
          where: {
            createdAt: { gte: today, lt: tomorrow },
          },
        }),
      ]);

      // 获取最近7天的评论趋势
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const weeklyTrend = await ctx.db.comment.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: sevenDaysAgo },
          isDeleted: false,
        },
        _count: {
          id: true,
        },
      });

      // 按日期分组统计
      const dailyStats: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyStats[dateStr] = 0;
      }

      weeklyTrend.forEach((item: any) => {
        const dateStr = item.createdAt.toISOString().split('T')[0];
        if (dailyStats[dateStr] !== undefined) {
          dailyStats[dateStr] += item._count.id;
        }
      });

      // 获取用户组评论分布
      const userLevelStats = await ctx.db.comment.groupBy({
        by: ['authorId'],
        where: {
          authorId: { not: null },
          isDeleted: false,
        },
        _count: {
          id: true,
        },
      });

      // 获取用户等级信息
      const userIds = userLevelStats.map((stat: any) => stat.authorId!);
      const users = await ctx.db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, userLevel: true },
      });

      const levelDistribution: Record<string, number> = {};
      userLevelStats.forEach((stat: any) => {
        const user = users.find((u: any) => u.id === stat.authorId);
        const level = user?.userLevel || 'UNKNOWN';
        levelDistribution[level] = (levelDistribution[level] || 0) + stat._count.id;
      });

      // 添加游客评论
      levelDistribution['GUEST'] = guestComments;

      // 获取热门评论（按点赞数排序）
      const hotComments = await ctx.db.comment.findMany({
        where: {
          isDeleted: false,
          status: "APPROVED",
          likeCount: { gt: 0 },
        },
        orderBy: { likeCount: 'desc' },
        take: 10,
        include: {
          author: {
            select: {
              username: true,
              displayName: true,
            },
          },
          post: {
            select: {
              title: true,
              contentType: true,
            },
          },
        },
      });

      // 获取最活跃的评论者
      const activeCommenters = await ctx.db.comment.groupBy({
        by: ['authorId'],
        where: {
          authorId: { not: null },
          isDeleted: false,
          createdAt: { gte: sevenDaysAgo },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      const commenterIds = activeCommenters.map((c: any) => c.authorId!);
      const commenters = await ctx.db.user.findMany({
        where: { id: { in: commenterIds } },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          userLevel: true,
        },
      });

      const activeCommentersWithInfo = activeCommenters.map((stat: any) => {
        const user = commenters.find((u: any) => u.id === stat.authorId);
        return {
          user,
          commentCount: stat._count.id,
        };
      });

      return {
        // 基础统计
        total: {
          comments: totalComments,
          pending: pendingComments,
          approved: approvedComments,
          rejected: rejectedComments,
          deleted: deletedComments,
          guest: guestComments,
          user: userComments,
          likes: totalLikes,
          replies: totalReplies,
        },

        // 今日统计
        today: {
          comments: todayComments,
          pending: todayPendingComments,
          approved: todayApprovedComments,
          rejected: todayRejectedComments,
          likes: todayLikes,
        },

        // 趋势数据
        weeklyTrend: Object.entries(dailyStats).map(([date, count]) => ({
          date,
          count,
        })),

        // 用户组分布
        levelDistribution,

        // 热门评论
        hotComments: hotComments.map((comment: any) => ({
          id: comment.id,
          content: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
          likeCount: comment.likeCount,
          author: comment.author,
          post: comment.post,
          createdAt: comment.createdAt,
        })),

        // 活跃评论者
        activeCommenters: activeCommentersWithInfo,
      };
    }),
});
