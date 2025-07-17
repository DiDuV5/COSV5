/**
 * @fileoverview 罐头签到系统路由
 * @description 处理每日签到、签到历史等功能
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, authProcedure } from "@/server/api/trpc";
import {
  checkAndResetUserExperience,
  calculateExperienceReward,
} from "@/lib/experience-utils";
import { getCheckinHistorySchema } from "./schemas/cans-input-schemas";
import { calculateConsecutiveBonus, getTodayDate, getYesterdayDate } from "./utils/cans-utils";

export const cansCheckinRouter = createTRPCRouter({
  /**
   * 每日签到
   */
  dailyCheckin: authProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const today = getTodayDate();

    // 检查今日是否已签到
    const existingCheckin = await ctx.db.dailyCheckin.findUnique({
      where: {
        userId_checkinDate: {
          userId,
          checkinDate: today,
        },
      },
    });

    if (existingCheckin) {
      throw TRPCErrorHandler.validationError("今日已完成签到，明天再来获取更多罐头吧！每日签到可获得丰厚奖励，连续签到还有额外惊喜哦～");
    }

    // 获取或创建用户罐头账户
    let account = await ctx.db.userCansAccount.findUnique({
      where: { userId },
    });

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
      });
    }

    // 计算连续签到天数
    const yesterday = getYesterdayDate();

    const yesterdayCheckin = await ctx.db.dailyCheckin.findUnique({
      where: {
        userId_checkinDate: {
          userId,
          checkinDate: yesterday,
        },
      },
    });

    const consecutiveDays = yesterdayCheckin ? account.consecutiveCheckins + 1 : 1;

    // 计算奖励罐头
    const baseCans = 10; // 基础签到奖励
    const bonusCans = calculateConsecutiveBonus(consecutiveDays);
    const totalCans = baseCans + bonusCans;

    // 使用事务处理签到
    const result = await ctx.db.$transaction(async (tx: any) => {
      // 检查并重置经验值（如果需要）
      const experienceStatus = await checkAndResetUserExperience(tx, userId);
      const currentDailyEarned = experienceStatus?.dailyExperienceEarned || account!.dailyExperienceEarned;
      const dailyLimit = experienceStatus?.dailyExperienceLimit || account!.dailyExperienceLimit;

      // 计算经验值奖励
      const experienceReward = calculateExperienceReward(totalCans, currentDailyEarned, dailyLimit, 1.0);

      // 创建签到记录
      const checkin = await tx.dailyCheckin.create({
        data: {
          userId,
          accountId: account!.id,
          checkinDate: today,
          consecutiveDays,
          cansEarned: baseCans,
          bonusCans,
          totalCans,
        },
      });

      // 更新账户信息
      const updatedAccount = await tx.userCansAccount.update({
        where: { id: account!.id },
        data: {
          totalCans: { increment: totalCans },
          availableCans: { increment: totalCans },
          totalCheckins: { increment: 1 },
          consecutiveCheckins: consecutiveDays,
          lastCheckinDate: today,
          totalExperience: { increment: experienceReward },
          dailyExperienceEarned: { increment: experienceReward },
        },
      });

      // 创建交易记录
      await tx.cansTransaction.create({
        data: {
          userId,
          accountId: account!.id,
          transactionType: 'EARN',
          amount: totalCans,
          sourceType: 'DAILY_SIGNIN',
          sourceId: checkin.id,
          description: `每日签到奖励 (连续${consecutiveDays}天)`,
          experienceEarned: experienceReward,
        },
      });

      return { checkin, account: updatedAccount };
    });

    return {
      success: true,
      cansEarned: totalCans,
      baseCans,
      bonusCans,
      consecutiveDays,
      totalCans: result.account.totalCans,
      message: `签到成功！获得 ${totalCans} 个罐头 (连续签到 ${consecutiveDays} 天)`,
    };
  }),

  /**
   * 获取签到状态
   */
  getCheckinStatus: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const today = getTodayDate();

    // 检查今日是否已签到
    const todayCheckin = await ctx.db.dailyCheckin.findUnique({
      where: {
        userId_checkinDate: {
          userId,
          checkinDate: today,
        },
      },
    });

    // 获取账户信息
    const account = await ctx.db.userCansAccount.findUnique({
      where: { userId },
    });

    return {
      hasCheckedInToday: !!todayCheckin,
      consecutiveCheckins: account?.consecutiveCheckins || 0,
      totalCheckins: account?.totalCheckins || 0,
      lastCheckinDate: account?.lastCheckinDate,
      todayCheckin,
    };
  }),

  /**
   * 获取签到历史
   */
  getCheckinHistory: authProcedure
    .input(getCheckinHistorySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, cursor } = input;

      const checkins = await ctx.db.dailyCheckin.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: { userId },
        orderBy: { checkinDate: 'desc' },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (checkins.length > limit) {
        const nextItem = checkins.pop();
        nextCursor = nextItem!.id;
      }

      return {
        checkins,
        nextCursor,
      };
    }),

  /**
   * 获取签到统计信息
   */
  getCheckinStats: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const today = getTodayDate();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [account, thisMonthCheckins, lastMonthCheckins, totalCheckins] = await Promise.all([
      ctx.db.userCansAccount.findUnique({
        where: { userId },
        select: {
          consecutiveCheckins: true,
          totalCheckins: true,
          lastCheckinDate: true,
        },
      }),
      ctx.db.dailyCheckin.count({
        where: {
          userId,
          checkinDate: { gte: thisMonth },
        },
      }),
      ctx.db.dailyCheckin.count({
        where: {
          userId,
          checkinDate: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
      }),
      ctx.db.dailyCheckin.aggregate({
        where: { userId },
        _sum: {
          totalCans: true,
        },
      }),
    ]);

    // 计算本月签到率
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const thisMonthRate = Math.round((thisMonthCheckins / currentDay) * 100);

    // 计算上月签到率
    const daysInLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    const lastMonthRate = Math.round((lastMonthCheckins / daysInLastMonth) * 100);

    return {
      consecutiveCheckins: account?.consecutiveCheckins || 0,
      totalCheckins: account?.totalCheckins || 0,
      totalCansEarned: totalCheckins._sum.totalCans || 0,
      thisMonthCheckins,
      lastMonthCheckins,
      thisMonthRate,
      lastMonthRate,
      lastCheckinDate: account?.lastCheckinDate,
      canCheckinToday: !await ctx.db.dailyCheckin.findUnique({
        where: {
          userId_checkinDate: {
            userId,
            checkinDate: today,
          },
        },
      }),
    };
  }),

  /**
   * 获取签到日历数据
   */
  getCheckinCalendar: authProcedure
    .input(getCheckinHistorySchema.pick({ limit: true }).extend({
      year: z.number().min(2020).max(2030).optional(),
      month: z.number().min(1).max(12).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();
      const year = input.year || now.getFullYear();
      const month = input.month || now.getMonth() + 1;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const checkins = await ctx.db.dailyCheckin.findMany({
        where: {
          userId,
          checkinDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { checkinDate: 'asc' },
      });

      // 构建日历数据
      const calendarData: any[] = [];
      const daysInMonth = endDate.getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const checkin = checkins.find((c: any) =>
          c.checkinDate.getDate() === day &&
          c.checkinDate.getMonth() === month - 1 &&
          c.checkinDate.getFullYear() === year
        );

        calendarData.push({
          date,
          day,
          hasCheckin: !!checkin,
          checkin: checkin || null,
          isToday: date.toDateString() === now.toDateString(),
          isFuture: date > now,
        });
      }

      return {
        year,
        month,
        calendarData,
        totalCheckins: checkins.length,
        checkinRate: Math.round((checkins.length / daysInMonth) * 100),
      };
    }),
});
