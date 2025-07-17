/**
 * @fileoverview 软删除管理路由
 * @description 提供软删除管理的API接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, adminProcedure } from '@/server/api/trpc';
import { SoftDeleteService } from '@/lib/services/soft-delete-service';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { prisma } from '@/lib/prisma';

/**
 * 软删除操作Schema
 */
const softDeleteSchema = z.object({
  id: z.string().min(1, '记录ID不能为空'),
  reason: z.string().optional(),
});

const batchSoftDeleteSchema = z.object({
  model: z.enum(['post', 'comment', 'user'], {
    errorMap: () => ({ message: '不支持的模型类型' }),
  }),
  ids: z.array(z.string()).min(1, '至少选择一条记录'),
  reason: z.string().optional(),
});

const cleanupSchema = z.object({
  daysOld: z.number().min(1).max(365).default(30),
});

/**
 * 软删除管理路由
 */
export const softDeleteRouter = createTRPCRouter({
  /**
   * 软删除帖子
   */
  deletePost: adminProcedure
    .input(softDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SoftDeleteService.deletePost(input.id, {
          deletedBy: ctx.session.user.id,
          deletionReason: input.reason,
        });

        return {
          success: true,
          message: '帖子已成功删除',
          data: result,
        };
      } catch (error) {
        console.error('删除帖子失败:', error);
        throw TRPCErrorHandler.internalError('删除帖子失败');
      }
    }),

  /**
   * 恢复帖子
   */
  restorePost: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SoftDeleteService.restorePost(
          input.id,
          ctx.session.user.id
        );

        return {
          success: true,
          message: '帖子已成功恢复',
          data: result,
        };
      } catch (error) {
        console.error('恢复帖子失败:', error);
        throw TRPCErrorHandler.internalError('恢复帖子失败');
      }
    }),

  /**
   * 软删除评论
   */
  deleteComment: adminProcedure
    .input(softDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SoftDeleteService.deleteComment(input.id, {
          deletedBy: ctx.session.user.id,
          deletionReason: input.reason,
        });

        return {
          success: true,
          message: '评论已成功删除',
          data: result,
        };
      } catch (error) {
        console.error('删除评论失败:', error);
        throw TRPCErrorHandler.internalError('删除评论失败');
      }
    }),

  /**
   * 批量软删除
   */
  batchDelete: adminProcedure
    .input(batchSoftDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SoftDeleteService.batchDelete(
          input.model,
          input.ids,
          {
            deletedBy: ctx.session.user.id,
            deletionReason: input.reason,
          }
        );

        return {
          success: true,
          message: `成功删除 ${result.count} 条记录`,
          data: result,
        };
      } catch (error) {
        console.error('批量删除失败:', error);
        throw TRPCErrorHandler.internalError('批量删除失败');
      }
    }),

  /**
   * 批量恢复
   */
  batchRestore: adminProcedure
    .input(z.object({
      model: z.enum(['post', 'comment', 'user']),
      ids: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SoftDeleteService.batchRestore(
          input.model,
          input.ids,
          ctx.session.user.id
        );

        return {
          success: true,
          message: `成功恢复 ${result.count} 条记录`,
          data: result,
        };
      } catch (error) {
        console.error('批量恢复失败:', error);
        throw TRPCErrorHandler.internalError('批量恢复失败');
      }
    }),

  /**
   * 永久删除
   */
  permanentDelete: adminProcedure
    .input(z.object({
      model: z.enum(['post', 'comment', 'user']),
      ids: z.array(z.string()).min(1),
      confirm: z.literal(true, {
        errorMap: () => ({ message: '必须确认永久删除操作' }),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SoftDeleteService.permanentDelete(
          input.model,
          input.ids,
          ctx.session.user.id
        );

        return {
          success: true,
          message: `成功永久删除 ${result.count} 条记录`,
          data: result,
        };
      } catch (error) {
        console.error('永久删除失败:', error);
        throw TRPCErrorHandler.internalError('永久删除失败');
      }
    }),

  /**
   * 获取软删除统计信息
   */
  getStats: adminProcedure
    .query(async () => {
      try {
        const stats = await SoftDeleteService.getStats();
        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        console.error('获取统计信息失败:', error);
        throw TRPCErrorHandler.internalError('获取统计信息失败');
      }
    }),

  /**
   * 清理过期的软删除记录
   */
  cleanupExpired: adminProcedure
    .input(cleanupSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await SoftDeleteService.cleanupExpired(input.daysOld);

        const totalCleaned = result.posts + result.comments + result.users;

        return {
          success: true,
          message: `成功清理 ${totalCleaned} 条过期记录`,
          data: result,
        };
      } catch (error) {
        console.error('清理过期记录失败:', error);
        throw TRPCErrorHandler.internalError('清理过期记录失败');
      }
    }),

  /**
   * 获取已删除的帖子列表
   */
  getDeletedPosts: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const { page, limit, search } = input;
        const skip = (page - 1) * limit;

        const where = {
          isDeleted: true,
          ...(search && {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { content: { contains: search, mode: 'insensitive' as const } },
            ],
          }),
        };

        const [posts, total] = await Promise.all([
          prisma.post.findMany({
            where,
            select: {
              id: true,
              title: true,
              excerpt: true,
              createdAt: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.post.count({ where }),
        ]);

        return {
          success: true,
          data: {
            posts,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          },
        };
      } catch (error) {
        console.error('获取已删除帖子列表失败:', error);
        throw TRPCErrorHandler.internalError('获取已删除帖子列表失败');
      }
    }),

  /**
   * 获取已删除的评论列表
   */
  getDeletedComments: adminProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const { page, limit } = input;
        const skip = (page - 1) * limit;

        const where = { isDeleted: true };

        const [comments, total] = await Promise.all([
          prisma.comment.findMany({
            where,
            select: {
              id: true,
              content: true,
              deletedAt: true,
              deletedBy: true,
              deletionReason: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
              post: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
            orderBy: { deletedAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.comment.count({ where }),
        ]);

        return {
          success: true,
          data: {
            comments,
            pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
            },
          },
        };
      } catch (error) {
        console.error('获取已删除评论列表失败:', error);
        throw TRPCErrorHandler.internalError('获取已删除评论列表失败');
      }
    }),
});
