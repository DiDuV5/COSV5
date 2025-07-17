/**
 * @fileoverview Post创建相关的tRPC路由
 * @description 处理内容创建、动态发布等功能
 */

import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, authProcedure, creatorProcedure } from "@/server/api/trpc";
import { encrypt } from "@/lib/encryption";
import {
  createPostInputSchema,
  createMomentInputSchema,
} from "./schemas/post-input-schemas";

export const postCreateRouter = createTRPCRouter({
  /**
   * 创建内容（作品）
   */
  create: creatorProcedure
    .input(createPostInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const authorId = ctx.session.user.id;
        const {
          title,
          content,
          description,
          category,
          tags,
          visibility,
          isPublic,
          isPremium,
          isDraft,
          contentType,
          mediaIds,
          downloadLinks,
        } = input;

        const publishedAt = !isDraft ? new Date() : null;

      const post = await ctx.db.$transaction(async (tx: any) => {
        // 创建内容
        const newPost = await tx.post.create({
          data: {
            title,
            content,
            description,
            category,
            visibility,
            isPublic,
            isPremium,
            contentType,
            publishedAt,
            authorId,
          },
        });

        // 关联媒体文件
        if (mediaIds && mediaIds.length > 0) {
          await tx.postMedia.updateMany({
            where: {
              id: { in: mediaIds },
            },
            data: {
              postId: newPost.id,
            },
          });
        }

        // 处理标签
        if (tags && tags.length > 0) {
          await tx.post.update({
            where: { id: newPost.id },
            data: {
              tags: JSON.stringify(tags),
            },
          });
        }

        // 创建下载链接
        if (downloadLinks && downloadLinks.length > 0) {
          for (const link of downloadLinks) {
            await tx.downloadLink.create({
              data: {
                postId: newPost.id,
                userId: ctx.session.user.id,
                platform: link.platform,
                url: encrypt(link.url),
                extractCode: link.extractCode ? encrypt(link.extractCode) : null,
                cansPrice: link.cansPrice,
                title: link.title,
                description: link.description,
                sortOrder: link.sortOrder,
                isActive: true,
              },
            });
          }
        }

        // 如果发布，更新作者的内容数量
        if (!isDraft) {
          await tx.user.update({
            where: { id: authorId },
            data: {
              postsCount: {
                increment: 1,
              },
            },
          });
        }

        // 返回完整的帖子信息
        return await tx.post.findUnique({
          where: { id: newPost.id },
          include: {
            media: {
              orderBy: { order: 'asc' },
            },
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });
      });

        return {
          success: true,
          message: !isDraft ?
            (contentType === "MOMENT" ? "动态发布成功" : "作品发布成功") :
            "草稿保存成功",
          post: {
            id: post!.id,
            title: post!.title,
            isDraft: !post!.publishedAt,
            contentType: post!.contentType,
            publishedAt: post!.publishedAt,
            mediaCount: post!.media?.length || 0,
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error("创建内容失败:", {
          authorId: ctx.session.user.id,
          contentType: input.contentType,
          title: input.title,
          isDraft: input.isDraft,
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
          "创建内容失败，请稍后重试"
        );
      }
    }),

  /**
   * 创建动态
   */
  createMoment: authProcedure
    .input(createMomentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const authorId = ctx.session.user.id;
        const { content, tags, visibility, mediaIds } = input;

      // 检查用户权限
      const user = await ctx.db.user.findUnique({
        where: { id: authorId },
        select: { userLevel: true },
      });

      if (!user) {
        throw TRPCErrorHandler.notFound("用户不存在");
      }

      // 获取权限配置
      const permissionConfig = await ctx.db.userPermissionConfig.findUnique({
        where: { userLevel: user.userLevel },
      });

      if (!permissionConfig?.canPublishMoments) {
        throw TRPCErrorHandler.forbidden("您没有发布动态的权限");
      }

      // 检查内容长度限制
      if (content.length < permissionConfig.momentMinLength ||
          content.length > permissionConfig.momentMaxLength) {
        throw TRPCErrorHandler.validationError(`动态内容长度必须在 ${permissionConfig.momentMinLength}-${permissionConfig.momentMaxLength} 字符之间`);
      }

      // 检查今日发布限制
      if (permissionConfig.dailyMomentsLimit > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayCount = await ctx.db.post.count({
          where: {
            authorId,
            contentType: 'MOMENT',
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        });

        if (todayCount >= permissionConfig.dailyMomentsLimit) {
          throw TRPCErrorHandler.rateLimitError(`今日动态发布次数已达上限（${permissionConfig.dailyMomentsLimit}次）`);
        }
      }

      const post = await ctx.db.$transaction(async (tx: any) => {
        // 创建动态
        const newPost = await tx.post.create({
          data: {
            title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            content,
            contentType: 'MOMENT',
            visibility,
            isPublic: visibility === 'PUBLIC',
            publishedAt: new Date(),
            authorId,
          },
        });

        // 关联媒体文件
        if (mediaIds && mediaIds.length > 0) {
          await tx.postMedia.updateMany({
            where: {
              id: { in: mediaIds },
            },
            data: {
              postId: newPost.id,
            },
          });
        }

        // 处理标签
        if (tags && tags.length > 0) {
          await tx.post.update({
            where: { id: newPost.id },
            data: {
              tags: JSON.stringify(tags),
            },
          });
        }

        // 更新作者的内容数量
        await tx.user.update({
          where: { id: authorId },
          data: {
            postsCount: {
              increment: 1,
            },
          },
        });

        // 返回完整的动态信息
        return await tx.post.findUnique({
          where: { id: newPost.id },
          include: {
            media: {
              orderBy: { order: 'asc' },
            },
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });
      });

        return {
          success: true,
          message: "动态发布成功",
          post: {
            id: post!.id,
            title: post!.title,
            content: post!.content,
            contentType: post!.contentType,
            publishedAt: post!.publishedAt,
            mediaCount: post!.media?.length || 0,
          },
        };
      } catch (error) {
        // 结构化日志记录
        console.error("创建动态失败:", {
          authorId: ctx.session.user.id,
          contentLength: input.content?.length || 0,
          visibility: input.visibility,
          mediaCount: input.mediaIds?.length || 0,
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
          "创建动态失败，请稍后重试"
        );
      }
    }),
});
