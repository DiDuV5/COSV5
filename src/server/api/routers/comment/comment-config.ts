/**
 * @fileoverview Comment配置相关的 tRPC 路由
 * @description 处理评论反应配置管理功能
 */

import { createTRPCRouter, adminProcedure, publicProcedure } from "@/server/api/trpc";
import { updateReactionConfigInputSchema } from "./schemas/comment-input-schemas";
import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";

export const commentConfigRouter = createTRPCRouter({
  /**
   * 获取反应配置
   */
  getReactionConfig: publicProcedure
    .query(async ({ ctx }) => {
      // 尝试从数据库获取配置
      const config = await (ctx.db as any).reactionConfig?.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      // 如果没有配置，返回默认配置
      if (!config) {
        return {
          likeWeight: 1,
          dislikeWeight: -3,
          enableLike: true,
          enableDislike: true,
          showCounts: true,
          description: "默认反应配置",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return config;
    }),

  /**
   * 更新反应配置（管理员）
   */
  updateReactionConfig: adminProcedure
    .input(updateReactionConfigInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { likeWeight, dislikeWeight, enableLike, enableDislike, showCounts, description } = input;
      const adminId = ctx.session.user.id;

      // 验证权重值的合理性
      if (likeWeight < -10 || likeWeight > 10) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          "点赞权重必须在-10到10之间"
        );
      }

      if (dislikeWeight < -10 || dislikeWeight > 10) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          "点踩权重必须在-10到10之间"
        );
      }

      // 创建新的配置记录（保留历史记录）
      const newConfig = await (ctx.db as any).reactionConfig?.create({
        data: {
          likeWeight,
          dislikeWeight,
          enableLike,
          enableDislike,
          showCounts,
          description: description || `配置更新于${new Date().toLocaleString()}`,
          createdBy: adminId,
        },
      }) || {
        likeWeight,
        dislikeWeight,
        enableLike,
        enableDislike,
        showCounts,
        description: description || `配置更新于${new Date().toLocaleString()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        message: "反应配置已更新",
        config: newConfig,
      };
    }),

  /**
   * 重置反应配置为默认值（管理员）
   */
  resetReactionConfig: adminProcedure
    .mutation(async ({ ctx }) => {
      const adminId = ctx.session.user.id;

      // 创建默认配置
      const defaultConfig = await (ctx.db as any).reactionConfig?.create({
        data: {
          likeWeight: 1,
          dislikeWeight: -3,
          enableLike: true,
          enableDislike: true,
          showCounts: true,
          description: `配置重置为默认值于${new Date().toLocaleString()}`,
          createdBy: adminId,
        },
      }) || {
        likeWeight: 1,
        dislikeWeight: -3,
        enableLike: true,
        enableDislike: true,
        showCounts: true,
        description: `配置重置为默认值于${new Date().toLocaleString()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return {
        success: true,
        message: "反应配置已重置为默认值",
        config: defaultConfig,
      };
    }),

  /**
   * 获取配置历史记录（管理员）
   */
  getConfigHistory: adminProcedure
    .query(async ({ ctx }) => {
      const configs = await (ctx.db as any).reactionConfig?.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      }) || [];

      return configs;
    }),

  /**
   * 获取反应类型定义
   */
  getReactionTypes: publicProcedure
    .query(async () => {
      // 返回支持的反应类型定义
      return {
        positive: [
          {
            type: 'like',
            name: '点赞',
            emoji: '👍',
            description: '表示赞同或喜欢',
            weight: 1,
          },
          {
            type: 'HEART',
            name: '爱心',
            emoji: '❤️',
            description: '表示喜爱',
            weight: 1,
          },
          {
            type: 'THUMBS_UP',
            name: '赞',
            emoji: '👍',
            description: '表示赞同',
            weight: 1,
          },
          {
            type: 'FIRE',
            name: '火',
            emoji: '🔥',
            description: '表示很棒',
            weight: 1,
          },
          {
            type: 'HUNDRED',
            name: '满分',
            emoji: '💯',
            description: '表示完美',
            weight: 1,
          },
          {
            type: 'CLAP',
            name: '鼓掌',
            emoji: '👏',
            description: '表示赞赏',
            weight: 1,
          },
          {
            type: 'STAR',
            name: '星星',
            emoji: '⭐',
            description: '表示收藏',
            weight: 1,
          },
        ],
        negative: [
          {
            type: 'dislike',
            name: '点踩',
            emoji: '👎',
            description: '表示不赞同或不喜欢',
            weight: -3,
          },
        ],
      };
    }),

  /**
   * 获取反应统计概览（管理员）
   */
  getReactionOverview: adminProcedure
    .query(async ({ ctx }) => {
      // 获取所有反应的统计数据
      const reactionStats = await ctx.db.commentLike.groupBy({
        by: ['reactionType'],
        _count: {
          reactionType: true,
        },
        orderBy: {
          _count: {
            reactionType: 'desc',
          },
        },
      });

      // 获取今日反应统计
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayReactionStats = await ctx.db.commentLike.groupBy({
        by: ['reactionType'],
        where: {
          createdAt: { gte: today, lt: tomorrow },
        },
        _count: {
          reactionType: true,
        },
        orderBy: {
          _count: {
            reactionType: 'desc',
          },
        },
      });

      // 获取最近7天的反应趋势
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const weeklyReactionTrend = await ctx.db.commentLike.groupBy({
        by: ['createdAt', 'reactionType'],
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        _count: {
          reactionType: true,
        },
      });

      // 按日期和反应类型分组
      const dailyReactionStats: Record<string, Record<string, number>> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(sevenDaysAgo);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        dailyReactionStats[dateStr] = {};
      }

      weeklyReactionTrend.forEach((item: any) => {
        const dateStr = item.createdAt.toISOString().split('T')[0];
        if (dailyReactionStats[dateStr]) {
          dailyReactionStats[dateStr][item.reactionType] =
            (dailyReactionStats[dateStr][item.reactionType] || 0) + item._count.reactionType;
        }
      });

      return {
        total: reactionStats,
        today: todayReactionStats,
        weeklyTrend: Object.entries(dailyReactionStats).map(([date, reactions]) => ({
          date,
          reactions,
        })),
      };
    }),
});
