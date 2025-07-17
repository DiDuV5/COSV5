/**
 * @fileoverview Post反应服务
 * @description 处理Post的点赞、反应等交互功能
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
export type ReactionType = 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY';

/**
 * 反应结果接口
 */
export interface ReactionResult {
  message: string;
  reactionType: string | null;
  likeCount: number;
  isNewReaction: boolean;
}

/**
 * 点赞状态接口
 */
export interface LikeStatus {
  isLiked: boolean;
  reactionType: string | null;
  likeCount: number;
}

/**
 * Post反应服务类
 */
export class PostReactionService {
  constructor(private db: PrismaClient) {}

  /**
   * 处理Post反应（点赞/取消点赞）
   */
  async handleReaction(params: {
    postId: string;
    userId: string;
    reactionType?: string | null;
  }): Promise<ReactionResult> {
    const { postId, userId, reactionType } = params;

    console.log('=== PostReactionService.handleReaction ===');
    console.log('用户ID:', userId);
    console.log('帖子ID:', postId);
    console.log('反应类型:', reactionType);

    // 检查内容是否存在
    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, title: true, publishedAt: true },
    });

    TRPCErrorHandler.requireResource(post, '内容', postId);

    // 检查现有反应
    const existingLike = await this.db.like.findUnique({
      where: {
        postId_userId: {
          postId,
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
          await this.removeReaction(tx, existingLike.id, postId, post.authorId);
          message = '已取消反应';
        }
      } else {
        // 添加或更新反应
        if (existingLike) {
          await this.updateReaction(tx, existingLike.id, reactionType);
          message = '反应已更新';
        } else {
          await this.createReaction(tx, { postId, userId, reactionType, post });
          message = '反应成功';
        }
        finalReactionType = reactionType;
      }

      const updatedPost = await tx.post.findUnique({
        where: { id: postId },
        select: { likeCount: true },
      });

      return {
        message,
        reactionType: finalReactionType,
        likeCount: updatedPost?.likeCount || 0,
        isNewReaction: !existingLike && reactionType !== null,
      };
    });

    // 创建点赞通知
    if (result.isNewReaction && post.authorId !== userId) {
      await this.createLikeNotification(postId, userId, post.authorId);
    }

    return result;
  }

  /**
   * 获取用户对Post的点赞状态
   */
  async getLikeStatus(postId: string, userId?: string): Promise<LikeStatus> {
    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: { likeCount: true },
    });

    TRPCErrorHandler.requireResource(post, '内容', postId);

    if (!userId) {
      return {
        isLiked: false,
        reactionType: null,
        likeCount: post.likeCount,
      };
    }

    const like = await this.db.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      select: { reactionType: true },
    });

    return {
      isLiked: !!like,
      reactionType: like?.reactionType || null,
      likeCount: post.likeCount,
    };
  }

  /**
   * 获取Post的反应统计
   */
  async getReactionStats(postId: string): Promise<Record<string, number>> {
    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    TRPCErrorHandler.requireResource(post, '内容', postId);

    const reactions = await this.db.like.groupBy({
      by: ['reactionType'],
      where: { postId },
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
    postId: string,
    authorId: string
  ): Promise<void> {
    await tx.like.delete({
      where: { id: likeId },
    });

    await tx.post.update({
      where: { id: postId },
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
    await tx.like.update({
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
      postId: string;
      userId: string;
      reactionType: string;
      post: any;
    }
  ): Promise<void> {
    const { postId, userId, reactionType, post } = params;

    await tx.like.upsert({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      update: {
        reactionType,
        updatedAt: new Date(),
      },
      create: {
        postId,
        userId,
        reactionType,
      },
    });

    await tx.post.update({
      where: { id: postId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    await tx.user.update({
      where: { id: post.authorId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    // 触发罐头奖励
    try {
      await tx.taskCompletion.create({
        data: {
          userId,
          taskType: 'LIKE',
          targetId: postId,
          cansEarned: 2,
          completedDate: new Date(),
          dailyCount: 1,
          metadata: JSON.stringify({
            reactionType,
            postAuthorId: post.authorId,
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
    postId: string,
    userId: string,
    authorId: string
  ): Promise<void> {
    try {
      const { NotificationHelpers } = await import('@/lib/notification-helpers');
      const postWithDetails = await this.db.post.findUnique({
        where: { id: postId },
        select: {
          title: true,
          contentType: true,
          content: true,
        },
      });

      const likerUser = await this.db.user.findUnique({
        where: { id: userId },
        select: { username: true, displayName: true },
      });

      if (postWithDetails && likerUser) {
        await NotificationHelpers.createLikeNotification({
          userId: authorId,
          likerUsername: likerUser.username || likerUser.displayName || '匿名用户',
          contentType: postWithDetails.contentType === 'MOMENT' ? '动态' : '作品',
          contentTitle:
            postWithDetails.title ||
            postWithDetails.content?.substring(0, 50) + '...' ||
            '无标题内容',
          postId: postId,
        });
      }
    } catch (error) {
      console.error('Failed to create like notification:', error);
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createPostReactionService = (db: PrismaClient) => new PostReactionService(db);
