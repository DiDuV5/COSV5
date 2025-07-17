/**
 * @fileoverview Post互动相关的tRPC路由（重构版）
 * @description 处理点赞、反应、互动统计等功能，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { z } from 'zod';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { createTRPCRouter, publicProcedure, authProcedure } from '@/server/api/trpc';

// 导入重构后的服务
import { postReactionService, postInteractionService } from './services';

// 导入输入验证schemas
import {
  reactInputSchema,
  likeInputSchema,
  unlikeInputSchema,
  getLikeStatusInputSchema,
  getReactionStatsInputSchema,
} from './schemas/post-input-schemas';

export const postInteractionRouter = createTRPCRouter({
  /**
   * 表情反应（重构版 - 使用反应服务）
   */
  react: authProcedure.input(reactInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const reactionService = postReactionService(ctx.db);
      return await reactionService.handleReaction({
        postId: input.postId,
        userId: ctx.session.user.id,
        reactionType: input.reactionType,
      });
    } catch (error) {
      // 结构化日志记录
      console.error("帖子反应操作失败:", {
        postId: input.postId,
        userId: ctx.session.user.id,
        reactionType: input.reactionType,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // 如果是已知的业务错误，直接抛出
      if (error instanceof Error && error.name === 'TRPCError') {
        throw error;
      }

      // 未知错误统一处理
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_ERROR,
        "反应操作失败，请稍后重试"
      );
    }
  }),

  /**
   * 点赞内容（重构版 - 保持向后兼容）
   */
  like: authProcedure.input(likeInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const reactionService = postReactionService(ctx.db);
      const result = await reactionService.handleReaction({
        postId: input.postId,
        userId: ctx.session.user.id,
        reactionType: 'HEART', // 默认使用HEART反应类型
      });

      return {
        message: result.message,
        isLiked: result.reactionType !== null,
      };
    } catch (error) {
      // 结构化日志记录
      console.error("帖子点赞操作失败:", {
        postId: input.postId,
        userId: ctx.session.user.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // 如果是已知的业务错误，直接抛出
      if (error instanceof Error && error.name === 'TRPCError') {
        throw error;
      }

      // 未知错误统一处理
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_ERROR,
        "点赞操作失败，请稍后重试"
      );
    }
  }),

  /**
   * 取消点赞（重构版 - 保持向后兼容）
   */
  unlike: authProcedure.input(unlikeInputSchema).mutation(async ({ ctx, input }) => {
    try {
      const reactionService = postReactionService(ctx.db);
      const result = await reactionService.handleReaction({
        postId: input.postId,
        userId: ctx.session.user.id,
        reactionType: null, // 传入null表示取消反应
      });

      return {
        message: result.message,
        isLiked: false,
      };
    } catch (error) {
      // 结构化日志记录
      console.error("取消点赞操作失败:", {
        postId: input.postId,
        userId: ctx.session.user.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });

      // 如果是已知的业务错误，直接抛出
      if (error instanceof Error && error.name === 'TRPCError') {
        throw error;
      }

      // 未知错误统一处理
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INTERNAL_ERROR,
        "取消点赞操作失败，请稍后重试"
      );
    }
  }),

  /**
   * 获取用户对帖子的点赞状态（重构版 - 使用交互服务）
   */
  getLikeStatus: authProcedure
    .input(getLikeStatusInputSchema)
    .query(async ({ ctx, input }) => {
      const interactionService = postInteractionService(ctx.db);
      return await interactionService.getBatchLikeStatus(
        input.postIds,
        ctx.session.user.id
      );
    }),

  /**
   * 获取帖子的表情反应统计（重构版 - 使用交互服务）
   */
  getReactionStats: publicProcedure
    .input(getReactionStatsInputSchema)
    .query(async ({ ctx, input }) => {
      const interactionService = postInteractionService(ctx.db);
      return await interactionService.getDetailedReactionStats({
        postId: input.postId,
        includeUsers: input.includeUsers,
        limit: input.limit,
      });
    }),

  /**
   * 获取单个Post的点赞状态（新增 - 简化版本）
   */
  getSingleLikeStatus: publicProcedure
    .input(getLikeStatusInputSchema.pick({ postIds: true }).transform(data => ({ postId: data.postIds[0] })))
    .query(async ({ ctx, input }) => {
      const reactionService = postReactionService(ctx.db);
      return await reactionService.getLikeStatus(
        input.postId,
        ctx.session?.user?.id
      );
    }),

  /**
   * 获取用户的互动历史（新增）
   */
  getUserInteractionHistory: authProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      type: z.enum(['LIKE', 'COMMENT', 'SHARE']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const interactionService = postInteractionService(ctx.db);
      return await interactionService.getUserInteractionHistory({
        userId: ctx.session.user.id,
        ...input,
      });
    }),

  /**
   * 获取Post的互动趋势（新增）
   */
  getInteractionTrends: publicProcedure
    .input(z.object({
      postId: z.string(),
      timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
    }))
    .query(async ({ ctx, input }) => {
      const interactionService = postInteractionService(ctx.db);
      return await interactionService.getInteractionTrends(input);
    }),

  /**
   * 获取热门互动内容（新增）
   */
  getPopularInteractions: publicProcedure
    .input(z.object({
      timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
      limit: z.number().min(1).max(50).default(10),
      type: z.enum(['likes', 'comments', 'reactions']).default('likes'),
    }))
    .query(async ({ ctx, input }) => {
      const interactionService = postInteractionService(ctx.db);
      return await interactionService.getPopularInteractions(input);
    }),
});
