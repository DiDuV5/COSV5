/**
 * @fileoverview 作品查询优化器
 * @description 提供作品相关的优化查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { QueryCacheManager } from './cache';
import {
  PostsListParams,
  PostsListResult,
  HotPostsParams,
  OPTIMIZED_POST_INCLUDE,
  CACHE_KEYS,
  CACHE_TAGS,
  CACHE_TTL,
  SORT_OPTIONS,
  QUERY_LIMITS,
} from './types';

/**
 * 作品查询优化器
 */
export class PostQueryOptimizer {
  private db: PrismaClient;
  private cache: QueryCacheManager;

  constructor(db: PrismaClient, cache: QueryCacheManager) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * 优化的作品列表查询
   */
  async getPostsList(params: PostsListParams): Promise<PostsListResult> {
    const {
      limit = QUERY_LIMITS.DEFAULT_PAGE_SIZE,
      cursor,
      authorId,
      tags,
      sortBy = 'latest',
    } = params;

    // 生成缓存键
    const cacheKey = this.cache.generateCacheKey('post:list', {
      limit,
      cursor: cursor || 'start',
      authorId: authorId || 'all',
      tags: tags?.join(',') || 'all',
      sortBy,
    });

    // 尝试从缓存获取
    const cached = await this.cache.get<PostsListResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // 构建查询条件
    const where: any = {
      isPublic: true,
    };

    if (authorId) {
      where.authorId = authorId;
    }

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          name: { in: tags },
        },
      };
    }

    // 构建排序条件
    let orderBy: any;
    switch (sortBy) {
      case 'popular':
        orderBy = SORT_OPTIONS.popular;
        break;
      case 'trending':
        orderBy = SORT_OPTIONS.trending;
        break;
      default:
        orderBy = SORT_OPTIONS.latest;
    }

    // 确保 limit 有值
    const safeLimit = limit || QUERY_LIMITS.DEFAULT_PAGE_SIZE;

    // 执行查询
    const posts = await this.db.post.findMany({
      take: safeLimit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      include: OPTIMIZED_POST_INCLUDE,
      orderBy,
    });

    // 处理分页
    let nextCursor: string | undefined;
    if (posts.length > safeLimit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    const result: PostsListResult = {
      posts,
      nextCursor,
      hasMore: !!nextCursor,
    };

    // 缓存结果
    const cacheTTL = sortBy === 'latest' ? CACHE_TTL.SHORT : CACHE_TTL.POST_LIST;
    await this.cache.set(cacheKey, result, {
      ttl: cacheTTL,
      tags: [CACHE_TAGS.POST],
    });

    return result;
  }

  /**
   * 优化的热门作品查询
   */
  async getHotPosts(period: 'day' | 'week' | 'month' = 'day', limit: number = 20): Promise<any[]> {
    // 尝试从缓存获取
    const cached = await this.cache.getHotPostsCache(period, limit);
    if (cached) {
      return cached;
    }

    // 计算时间范围
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // 执行查询
    const posts = await this.db.post.findMany({
      take: limit,
      where: {
        isPublic: true,
        publishedAt: {
          gte: startDate,
          lte: now,
        },
      },
      include: OPTIMIZED_POST_INCLUDE,
      orderBy: [
        { likeCount: 'desc' },
        { viewCount: 'desc' },
        { commentCount: 'desc' },
      ],
    });

    // 缓存结果
    await this.cache.cacheHotPosts(period, limit, posts);

    return posts;
  }

  /**
   * 获取作品详情
   */
  async getPostDetails(postId: string): Promise<any | null> {
    const cacheKey = CACHE_KEYS.POST_DETAILS(postId);

    // 尝试从缓存获取
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 从数据库查询
    const post = await this.db.post.findUnique({
      where: { id: postId },
      include: {
        ...OPTIMIZED_POST_INCLUDE,
      },
    });

    if (post) {
      // 缓存结果
      await this.cache.set(cacheKey, post, {
        ttl: CACHE_TTL.LONG,
        tags: [CACHE_TAGS.POST],
      });
    }

    return post;
  }

  /**
   * 获取用户的作品列表
   */
  async getUserPosts(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PostsListResult> {
    return this.getPostsList({
      authorId: userId,
      limit,
      cursor,
      sortBy: 'latest',
    });
  }

  /**
   * 获取相关作品推荐
   */
  async getRelatedPosts(postId: string, limit: number = 10): Promise<any[]> {
    const cacheKey = `post:related:${postId}:${limit}`;

    // 尝试从缓存获取
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return Array.isArray(cached) ? cached : [];
    }

    // 获取当前作品的标签
    const currentPost = await this.db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!currentPost) {
      return [];
    }

    // 查找相关作品（基于作者的其他作品）
    const relatedPosts = await this.db.post.findMany({
      where: {
        id: { not: postId },
        authorId: currentPost.authorId, // 同一作者的其他作品
        isPublic: true,
      },
      take: limit,
      include: OPTIMIZED_POST_INCLUDE,
      orderBy: [
        { likeCount: 'desc' },
        { viewCount: 'desc' },
      ],
    });

    // 缓存结果
    await this.cache.set(cacheKey, relatedPosts, {
      ttl: CACHE_TTL.LONG,
      tags: [CACHE_TAGS.POST],
    });

    return relatedPosts;
  }

  /**
   * 搜索作品
   */
  async searchPosts(
    query: string,
    limit: number = 20,
    cursor?: string,
    tags?: string[]
  ): Promise<PostsListResult> {
    // 构建查询条件
    const where: any = {
      isPublic: true,
      isDeleted: false, // 排除软删除的帖子
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          name: { in: tags },
        },
      };
    }

    // 执行查询
    const posts = await this.db.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      include: OPTIMIZED_POST_INCLUDE,
      orderBy: [
        { likeCount: 'desc' },
        { viewCount: 'desc' },
        { publishedAt: 'desc' },
      ],
    });

    // 处理分页
    let nextCursor: string | undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    return {
      posts,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  /**
   * 获取作品统计信息
   */
  async getPostStats(postId: string): Promise<any | null> {
    const cacheKey = `post:stats:${postId}`;

    // 尝试从缓存获取
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 从数据库查询
    const stats = await this.db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (stats) {
      // 缓存结果（较短的TTL，因为统计数据变化频繁）
      await this.cache.set(cacheKey, stats, {
        ttl: CACHE_TTL.SHORT,
        tags: [CACHE_TAGS.POST],
      });
    }

    return stats;
  }

  /**
   * 清理作品缓存
   */
  async invalidatePostCache(postId?: string): Promise<void> {
    await this.cache.invalidatePostCache(postId);
  }
}
