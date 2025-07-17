/**
 * @fileoverview Post管理CRUD操作相关的tRPC路由
 * @description 处理内容删除、恢复、永久删除等CRUD功能
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { createTRPCRouter, authProcedure, adminProcedure } from "@/server/api/trpc";
import { TransactionManager } from "@/lib/transaction";
import {
  deletePostInputSchema,
} from "./schemas/post-input-schemas";

export const postAdminCrudRouter = createTRPCRouter({
  /**
   * 用户删除自己的帖子
   */
  deleteMyPost: authProcedure
    .input(deletePostInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, reason } = input;
      const userId = ctx.session.user.id;

      // 使用事务管理器软删除帖子
      const result = await TransactionManager.softDeletePost(id, userId, reason);

      if (!result.success) {
        if (result.error?.includes('权限')) {
          throw TRPCErrorHandler.forbidden(result.error || "删除失败");
        } else {
          throw TRPCErrorHandler.internalError(result.error || "删除失败");
        }
      }

      return {
        success: true,
        message: "帖子已软删除，管理员可在后台恢复",
        deletedMediaCount: 0, // 软删除不删除媒体文件
      };
    }),

  /**
   * 管理员：删除内容
   */
  delete: adminProcedure
    .input(deletePostInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, reason } = input;
      const adminId = ctx.session.user.id;

      try {
        // 使用事务管理器软删除帖子
        const result = await TransactionManager.softDeletePost(id, adminId, reason);

        if (!result.success) {
          throw TRPCErrorHandler.internalError(result.error || "删除失败");
        }

        return {
          success: true,
          message: "内容已删除",
        };
      } catch (error) {
        console.error('管理员删除内容失败:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        // 处理特定的业务错误
        if (error instanceof Error) {
          if (error.message.includes('不存在')) {
            throw TRPCErrorHandler.businessError(
              BusinessErrorType.RESOURCE_NOT_FOUND,
              "要删除的内容不存在"
            );
          }
          if (error.message.includes('权限')) {
            throw TRPCErrorHandler.forbidden("没有权限删除此内容");
          }
        }

        throw TRPCErrorHandler.internalError("删除内容时发生未知错误");
      }
    }),

  /**
   * 管理员：恢复已删除的内容
   */
  restore: adminProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, reason } = input;

      try {
        const post = await ctx.db.post.update({
          where: { id },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            deletionReason: null,
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "内容已恢复",
          post,
        };
      } catch (error) {
        console.error('恢复内容失败:', error);
        throw TRPCErrorHandler.internalError("恢复内容失败");
      }
    }),

  /**
   * 管理员：永久删除内容（不可恢复）
   */
  permanentDelete: adminProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().min(5, "删除原因至少5个字符"),
      confirmText: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, reason, confirmText } = input;

      // 验证确认文本
      if (confirmText !== "永久删除") {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          "确认文本不正确，请输入'永久删除'"
        );
      }

      try {
        // 检查帖子是否存在
        const existingPost = await ctx.db.post.findUnique({
          where: { id },
          include: {
            media: true,
          },
        });

        if (!existingPost) {
          throw TRPCErrorHandler.businessError(
            BusinessErrorType.RESOURCE_NOT_FOUND,
            "要删除的内容不存在"
          );
        }

        // 使用事务删除帖子和相关数据
        await ctx.db.$transaction(async (tx: any) => {
          // 删除相关的媒体文件记录
          await tx.postMedia.deleteMany({
            where: { postId: id },
          });

          // 删除相关的点赞记录
          await tx.like.deleteMany({
            where: { postId: id },
          });

          // 删除相关的评论记录
          await tx.comment.deleteMany({
            where: { postId: id },
          });

          // 最后删除帖子本身
          await tx.post.delete({
            where: { id },
          });
        });

        return {
          success: true,
          message: "内容已永久删除",
          deletedMediaCount: existingPost.media?.length || 0,
        };
      } catch (error) {
        console.error('永久删除内容失败:', error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw TRPCErrorHandler.internalError("永久删除内容失败");
      }
    }),
});
