/**
 * @fileoverview Post统计服务
 * @description 处理Post的统计相关操作，包括趋势统计、用户统计等
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';

/**
 * 统计时间范围
 */
export type StatsTimeRange = '24h' | '7d' | '30d' | '90d';

/**
 * 趋势统计结果
 */
export interface TrendingStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  topTags: Array<{ tag: string; count: number }>;
  topAuthors: Array<{ 
    id: string; 
    username: string; 
    displayName: string; 
    postCount: number; 
    totalViews: number; 
  }>;
}

/**
 * 用户统计结果
 */
export interface UserStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  averageViewsPerPost: number;
  averageLikesPerPost: number;
}

/**
 * Post统计服务类
 */
export class PostStatsService {
  constructor(private db: PrismaClient) {}

  /**
   * 获取趋势统计
   */
  async getTrendingStats(timeRange: StatsTimeRange = '7d'): Promise<TrendingStats> {
    const dateFilter = this.getDateFilter(timeRange);

    // 并行获取各种统计数据
    const [
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
      topTags,
      topAuthors
    ] = await Promise.all([
      this.getTotalPosts(dateFilter),
      this.getTotalViews(dateFilter),
      this.getTotalLikes(dateFilter),
      this.getTotalComments(dateFilter),
      this.getTopTags(dateFilter),
      this.getTopAuthors(dateFilter)
    ]);

    return {
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
      topTags,
      topAuthors,
    };
  }

  /**
   * 获取用户统计
   */
  async getUserStats(userId: string, timeRange: StatsTimeRange = '30d'): Promise<UserStats> {
    const dateFilter = this.getDateFilter(timeRange);
    const whereCondition = {
      authorId: userId,
      isPublic: true,
      publishedAt: { not: null, ...dateFilter },
    };

    // 获取用户的Post统计
    const posts = await this.db.post.findMany({
      where: whereCondition,
      select: {
        viewCount: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, post) => sum + post.viewCount, 0);
    const totalLikes = posts.reduce((sum, post) => sum + post._count.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post._count.comments, 0);

    return {
      totalPosts,
      totalViews,
      totalLikes,
      totalComments,
      averageViewsPerPost: totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0,
      averageLikesPerPost: totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0,
    };
  }

  /**
   * 获取推荐内容
   */
  async getRecommendedPosts(userId?: string, limit: number = 20): Promise<any[]> {
    // 如果用户已登录，基于用户行为推荐
    if (userId) {
      return this.getPersonalizedRecommendations(userId, limit);
    }

    // 未登录用户，返回热门内容
    return this.getPopularPosts(limit);
  }

  /**
   * 获取关注用户的内容
   */
  async getFollowingPosts(userId: string, limit: number = 20, cursor?: string): Promise<any> {
    const posts = await this.db.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        isPublic: true,
        publishedAt: { not: null },
        author: {
          followers: {
            some: {
              followerId: userId,
            },
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
            userLevel: true,
            isVerified: true,
          },
        },
        media: {
          orderBy: { order: 'asc' },
          take: 5,
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
    });

    let nextCursor: string | undefined = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    return {
      posts: posts.map(post => ({
        ...post,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
      })),
      nextCursor,
    };
  }

  /**
   * 获取日期过滤条件
   */
  private getDateFilter(timeRange: StatsTimeRange) {
    const now = new Date();
    const ranges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    };

    return { gte: ranges[timeRange] };
  }

  /**
   * 获取总Post数
   */
  private async getTotalPosts(dateFilter: any): Promise<number> {
    return this.db.post.count({
      where: {
        isPublic: true,
        publishedAt: { not: null, ...dateFilter },
      },
    });
  }

  /**
   * 获取总浏览量
   */
  private async getTotalViews(dateFilter: any): Promise<number> {
    const result = await this.db.post.aggregate({
      where: {
        isPublic: true,
        publishedAt: { not: null, ...dateFilter },
      },
      _sum: {
        viewCount: true,
      },
    });

    return result._sum.viewCount || 0;
  }

  /**
   * 获取总点赞数
   */
  private async getTotalLikes(dateFilter: any): Promise<number> {
    return this.db.like.count({
      where: {
        post: {
          isPublic: true,
          publishedAt: { not: null, ...dateFilter },
        },
      },
    });
  }

  /**
   * 获取总评论数
   */
  private async getTotalComments(dateFilter: any): Promise<number> {
    return this.db.comment.count({
      where: {
        post: {
          isPublic: true,
          publishedAt: { not: null, ...dateFilter },
        },
      },
    });
  }

  /**
   * 获取热门标签
   */
  private async getTopTags(dateFilter: any): Promise<Array<{ tag: string; count: number }>> {
    // 这里需要根据实际的标签存储结构来实现
    // 暂时返回模拟数据
    return [
      { tag: 'cosplay', count: 150 },
      { tag: 'anime', count: 120 },
      { tag: 'photography', count: 100 },
      { tag: 'costume', count: 80 },
      { tag: 'makeup', count: 60 },
    ];
  }

  /**
   * 获取热门作者
   */
  private async getTopAuthors(dateFilter: any): Promise<Array<{ 
    id: string; 
    username: string; 
    displayName: string; 
    postCount: number; 
    totalViews: number; 
  }>> {
    const authors = await this.db.user.findMany({
      where: {
        posts: {
          some: {
            isPublic: true,
            publishedAt: { not: null, ...dateFilter },
          },
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        posts: {
          where: {
            isPublic: true,
            publishedAt: { not: null, ...dateFilter },
          },
          select: {
            viewCount: true,
          },
        },
      },
      take: 10,
    });

    return authors.map(author => ({
      id: author.id,
      username: author.username,
      displayName: author.displayName || author.username,
      postCount: author.posts.length,
      totalViews: author.posts.reduce((sum, post) => sum + post.viewCount, 0),
    })).sort((a, b) => b.totalViews - a.totalViews);
  }

  /**
   * 获取个性化推荐
   */
  private async getPersonalizedRecommendations(userId: string, limit: number): Promise<any[]> {
    // 基于用户的点赞和浏览历史推荐相似内容
    // 这里实现简化版本，实际可以使用更复杂的推荐算法
    return this.getPopularPosts(limit);
  }

  /**
   * 获取热门内容
   */
  private async getPopularPosts(limit: number): Promise<any[]> {
    return this.db.post.findMany({
      take: limit,
      where: {
        isPublic: true,
        publishedAt: { not: null },
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
        media: {
          orderBy: { order: 'asc' },
          take: 5,
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: [
        { likeCount: 'desc' },
        { viewCount: 'desc' },
      ],
    });
  }
}

/**
 * 导出单例实例
 */
export const createPostStatsService = (db: PrismaClient) => new PostStatsService(db);
