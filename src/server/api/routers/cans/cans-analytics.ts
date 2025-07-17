/**
 * @fileoverview 罐头系统统计分析路由
 * @description 处理系统统计、趋势分析等功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  getTransactionTrendsSchema,
  getTransactionTypeDistributionSchema,
  getRecentTransactionsSchema,
  getAnomalousTransactionsSchema,
} from "./schemas/cans-input-schemas";

export const cansAnalyticsRouter = createTRPCRouter({
  /**
   * 获取系统统计概览（管理员）
   */
  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAccounts,
      totalTransactions,
      totalCansInCirculation,
      todayStats,
      weeklyStats,
      monthlyStats,
      userLevelDistribution,
    ] = await Promise.all([
      // 总账户数
      ctx.db.userCansAccount.count(),

      // 总交易数
      ctx.db.cansTransaction.count(),

      // 流通中的罐头总数
      ctx.db.userCansAccount.aggregate({
        _sum: { totalCans: true },
      }),

      // 今日统计
      Promise.all([
        ctx.db.cansTransaction.count({
          where: { createdAt: { gte: today } },
        }),
        ctx.db.cansTransaction.aggregate({
          where: { createdAt: { gte: today } },
          _sum: { amount: true },
        }),
        ctx.db.dailyCheckin.count({
          where: { checkinDate: today },
        }),
        ctx.db.taskCompletion.count({
          where: { completedDate: today },
        }),
      ]).then(([transactions, amount, checkins, tasks]) => ({
        transactions,
        amount: amount._sum.amount || 0,
        checkins,
        tasks,
      })),

      // 本周统计
      Promise.all([
        ctx.db.cansTransaction.count({
          where: { createdAt: { gte: thisWeek } },
        }),
        ctx.db.cansTransaction.aggregate({
          where: { createdAt: { gte: thisWeek } },
          _sum: { amount: true },
        }),
      ]).then(([transactions, amount]) => ({
        transactions,
        amount: amount._sum.amount || 0,
      })),

      // 本月统计
      Promise.all([
        ctx.db.cansTransaction.count({
          where: { createdAt: { gte: thisMonth } },
        }),
        ctx.db.cansTransaction.aggregate({
          where: { createdAt: { gte: thisMonth } },
          _sum: { amount: true },
        }),
      ]).then(([transactions, amount]) => ({
        transactions,
        amount: amount._sum.amount || 0,
      })),

      // 用户等级分布
      ctx.db.user.groupBy({
        by: ['userLevel'],
        _count: { id: true },
      }),
    ]);

    return {
      overview: {
        totalAccounts,
        totalTransactions,
        totalCansInCirculation: totalCansInCirculation._sum.totalCans || 0,
      },
      today: todayStats,
      weekly: weeklyStats,
      monthly: monthlyStats,
      userLevelDistribution: userLevelDistribution.map((item: any) => ({
        userLevel: item.userLevel,
        count: item._count.id,
      })),
    };
  }),

  /**
   * 获取交易趋势（管理员）
   */
  getTransactionTrends: adminProcedure
    .input(getTransactionTrendsSchema)
    .query(async ({ ctx, input }) => {
      const { days } = input;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // 按日期分组获取交易数据
      const dailyTransactions = await ctx.db.cansTransaction.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      // 按日期分组获取签到数据
      const dailyCheckins = await ctx.db.dailyCheckin.groupBy({
        by: ['checkinDate'],
        where: {
          checkinDate: { gte: startDate },
        },
        _count: { id: true },
        _sum: { totalCans: true },
      });

      // 按日期分组获取任务完成数据
      const dailyTasks = await ctx.db.taskCompletion.groupBy({
        by: ['completedDate'],
        where: {
          completedDate: { gte: startDate },
        },
        _count: { id: true },
        _sum: { cansEarned: true },
      });

      // 处理数据，确保每天都有数据点
      const trendData: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];

        const transactionData = dailyTransactions.filter((t: any) =>
          t.createdAt.toISOString().split('T')[0] === dateKey
        );
        const checkinData = dailyCheckins.filter((c: any) =>
          c.checkinDate.toISOString().split('T')[0] === dateKey
        );
        const taskData = dailyTasks.filter((t: any) =>
          t.completedDate.toISOString().split('T')[0] === dateKey
        );

        const transactionTotal = transactionData.reduce((sum: any, t: any) => sum + (t._sum.amount || 0), 0);
        const transactionCount = transactionData.reduce((sum: any, t: any) => sum + t._count.id, 0);
        const checkinCount = checkinData.reduce((sum: any, c: any) => sum + c._count.id, 0);
        const checkinCans = checkinData.reduce((sum: any, c: any) => sum + (c._sum.totalCans || 0), 0);
        const taskCount = taskData.reduce((sum: any, t: any) => sum + t._count.id, 0);
        const taskCans = taskData.reduce((sum: any, t: any) => sum + (t._sum.cansEarned || 0), 0);

        trendData.push({
          date: dateKey,
          transactions: {
            count: transactionCount,
            amount: transactionTotal,
          },
          checkins: {
            count: checkinCount,
            cans: checkinCans,
          },
          tasks: {
            count: taskCount,
            cans: taskCans,
          },
        });
      }

      return trendData;
    }),

  /**
   * 获取交易类型分布（管理员）
   */
  getTransactionTypeDistribution: adminProcedure
    .input(getTransactionTypeDistributionSchema)
    .query(async ({ ctx, input }) => {
      const { days } = input;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const distribution = await ctx.db.cansTransaction.groupBy({
        by: ['sourceType', 'transactionType'],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      return distribution.map((item: any) => ({
        sourceType: item.sourceType,
        transactionType: item.transactionType,
        amount: item._sum.amount || 0,
        count: item._count.id,
      }));
    }),

  /**
   * 获取最近交易记录（管理员）
   */
  getRecentTransactions: adminProcedure
    .input(getRecentTransactionsSchema)
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      const transactions = await ctx.db.cansTransaction.findMany({
        where: cursor ? { id: { lt: cursor } } : {},
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              userLevel: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (transactions.length > limit) {
        const nextItem = transactions.pop();
        nextCursor = nextItem!.id;
      }

      return {
        transactions,
        nextCursor,
      };
    }),

  /**
   * 获取异常交易（管理员）
   */
  getAnomalousTransactions: adminProcedure
    .input(getAnomalousTransactionsSchema)
    .query(async ({ ctx, input }) => {
      const { days, threshold } = input;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // 查找大额交易
      const largeTransactions = await ctx.db.cansTransaction.findMany({
        where: {
          createdAt: { gte: startDate },
          OR: [
            { amount: { gte: threshold } },
            { amount: { lte: -threshold } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              userLevel: true,
            },
          },
        },
      });

      // 查找频繁交易用户
      const frequentUsers = await ctx.db.cansTransaction.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        having: {
          id: { _count: { gte: 100 } }, // 可配置的阈值
        },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      // 获取频繁用户详情
      const frequentUserIds = frequentUsers.map((u: any) => u.userId);
      const userDetails = await ctx.db.user.findMany({
        where: { id: { in: frequentUserIds } },
        select: {
          id: true,
          username: true,
          displayName: true,
          userLevel: true,
        },
      });

      const frequentUsersWithDetails = frequentUsers.map((user: any) => {
        const details = userDetails.find((d: any) => d.id === user.userId);
        return {
          ...user,
          user: details,
        };
      });

      return {
        largeTransactions,
        frequentUsers: frequentUsersWithDetails,
      };
    }),

  /**
   * 获取用户活跃度统计（管理员）
   */
  getUserActivityStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeUsersToday,
      activeUsersWeek,
      activeUsersMonth,
      topEarners,
      topSpenders,
    ] = await Promise.all([
      // 今日活跃用户
      ctx.db.cansTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }).then((users: any) => users.length),

      // 本周活跃用户
      ctx.db.cansTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thisWeek } },
        _count: { id: true },
      }).then((users: any) => users.length),

      // 本月活跃用户
      ctx.db.cansTransaction.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thisMonth } },
        _count: { id: true },
      }).then((users: any) => users.length),

      // 收入排行榜
      ctx.db.cansTransaction.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: thisMonth },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10,
      }),

      // 支出排行榜
      ctx.db.cansTransaction.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: thisMonth },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'asc' } },
        take: 10,
      }),
    ]);

    // 获取用户详情
    const allUserIds = [...topEarners.map((u: any) => u.userId), ...topSpenders.map((u: any) => u.userId)];
    const userDetails = await ctx.db.user.findMany({
      where: { id: { in: allUserIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        userLevel: true,
      },
    });

    const topEarnersWithDetails = topEarners.map((earner: any) => {
      const user = userDetails.find((u: any) => u.id === earner.userId);
      return {
        ...earner,
        user,
      };
    });

    const topSpendersWithDetails = topSpenders.map((spender: any) => {
      const user = userDetails.find((u: any) => u.id === spender.userId);
      return {
        ...spender,
        user,
      };
    });

    return {
      activeUsers: {
        today: activeUsersToday,
        week: activeUsersWeek,
        month: activeUsersMonth,
      },
      topEarners: topEarnersWithDetails,
      topSpenders: topSpendersWithDetails,
    };
  }),
});
