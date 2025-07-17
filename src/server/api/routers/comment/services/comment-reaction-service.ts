/**
 * @fileoverview Comment反应服务
 * @description 处理Comment的点赞、反应等交互功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 反应类型
 */
export type CommentReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY';

/**
 * 反应结果接口
 */
export interface CommentReactionResult {
  message: string;
  reactionType: string | null;
  likeCount: number;
  isNewReaction: boolean;
}

/**
 * 点赞状态接口
 */
export interface CommentLikeStatus {
  isLiked: boolean;
  reactionType: string | null;
  likeCount: number;
}

/**
 * Comment反应服务类
 */
export class CommentReactionService {
  constructor(private db: PrismaClient) {}

  /**
   * 处理Comment反应（点赞/取消点赞）
   */
  async handleReaction(params: {
    commentId: string;
    userId: string;
    reactionType?: string | null;
  }): Promise<CommentReactionResult> {
    const { commentId, userId, reactionType } = params;

    console.log('=== CommentReactionService.handleReaction ===');
    console.log('用户ID:', userId);
    console.log('评论ID:', commentId);
    console.log('反应类型:', reactionType);

    // 检查评论是否存在且已审核通过
    const comment = await this.db.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        status: true,
        isDeleted: true,
        authorId: true,
      },
    });

    TRPCErrorHandler.requireResource(comment, '评论', commentId);
    TRPCErrorHandler.requirePermission(!comment.isDeleted, '评论已被删除');
    TRPCErrorHandler.requirePermission(comment.status === 'APPROVED', '评论未通过审核');

    // 检查现有反应
    const existingLike = await this.db.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    const result = await this.db.$transaction(async (tx) => {
      let message = '';
      let finalReactionType: string | null = null;

      if (!reactionType) {
        // 取消反应
        if (existingLike) {
          await this.removeReaction(tx, existingLike.id, commentId, comment.authorId!);
          message = '已取消反应';
        }
      } else {
        // 添加或更新反应
        if (existingLike) {
          await this.updateReaction(tx, existingLike.id, reactionType);
          message = '反应已更新';
        } else {
          await this.createReaction(tx, { commentId, userId, reactionType, comment });
          message = '反应成功';
        }
        finalReactionType = reactionType;
      }

      const updatedComment = await tx.comment.findUnique({
        where: { id: commentId },
        select: { likeCount: true },
      });

      return {
        message,
        reactionType: finalReactionType,
        likeCount: updatedComment?.likeCount || 0,
        isNewReaction: !existingLike && reactionType !== null,
      };
    });

    // 创建点赞通知
    if (result.isNewReaction && comment.authorId !== userId) {
      await this.createLikeNotification(commentId, userId, comment.authorId!);
    }

    return result;
  }

  /**
   * 获取用户对Comment的点赞状态
   */
  async getLikeStatus(commentId: string, userId?: string): Promise<CommentLikeStatus> {
    const comment = await this.db.comment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });

    TRPCErrorHandler.requireResource(comment, '评论', commentId);

    if (!userId) {
      return {
        isLiked: false,
        reactionType: null,
        likeCount: comment.likeCount,
      };
    }

    const like = await this.db.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
      select: { reactionType: true },
    });

    return {
      isLiked: !!like,
      reactionType: like?.reactionType || null,
      likeCount: comment.likeCount,
    };
  }

  /**
   * 获取Comment的反应统计
   */
  async getReactionStats(commentId: string): Promise<Record<string, number>> {
    const comment = await this.db.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    TRPCErrorHandler.requireResource(comment, '评论', commentId);

    const reactions = await this.db.commentLike.groupBy({
      by: ['reactionType'],
      where: { commentId },
      _count: { reactionType: true },
    });

    const stats: Record<string, number> = {};
    reactions.forEach((reaction) => {
      if (reaction.reactionType) {
        stats[reaction.reactionType] = reaction._count.reactionType;
      }
    });

    return stats;
  }

  /**
   * 移除反应
   */
  private async removeReaction(
    tx: any,
    likeId: string,
    commentId: string,
    authorId: string
  ): Promise<void> {
    await tx.commentLike.delete({
      where: { id: likeId },
    });

    await tx.comment.update({
      where: { id: commentId },
      data: {
        likeCount: { decrement: 1 },
      },
    });

    await tx.user.update({
      where: { id: authorId },
      data: {
        likeCount: { decrement: 1 },
      },
    });
  }

  /**
   * 更新反应
   */
  private async updateReaction(
    tx: any,
    likeId: string,
    reactionType: string
  ): Promise<void> {
    await tx.commentLike.update({
      where: { id: likeId },
      data: {
        reactionType,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 创建新反应
   */
  private async createReaction(
    tx: any,
    params: {
      commentId: string;
      userId: string;
      reactionType: string;
      comment: any;
    }
  ): Promise<void> {
    const { commentId, userId, reactionType, comment } = params;

    await tx.commentLike.upsert({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
      update: {
        reactionType,
        updatedAt: new Date(),
      },
      create: {
        commentId,
        userId,
        reactionType,
      },
    });

    await tx.comment.update({
      where: { id: commentId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    await tx.user.update({
      where: { id: comment.authorId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    // 触发罐头奖励
    try {
      await tx.taskCompletion.create({
        data: {
          userId,
          taskType: 'COMMENT_LIKE',
          targetId: commentId,
          cansEarned: 1,
          completedDate: new Date(),
          dailyCount: 1,
          metadata: JSON.stringify({
            reactionType,
            commentAuthorId: comment.authorId,
          }),
        },
      });
    } catch (error) {
      console.error('Failed to create task completion:', error);
    }
  }

  /**
   * 创建点赞通知
   */
  private async createLikeNotification(
    commentId: string,
    userId: string,
    authorId: string
  ): Promise<void> {
    try {
      const { NotificationHelpers } = await import('@/lib/notification-helpers');
      const commentWithDetails = await this.db.comment.findUnique({
        where: { id: commentId },
        select: {
          content: true,
          post: {
            select: {
              id: true,
              title: true,
              contentType: true,
            },
          },
        },
      });

      const likerUser = await this.db.user.findUnique({
        where: { id: userId },
        select: { username: true, displayName: true },
      });

      if (commentWithDetails && likerUser) {
        await NotificationHelpers.createCommentNotification({
          userId: authorId,
          commenterUsername: likerUser.username || likerUser.displayName || '匿名用户',
          contentType: 'comment',
          commentContent: commentWithDetails.content.substring(0, 50) + '...',
          postId: commentWithDetails.post?.id || '',
          commentId: commentId,
        });
      }
    } catch (error) {
      console.error('Failed to create comment like notification:', error);
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createCommentReactionService = (db: PrismaClient) => new CommentReactionService(db);
