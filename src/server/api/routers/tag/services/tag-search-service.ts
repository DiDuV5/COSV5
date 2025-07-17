/**
 * @fileoverview 标签搜索服务
 * @description 处理标签的搜索和发现功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { parsePostTags } from '../utils';

/**
 * 标签搜索结果接口
 */
export interface TagSearchResult {
  name: string;
  count: number;
  recentPosts: number;
  isDeleted: boolean;
}

/**
 * 标签建议结果接口
 */
export interface TagSuggestion {
  name: string;
  count: number;
  similarity: number;
  category?: string;
}

/**
 * 标签搜索服务类
 */
export class TagSearchService {
  constructor(private db: PrismaClient) {}

  /**
   * 搜索标签
   */
  async searchTags(params: {
    query: string;
    limit?: number;
    includeDeleted?: boolean;
    sortBy?: 'relevance' | 'count' | 'recent';
  }): Promise<TagSearchResult[]> {
    const { query, limit = 20, includeDeleted = false, sortBy = 'relevance' } = params;

    if (!query || query.trim().length < 1) {
      throw TRPCErrorHandler.validationError('搜索关键词不能为空');
    }

    const posts = await this.db.post.findMany({
      where: {
        publishedAt: { not: null },
        isDeleted: false, // 排除软删除的内容
      },
      select: {
        tags: true,
        createdAt: true,
      },
    });

    const tagMap = new Map<string, {
      count: number;
      recentPosts: number;
      isDeleted: boolean;
      lastUsed: Date;
    }>();

    const now = new Date();
    const recentThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30天内

    posts.forEach(post => {
      if (post.tags) {
        try {
          const tags = parsePostTags(post.tags);
          tags.forEach(tagName => {
            const isDeleted = tagName.startsWith('[DELETED]');

            if (!includeDeleted && isDeleted) {
              return;
            }

            const normalizedTag = isDeleted ? tagName.replace('[DELETED]', '').trim() : tagName;

            if (normalizedTag.toLowerCase().includes(query.toLowerCase())) {
              if (!tagMap.has(tagName)) {
                tagMap.set(tagName, {
                  count: 0,
                  recentPosts: 0,
                  isDeleted,
                  lastUsed: post.createdAt,
                });
              }

              const stats = tagMap.get(tagName)!;
              stats.count++;

              if (post.createdAt > recentThreshold) {
                stats.recentPosts++;
              }

              if (post.createdAt > stats.lastUsed) {
                stats.lastUsed = post.createdAt;
              }
            }
          });
        } catch {
          // 忽略解析错误
        }
      }
    });

    const results = Array.from(tagMap.entries()).map(([name, stats]) => ({
      name,
      count: stats.count,
      recentPosts: stats.recentPosts,
      isDeleted: stats.isDeleted,
      lastUsed: stats.lastUsed,
      relevance: this.calculateRelevance(name, query, stats.count),
    }));

    // 排序
    results.sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.count - a.count;
        case 'recent':
          return b.lastUsed.getTime() - a.lastUsed.getTime();
        case 'relevance':
        default:
          return b.relevance - a.relevance;
      }
    });

    return results.slice(0, limit).map(({ lastUsed, relevance, ...result }) => result);
  }

  /**
   * 获取标签建议
   */
  async getTagSuggestions(params: {
    input: string;
    limit?: number;
    excludeTags?: string[];
  }): Promise<TagSuggestion[]> {
    const { input, limit = 10, excludeTags = [] } = params;

    if (!input || input.trim().length < 1) {
      return [];
    }

    const posts = await this.db.post.findMany({
      where: {
        publishedAt: { not: null },
      },
      select: {
        tags: true,
      },
    });

    const tagCounts = new Map<string, number>();

    posts.forEach(post => {
      if (post.tags) {
        try {
          const tags = parsePostTags(post.tags);
          tags.forEach(tagName => {
            if (!tagName.startsWith('[DELETED]') && !excludeTags.includes(tagName)) {
              tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
            }
          });
        } catch {
          // 忽略解析错误
        }
      }
    });

    const suggestions = Array.from(tagCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        similarity: this.calculateSimilarity(name, input),
        category: this.categorizeTag(name),
      }))
      .filter(suggestion => suggestion.similarity > 0.3) // 过滤相似度太低的
      .sort((a, b) => {
        // 先按相似度排序，再按使用频率排序
        if (Math.abs(a.similarity - b.similarity) < 0.1) {
          return b.count - a.count;
        }
        return b.similarity - a.similarity;
      })
      .slice(0, limit);

    return suggestions;
  }

  /**
   * 获取热门标签
   */
  async getPopularTags(params: {
    limit?: number;
    timeRange?: 'day' | 'week' | 'month' | 'all';
    category?: string;
  }): Promise<TagSearchResult[]> {
    const { limit = 20, timeRange = 'all', category } = params;

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(0);
    }

    const posts = await this.db.post.findMany({
      where: {
        publishedAt: {
          not: null,
          gte: startDate,
        },
      },
      select: {
        tags: true,
        createdAt: true,
      },
    });

    const tagCounts = new Map<string, { count: number; recentPosts: number }>();
    const recentThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    posts.forEach(post => {
      if (post.tags) {
        try {
          const tags = parsePostTags(post.tags);
          tags.forEach(tagName => {
            if (!tagName.startsWith('[DELETED]')) {
              // 如果指定了分类，只包含该分类的标签
              if (category && this.categorizeTag(tagName) !== category) {
                return;
              }

              if (!tagCounts.has(tagName)) {
                tagCounts.set(tagName, { count: 0, recentPosts: 0 });
              }

              const stats = tagCounts.get(tagName)!;
              stats.count++;

              if (post.createdAt > recentThreshold) {
                stats.recentPosts++;
              }
            }
          });
        } catch {
          // 忽略解析错误
        }
      }
    });

    return Array.from(tagCounts.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        recentPosts: stats.recentPosts,
        isDeleted: false,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 获取相关标签
   */
  async getRelatedTags(tagName: string, limit: number = 10): Promise<TagSuggestion[]> {
    const posts = await this.db.post.findMany({
      where: {
        tags: { contains: tagName },
        publishedAt: { not: null },
      },
      select: { tags: true },
    });

    const relatedTagCounts = new Map<string, number>();

    posts.forEach(post => {
      if (post.tags) {
        try {
          const tags = parsePostTags(post.tags);
          if (tags.includes(tagName)) {
            tags.forEach(otherTag => {
              if (otherTag !== tagName && !otherTag.startsWith('[DELETED]')) {
                relatedTagCounts.set(otherTag, (relatedTagCounts.get(otherTag) || 0) + 1);
              }
            });
          }
        } catch {
          // 忽略解析错误
        }
      }
    });

    return Array.from(relatedTagCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        similarity: count / posts.length, // 共现频率作为相似度
        category: this.categorizeTag(name),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 计算标签相关性
   */
  private calculateRelevance(tagName: string, query: string, count: number): number {
    const similarity = this.calculateSimilarity(tagName, query);
    const popularity = Math.log(count + 1) / 10; // 使用对数缩放流行度
    return similarity * 0.7 + popularity * 0.3;
  }

  /**
   * 计算字符串相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // 完全匹配
    if (s1 === s2) return 1.0;

    // 包含匹配
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // 开头匹配
    if (s1.startsWith(s2) || s2.startsWith(s1)) return 0.6;

    // 简单的编辑距离相似度
    const maxLen = Math.max(s1.length, s2.length);
    const distance = this.levenshteinDistance(s1, s2);
    return Math.max(0, (maxLen - distance) / maxLen);
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 标签分类
   */
  private categorizeTag(tagName: string): string {
    const tag = tagName.toLowerCase();

    if (tag.includes('cosplay') || tag.includes('角色') || tag.includes('character')) {
      return 'character';
    }
    if (tag.includes('anime') || tag.includes('动漫') || tag.includes('manga')) {
      return 'anime';
    }
    if (tag.includes('photo') || tag.includes('摄影') || tag.includes('photography')) {
      return 'photography';
    }
    if (tag.includes('makeup') || tag.includes('化妆') || tag.includes('美妆')) {
      return 'makeup';
    }
    if (tag.includes('costume') || tag.includes('服装') || tag.includes('outfit')) {
      return 'costume';
    }

    return 'general';
  }
}

/**
 * 导出服务创建函数
 */
export const createTagSearchService = (db: PrismaClient) => new TagSearchService(db);
