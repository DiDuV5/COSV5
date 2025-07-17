/**
 * @fileoverview 管理员统计分析路由
 * @description 处理各种统计数据查询和分析功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";

export const adminAnalyticsRouter = createTRPCRouter({
  /**
   * 获取用户增长统计
   */
  getUserGrowthStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersLast30Days,
      usersLast7Days,
      usersLast24Hours,
      activeUsersLast30Days,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      ctx.db.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      ctx.db.user.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      ctx.db.user.count({
        where: {
          lastLoginAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    // 获取每日新用户注册数据（最近30天）
    const dailyRegistrations = await ctx.db.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    // 处理每日数据
    const dailyData: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = 0;
    }

    dailyRegistrations.forEach((reg: any) => {
      const dateKey = reg.createdAt.toISOString().split('T')[0];
      if (dailyData.hasOwnProperty(dateKey)) {
        dailyData[dateKey] = reg._count.id;
      }
    });

    return {
      totalUsers,
      newUsers: {
        last30Days: usersLast30Days,
        last7Days: usersLast7Days,
        last24Hours: usersLast24Hours,
      },
      activeUsers: {
        last30Days: activeUsersLast30Days,
      },
      dailyRegistrations: dailyData,
      growthRate: {
        daily: usersLast24Hours,
        weekly: usersLast7Days,
        monthly: usersLast30Days,
      },
    };
  }),

  /**
   * 获取内容统计
   */
  getContentStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      postsLast30Days,
      postsLast7Days,
      totalComments,
      commentsLast30Days,
      totalLikes,
    ] = await Promise.all([
      ctx.db.post.count(),
      ctx.db.post.count({ where: { publishedAt: { not: null } } }),
      ctx.db.post.count({ where: { publishedAt: null } }),
      ctx.db.post.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      ctx.db.post.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      ctx.db.comment.count(),
      ctx.db.comment.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      ctx.db.like.count(),
    ]);

    // 获取热门内容
    const topPosts = await ctx.db.post.findMany({
      where: {
        publishedAt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        title: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        author: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { likeCount: 'desc' },
      take: 10,
    });

    // 获取内容类型统计
    const contentTypeStats = await ctx.db.post.groupBy({
      by: ['contentType'],
      where: { publishedAt: { not: null } },
      _count: { id: true },
    });

    // 获取可见性统计
    const visibilityStats = await ctx.db.post.groupBy({
      by: ['visibility'],
      where: { publishedAt: { not: null } },
      _count: { id: true },
    });

    return {
      posts: {
        total: totalPosts,
        published: publishedPosts,
        drafts: draftPosts,
        last30Days: postsLast30Days,
        last7Days: postsLast7Days,
      },
      comments: {
        total: totalComments,
        last30Days: commentsLast30Days,
      },
      likes: {
        total: totalLikes,
      },
      topPosts,
      contentTypeStats: contentTypeStats.map((stat: any) => ({
        type: stat.contentType,
        count: stat._count.id,
      })),
      visibilityStats: visibilityStats.map((stat: any) => ({
        visibility: stat.visibility,
        count: stat._count.id,
      })),
      engagement: {
        avgCommentsPerPost: publishedPosts > 0 ? Math.round((totalComments / publishedPosts) * 100) / 100 : 0,
        avgLikesPerPost: publishedPosts > 0 ? Math.round((totalLikes / publishedPosts) * 100) / 100 : 0,
      },
    };
  }),

  /**
   * 获取用户活跃度统计
   */
  getUserActivityStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeUsersLast30Days,
      activeUsersLast7Days,
      activeUsersLast24Hours,
      usersWithPosts,
      usersWithComments,
    ] = await Promise.all([
      ctx.db.user.count({
        where: { lastLoginAt: { gte: thirtyDaysAgo } },
      }),
      ctx.db.user.count({
        where: { lastLoginAt: { gte: sevenDaysAgo } },
      }),
      ctx.db.user.count({
        where: { lastLoginAt: { gte: oneDayAgo } },
      }),
      ctx.db.user.count({
        where: { postsCount: { gt: 0 } },
      }),
      ctx.db.user.count({
        where: {
          comments: {
            some: {},
          },
        },
      }),
    ]);

    // 获取用户等级分布
    const userLevelDistribution = await ctx.db.user.groupBy({
      by: ['userLevel'],
      _count: { id: true },
      orderBy: { userLevel: 'asc' },
    });

    // 获取最活跃用户
    const mostActiveUsers = await ctx.db.user.findMany({
      where: {
        lastLoginAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        userLevel: true,
        postsCount: true,
        followersCount: true,
        lastLoginAt: true,
      },
      orderBy: { postsCount: 'desc' },
      take: 10,
    });

    // 计算活跃度指标
    const totalUsers = await ctx.db.user.count();
    const activityRates = {
      daily: totalUsers > 0 ? Math.round((activeUsersLast24Hours / totalUsers) * 100) : 0,
      weekly: totalUsers > 0 ? Math.round((activeUsersLast7Days / totalUsers) * 100) : 0,
      monthly: totalUsers > 0 ? Math.round((activeUsersLast30Days / totalUsers) * 100) : 0,
    };

    return {
      activeUsers: {
        last30Days: activeUsersLast30Days,
        last7Days: activeUsersLast7Days,
        last24Hours: activeUsersLast24Hours,
      },
      contentCreators: {
        withPosts: usersWithPosts,
        withComments: usersWithComments,
        creatorRate: totalUsers > 0 ? Math.round((usersWithPosts / totalUsers) * 100) : 0,
      },
      userLevelDistribution: userLevelDistribution.map((level: any) => ({
        level: level.userLevel,
        count: level._count.id,
        percentage: totalUsers > 0 ? Math.round((level._count.id / totalUsers) * 100) : 0,
      })),
      mostActiveUsers,
      activityRates,
      totalUsers,
    };
  }),

  /**
   * 获取系统性能统计
   */
  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 获取数据库统计
    const [
      totalRecords,
      recentActivity,
    ] = await Promise.all([
      Promise.all([
        ctx.db.user.count(),
        ctx.db.post.count(),
        ctx.db.comment.count(),
        ctx.db.like.count(),
        ctx.db.follow.count(),
        ctx.db.auditLog.count(),
      ]).then(counts => ({
        users: counts[0],
        posts: counts[1],
        comments: counts[2],
        likes: counts[3],
        follows: counts[4],
        auditLogs: counts[5],
        total: counts.reduce((sum, count) => sum + count, 0),
      })),
      Promise.all([
        ctx.db.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
        ctx.db.post.count({ where: { createdAt: { gte: oneDayAgo } } }),
        ctx.db.comment.count({ where: { createdAt: { gte: oneDayAgo } } }),
        ctx.db.like.count({ where: { createdAt: { gte: oneDayAgo } } }),
      ]).then(counts => ({
        newUsers: counts[0],
        newPosts: counts[1],
        newComments: counts[2],
        newLikes: counts[3],
        totalActivity: counts.reduce((sum, count) => sum + count, 0),
      })),
    ]);

    // 获取存储统计（模拟数据，实际应该从文件系统或云存储获取）
    const storageStats = {
      totalFiles: 0, // 实际应该查询MediaFile表
      totalSize: 0, // 实际应该计算所有文件大小
      imageFiles: 0,
      videoFiles: 0,
      documentFiles: 0,
    };

    return {
      database: {
        totalRecords,
        recentActivity,
        tableStats: [
          { table: 'users', count: totalRecords.users },
          { table: 'posts', count: totalRecords.posts },
          { table: 'comments', count: totalRecords.comments },
          { table: 'likes', count: totalRecords.likes },
          { table: 'follows', count: totalRecords.follows },
          { table: 'audit_logs', count: totalRecords.auditLogs },
        ],
      },
      storage: storageStats,
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };
  }),
});
