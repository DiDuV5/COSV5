/**
 * @fileoverview Comment互动相关的tRPC路由（重构版）
 * @description 处理评论点赞、反应等互动功能，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, authProcedure, publicProcedure } from '@/server/api/trpc';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

// 导入重构后的服务
import { commentReactionService, commentInteractionService } from './services';

// 导入输入验证schemas
import {
  reactInputSchema,
  toggleReactionInputSchema,
  toggleLikeInputSchema,
  getReactionStatusInputSchema,
  getLikeStatusInputSchema,
  getReactionStatsInputSchema,
} from './schemas/comment-input-schemas';

export const commentInteractionRouter = createTRPCRouter({
  /**
   * 表情反应（重构版 - 使用反应服务）
   */
  react: authProcedure.input(reactInputSchema).mutation(async ({ ctx, input }) => {
    const reactionService = commentReactionService(ctx.db);
    return await reactionService.handleReaction({
      commentId: input.commentId,
      userId: ctx.session.user.id,
      reactionType: input.reactionType,
    });
  }),

  /**
   * 切换反应（重构版 - 使用反应服务）
   */
  toggleReaction: authProcedure
    .input(toggleReactionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const reactionService = commentReactionService(ctx.db);

      // 先获取当前状态
      const currentStatus = await reactionService.getLikeStatus(
        input.commentId,
        ctx.session.user.id
      );

      // 如果当前已有相同反应，则取消；否则设置新反应
      const newReactionType = currentStatus.reactionType === input.reactionType
        ? null
        : input.reactionType;

      return await reactionService.handleReaction({
        commentId: input.commentId,
        userId: ctx.session.user.id,
        reactionType: newReactionType,
      });
    }),

  /**
   * 切换点赞（重构版 - 保持向后兼容）
   */
  toggleLike: authProcedure
    .input(toggleLikeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const reactionService = commentReactionService(ctx.db);

      // 先获取当前状态
      const currentStatus = await reactionService.getLikeStatus(
        input.commentId,
        ctx.session.user.id
      );

      // 如果已点赞则取消，否则点赞
      const newReactionType = currentStatus.isLiked ? null : 'LIKE';

      const result = await reactionService.handleReaction({
        commentId: input.commentId,
        userId: ctx.session.user.id,
        reactionType: newReactionType,
      });

      return {
        message: result.message,
        isLiked: result.reactionType !== null,
        likeCount: result.likeCount,
      };
    }),

  /**
   * 获取反应状态（重构版 - 使用交互服务）
   */
  getReactionStatus: authProcedure
    .input(getReactionStatusInputSchema)
    .query(async ({ ctx, input }) => {
      const interactionService = commentInteractionService(ctx.db);
      return await interactionService.getBatchLikeStatus(
        input.commentIds,
        ctx.session.user.id
      );
    }),

  /**
   * 获取点赞状态（重构版 - 使用反应服务）
   */
  getLikeStatus: authProcedure
    .input(getLikeStatusInputSchema)
    .query(async ({ ctx, input }) => {
      const reactionService = commentReactionService(ctx.db);
      return await reactionService.getLikeStatus(
        input.commentIds[0], // 使用第一个commentId
        ctx.session.user.id
      );
    }),

  /**
   * 获取反应统计（重构版 - 使用交互服务）
   */
  getReactionStats: publicProcedure
    .input(getReactionStatsInputSchema)
    .query(async ({ ctx, input }) => {
      const interactionService = commentInteractionService(ctx.db);
      return await interactionService.getDetailedReactionStats({
        commentId: input.commentId,
        includeUsers: input.includeUsers,
        limit: input.limit,
      });
    }),

  /**
   * 获取用户的评论互动历史（新增）
   */
  getUserInteractionHistory: authProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const interactionService = commentInteractionService(ctx.db);
      return await interactionService.getUserCommentInteractionHistory({
        userId: ctx.session.user.id,
        ...input,
      });
    }),

  /**
   * 获取评论的互动趋势（新增）
   */
  getInteractionTrends: publicProcedure
    .input(z.object({
      commentId: z.string(),
      timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
    }))
    .query(async ({ ctx, input }) => {
      const interactionService = commentInteractionService(ctx.db);
      return await interactionService.getCommentInteractionTrends(input);
    }),

  /**
   * 获取热门评论互动（新增）
   */
  getPopularInteractions: publicProcedure
    .input(z.object({
      timeRange: z.enum(['24h', '7d', '30d']).default('7d'),
      limit: z.number().min(1).max(50).default(10),
      postId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const interactionService = commentInteractionService(ctx.db);
      return await interactionService.getPopularCommentInteractions(input);
    }),
});
