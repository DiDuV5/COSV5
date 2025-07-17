/**
 * @fileoverview 罐头任务系统路由
 * @description 处理任务完成、任务列表、进度查询等功能
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, authProcedure } from "@/server/api/trpc";
import {
  checkAndResetUserExperience,
  calculateExperienceReward,
} from "@/lib/experience-utils";
import { completeTaskSchema } from "./schemas/cans-input-schemas";
import { getTaskConfig, getTaskDefinitions, getTodayDate } from "./utils/cans-utils";

export const cansTasksRouter = createTRPCRouter({
  /**
   * 完成任务获得罐头
   * @description 增强版任务完成API，支持更严格的验证和更好的错误处理
   */
  completeTask: authProcedure
    .input(completeTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const today = getTodayDate();

      // 获取用户等级配置
      const userLevel = ctx.session.user.userLevel;
      const config = await ctx.db.cansSystemConfig.findUnique({
        where: { userLevel },
      });

      if (!config) {
        throw TRPCErrorHandler.notFound("系统配置异常，请稍后重试或联系守馆员协助处理。我们会尽快为您解决问题！");
      }

      // 检查用户权限 - 访客用户不能完成任务
      if (userLevel === 'GUEST') {
        throw TRPCErrorHandler.forbidden("欢迎来到兔图！请先注册成为正式成员，即可参与任务获得罐头奖励。注册简单快捷，还有新手礼包等着您～");
      }

      // 检查每日限制
      const todayCompletions = await ctx.db.taskCompletion.count({
        where: {
          userId,
          taskType: input.taskType,
          completedDate: today,
        },
      });

      // 获取每日限制和奖励配置
      const taskConfig = getTaskConfig(config);
      const currentTask = taskConfig[input.taskType];

      if (!currentTask) {
        throw TRPCErrorHandler.validationError("任务类型不正确，请刷新页面重试。如果问题持续存在，请联系守馆员获取帮助。");
      }

      // 检查每日限制
      if (todayCompletions >= currentTask.limit) {
        const resetTime = new Date(today);
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(0, 0, 0, 0);
        const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));

        throw TRPCErrorHandler.validationError(`今日${currentTask.name}任务已完成 ${currentTask.limit} 次，已达每日上限。${hoursUntilReset}小时后重置，明天继续加油！您还可以尝试其他类型的任务哦～`);
      }

      // 检查奖励是否为0 (可能是被禁用的任务)
      if (currentTask.reward <= 0) {
        throw TRPCErrorHandler.validationError(`${currentTask.name}任务暂时维护中，请稍后再试。您可以先完成其他任务获得罐头奖励！`);
      }

      // 使用事务处理任务完成，确保数据一致性
      let result;
      try {
        result = await ctx.db.$transaction(async (tx: any) => {
        // 获取或创建用户罐头账户
        let account = await tx.userCansAccount.findUnique({
          where: { userId },
        });

        if (!account) {
          account = await tx.userCansAccount.create({
            data: {
              userId,
              totalCans: 0,
              availableCans: 0,
              frozenCans: 0,
              totalExperience: 0,
              dailyExperienceEarned: 0,
              dailyExperienceLimit: config.dailyExperienceLimit,
              totalCheckins: 0,
              consecutiveCheckins: 0,
            },
          });
        }

        // 检查并重置经验值（如果需要）
        const experienceStatus = await checkAndResetUserExperience(tx, userId);
        const currentDailyEarned = experienceStatus?.dailyExperienceEarned || account.dailyExperienceEarned;
        const dailyLimit = experienceStatus?.dailyExperienceLimit || config.dailyExperienceLimit;

        // 计算经验值奖励 (考虑每日上限)
        const experienceReward = calculateExperienceReward(
          currentTask.reward,
          currentDailyEarned,
          dailyLimit,
          config.cansToExperienceRatio
        );

        // 创建任务完成记录
        const completion = await tx.taskCompletion.create({
          data: {
            userId,
            taskType: input.taskType,
            targetId: input.targetId,
            cansEarned: currentTask.reward,
            completedDate: today,
            dailyCount: todayCompletions + 1,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          },
        });

        // 更新账户余额和经验值
        const updatedAccount = await tx.userCansAccount.update({
          where: { id: account.id },
          data: {
            totalCans: { increment: currentTask.reward },
            availableCans: { increment: currentTask.reward },
            totalExperience: { increment: experienceReward },
            dailyExperienceEarned: { increment: experienceReward },
          },
        });

        // 创建交易记录
        await tx.cansTransaction.create({
          data: {
            userId,
            accountId: account.id,
            transactionType: 'EARN',
            amount: currentTask.reward,
            sourceType: 'TASK',
            sourceId: completion.id,
            description: `完成${currentTask.name}任务获得罐头`,
            experienceEarned: experienceReward,
            metadata: input.metadata ? JSON.stringify({
              taskType: input.taskType,
              targetId: input.targetId,
              dailyCount: todayCompletions + 1,
              ...input.metadata,
            }) : null,
          },
        });

          return { completion, account: updatedAccount, experienceReward };
        });
      } catch (error) {
        console.error('任务完成事务失败:', error);
        throw TRPCErrorHandler.internalError("任务完成失败，请稍后重试。如果问题持续存在，请联系守馆员获取帮助。您的进度已保存，请放心！");
      }

      return {
        success: true,
        taskType: input.taskType,
        taskName: currentTask.name,
        cansEarned: currentTask.reward,
        experienceEarned: result.experienceReward,
        remainingTasks: currentTask.limit - (todayCompletions + 1),
        totalCans: result.account.totalCans,
        totalExperience: result.account.totalExperience,
        dailyProgress: {
          completed: todayCompletions + 1,
          limit: currentTask.limit,
          percentage: Math.round(((todayCompletions + 1) / currentTask.limit) * 100),
        },
        message: `完成${currentTask.name}任务获得 ${currentTask.reward} 个罐头${result.experienceReward > 0 ? ` 和 ${result.experienceReward} 经验值` : ''}！`,
      };
    }),

  /**
   * 获取可用任务列表
   * @description 增强版任务列表API，包含更详细的任务信息和状态
   */
  getAvailableTasks: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userLevel = ctx.session.user.userLevel;
    const today = getTodayDate();

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

    // 定义任务配置
    const taskDefinitions = getTaskDefinitions(config);

    // 构建任务列表
    const tasks = taskDefinitions.map(taskDef => {
      const completed = completionMap[taskDef.type] || 0;
      const remaining = taskDef.dailyLimit - completed;
      const progress = taskDef.dailyLimit > 0 ? (completed / taskDef.dailyLimit) * 100 : 0;

      return {
        ...taskDef,
        completed,
        remaining: Math.max(0, remaining),
        progress: Math.round(progress),
        status: remaining > 0 ? 'available' : 'completed',
        isEnabled: taskDef.cansReward > 0 && taskDef.dailyLimit > 0,
        totalReward: taskDef.cansReward * taskDef.dailyLimit,
      };
    });

    // 返回所有任务（包括已完成的），前端可以根据需要过滤
    return tasks.filter(task => task.isEnabled);
  }),

  /**
   * 获取今日任务进度
   * @description 增强版今日进度API，包含详细的统计信息和成就数据
   */
  getTodayTaskProgress: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userLevel = ctx.session.user.userLevel;
    const today = getTodayDate();

    // 游客用户返回空数据
    if (userLevel === 'GUEST') {
      return null;
    }

    // 获取用户等级配置
    const config = await ctx.db.cansSystemConfig.findUnique({
      where: { userLevel },
    });

    if (!config) {
      return null;
    }

    // 获取今日任务完成情况
    const todayCompletions = await ctx.db.taskCompletion.findMany({
      where: {
        userId,
        completedDate: today,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 获取今日交易记录（用于计算经验值）
    const todayTransactions = await ctx.db.cansTransaction.findMany({
      where: {
        userId,
        sourceType: 'TASK',
        createdAt: {
          gte: today,
        },
      },
    });

    // 计算统计数据
    const todayTotalCans = todayCompletions.reduce((sum: any, completion: any) => sum + completion.cansEarned, 0);
    const todayTotalExperience = todayTransactions.reduce((sum: any, transaction: any) => sum + (transaction.experienceEarned || 0), 0);

    // 按任务类型分组统计
    const taskTypeStats = todayCompletions.reduce((acc: any, completion: any) => {
      if (!acc[completion.taskType]) {
        acc[completion.taskType] = {
          count: 0,
          cansEarned: 0,
        };
      }
      acc[completion.taskType].count++;
      acc[completion.taskType].cansEarned += completion.cansEarned;
      return acc;
    }, {} as Record<string, { count: number; cansEarned: number }>);

    // 计算完成率
    const totalPossibleTasks = config.dailyLikeLimit + config.dailyCommentLimit +
                              config.dailyShareLimit + config.dailyMomentLimit + config.dailyPostLimit;
    const completionRate = totalPossibleTasks > 0 ? (todayCompletions.length / totalPossibleTasks) * 100 : 0;

    return {
      completions: todayCompletions,
      totalCansEarned: todayTotalCans,
      totalExperienceEarned: todayTotalExperience,
      totalTasksCompleted: todayCompletions.length,
      totalPossibleTasks,
      completionRate: Math.round(completionRate),
      taskTypeStats,
      config,
      achievements: {
        firstTaskToday: todayCompletions.length === 1,
        halfTasksCompleted: completionRate >= 50,
        allTasksCompleted: completionRate >= 100,
        highEarner: todayTotalCans >= 100, // 可配置的阈值
      },
    };
  }),
});
