/**
 * @fileoverview Post管理更新操作相关的tRPC路由
 * @description 处理内容更新功能
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, authProcedure, adminProcedure } from "@/server/api/trpc";
import {
  updatePostInputSchema,
} from "./schemas/post-input-schemas";

export const postAdminUpdateRouter = createTRPCRouter({
  /**
   * 作者：更新自己的内容
   */
  updateMyPost: authProcedure
    .input(updatePostInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const userId = ctx.session.user.id;

      try {
        // 检查帖子是否存在且属于当前用户
        const existingPost = await ctx.db.post.findFirst({
          where: {
            id,
            authorId: userId,
            isDeleted: false,
          },
        });

        if (!existingPost) {
          throw TRPCErrorHandler.businessError(
            BusinessErrorType.RESOURCE_NOT_FOUND,
            "帖子不存在或您没有权限编辑"
          );
        }

        // 处理 isDraft 字段转换
        const { isDraft, mediaIds, ...restUpdateData } = updateData;
        const finalUpdateData = {
          ...restUpdateData,
          ...(updateData.tags && { tags: JSON.stringify(updateData.tags) }),
          ...(isDraft !== undefined && {
            publishedAt: isDraft ? null : (existingPost.publishedAt || new Date())
          }),
          updatedAt: new Date(),
        };

        // 使用事务处理内容和媒体文件更新
        const updatedPost = await ctx.db.$transaction(async (tx: any) => {
          // 更新内容
          const post = await tx.post.update({
            where: { id },
            data: finalUpdateData as any,
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  userLevel: true,
                  isVerified: true,
                },
              },
              media: {
                orderBy: { order: 'asc' },
                take: 10,
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          });

          // 处理媒体文件更新
          if (mediaIds !== undefined) {
            // 先清除现有的媒体文件关联
            await tx.postMedia.updateMany({
              where: { postId: id },
              data: { postId: null },
            });

            // 关联新的媒体文件
            if (mediaIds.length > 0) {
              await tx.postMedia.updateMany({
                where: {
                  id: { in: mediaIds },
                },
                data: {
                  postId: id,
                },
              });
            }
          }

          return post;
        });

        return {
          success: true,
          message: "内容更新成功",
          post: {
            ...updatedPost,
            tags: updatedPost.tags ? JSON.parse(updatedPost.tags) : [],
            likeCount: updatedPost._count.likes,
            commentCount: updatedPost._count.comments,
          },
        };
      } catch (error) {
        console.error('更新内容失败:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw TRPCErrorHandler.internalError("更新内容失败");
      }
    }),

  /**
   * 管理员：更新内容
   */
  update: adminProcedure
    .input(updatePostInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const adminId = ctx.session.user.id;

      try {
        // 检查帖子是否存在
        const existingPost = await ctx.db.post.findUnique({
          where: { id },
        });

        if (!existingPost) {
          throw TRPCErrorHandler.businessError(
            BusinessErrorType.RESOURCE_NOT_FOUND,
            "要更新的内容不存在"
          );
        }

        // 处理 isDraft 字段转换
        const { isDraft, mediaIds, ...restUpdateData } = updateData;
        const finalUpdateData = {
          ...restUpdateData,
          ...(updateData.tags && { tags: JSON.stringify(updateData.tags) }),
          ...(isDraft !== undefined && {
            publishedAt: isDraft ? null : (existingPost.publishedAt || new Date())
          }),
          updatedAt: new Date(),
        };

        // 使用事务处理内容和媒体文件更新
        const updatedPost = await ctx.db.$transaction(async (tx: any) => {
          // 更新内容
          const post = await tx.post.update({
            where: { id },
            data: finalUpdateData as any,
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  userLevel: true,
                  isVerified: true,
                },
              },
              media: {
                orderBy: {
                  order: "asc",
                },
              },
              _count: {
                select: {
                  likes: true,
                  comments: true,
                },
              },
            },
          });

          // 处理媒体文件更新
          if (mediaIds !== undefined) {
            // 先清除现有的媒体文件关联
            await tx.postMedia.updateMany({
              where: { postId: id },
              data: { postId: null },
            });

            // 关联新的媒体文件
            if (mediaIds.length > 0) {
              await tx.postMedia.updateMany({
                where: {
                  id: { in: mediaIds },
                },
                data: {
                  postId: id,
                },
              });
            }
          }

          return post;
        });

        return {
          success: true,
          message: "内容更新成功",
          post: {
            ...updatedPost,
            tags: updatedPost.tags ? JSON.parse(updatedPost.tags) : [],
            likeCount: updatedPost._count.likes,
            commentCount: updatedPost._count.comments,
          },
        };
      } catch (error) {
        console.error('管理员更新内容失败:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw TRPCErrorHandler.internalError("更新内容失败");
      }
    }),
});
