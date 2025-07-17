/**
 * @fileoverview 罐头账户管理路由
 * @description 处理用户罐头账户信息查询和管理
 */

import { createTRPCRouter, authProcedure } from "@/server/api/trpc";

export const cansAccountRouter = createTRPCRouter({
  /**
   * 获取用户罐头账户信息
   */
  getAccount: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    let account = await ctx.db.userCansAccount.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            transactions: true,
            checkins: true,
          },
        },
      },
    });

    // 如果账户不存在，创建新账户
    if (!account) {
      account = await ctx.db.userCansAccount.create({
        data: {
          userId,
          totalCans: 0,
          availableCans: 0,
          frozenCans: 0,
          totalExperience: 0,
          dailyExperienceEarned: 0,
          dailyExperienceLimit: 100,
          totalCheckins: 0,
          consecutiveCheckins: 0,
        },
        include: {
          _count: {
            select: {
              transactions: true,
              checkins: true,
            },
          },
        },
      });
    }

    return account;
  }),

  /**
   * 获取账户余额摘要
   */
  getAccountSummary: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const account = await ctx.db.userCansAccount.findUnique({
      where: { userId },
      select: {
        totalCans: true,
        availableCans: true,
        frozenCans: true,
        totalExperience: true,
        dailyExperienceEarned: true,
        dailyExperienceLimit: true,
        totalCheckins: true,
        consecutiveCheckins: true,
        lastCheckinDate: true,
      },
    });

    if (!account) {
      // 返回默认值
      return {
        totalCans: 0,
        availableCans: 0,
        frozenCans: 0,
        totalExperience: 0,
        dailyExperienceEarned: 0,
        dailyExperienceLimit: 100,
        totalCheckins: 0,
        consecutiveCheckins: 0,
        lastCheckinDate: null,
      };
    }

    return account;
  }),

  /**
   * 获取账户详细信息（包含统计数据）
   */
  getAccountDetails: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [account, todayTransactions, weeklyStats] = await Promise.all([
      ctx.db.userCansAccount.findUnique({
        where: { userId },
        include: {
          _count: {
            select: {
              transactions: true,
              checkins: true,
            },
          },
        },
      }),
      // 今日交易统计
      ctx.db.cansTransaction.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        select: {
          amount: true,
          transactionType: true,
          sourceType: true,
        },
      }),
      // 本周统计
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // 计算今日收入和支出
    const todayEarned = todayTransactions
      .filter((t: any) => t.amount > 0)
      .reduce((sum: any, t: any) => sum + t.amount, 0);

    const todaySpent = todayTransactions
      .filter((t: any) => t.amount < 0)
      .reduce((sum: any, t: any) => sum + Math.abs(t.amount), 0);

    // 按来源类型统计今日收入
    const todayEarningsBySource = todayTransactions
      .filter((t: any) => t.amount > 0)
      .reduce((acc: any, t: any) => {
        acc[t.sourceType] = (acc[t.sourceType] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      account: account || {
        totalCans: 0,
        availableCans: 0,
        frozenCans: 0,
        totalExperience: 0,
        dailyExperienceEarned: 0,
        dailyExperienceLimit: 100,
        totalCheckins: 0,
        consecutiveCheckins: 0,
        lastCheckinDate: null,
        _count: { transactions: 0, checkins: 0 },
      },
      todayStats: {
        earned: todayEarned,
        spent: todaySpent,
        net: todayEarned - todaySpent,
        transactionCount: todayTransactions.length,
        earningsBySource: todayEarningsBySource,
      },
      weeklyStats: {
        totalAmount: weeklyStats._sum.amount || 0,
        transactionCount: weeklyStats._count.id,
      },
    };
  }),

  /**
   * 获取经验值进度信息
   */
  getExperienceProgress: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const account = await ctx.db.userCansAccount.findUnique({
      where: { userId },
      select: {
        totalExperience: true,
        dailyExperienceEarned: true,
        dailyExperienceLimit: true,
      },
    });

    if (!account) {
      return {
        totalExperience: 0,
        dailyExperienceEarned: 0,
        dailyExperienceLimit: 100,
        dailyProgress: 0,
        remainingDaily: 100,
        canEarnMore: true,
      };
    }

    const dailyProgress = account.dailyExperienceLimit > 0
      ? Math.round((account.dailyExperienceEarned / account.dailyExperienceLimit) * 100)
      : 0;

    const remainingDaily = Math.max(0, account.dailyExperienceLimit - account.dailyExperienceEarned);
    const canEarnMore = remainingDaily > 0;

    return {
      totalExperience: account.totalExperience,
      dailyExperienceEarned: account.dailyExperienceEarned,
      dailyExperienceLimit: account.dailyExperienceLimit,
      dailyProgress,
      remainingDaily,
      canEarnMore,
    };
  }),

  /**
   * 获取账户活动摘要
   */
  getActivitySummary: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCheckin, recentTransactions, taskCompletions] = await Promise.all([
      // 今日签到状态
      ctx.db.dailyCheckin.findUnique({
        where: {
          userId_checkinDate: {
            userId,
            checkinDate: today,
          },
        },
      }),
      // 最近5笔交易
      ctx.db.cansTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          transactionType: true,
          sourceType: true,
          description: true,
          createdAt: true,
        },
      }),
      // 今日任务完成情况
      ctx.db.taskCompletion.findMany({
        where: {
          userId,
          completedDate: today,
        },
        select: {
          taskType: true,
          cansEarned: true,
        },
      }),
    ]);

    const todayTaskStats = taskCompletions.reduce((acc: any, task: any) => {
      acc.count++;
      acc.cansEarned += task.cansEarned;
      return acc;
    }, { count: 0, cansEarned: 0 });

    return {
      hasCheckedInToday: !!todayCheckin,
      todayTasksCompleted: todayTaskStats.count,
      todayTaskCansEarned: todayTaskStats.cansEarned,
      recentTransactions,
      lastActivity: recentTransactions[0]?.createdAt || null,
    };
  }),
});
