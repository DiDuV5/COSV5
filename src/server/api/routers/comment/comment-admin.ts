/**
 * @fileoverview Comment管理相关的 tRPC 路由
 * @description 处理评论审核、删除、置顶等管理功能
 */

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import {
  moderateCommentInputSchema,
  batchModerateInputSchema,
  togglePinInputSchema,
  softDeleteInputSchema,
} from "./schemas/comment-input-schemas";
import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";

export const commentAdminRouter = createTRPCRouter({
  /**
   * 管理员审核评论
   */
  moderate: adminProcedure
    .input(moderateCommentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { commentId, action, rejectionReason } = input;
      const adminId = ctx.session.user.id;

      // 检查评论是否存在
      const comment = await ctx.db.comment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          status: true,
          postId: true,
          parentId: true,
          authorId: true,
        },
      });

      if (!comment) {
        throw TRPCErrorHandler.notFound("评论不存在");
      }

      if (comment.status !== "PENDING") {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INVALID_OPERATION,
          "评论已经审核过了"
        );
      }

      // 执行审核操作
      const result = await ctx.db.$transaction(async (tx: any) => {
        const updatedComment = await tx.comment.update({
          where: { id: commentId },
          data: {
            status: action === "APPROVE" ? "APPROVED" : "REJECTED",
            rejectionReason: action === "REJECT" ? rejectionReason : null,
            reviewedBy: adminId,
            reviewedAt: new Date(),
          },
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
          },
        });

        // 如果审核通过，更新统计数据
        if (action === "APPROVE") {
          // 更新内容评论数
          await tx.post.update({
            where: { id: comment.postId },
            data: {
              commentCount: {
                increment: 1,
              },
            },
          });

          // 如果是回复，更新父评论的回复数
          if (comment.parentId) {
            await tx.comment.update({
              where: { id: comment.parentId },
              data: {
                replyCount: {
                  increment: 1,
                },
              },
            });
          }
        }

        return updatedComment;
      });

      return {
        success: true,
        message: action === "APPROVE" ? "评论审核通过" : "评论已拒绝",
        comment: result,
      };
    }),

  /**
   * 批量审核评论（管理员）
   */
  batchModerate: adminProcedure
    .input(batchModerateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { commentIds, action, rejectionReason } = input;
      const adminId = ctx.session.user.id;

      // 检查所有评论是否存在且为待审核状态
      const comments = await ctx.db.comment.findMany({
        where: {
          id: { in: commentIds },
          status: "PENDING",
        },
        select: {
          id: true,
          postId: true,
          parentId: true,
        },
      });

      if (comments.length !== commentIds.length) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INVALID_OPERATION,
          "部分评论不存在或已审核"
        );
      }

      // 批量审核
      const result = await ctx.db.$transaction(async (tx: any) => {
        // 更新评论状态
        await tx.comment.updateMany({
          where: { id: { in: commentIds } },
          data: {
            status: action === "APPROVE" ? "APPROVED" : "REJECTED",
            rejectionReason: action === "REJECT" ? rejectionReason : null,
            reviewedBy: adminId,
            reviewedAt: new Date(),
          },
        });

        // 如果审核通过，更新统计数据
        if (action === "APPROVE") {
          // 按内容ID分组更新评论数
          const postIds = Array.from(new Set(comments.map((c: any) => c.postId)));
          for (const postId of postIds) {
            const postCommentCount = comments.filter((c: any) => c.postId === postId).length;
            await tx.post.update({
              where: { id: postId },
              data: {
                commentCount: {
                  increment: postCommentCount,
                },
              },
            });
          }

          // 更新父评论回复数
          const parentIds = comments.filter((c: any) => c.parentId).map((c: any) => c.parentId!);
          const uniqueParentIds = Array.from(new Set(parentIds));
          for (const parentId of uniqueParentIds) {
            const replyCount = comments.filter((c: any) => c.parentId === parentId).length;
            await tx.comment.update({
              where: { id: parentId },
              data: {
                replyCount: {
                  increment: replyCount,
                },
              },
            });
          }
        }

        return comments.length;
      });

      return {
        success: true,
        message: `成功${action === "APPROVE" ? "通过" : "拒绝"}${result}条评论`,
        count: result,
      };
    }),

  /**
   * 置顶/取消置顶评论（管理员）
   */
  togglePin: adminProcedure
    .input(togglePinInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { commentId } = input;

      // 检查评论是否存在
      const comment = await ctx.db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, isPinned: true },
      });

      if (!comment) {
        throw TRPCErrorHandler.notFound("评论不存在");
      }

      // 切换置顶状态
      const updatedComment = await ctx.db.comment.update({
        where: { id: commentId },
        data: { isPinned: !comment.isPinned },
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
        },
      });

      return {
        success: true,
        message: updatedComment.isPinned ? "评论已置顶" : "评论已取消置顶",
        comment: updatedComment,
      };
    }),

  /**
   * 软删除评论（管理员）
   */
  softDelete: adminProcedure
    .input(softDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { commentId, reason } = input;
      const adminId = ctx.session.user.id;

      // 检查评论是否存在
      const comment = await ctx.db.comment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          isDeleted: true,
          postId: true,
          parentId: true,
          status: true,
        },
      });

      if (!comment) {
        throw TRPCErrorHandler.notFound("评论不存在");
      }

      if (comment.isDeleted) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INVALID_OPERATION,
          "评论已被删除"
        );
      }

      // 执行软删除
      const result = await ctx.db.$transaction(async (tx: any) => {
        const updatedComment = await tx.comment.update({
          where: { id: commentId },
          data: {
            isDeleted: true,
            deletedBy: adminId,
            deletedAt: new Date(),
            deletionReason: reason,
          },
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
          },
        });

        // 如果是已审核通过的评论，需要更新统计数据
        if (comment.status === "APPROVED") {
          // 更新内容评论数
          await tx.post.update({
            where: { id: comment.postId },
            data: {
              commentCount: {
                decrement: 1,
              },
            },
          });

          // 如果是回复，更新父评论的回复数
          if (comment.parentId) {
            await tx.comment.update({
              where: { id: comment.parentId },
              data: {
                replyCount: {
                  decrement: 1,
                },
              },
            });
          }
        }

        return updatedComment;
      });

      return {
        success: true,
        message: "评论已删除",
        comment: result,
      };
    }),
});
