/**
 * @fileoverview Comment互动扩展相关的 tRPC 路由
 * @description 处理评论点赞状态查询、反应统计等功能
 */

import { createTRPCRouter, authProcedure, publicProcedure } from "@/server/api/trpc";
import {
  toggleLikeInputSchema,
  getReactionStatusInputSchema,
  getLikeStatusInputSchema,
  getReactionStatsInputSchema,
} from "./schemas/comment-input-schemas";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";

export const commentInteractionExtendedRouter = createTRPCRouter({
  /**
   * 点赞/取消点赞评论（保持向后兼容）
   */
  toggleLike: authProcedure
    .input(toggleLikeInputSchema)
    .mutation(async ({ ctx, input }) => {
      // 直接调用toggleReaction逻辑，保持向后兼容
      const { commentId } = input;
      const userId = ctx.session.user.id;

      // 检查现有反应
      const existingReaction = await ctx.db.commentLike.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId,
          },
        },
      });

      // 如果已经点赞，则取消；否则点赞
      const reactionType = existingReaction?.reactionType === 'like' ? undefined : 'like';

      // 调用内部逻辑
      const comment = await ctx.db.comment.findUnique({
        where: { id: commentId },
        select: {
          id: true,
          status: true,
          isDeleted: true,
          authorId: true,
          likeCount: true,
        },
      });

      if (!comment || comment.isDeleted || comment.status !== "APPROVED") {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INVALID_OPERATION,
          "无法对此评论进行反应"
        );
      }

      const result = await ctx.db.$transaction(async (tx: any) => {
        if (!reactionType) {
          // 取消点赞
          if (existingReaction) {
            await tx.commentLike.delete({
              where: { id: existingReaction.id },
            });
          }
        } else {
          // 点赞
          if (existingReaction) {
            await tx.commentLike.update({
              where: { id: existingReaction.id },
              data: { reactionType, updatedAt: new Date() },
            });
          } else {
            await tx.commentLike.create({
              data: { commentId, userId, reactionType },
            });
          }
        }

        // 重新计算点赞数（包含所有正面反应类型）
        const likeCount = await tx.commentLike.count({
          where: {
            commentId,
            reactionType: {
              in: ['like', 'HEART', 'THUMBS_UP', 'FIRE', 'HUNDRED', 'CLAP', 'STAR']
            }
          },
        });

        await tx.comment.update({
          where: { id: commentId },
          data: { likeCount },
        });

        return {
          likeCount,
          liked: !!reactionType,
          isNewLike: !existingReaction && !!reactionType
        };
      });

      // 在事务外创建评论点赞通知（仅新点赞且不是给自己点赞）
      if (result.isNewLike && comment.authorId && comment.authorId !== userId) {
        try {
          const { NotificationHelpers } = await import("@/lib/notification-helpers");
          const commentWithPost = await ctx.db.comment.findUnique({
            where: { id: commentId },
            select: {
              content: true,
              post: {
                select: {
                  id: true,
                  title: true,
                  contentType: true,
                  content: true,
                },
              },
            },
          });

          const likerUser = await ctx.db.user.findUnique({
            where: { id: userId },
            select: { username: true, displayName: true },
          });

          if (commentWithPost && likerUser) {
            // 创建评论点赞通知（使用评论通知类型）
            await NotificationHelpers.createCommentNotification({
              userId: comment.authorId,
              commenterUsername: likerUser.username || likerUser.displayName || '匿名用户',
              contentType: commentWithPost.post?.contentType === 'MOMENT' ? '动态' : '作品',
              commentContent: `点赞了您的评论：${commentWithPost.content?.substring(0, 50)}...`,
              postId: commentWithPost.post?.id || '',
              commentId: commentId,
            });
          }
        } catch (error) {
          console.error("创建评论点赞通知失败:", error);
          // 通知失败不影响点赞功能
        }
      }

      return {
        success: true,
        message: result.liked ? "点赞成功" : "已取消点赞",
        liked: result.liked,
        likeCount: result.likeCount,
      };
    }),

  /**
   * 获取用户对评论的反应状态
   */
  getReactionStatus: authProcedure
    .input(getReactionStatusInputSchema)
    .query(async ({ ctx, input }) => {
      const { commentIds } = input;
      const userId = ctx.session.user.id;

      const reactions = await ctx.db.commentLike.findMany({
        where: {
          commentId: { in: commentIds },
          userId,
        },
        select: {
          commentId: true,
          reactionType: true,
        },
      });

      const reactionStatus: Record<string, {
        reactionType: string | null;
        isLiked: boolean;
        isDisliked: boolean;
      }> = {};

      commentIds.forEach(id => {
        const reaction = reactions.find((r: any) => r.commentId === id);
        reactionStatus[id] = {
          reactionType: reaction?.reactionType || null,
          isLiked: reaction?.reactionType === 'like',
          isDisliked: reaction?.reactionType === 'dislike',
        };
      });

      return reactionStatus;
    }),

  /**
   * 获取用户对评论的点赞状态（保持向后兼容）
   */
  getLikeStatus: authProcedure
    .input(getLikeStatusInputSchema)
    .query(async ({ ctx, input }) => {
      const { commentIds } = input;
      const userId = ctx.session.user.id;

      const likes = await ctx.db.commentLike.findMany({
        where: {
          commentId: { in: commentIds },
          userId,
        },
        select: {
          commentId: true,
          reactionType: true,
        },
      });

      const likeStatus: Record<string, { isLiked: boolean; reactionType: string | null }> = {};
      commentIds.forEach(id => {
        const like = likes.find((like: any) => like.commentId === id);
        likeStatus[id] = {
          isLiked: like?.reactionType === 'like',
          reactionType: like?.reactionType || null,
        };
      });

      return likeStatus;
    }),

  /**
   * 获取评论的表情反应统计
   */
  getReactionStats: publicProcedure
    .input(getReactionStatsInputSchema)
    .query(async ({ ctx, input }) => {
      const { commentId, includeUsers, limit } = input;

      // 检查评论是否存在
      const comment = await ctx.db.comment.findUnique({
        where: { id: commentId },
        select: { id: true, likeCount: true },
      });

      if (!comment) {
        throw TRPCErrorHandler.notFound("评论不存在");
      }

      // 获取表情统计
      const reactionStats = await ctx.db.commentLike.groupBy({
        by: ['reactionType'],
        where: { commentId },
        _count: {
          reactionType: true,
        },
        orderBy: {
          _count: {
            reactionType: 'desc',
          },
        },
      });

      // 如果需要包含用户信息
      const statsWithUsers = await Promise.all(
        reactionStats.map(async (stat) => {
          let users: any[] = [];

          if (includeUsers) {
            const likes = await ctx.db.commentLike.findMany({
              where: {
                commentId,
                reactionType: stat.reactionType,
              },
              take: limit,
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            });

            users = likes.map(like => like.user);
          }

          return {
            type: stat.reactionType,
            count: stat._count.reactionType,
            users,
          };
        })
      );

      return {
        totalCount: comment.likeCount,
        reactions: statsWithUsers,
      };
    }),
});
