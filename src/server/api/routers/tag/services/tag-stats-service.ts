/**
 * @fileoverview 标签统计服务
 * @description 处理标签的统计分析功能，包括热门标签、趋势分析等
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler as _TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  parsePostTags,
  calculateHeatScore,
  validateTagExists,
} from '../utils';
import type { TagStats, TagWithStats } from '../schemas';

/**
 * 标签统计服务类
 */
export class TagStatsService {
  constructor(private db: PrismaClient) {}

  /**
   * 获取单个标签的统计信息
   */
  async getTagStats(tagName: string): Promise<TagStats> {
    const posts = await this.db.post.findMany({
      where: {
        tags: { contains: tagName },
        publishedAt: { not: null },
      },
      select: {
        tags: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
      },
    });

    validateTagExists(posts, tagName);

    let count = 0;
    let views = 0;
    let likes = 0;
    let comments = 0;

    posts.forEach(post => {
      const tags = parsePostTags(post.tags);
      if (tags.includes(tagName)) {
        count++;
        views += post.viewCount || 0;
        likes += post.likeCount || 0;
        comments += post.commentCount || 0;
      }
    });

    return { count, views, likes, comments };
  }

  /**
   * 获取多个标签的统计信息
   */
  async getMultipleTagStats(tagNames: string[]): Promise<Record<string, TagStats>> {
    const posts = await this.db.post.findMany({
      where: {
        publishedAt: { not: null },
      },
      select: {
        tags: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
      },
    });

    const statsMap: Record<string, TagStats> = {};

    // 初始化统计对象
    tagNames.forEach(tagName => {
      statsMap[tagName] = { count: 0, views: 0, likes: 0, comments: 0 };
    });

    posts.forEach(post => {
      if (post.tags) {
        try {
          const tags = parsePostTags(post.tags);
          tagNames.forEach(tagName => {
            if (tags.includes(tagName)) {
              const stats = statsMap[tagName];
              stats.count++;
              stats.views += post.viewCount || 0;
              stats.likes += post.likeCount || 0;
              stats.comments += post.commentCount || 0;
            }
          });
        } catch {
          // 忽略解析错误
        }
      }
    });

    return statsMap;
  }

  /**
   * 获取热门标签
   */
  async getTrendingTags(
    limit: number,
    timeRange: string
  ): Promise<{
    topTags: TagWithStats[];
    timeRange: string;
    totalTags: number;
    totalPosts: number;
    dateRange: { start: Date; end: Date };
    trendDays: string[];
  }> {
    const now = new Date();
    const startDate = this.getStartDateByTimeRange(timeRange, now);

    const posts = await this.db.post.findMany({
      where: {
        publishedAt: {
          not: null,
          gte: startDate,
        },
      },
      select: {
        tags: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        publishedAt: true,
      },
    });

    const tagStats = new Map<string, TagStats>();
    const dailyStats = new Map<string, Map<string, number>>();

    posts.forEach(post => {
      if (post.tags && post.publishedAt) {
        try {
          const tags = parsePostTags(post.tags);
          const dayKey = post.publishedAt.toISOString().split('T')[0];

          tags.forEach(tagName => {
            if (!tagName.startsWith('[DELETED]')) {
              // 总体统计
              if (!tagStats.has(tagName)) {
                tagStats.set(tagName, { count: 0, views: 0, likes: 0, comments: 0 });
              }
              const stats = tagStats.get(tagName)!;
              stats.count++;
              stats.views += post.viewCount || 0;
              stats.likes += post.likeCount || 0;
              stats.comments += post.commentCount || 0;

              // 每日统计
              if (!dailyStats.has(dayKey)) {
                dailyStats.set(dayKey, new Map());
              }
              const dayTagStats = dailyStats.get(dayKey)!;
              dayTagStats.set(tagName, (dayTagStats.get(tagName) || 0) + 1);
            }
          });
        } catch {
          // 忽略解析错误
        }
      }
    });

    // 生成趋势数据
    const sortedDays = Array.from(dailyStats.keys()).sort();
    const topTags = Array.from(tagStats.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        heatScore: calculateHeatScore(stats),
        trend: sortedDays.map(day => dailyStats.get(day)?.get(name) || 0),
      }))
      .sort((a, b) => b.heatScore - a.heatScore)
      .slice(0, limit);

    return {
      topTags,
      timeRange,
      totalTags: tagStats.size,
      totalPosts: posts.length,
      dateRange: { start: startDate, end: now },
      trendDays: sortedDays,
    };
  }

  /**
   * 获取标签使用趋势
   */
  async getTagTrends(params: {
    tagNames: string[];
    timeRange: string;
    granularity?: 'day' | 'week' | 'month';
  }): Promise<{
    trends: Array<{
      tagName: string;
      data: Array<{ date: string; count: number; views: number; likes: number }>;
    }>;
    dateRange: { start: Date; end: Date };
  }> {
    const { tagNames, timeRange, granularity = 'day' } = params;
    const now = new Date();
    const startDate = this.getStartDateByTimeRange(timeRange, now);

    const posts = await this.db.post.findMany({
      where: {
        publishedAt: {
          not: null,
          gte: startDate,
        },
      },
      select: {
        tags: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
      },
    });

    const trends = tagNames.map(tagName => {
      const data = new Map<string, { count: number; views: number; likes: number }>();

      posts.forEach(post => {
        if (post.tags && post.publishedAt) {
          try {
            const tags = parsePostTags(post.tags);
            if (tags.includes(tagName)) {
              const dateKey = this.getDateKey(post.publishedAt, granularity);
              if (!data.has(dateKey)) {
                data.set(dateKey, { count: 0, views: 0, likes: 0 });
              }
              const stats = data.get(dateKey)!;
              stats.count++;
              stats.views += post.viewCount || 0;
              stats.likes += post.likeCount || 0;
            }
          } catch {
            // 忽略解析错误
          }
        }
      });

      return {
        tagName,
        data: Array.from(data.entries())
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
    });

    return {
      trends,
      dateRange: { start: startDate, end: now },
    };
  }

  /**
   * 获取标签相关性分析
   */
  async getTagCorrelations(tagName: string, limit: number = 10): Promise<Array<{
    tagName: string;
    correlation: number;
    coOccurrence: number;
  }>> {
    const posts = await this.db.post.findMany({
      where: {
        tags: { contains: tagName },
        publishedAt: { not: null },
      },
      select: { tags: true },
    });

    const coOccurrenceMap = new Map<string, number>();
    const totalOccurrences = posts.length;

    posts.forEach(post => {
      if (post.tags) {
        try {
          const tags = parsePostTags(post.tags);
          if (tags.includes(tagName)) {
            tags.forEach(otherTag => {
              if (otherTag !== tagName && !otherTag.startsWith('[DELETED]')) {
                coOccurrenceMap.set(otherTag, (coOccurrenceMap.get(otherTag) || 0) + 1);
              }
            });
          }
        } catch {
          // 忽略解析错误
        }
      }
    });

    return Array.from(coOccurrenceMap.entries())
      .map(([relatedTag, coOccurrence]) => ({
        tagName: relatedTag,
        correlation: coOccurrence / totalOccurrences,
        coOccurrence,
      }))
      .sort((a, b) => b.correlation - a.correlation)
      .slice(0, limit);
  }

  /**
   * 根据时间范围获取开始日期
   */
  private getStartDateByTimeRange(timeRange: string, now: Date): Date {
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0);
    }
  }

  /**
   * 根据粒度获取日期键
   */
  private getDateKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
    switch (granularity) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString().split('T')[0];
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createTagStatsService = (db: PrismaClient) => new TagStatsService(db);
