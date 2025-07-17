/**
 * @fileoverview Comment交互统计服务
 * @description 处理Comment的交互统计、批量状态查询等功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 批量点赞状态接口
 */
export interface BatchCommentLikeStatus {
  [commentId: string]: {
    isLiked: boolean;
    reactionType: string | null;
  };
}

/**
 * 反应统计接口
 */
export interface CommentReactionStatsResult {
  totalCount: number;
  reactions: Array<{
    type: string | null;
    count: number;
    users: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      isVerified: boolean;
    }>;
  }>;
}

/**
 * Comment交互统计服务类
 */
export class CommentInteractionService {
  constructor(private db: PrismaClient) {}

  /**
   * 获取用户对多个Comment的点赞状态
   */
  async getBatchLikeStatus(commentIds: string[], userId: string): Promise<BatchCommentLikeStatus> {
    const likes = await this.db.commentLike.findMany({
      where: {
        commentId: { in: commentIds },
        userId,
      },
      select: {
        commentId: true,
        reactionType: true,
      },
    });

    const likeStatus: BatchCommentLikeStatus = {};
    commentIds.forEach(id => {
      const like = likes.find(like => like.commentId === id);
      likeStatus[id] = {
        isLiked: !!like,
        reactionType: like?.reactionType || null,
      };
    });

    return likeStatus;
  }

  /**
   * 获取Comment的详细反应统计
   */
  async getDetailedReactionStats(params: {
    commentId: string;
    includeUsers?: boolean;
    limit?: number;
  }): Promise<CommentReactionStatsResult> {
    const { commentId, includeUsers = false, limit = 10 } = params;

    const comment = await this.db.comment.findUnique({
      where: { id: commentId },
      select: { id: true, likeCount: true },
    });

    TRPCErrorHandler.requireResource(comment, '评论', commentId);

    const reactionStats = await this.db.commentLike.groupBy({
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

    const statsWithUsers = await Promise.all(
      reactionStats.map(async stat => {
        let users: any[] = [];

        if (includeUsers) {
          const likes = await this.db.commentLike.findMany({
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
  }

  /**
   * 获取用户的评论互动历史
   */
  async getUserCommentInteractionHistory(params: {
    userId: string;
    limit?: number;
    cursor?: string;
  }): Promise<{
    interactions: any[];
    nextCursor?: string;
  }> {
    const { userId, limit = 20, cursor } = params;

    const likes = await this.db.commentLike.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: { userId },
      include: {
        comment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                contentType: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let nextCursor: string | undefined = undefined;
    if (likes.length > limit) {
      const nextItem = likes.pop();
      nextCursor = nextItem!.id;
    }

    const interactions = likes.map(like => ({
      id: like.id,
      type: 'COMMENT_LIKE',
      reactionType: like.reactionType,
      createdAt: like.createdAt,
      comment: like.comment,
    }));

    return {
      interactions,
      nextCursor,
    };
  }

  /**
   * 获取Comment的互动趋势
   */
  async getCommentInteractionTrends(params: {
    commentId: string;
    timeRange?: '24h' | '7d' | '30d';
  }): Promise<{
    likes: Array<{ date: string; count: number }>;
  }> {
    const { commentId, timeRange = '7d' } = params;

    const comment = await this.db.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    TRPCErrorHandler.requireResource(comment, '评论', commentId);

    const now = new Date();
    const ranges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const startDate = ranges[timeRange];

    // 获取点赞趋势
    const likes = await this.db.commentLike.findMany({
      where: {
        commentId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 按日期分组统计
    const likeTrends = this.groupByDate(likes, timeRange);

    return {
      likes: likeTrends,
    };
  }

  /**
   * 获取热门评论互动
   */
  async getPopularCommentInteractions(params: {
    timeRange?: '24h' | '7d' | '30d';
    limit?: number;
    postId?: string;
  }): Promise<any[]> {
    const { timeRange = '7d', limit = 10, postId } = params;

    const now = new Date();
    const ranges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const startDate = ranges[timeRange];

    const whereCondition: any = {
      status: 'APPROVED',
      isDeleted: false,
      likes: {
        some: {
          createdAt: { gte: startDate },
        },
      },
    };

    if (postId) {
      whereCondition.postId = postId;
    }

    return this.db.comment.findMany({
      take: limit,
      where: whereCondition,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            contentType: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: {
        likeCount: 'desc',
      },
    });
  }

  /**
   * 按日期分组统计
   */
  private groupByDate(
    items: Array<{ createdAt: Date }>,
    timeRange: '24h' | '7d' | '30d'
  ): Array<{ date: string; count: number }> {
    const groups: Record<string, number> = {};

    items.forEach(item => {
      let dateKey: string;
      
      if (timeRange === '24h') {
        // 按小时分组
        dateKey = item.createdAt.toISOString().substring(0, 13) + ':00:00.000Z';
      } else {
        // 按天分组
        dateKey = item.createdAt.toISOString().substring(0, 10);
      }

      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });

    return Object.entries(groups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

/**
 * 导出服务创建函数
 */
export const createCommentInteractionService = (db: PrismaClient) => new CommentInteractionService(db);
