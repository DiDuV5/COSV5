/**
 * @fileoverview 用户提及API路由（重构版）
 * @description 处理@用户提及的创建、查询和通知功能
 * @author Augment AI
 * @date 2025-06-27
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.0.0
 * - zod: ^3.22.0
 * - prisma: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-27: 模块化重构，拆分为独立组件
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure, authProcedure } from "@/server/api/trpc";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";

// 导入重构后的模块
import { MentionResolver } from './mention-resolver';
import { MentionValidator } from './mention-validator';
import { MentionCreator } from './mention-creator';
import { MentionManager } from './mention-manager';
import { MentionStats } from './mention-stats';

// 导入类型定义和验证规则
import {
  ResolveUsernameInput,
  ValidateMentionsInput,
  CreateMentionsInput,
  GetUserMentionsInput,
  MarkAsReadInput,
  DeleteMentionInput,
  RecordMentionStatsInput,
  GetUserMentionStatsInput,
  GetTopMentionedUsersInput,
  GetUserMentionHistoryInput,
} from './mention-types';

export const mentionRouter = createTRPCRouter({
  /**
   * 智能用户名解析 - 处理用户名冲突（重构版）
   */
  resolveUsername: publicProcedure
    .input(ResolveUsernameInput)
    .query(async ({ ctx, input }) => {
      try {
        const resolver = new MentionResolver(ctx.db);
        return await resolver.resolveUsername(input);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '用户名解析失败',
          { context: { username: input.username } }
        );
      }
    }),

  /**
   * 验证并解析文本中的用户提及（重构版）
   */
  validateMentions: publicProcedure
    .input(ValidateMentionsInput)
    .query(async ({ ctx, input }) => {
      try {
        const validator = new MentionValidator(ctx.db);
        return await validator.validateMentions(input);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '提及验证失败',
          { context: { textLength: input.text.length } }
        );
      }
    }),

  /**
   * 创建用户提及记录（重构版）
   */
  createMentions: authProcedure
    .input(CreateMentionsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const creator = new MentionCreator(ctx.db);
        return await creator.createMentions(input, ctx.session.user.id);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '创建提及失败',
          { context: { mentionType: input.mentionType } }
        );
      }
    }),

  /**
   * 获取用户收到的提及（重构版）
   */
  getUserMentions: authProcedure
    .input(GetUserMentionsInput)
    .query(async ({ ctx, input }) => {
      try {
        const manager = new MentionManager(ctx.db);
        return await manager.getUserMentions(input, ctx.session.user.id);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '获取提及列表失败'
        );
      }
    }),

  /**
   * 标记提及为已读（重构版）
   */
  markAsRead: authProcedure
    .input(MarkAsReadInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = new MentionManager(ctx.db);
        const count = await manager.markAsRead(input, ctx.session.user.id);
        return { markedCount: count };
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '标记已读失败'
        );
      }
    }),

  /**
   * 删除提及记录（重构版）
   */
  deleteMention: authProcedure
    .input(DeleteMentionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = new MentionManager(ctx.db);
        await manager.deleteMention(input, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '删除提及失败'
        );
      }
    }),

  /**
   * 获取未读提及数量（重构版）
   */
  getUnreadCount: authProcedure
    .query(async ({ ctx }) => {
      try {
        const manager = new MentionManager(ctx.db);
        const count = await manager.getUnreadCount(ctx.session.user.id);
        return { count };
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '获取未读数量失败'
        );
      }
    }),

  /**
   * 记录提及统计（重构版）
   */
  recordMentionStats: authProcedure
    .input(RecordMentionStatsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const stats = new MentionStats(ctx.db);
        await stats.recordMentionStats(input, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '记录统计失败'
        );
      }
    }),

  /**
   * 获取用户提及统计（重构版）
   */
  getUserMentionStats: publicProcedure
    .input(GetUserMentionStatsInput)
    .query(async ({ ctx, input }) => {
      try {
        const stats = new MentionStats(ctx.db);
        return await stats.getUserMentionStats(input);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '获取用户统计失败'
        );
      }
    }),

  /**
   * 获取热门被提及用户排行榜（重构版）
   */
  getTopMentionedUsers: publicProcedure
    .input(GetTopMentionedUsersInput)
    .query(async ({ ctx, input }) => {
      try {
        const stats = new MentionStats(ctx.db);
        return await stats.getTopMentionedUsers(input);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '获取排行榜失败'
        );
      }
    }),

  /**
   * 获取用户提及历史（重构版）
   */
  getUserMentionHistory: authProcedure
    .input(GetUserMentionHistoryInput)
    .query(async ({ ctx, input }) => {
      try {
        const stats = new MentionStats(ctx.db);
        return await stats.getUserMentionHistory(input);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '获取提及历史失败'
        );
      }
    }),

  /**
   * 搜索用户（用于提及建议）（重构版）
   */
  searchUsers: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(50),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const resolver = new MentionResolver(ctx.db);
        return await resolver.searchUsers(input.query, input.limit);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '搜索用户失败'
        );
      }
    }),

  /**
   * 获取提及摘要（重构版）
   */
  getMentionSummary: authProcedure
    .query(async ({ ctx }) => {
      try {
        const manager = new MentionManager(ctx.db);
        return await manager.getMentionSummary(ctx.session.user.id);
      } catch (error) {
        throw TRPCErrorHandler.internalError(
          '获取提及摘要失败'
        );
      }
    }),
});

