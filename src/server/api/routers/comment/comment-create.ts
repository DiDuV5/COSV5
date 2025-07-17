/**
 * @fileoverview Comment创建相关的 tRPC 路由
 * @description 处理评论发布功能
 */

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { createCommentInputSchema } from "./schemas/comment-input-schemas";
import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { guestCommentProcedure } from "@/lib/security/turnstile-middleware";

export const commentCreateRouter = createTRPCRouter({
  /**
   * 发布评论
   */
  create: guestCommentProcedure
    .input(createCommentInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { contentId, content, parentId, guestName, guestContact, guestSessionId, images } = input;

      // 检查内容是否存在
      const post = await ctx.db.post.findUnique({
        where: { id: contentId },
        select: { id: true, authorId: true },
      });

      if (!post) {
        throw TRPCErrorHandler.notFound("内容不存在");
      }

      // 如果是回复，检查父评论是否存在
      if (parentId) {
        const parentComment = await ctx.db.comment.findUnique({
          where: { id: parentId },
          select: { id: true, postId: true },
        });

        if (!parentComment || parentComment.postId !== contentId) {
          throw TRPCErrorHandler.notFound("父评论不存在");
        }
      }

      const userId = ctx.session?.user?.id;

      // 游客评论需要提供昵称
      if (!userId && !guestName) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          "游客评论需要提供昵称"
        );
      }

      // 获取用户权限配置
      let requiresApproval = true;
      if (userId) {
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
          select: { userLevel: true },
        });

        if (user) {
          const permissionConfig = await ctx.db.userPermissionConfig.findUnique({
            where: { userLevel: user.userLevel },
            select: {
              canComment: true,
              requiresCommentApproval: true,
              canCommentWithImages: true,
              dailyCommentLimit: true
            },
          });

          if (!permissionConfig?.canComment) {
            throw TRPCErrorHandler.forbidden("您没有评论权限");
          }

          requiresApproval = permissionConfig.requiresCommentApproval;

          // 检查是否可以添加图片
          if (images && images.length > 0 && !permissionConfig.canCommentWithImages) {
            throw TRPCErrorHandler.forbidden("您没有在评论中添加图片的权限");
          }
        }
      }

      // 获取客户端IP地址（简化处理）
      const guestIp = !userId ? "unknown" : null;

      // 创建评论
      const comment = await ctx.db.$transaction(async (tx: any) => {
        const newComment = await tx.comment.create({
          data: {
            postId: contentId,
            content,
            parentId,
            authorId: userId,
            guestName,
            guestContact,
            guestSessionId,
            guestIp: guestIp as string,
            status: requiresApproval ? "PENDING" : "APPROVED",
          },
          include: {
            author: userId ? {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                userLevel: true,
                isVerified: true,
              },
            } : false,
          },
        });

        // 只有审核通过的评论才更新统计数据和发送通知
        if (!requiresApproval) {
          // 更新内容评论数
          await tx.post.update({
            where: { id: contentId },
            data: {
              commentCount: {
                increment: 1,
              },
            },
          });

          // 如果是回复，更新父评论的回复数
          if (parentId) {
            await tx.comment.update({
              where: { id: parentId },
              data: {
                replyCount: {
                  increment: 1,
                },
              },
            });
          }

          // 创建通知（异步处理，不影响主流程）
          if (userId) {
            setImmediate(async () => {
              try {
                const { NotificationHelpers } = await import("@/lib/notification-helpers");

                // 获取内容信息
                const post = await ctx.db.post.findUnique({
                  where: { id: contentId },
                  select: {
                    authorId: true,
                    title: true,
                    contentType: true
                  },
                });

                if (post && post.authorId !== userId) {
                  if (parentId) {
                    // 这是回复，通知被回复的用户
                    const parentComment = await ctx.db.comment.findUnique({
                      where: { id: parentId },
                      select: { authorId: true },
                    });

                    if (parentComment?.authorId && parentComment.authorId !== userId) {
                      await NotificationHelpers.createReplyNotification({
                        userId: parentComment.authorId,
                        replierUsername: ctx.session?.user?.username || "匿名用户",
                        replyContent: content,
                        postId: contentId,
                        commentId: newComment.id,
                      });
                    }
                  } else {
                    // 这是评论，通知内容作者
                    await NotificationHelpers.createCommentNotification({
                      userId: post.authorId,
                      commenterUsername: ctx.session?.user?.username || "匿名用户",
                      contentType: post.contentType === 'POST' ? '作品' : '动态',
                      commentContent: content,
                      postId: contentId,
                      commentId: newComment.id,
                    });
                  }
                }
              } catch (error) {
                // 结构化日志记录
                console.error("创建评论通知失败:", {
                  contentId: contentId,
                  commentId: newComment.id,
                  error: error instanceof Error ? error.message : String(error),
                  timestamp: new Date().toISOString(),
                });
              }
            });
          }
        }

        return newComment;
      });

        return {
          success: true,
          message: requiresApproval ? "评论发布成功，等待审核" : "评论发布成功",
          comment,
          requiresApproval,
        };
      } catch (error) {
        // 结构化日志记录
        console.error("创建评论失败:", {
          contentId: input.contentId,
          userId: ctx.session?.user?.id || 'guest',
          guestName: input.guestName,
          parentId: input.parentId,
          contentLength: input.content?.length || 0,
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
          "创建评论失败，请稍后重试"
        );
      }
    }),
});
