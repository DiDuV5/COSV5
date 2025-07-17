/**
 * @fileoverview 罐头经验值系统路由
 * @description 处理经验值管理和重置功能
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  resetUserExperienceSchema,
  resetAllExperienceSchema,
} from "./schemas/cans-input-schemas";

export const cansExperienceRouter = createTRPCRouter({
  /**
   * 重置用户经验值（管理员）
   */
  resetUserExperience: adminProcedure
    .input(resetUserExperienceSchema)
    .mutation(async ({ ctx, input }) => {
      const { userId, reason } = input;
      const adminId = ctx.session.user.id;

      // 检查用户是否存在
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      // 获取用户罐头账户
      const account = await ctx.db.userCansAccount.findUnique({
        where: { userId },
      });

      if (!account) {
        throw TRPCErrorHandler.notFound("用户罐头账户不存在");
      }

      // 记录重置前的经验值
      const beforeExperience = {
        totalExperience: account.totalExperience,
        dailyExperienceEarned: account.dailyExperienceEarned,
        dailyExperienceLimit: account.dailyExperienceLimit,
      };

      // 重置经验值
      const updatedAccount = await ctx.db.userCansAccount.update({
        where: { userId },
        data: {
          totalExperience: 0,
          dailyExperienceEarned: 0,
          lastExperienceReset: new Date(),
        },
      });

      // 记录审计日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: 'RESET_USER_EXPERIENCE',
          message: `重置用户 ${user.username} 的经验值${reason ? ` - ${reason}` : ''}`,
          resource: 'USER_EXPERIENCE',
          resourceId: userId,
          details: JSON.stringify({
            targetUser: {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
            },
            beforeExperience,
            afterExperience: {
              totalExperience: 0,
              dailyExperienceEarned: 0,
              dailyExperienceLimit: updatedAccount.dailyExperienceLimit,
            },
            reason,
          }),
        },
      });

      return {
        success: true,
        message: `用户 ${user.username} 的经验值已重置`,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        },
        beforeExperience,
        afterExperience: {
          totalExperience: 0,
          dailyExperienceEarned: 0,
          dailyExperienceLimit: updatedAccount.dailyExperienceLimit,
        },
      };
    }),

  /**
   * 重置所有用户经验值（管理员）
   */
  resetAllExperience: adminProcedure
    .input(resetAllExperienceSchema)
    .mutation(async ({ ctx, input }) => {
      const { forceReset, reason } = input;
      const adminId = ctx.session.user.id;

      // 安全检查：需要明确确认
      if (!forceReset) {
        throw TRPCErrorHandler.validationError("重置所有用户经验值是危险操作，请设置 forceReset 为 true 确认执行");
      }

      // 获取所有有经验值的账户
      const accountsWithExperience = await ctx.db.userCansAccount.findMany({
        where: {
          OR: [
            { totalExperience: { gt: 0 } },
            { dailyExperienceEarned: { gt: 0 } },
          ],
        },
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      if (accountsWithExperience.length === 0) {
        return {
          success: true,
          message: '没有需要重置的用户经验值',
          affectedUsers: 0,
        };
      }

      // 批量重置经验值
      const resetResult = await ctx.db.userCansAccount.updateMany({
        where: {
          id: { in: accountsWithExperience.map((account: any) => account.id) },
        },
        data: {
          totalExperience: 0,
          dailyExperienceEarned: 0,
          lastExperienceReset: new Date(),
        },
      });

      // 记录每个用户的重置日志
      const auditLogs = accountsWithExperience.map((account: any) => ({
        userId: adminId,
        action: 'RESET_ALL_EXPERIENCE',
        message: `批量重置经验值 - 用户: ${account.user.username}${reason ? ` - ${reason}` : ''}`,
        resource: 'USER_EXPERIENCE',
        resourceId: account.userId,
        details: JSON.stringify({
          targetUser: {
            id: account.userId,
            username: account.user.username,
            displayName: account.user.displayName,
          },
          beforeExperience: {
            totalExperience: account.totalExperience,
            dailyExperienceEarned: account.dailyExperienceEarned,
          },
          batchOperation: true,
          reason,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // 批量插入审计日志
      await ctx.db.auditLog.createMany({
        data: auditLogs,
      });

      // 记录总体操作日志
      await ctx.db.auditLog.create({
        data: {
          userId: adminId,
          action: 'RESET_ALL_EXPERIENCE_SUMMARY',
          message: `批量重置所有用户经验值完成，影响 ${resetResult.count} 个用户${reason ? ` - ${reason}` : ''}`,
          resource: 'SYSTEM_EXPERIENCE',
          details: JSON.stringify({
            affectedUsers: resetResult.count,
            totalUsers: accountsWithExperience.length,
            reason,
            forceReset,
          }),
        },
      });

      return {
        success: true,
        message: `成功重置 ${resetResult.count} 个用户的经验值`,
        affectedUsers: resetResult.count,
        resetUsers: accountsWithExperience.map((account: any) => ({
          id: account.userId,
          username: account.user.username,
          displayName: account.user.displayName,
          beforeExperience: {
            totalExperience: account.totalExperience,
            dailyExperienceEarned: account.dailyExperienceEarned,
          },
        })),
      };
    }),

  /**
   * 获取经验值统计（管理员）
   */
  getExperienceStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalAccounts,
      accountsWithExperience,
      experienceDistribution,
      topExperienceUsers,
      dailyExperienceStats,
    ] = await Promise.all([
      // 总账户数
      ctx.db.userCansAccount.count(),

      // 有经验值的账户数
      ctx.db.userCansAccount.count({
        where: { totalExperience: { gt: 0 } },
      }),

      // 经验值分布
      ctx.db.userCansAccount.aggregate({
        _avg: { totalExperience: true },
        _max: { totalExperience: true },
        _min: { totalExperience: true },
        _sum: { totalExperience: true },
      }),

      // 经验值排行榜
      ctx.db.userCansAccount.findMany({
        where: { totalExperience: { gt: 0 } },
        orderBy: { totalExperience: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              userLevel: true,
            },
          },
        },
      }),

      // 今日经验值统计
      ctx.db.userCansAccount.aggregate({
        _avg: { dailyExperienceEarned: true },
        _max: { dailyExperienceEarned: true },
        _sum: { dailyExperienceEarned: true },
      }),
    ]);

    return {
      overview: {
        totalAccounts,
        accountsWithExperience,
        experienceRate: totalAccounts > 0 ? Math.round((accountsWithExperience / totalAccounts) * 100) : 0,
      },
      distribution: {
        average: Math.round(experienceDistribution._avg.totalExperience || 0),
        maximum: experienceDistribution._max.totalExperience || 0,
        minimum: experienceDistribution._min.totalExperience || 0,
        total: experienceDistribution._sum.totalExperience || 0,
      },
      topUsers: topExperienceUsers,
      dailyStats: {
        averageDaily: Math.round(dailyExperienceStats._avg.dailyExperienceEarned || 0),
        maximumDaily: dailyExperienceStats._max.dailyExperienceEarned || 0,
        totalDaily: dailyExperienceStats._sum.dailyExperienceEarned || 0,
      },
    };
  }),

  /**
   * 获取经验值重置历史（管理员）
   */
  getExperienceResetHistory: adminProcedure
    .input(resetAllExperienceSchema.pick({ reason: true }).extend({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      const resetLogs = await ctx.db.auditLog.findMany({
        where: {
          action: {
            in: ['RESET_USER_EXPERIENCE', 'RESET_ALL_EXPERIENCE', 'RESET_ALL_EXPERIENCE_SUMMARY'],
          },
          ...(cursor && { id: { lt: cursor } }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      if (resetLogs.length > limit) {
        const nextItem = resetLogs.pop();
        nextCursor = nextItem!.id;
      }

      return {
        resetLogs,
        nextCursor,
      };
    }),
});
