/**
 * @fileoverview 罐头交易记录路由
 * @description 处理交易记录查询、分页等功能
 */

import { z } from "zod";
import { createTRPCRouter, authProcedure } from "@/server/api/trpc";
import { getTransactionsSchema } from "./schemas/cans-input-schemas";

export const cansTransactionsRouter = createTRPCRouter({
  /**
   * 获取交易记录（支持分页和游标分页）
   */
  getTransactions: authProcedure
    .input(getTransactionsSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit, cursor, type, paginationMode } = input;

      // 构建查询条件
      const where: {
        userId: string;
        amount?: { gt?: number; lt?: number };
        transactionType?: string;
        id?: { lt: string };
      } = { userId };

      if (type !== 'ALL') {
        switch (type) {
          case 'EARN':
            where.amount = { gt: 0 };
            break;
          case 'SPEND':
            where.amount = { lt: 0 };
            break;
          case 'TRANSFER':
            where.transactionType = 'TRANSFER';
            break;
        }
      }

      if (paginationMode === 'cursor' && cursor) {
        where.id = { lt: cursor };
      }

      // 执行查询
      const transactions = await ctx.db.cansTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: paginationMode === 'cursor' ? limit + 1 : limit,
        skip: paginationMode === 'page' ? (page - 1) * limit : 0,
      });

      // 处理游标分页
      let nextCursor: string | undefined = undefined;
      if (paginationMode === 'cursor' && transactions.length > limit) {
        const nextItem = transactions.pop();
        nextCursor = nextItem!.id;
      }

      // 获取总数（仅在页面分页时需要）
      let total = 0;
      if (paginationMode === 'page') {
        total = await ctx.db.cansTransaction.count({ where });
      }

      return {
        transactions,
        pagination: {
          mode: paginationMode,
          ...(paginationMode === 'page' && {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          }),
          ...(paginationMode === 'cursor' && {
            nextCursor,
            hasNext: !!nextCursor,
          }),
        },
      };
    }),

  /**
   * 获取交易统计信息
   */
  getTransactionStats: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTransactions,
      todayStats,
      weeklyStats,
      monthlyStats,
      sourceTypeStats,
    ] = await Promise.all([
      // 总交易数
      ctx.db.cansTransaction.count({ where: { userId } }),

      // 今日统计
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: today },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 本周统计
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: thisWeek },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 本月统计
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: thisMonth },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // 按来源类型统计
      ctx.db.cansTransaction.groupBy({
        by: ['sourceType'],
        where: { userId },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // 计算收入和支出
    const [todayEarned, todaySpent] = await Promise.all([
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: today },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      }),
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: today },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      }),
    ]);

    const [weeklyEarned, weeklySpent] = await Promise.all([
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: thisWeek },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      }),
      ctx.db.cansTransaction.aggregate({
        where: {
          userId,
          createdAt: { gte: thisWeek },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      total: {
        transactions: totalTransactions,
        amount: 0, // 需要单独计算总金额
      },
      today: {
        transactions: todayStats._count.id,
        amount: todayStats._sum.amount || 0,
        earned: todayEarned._sum.amount || 0,
        spent: Math.abs(todaySpent._sum.amount || 0),
      },
      weekly: {
        transactions: weeklyStats._count.id,
        amount: weeklyStats._sum.amount || 0,
        earned: weeklyEarned._sum.amount || 0,
        spent: Math.abs(weeklySpent._sum.amount || 0),
      },
      monthly: {
        transactions: monthlyStats._count.id,
        amount: monthlyStats._sum.amount || 0,
      },
      sourceTypes: sourceTypeStats.map((stat: any) => ({
        sourceType: stat.sourceType,
        count: stat._count.id,
        amount: stat._sum.amount || 0,
      })),
    };
  }),

  /**
   * 获取最近交易记录
   */
  getRecentTransactions: authProcedure
    .input(getTransactionsSchema.pick({ limit: true, cursor: true }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, cursor } = input;

      const transactions = await ctx.db.cansTransaction.findMany({
        where: {
          userId,
          ...(cursor && { id: { lt: cursor } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
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
   * 获取交易趋势数据
   */
  getTransactionTrends: authProcedure
    .input(getTransactionsSchema.pick({ limit: true }).extend({
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { days } = input;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // 按日期分组获取交易数据
      const dailyTransactions = await ctx.db.cansTransaction.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      // 处理数据，确保每天都有数据点
      const trendData: Array<{ date: string; amount: number; count: number }> = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];

        const dayData = dailyTransactions.filter((t: any) =>
          t.createdAt.toISOString().split('T')[0] === dateKey
        );

        const dayTotal = dayData.reduce((sum: any, t: any) => sum + (t._sum.amount || 0), 0);
        const dayCount = dayData.reduce((sum: any, t: any) => sum + t._count.id, 0);

        trendData.push({
          date: dateKey,
          amount: dayTotal,
          count: dayCount,
        });
      }

      return trendData;
    }),

  /**
   * 获取交易类型分布
   */
  getTransactionTypeDistribution: authProcedure
    .input(getTransactionsSchema.pick({ limit: true }).extend({
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { days } = input;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const distribution = await ctx.db.cansTransaction.groupBy({
        by: ['sourceType', 'transactionType'],
        where: {
          userId,
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
   * 搜索交易记录
   */
  searchTransactions: authProcedure
    .input(getTransactionsSchema.extend({
      search: z.string().optional(),
      sourceType: z.string().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { page, limit, search, sourceType, dateFrom, dateTo } = input;

      const where: {
        userId: string;
        description?: { contains: string };
        sourceType?: string;
        createdAt?: { gte?: Date; lte?: Date };
      } = { userId };

      if (search) {
        where.description = { contains: search };
      }

      if (sourceType) {
        where.sourceType = sourceType;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [transactions, total] = await Promise.all([
        ctx.db.cansTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        ctx.db.cansTransaction.count({ where }),
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    }),
});
