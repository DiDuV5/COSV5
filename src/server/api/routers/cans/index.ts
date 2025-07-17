/**
 * @fileoverview 罐头系统路由组合文件
 * @description 组合所有罐头系统子路由，提供统一的罐头API接口
 */

import { z } from "zod";
import { createTRPCRouter, authProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler } from "@/lib/errors/trpc-error-handler";
import { cansAccountRouter } from "./cans-account";
import { cansCheckinRouter } from "./cans-checkin";
import { cansTasksRouter } from "./cans-tasks";
import { cansTransactionsRouter } from "./cans-transactions";
import { cansConfigRouter } from "./cans-config";
import { cansAnalyticsRouter } from "./cans-analytics";
import { cansExperienceRouter } from "./cans-experience";

export const cansRouter = createTRPCRouter({
  // 账户管理
  account: cansAccountRouter,

  // 签到系统
  checkin: cansCheckinRouter,

  // 任务系统
  tasks: cansTasksRouter,

  // 交易记录
  transactions: cansTransactionsRouter,

  // 系统配置（管理员）
  config: cansConfigRouter,

  // 统计分析（管理员）
  analytics: cansAnalyticsRouter,

  // 经验值管理（管理员）
  experience: cansExperienceRouter,

  // 重定向到account子路由，避免重复实现
  getAccount: cansAccountRouter.getAccount,

  // 重定向到checkin子路由，避免重复实现
  dailyCheckin: cansCheckinRouter.dailyCheckin,

  // 重定向到checkin子路由，避免重复实现
  getCheckinStatus: cansCheckinRouter.getCheckinStatus,

  // 重定向到account子路由，避免重复实现
  getAccountSummary: cansAccountRouter.getAccountSummary,

  // 兼容性方法：获取可用任务
  getAvailableTasks: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userLevel = ctx.session.user.userLevel;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 游客用户返回空任务列表
    if (userLevel === 'GUEST') {
      return [];
    }

    // 获取用户等级配置
    const config = await ctx.db.cansSystemConfig.findUnique({
      where: { userLevel },
    });

    if (!config) {
      return [];
    }

    // 获取今日任务完成情况
    const todayCompletions = await ctx.db.taskCompletion.groupBy({
      by: ['taskType'],
      where: {
        userId,
        completedDate: today,
      },
      _count: {
        taskType: true,
      },
    });

    const completionMap = todayCompletions.reduce((acc: any, item: any) => {
      acc[item.taskType] = item._count.taskType;
      return acc;
    }, {} as Record<string, number>);

    // 简化的任务定义
    const taskDefinitions = [
      {
        type: 'DAILY_LOGIN',
        title: '每日登录',
        description: '每日登录获得罐头奖励',
        cansReward: config.dailySigninCans || 0,
        dailyLimit: 1,
      },
      {
        type: 'DAILY_CHECKIN',
        title: '每日签到',
        description: '每日签到获得罐头奖励',
        cansReward: config.dailySigninCans || 0,
        dailyLimit: 1,
      },
      {
        type: 'POST_CREATION',
        title: '发布作品',
        description: '发布作品获得罐头奖励',
        cansReward: config.publishPostCans || 0,
        dailyLimit: config.dailyPostLimit || 0,
      },
      {
        type: 'COMMENT_CREATION',
        title: '发表评论',
        description: '发表评论获得罐头奖励',
        cansReward: config.commentCans || 0,
        dailyLimit: config.dailyCommentLimit || 0,
      },
    ];

    // 构建任务列表
    const tasks = taskDefinitions.map(taskDef => {
      const completed = completionMap[taskDef.type] || 0;
      const remaining = taskDef.dailyLimit - completed;
      const progress = taskDef.dailyLimit > 0 ? (completed / taskDef.dailyLimit) * 100 : 0;

      return {
        ...taskDef,
        name: taskDef.title, // 添加name字段以兼容前端
        completed,
        remaining: Math.max(0, remaining),
        progress: Math.round(progress),
        status: remaining > 0 ? 'available' : 'completed',
        isEnabled: taskDef.cansReward > 0 && taskDef.dailyLimit > 0,
        totalReward: taskDef.cansReward * taskDef.dailyLimit,
      };
    });

    // 返回启用的任务
    return tasks.filter(task => task.isEnabled);
  }),

  // 兼容性方法：完成任务
  completeTask: authProcedure
    .input(z.object({
      taskType: z.string(),
      resourceId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { taskType, resourceId } = input;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 获取用户等级配置
      const userLevel = ctx.session.user.userLevel;
      const config = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel },
      });

      if (!config) {
        throw TRPCErrorHandler.notFound("用户等级配置不存在");
      }

      // 检查今日任务完成次数
      const todayCompletions = await ctx.db.taskCompletion.count({
        where: {
          userId,
          taskType,
          completedDate: today,
        },
      });

      // 获取任务配置和限制
      let dailyLimit = 0;
      let cansReward = 0;

      switch (taskType) {
        case 'DAILY_LOGIN':
          dailyLimit = 1;
          cansReward = config.dailySigninCans || 0;
          break;
        case 'DAILY_CHECKIN':
          dailyLimit = 1;
          cansReward = config.dailySigninCans || 0;
          break;
        case 'POST_CREATION':
          dailyLimit = config.dailyPostLimit || 0;
          cansReward = config.publishPostCans || 0;
          break;
        case 'COMMENT_CREATION':
          dailyLimit = config.dailyCommentLimit || 0;
          cansReward = config.commentCans || 0;
          break;
        default:
          throw TRPCErrorHandler.validationError("无效的任务类型");
      }

      // 检查是否超过每日限制
      if (todayCompletions >= dailyLimit) {
        throw TRPCErrorHandler.validationError("今日该任务已达到完成上限");
      }

      // 创建任务完成记录
      const completion = await ctx.db.taskCompletion.create({
        data: {
          userId,
          taskType,
          completedDate: today,
          cansEarned: cansReward,
          dailyCount: todayCompletions + 1,
        },
      });

      // 更新用户罐头账户
      await ctx.db.userCansAccount.upsert({
        where: { userId },
        create: {
          userId,
          availableCans: cansReward,
          totalCans: cansReward,
          frozenCans: 0,
          totalExperience: 0,
          dailyExperienceEarned: 0,
          consecutiveCheckins: 0,
          totalCheckins: 0,
        },
        update: {
          availableCans: { increment: cansReward },
          totalCans: { increment: cansReward },
        },
      });

      return {
        success: true,
        taskType,
        cansEarned: cansReward,
        remainingToday: dailyLimit - todayCompletions - 1,
        completion,
      };
    }),

  // 批量更新配置
  batchUpdateConfigs: adminProcedure
    .input(z.object({
      configs: z.array(z.object({
        userLevel: z.string(),
        dailyExperienceLimit: z.number(),
        dailyCommentLimit: z.number(),
        dailySigninCans: z.number(),
        consecutiveBonus: z.string(),
        likeCans: z.number(),
        commentCans: z.number(),
        shareCans: z.number(),
        publishMomentCans: z.number(),
        publishPostCans: z.number(),
        dailyLikeLimit: z.number(),
        dailyShareLimit: z.number(),
        cansToExperienceRatio: z.number(),
      })),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { configs, reason } = input;

      // 批量更新配置
      const updatePromises = configs.map(config =>
        ctx.db.cansSystemConfig.upsert({
          where: { userLevel: config.userLevel },
          create: {
            isActive: true,
            ...config,
          },
          update: config,
        })
      );

      await Promise.all(updatePromises);

      // 记录审计日志
      await ctx.db.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: "BATCH_UPDATE_CANS_CONFIG",
          level: "INFO",
          message: `批量更新了 ${configs.length} 个用户等级的罐头配置: ${reason}`,
          resource: "CANS_CONFIG",
          resourceId: "batch",
          details: JSON.stringify({ configs, reason }),
        },
      });

      return {
        success: true,
        message: `成功更新了 ${configs.length} 个配置`,
        updatedCount: configs.length,
      };
    }),

  // 获取经验值状态
  getExperienceStatus: authProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const userLevel = ctx.session.user.userLevel;

      // 获取用户等级配置
      const config = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel },
      });

      // 获取用户账户
      const account = await ctx.db.userCansAccount.findUnique({
        where: { userId },
      });

      const dailyExperienceLimit = config?.dailyExperienceLimit || 100;
      const dailyExperienceEarned = account?.dailyExperienceEarned || 0;
      const remainingExperience = Math.max(0, dailyExperienceLimit - dailyExperienceEarned);
      const canEarnMore = remainingExperience > 0;

      return {
        dailyExperienceEarned,
        dailyExperienceLimit,
        remainingExperience,
        canEarnMore,
        lastExperienceReset: account?.lastExperienceReset || new Date(),
      };
    }),


});
