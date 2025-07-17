/**
 * @fileoverview Post查询相关的tRPC路由（重构版）
 * @description 处理内容查询、搜索、统计等功能，采用模块化设计
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { createTRPCRouter, publicProcedure, authProcedure } from '@/server/api/trpc';
// import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
// import { DuplicateDetector } from '@/lib/upload/deduplication/duplicate-detector';

// 导入重构后的查询服务
import { postQueryService } from './services';

// 导入输入验证schemas
import {
  getPostsInputSchema,
  getAllInputSchema,
  getByTagInputSchema,
  getByIdInputSchema,
  getUserPostsInputSchema,
  getUserLikedPostsInputSchema,
} from './schemas/post-input-schemas';

export const postQueryRouter = createTRPCRouter({
  /**
   * 获取内容列表（重构版 - 使用查询服务）
   */
  getPosts: publicProcedure.input(getPostsInputSchema).query(async ({ ctx, input }) => {
    const queryService = postQueryService(ctx.db);
    return await queryService.getPosts(input);
  }),

  /**
   * 获取所有内容（重构版 - 使用查询服务）
   */
  getAll: publicProcedure.input(getAllInputSchema).query(async ({ ctx, input }) => {
    const queryService = postQueryService(ctx.db);
    return await queryService.getPosts(input);
  }),

  /**
   * 根据标签获取内容（重构版 - 使用查询服务）
   */
  getByTag: publicProcedure.input(getByTagInputSchema).query(async ({ ctx, input }) => {
    const queryService = postQueryService(ctx.db);
    const { tag, ...params } = input;
    return await queryService.getPostsByTag(tag, params);
  }),

  /**
   * 根据ID获取内容详情（重构版 - 使用查询服务）
   */
  getById: publicProcedure.input(getByIdInputSchema).query(async ({ ctx, input }) => {
    const queryService = postQueryService(ctx.db);
    return await queryService.getPostById(input.id, ctx.session?.user?.id);
  }),

  /**
   * 获取用户发布的内容（重构版 - 使用查询服务）
   */
  getUserPosts: publicProcedure.input(getUserPostsInputSchema).query(async ({ ctx, input }) => {
    const queryService = postQueryService(ctx.db);
    return await queryService.getUserPosts(input);
  }),

  /**
   * 获取用户点赞的内容（重构版 - 使用查询服务）
   */
  getUserLikedPosts: authProcedure
    .input(getUserLikedPostsInputSchema)
    .query(async ({ ctx, input }) => {
      const queryService = postQueryService(ctx.db);
      return await queryService.getUserLikedPosts({
        ...input,
        currentUserId: ctx.session.user.id,
      });
    }),

  /**
   * 获取测试用的帖子列表（用于调试）
   */
  getTestPosts: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.post.findMany({
      take: 10,
      where: {
        isDeleted: false, // 排除软删除的帖子
      },
      select: {
        id: true,
        title: true,
        content: true,
        contentType: true,
        authorId: true,
        likeCount: true,
        publishedAt: true,
        createdAt: true,
        author: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return posts;
  }),
});
