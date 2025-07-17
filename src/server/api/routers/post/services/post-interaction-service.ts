/**
 * @fileoverview Post交互统计服务
 * @description 处理Post的交互统计、批量状态查询等功能
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
export interface BatchLikeStatus {
  [postId: string]: {
    isLiked: boolean;
    reactionType: string | null;
  };
}

/**
 * 反应统计接口
 */
export interface ReactionStatsResult {
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
 * Post交互统计服务类
 */
export class PostInteractionService {
  constructor(private db: PrismaClient) {}

  /**
   * 获取用户对多个Post的点赞状态
   */
  async getBatchLikeStatus(postIds: string[], userId: string): Promise<BatchLikeStatus> {
    const likes = await this.db.like.findMany({
      where: {
        postId: { in: postIds },
        userId,
      },
      select: {
        postId: true,
        reactionType: true,
      },
    });

    const likeStatus: BatchLikeStatus = {};
    postIds.forEach(id => {
      const like = likes.find(like => like.postId === id);
      likeStatus[id] = {
        isLiked: !!like,
        reactionType: like?.reactionType || null,
      };
    });

    return likeStatus;
  }

  /**
   * 获取Post的详细反应统计
   */
  async getDetailedReactionStats(params: {
    postId: string;
    includeUsers?: boolean;
    limit?: number;
  }): Promise<ReactionStatsResult> {
    const { postId, includeUsers = false, limit = 10 } = params;

    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: { id: true, likeCount: true },
    });

    TRPCErrorHandler.requireResource(post, '内容', postId);

    const reactionStats = await this.db.like.groupBy({
      by: ['reactionType'],
      where: { postId },
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
          const likes = await this.db.like.findMany({
            where: {
              postId,
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
      totalCount: post.likeCount,
      reactions: statsWithUsers,
    };
  }

  /**
   * 获取用户的互动历史
   */
  async getUserInteractionHistory(params: {
    userId: string;
    limit?: number;
    cursor?: string;
    type?: 'LIKE' | 'COMMENT' | 'SHARE';
  }): Promise<{
    interactions: any[];
    nextCursor?: string;
  }> {
    const { userId, limit = 20, cursor, type } = params;

    let interactions: any[] = [];

    if (!type || type === 'LIKE') {
      const likes = await this.db.like.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: { userId },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              content: true,
              contentType: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      interactions = likes.map(like => ({
        id: like.id,
        type: 'LIKE',
        reactionType: like.reactionType,
        createdAt: like.createdAt,
        post: like.post,
      }));
    }

    let nextCursor: string | undefined = undefined;
    if (interactions.length > limit) {
      const nextItem = interactions.pop();
      nextCursor = nextItem!.id;
    }

    return {
      interactions,
      nextCursor,
    };
  }

  /**
   * 获取Post的互动趋势
   */
  async getInteractionTrends(params: {
    postId: string;
    timeRange?: '24h' | '7d' | '30d';
  }): Promise<{
    likes: Array<{ date: string; count: number }>;
    comments: Array<{ date: string; count: number }>;
  }> {
    const { postId, timeRange = '7d' } = params;

    const post = await this.db.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    TRPCErrorHandler.requireResource(post, '内容', postId);

    const now = new Date();
    const ranges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const startDate = ranges[timeRange];

    // 获取点赞趋势
    const likes = await this.db.like.findMany({
      where: {
        postId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 获取评论趋势
    const comments = await this.db.comment.findMany({
      where: {
        postId,
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
    const commentTrends = this.groupByDate(comments, timeRange);

    return {
      likes: likeTrends,
      comments: commentTrends,
    };
  }

  /**
   * 获取热门互动内容
   */
  async getPopularInteractions(params: {
    timeRange?: '24h' | '7d' | '30d';
    limit?: number;
    type?: 'likes' | 'comments' | 'reactions';
  }): Promise<any[]> {
    const { timeRange = '7d', limit = 10, type = 'likes' } = params;

    const now = new Date();
    const ranges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    };

    const startDate = ranges[timeRange];

    if (type === 'likes') {
      return this.db.post.findMany({
        take: limit,
        where: {
          publishedAt: { not: null },
          isPublic: true,
          likes: {
            some: {
              createdAt: { gte: startDate },
            },
          },
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          likeCount: 'desc',
        },
      });
    }

    return [];
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
export const createPostInteractionService = (db: PrismaClient) => new PostInteractionService(db);
