/**
 * @fileoverview 草稿管理路由
 * @description 处理用户草稿的创建、保存、加载和删除
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { z } from 'zod';
import { createTRPCRouter, authProcedure } from '@/server/api/trpc';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

// 草稿数据结构
const draftSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200字符'),
  description: z.string().max(1000, '描述不能超过1000字符').optional(),
  content: z.string().max(5000, '内容不能超过5000字符').optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY']).default('PUBLIC'),
  allowComments: z.boolean().default(true),
  allowDownload: z.boolean().default(false),
  mediaIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  downloadLinks: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string().optional(),
  })).optional(),
  // 编辑模式相关
  editingPostId: z.string().optional(), // 如果是编辑现有作品，记录原作品ID
});

const saveDraftInputSchema = draftSchema;
const loadDraftInputSchema = z.object({
  draftId: z.string(),
});

const deleteDraftInputSchema = z.object({
  draftId: z.string(),
});

const loadPostForEditInputSchema = z.object({
  postId: z.string(),
});

export const draftRouter = createTRPCRouter({
  /**
   * 保存草稿
   */
  saveDraft: authProcedure
    .input(saveDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        // 检查用户草稿数量限制（最多5个）
        const existingDrafts = await ctx.db.draft.findMany({
          where: {
            authorId: userId,
            isDeleted: false,
          },
        });

        // 如果是新草稿且已达到限制
        if (!input.id && existingDrafts.length >= 5) {
          throw TRPCErrorHandler.validationError(
            '草稿数量已达上限（5个），请删除一些草稿后再试'
          );
        }

        const draftData = {
          title: input.title,
          description: input.description || '',
          content: input.content || '',
          visibility: input.visibility,
          allowComments: input.allowComments,
          allowDownload: input.allowDownload,
          mediaIds: input.mediaIds || [],
          tags: input.tags || [],
          downloadLinks: input.downloadLinks || [],
          editingPostId: input.editingPostId,
          authorId: userId,
          updatedAt: new Date(),
        };

        let draft;
        if (input.id) {
          // 更新现有草稿
          draft = await ctx.db.draft.update({
            where: {
              id: input.id,
              authorId: userId, // 确保只能更新自己的草稿
            },
            data: draftData,
          });
        } else {
          // 创建新草稿
          draft = await ctx.db.draft.create({
            data: {
              ...draftData,
              createdAt: new Date(),
            },
          });
        }

        return {
          success: true,
          draftId: draft.id,
          message: '草稿保存成功',
        };
      } catch (error) {
        console.error('保存草稿失败:', error);
        throw TRPCErrorHandler.internalError(
          '保存草稿失败，请稍后重试'
        );
      }
    }),

  /**
   * 获取用户的所有草稿
   */
  getUserDrafts: authProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        const drafts = await ctx.db.draft.findMany({
          where: {
            authorId: userId,
            isDeleted: false,
          },
          orderBy: {
            updatedAt: 'desc',
          },
          select: {
            id: true,
            title: true,
            description: true,
            content: true,
            editingPostId: true,
            createdAt: true,
            updatedAt: true,
            mediaIds: true,
            tags: true,
          },
        });

        return drafts.map((draft: any) => ({
          ...draft,
          isEditing: !!draft.editingPostId,
          mediaCount: draft.mediaIds?.length || 0,
          tagCount: draft.tags?.length || 0,
          contentPreview: draft.content ?
            draft.content.substring(0, 100) + (draft.content.length > 100 ? '...' : '') :
            '',
        }));
      } catch (error) {
        console.error('获取草稿列表失败:', error);
        throw TRPCErrorHandler.internalError(
          '获取草稿列表失败，请稍后重试'
        );
      }
    }),

  /**
   * 加载草稿详情
   */
  loadDraft: authProcedure
    .input(loadDraftInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const draft = await ctx.db.draft.findFirst({
          where: {
            id: input.draftId,
            authorId: userId,
            isDeleted: false,
          },
        });

        if (!draft) {
          throw TRPCErrorHandler.notFound('草稿不存在或已被删除');
        }

        return draft;
      } catch (error) {
        console.error('加载草稿失败:', error);
        if (error instanceof Error && error.message.includes('草稿不存在')) {
          throw error;
        }
        throw TRPCErrorHandler.internalError(
          '加载草稿失败，请稍后重试'
        );
      }
    }),

  /**
   * 删除草稿
   */
  deleteDraft: authProcedure
    .input(deleteDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        await ctx.db.draft.update({
          where: {
            id: input.draftId,
            authorId: userId,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });

        return {
          success: true,
          message: '草稿删除成功',
        };
      } catch (error) {
        console.error('删除草稿失败:', error);
        throw TRPCErrorHandler.internalError(
          '删除草稿失败，请稍后重试'
        );
      }
    }),

  /**
   * 加载作品数据用于编辑
   */
  loadPostForEdit: authProcedure
    .input(loadPostForEditInputSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const post = await ctx.db.post.findFirst({
          where: {
            id: input.postId,
            isDeleted: false,
          },
          include: {
            media: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                userLevel: true,
              },
            },
            downloadLinks: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        });

        if (!post) {
          throw TRPCErrorHandler.notFound('作品不存在或已被删除');
        }

        // 权限检查
        const isAuthor = post.authorId === userId;
        const isAdmin = ctx.session.user.userLevel === 'ADMIN' ||
                       ctx.session.user.userLevel === 'SUPER_ADMIN';

        if (!isAuthor && !isAdmin) {
          throw TRPCErrorHandler.forbidden('您没有权限编辑此作品');
        }

        // 转换为草稿格式
        return {
          title: post.title,
          description: post.description || '',
          content: post.content || '',
          visibility: post.visibility,
          allowComments: post.allowComments,
          allowDownload: post.allowDownload,
          mediaIds: post.media?.map((m: any) => m.id) || [],
          tags: Array.isArray(post.tags) ? post.tags : [],
          downloadLinks: post.downloadLinks || [],
          editingPostId: post.id,
          originalPost: post,
        };
      } catch (error) {
        console.error('加载作品编辑数据失败:', error);
        if (error instanceof Error && (
          error.message.includes('作品不存在') ||
          error.message.includes('没有权限')
        )) {
          throw error;
        }
        throw TRPCErrorHandler.internalError(
          '加载作品数据失败，请稍后重试'
        );
      }
    }),
});
