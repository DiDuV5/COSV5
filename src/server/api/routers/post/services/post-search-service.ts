/**
 * @fileoverview Post搜索服务
 * @description 处理Post的搜索相关操作，包括全文搜索、标签搜索等
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';

/**
 * 搜索参数接口
 */
export interface SearchParams {
  query: string;
  limit?: number;
  cursor?: string;
  sortBy?: 'relevance' | 'latest' | 'popular';
  filters?: {
    postType?: string;
    authorId?: string;
    tags?: string[];
    dateRange?: {
      from?: Date;
      to?: Date;
    };
  };
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  posts: any[];
  nextCursor?: string;
  totalCount?: number;
  suggestions?: string[];
}

/**
 * Post搜索服务类
 */
export class PostSearchService {
  constructor(private db: PrismaClient) {}

  /**
   * 搜索Post
   */
  async searchPosts(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      limit = 20,
      cursor,
      sortBy = 'relevance',
      filters = {}
    } = params;

    // 构建搜索条件
    const where = this.buildSearchCondition(query, filters);

    // 获取排序配置
    const orderBy = this.getSearchOrderBy(sortBy);

    const posts = await this.db.post.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
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
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            fileSize: true,
            fileHash: true,
            mediaType: true,
            url: true,
            cdnUrl: true,
            thumbnailUrl: true,
            width: true,
            height: true,
            duration: true,
            order: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy,
    });

    // 处理分页
    let nextCursor: string | undefined = undefined;
    if (posts.length > limit) {
      const nextItem = posts.pop();
      nextCursor = nextItem!.id;
    }

    // 获取搜索建议
    const suggestions = await this.getSearchSuggestions(query);

    return {
      posts: posts.map(post => ({
        ...post,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        media: post.media,
      })),
      nextCursor,
      suggestions,
    };
  }

  /**
   * 获取热门搜索词
   */
  async getPopularSearchTerms(limit: number = 10): Promise<string[]> {
    // 这里可以从搜索日志中获取热门搜索词
    // 暂时返回模拟数据
    return [
      'cosplay',
      'anime',
      'photography',
      'costume',
      'makeup',
      'character',
      'convention',
      'props',
      'wig',
      'tutorial',
    ].slice(0, limit);
  }

  /**
   * 获取相关标签
   */
  async getRelatedTags(query: string, limit: number = 10): Promise<string[]> {
    // 基于查询词获取相关标签
    const posts = await this.db.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
        isPublic: true,
        publishedAt: { not: null },
        isDeleted: false, // 排除软删除的内容
      },
      select: {
        tags: true,
      },
      take: 100,
    });

    // 提取和统计标签
    const tagCounts = new Map<string, number>();
    posts.forEach(post => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          if (typeof tag === 'string') {
            const count = tagCounts.get(tag) || 0;
            tagCounts.set(tag, count + 1);
          }
        });
      }
    });

    // 按频率排序并返回
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  /**
   * 构建搜索条件
   */
  private buildSearchCondition(query: string, filters: SearchParams['filters'] = {}) {
    const { postType, authorId, tags, dateRange } = filters;

    const baseCondition = {
      isPublic: true,
      publishedAt: { not: null },
      isDeleted: false, // 排除软删除的内容
    };

    const searchCondition = {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { content: { contains: query, mode: 'insensitive' as const } },
        { tags: { hasSome: [query] } },
      ],
    };

    const filterConditions: any = {};

    if (postType) {
      filterConditions.postType = postType;
    }

    if (authorId) {
      filterConditions.authorId = authorId;
    }

    if (tags && tags.length > 0) {
      filterConditions.tags = { hasSome: tags };
    }

    if (dateRange) {
      const dateFilter: any = {};
      if (dateRange.from) {
        dateFilter.gte = dateRange.from;
      }
      if (dateRange.to) {
        dateFilter.lte = dateRange.to;
      }
      if (Object.keys(dateFilter).length > 0) {
        filterConditions.publishedAt = { ...filterConditions.publishedAt, ...dateFilter };
      }
    }

    return {
      ...baseCondition,
      ...searchCondition,
      ...filterConditions,
    };
  }

  /**
   * 获取搜索排序配置
   */
  private getSearchOrderBy(sortBy: SearchParams['sortBy']) {
    switch (sortBy) {
      case 'latest':
        return { publishedAt: 'desc' as const };
      case 'popular':
        return [
          { likeCount: 'desc' as const },
          { viewCount: 'desc' as const },
        ];
      case 'relevance':
      default:
        // 相关性排序：优先考虑标题匹配，然后是点赞数和浏览数
        return [
          { likeCount: 'desc' as const },
          { viewCount: 'desc' as const },
          { publishedAt: 'desc' as const },
        ];
    }
  }

  /**
   * 获取搜索建议
   */
  private async getSearchSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) {
      return [];
    }

    // 基于现有内容生成搜索建议
    const suggestions = await this.db.post.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
        isPublic: true,
        publishedAt: { not: null },
        isDeleted: false, // 排除软删除的内容
      },
      select: {
        title: true,
        tags: true,
      },
      take: 20,
    });

    const suggestionSet = new Set<string>();

    // 从标题中提取建议
    suggestions.forEach(post => {
      const words = post.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.includes(query.toLowerCase()) && word.length > 2) {
          suggestionSet.add(word);
        }
      });
    });

    // 从标签中提取建议
    suggestions.forEach(post => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(tag => {
          if (typeof tag === 'string' && tag.toLowerCase().includes(query.toLowerCase())) {
            suggestionSet.add(tag);
          }
        });
      }
    });

    return Array.from(suggestionSet).slice(0, 5);
  }

  /**
   * 记录搜索日志（用于分析和优化）
   */
  async logSearch(query: string, userId?: string, resultCount?: number): Promise<void> {
    // 这里可以记录搜索日志到数据库或日志系统
    // 用于后续的搜索分析和优化
    console.log(`Search logged: query="${query}", userId="${userId}", results=${resultCount}`);
  }
}

/**
 * 导出单例实例
 */
export const createPostSearchService = (db: PrismaClient) => new PostSearchService(db);
