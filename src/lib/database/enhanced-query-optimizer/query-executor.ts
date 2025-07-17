/**
 * @fileoverview 查询执行器
 * @description 提供优化的查询执行功能，集成缓存和性能监控
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { QueryCacheManager } from './query-cache';
import { QueryPerformanceMonitor } from './query-monitor';
import { QueryOptimizerConfig, QueryExecutionOptions, TimeRange } from './types';

// 临时logger
const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  debug: (message: string, data?: any) => console.log(message, data),
  warn: (message: string, data?: any) => console.warn(message, data),
  error: (message: string, data?: any) => console.error(message, data)
};

/**
 * 查询执行器
 */
export class QueryExecutor {
  private cache: QueryCacheManager;
  private monitor: QueryPerformanceMonitor;

  constructor(
    private prisma: PrismaClient,
    private config: QueryOptimizerConfig
  ) {
    this.cache = new QueryCacheManager(config);
    this.monitor = new QueryPerformanceMonitor(config);
    this.setupPrismaMiddleware();
  }

  /**
   * 执行优化查询
   */
  async executeOptimizedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options?: QueryExecutionOptions
  ): Promise<T> {
    const startTime = Date.now();

    // 检查缓存
    if (this.config.enableQueryCache && !options?.skipCache) {
      const cached = await this.cache.get<T>(queryKey);
      if (cached !== null) {
        this.monitor.recordCacheHit(Date.now() - startTime);
        return cached;
      }
    }

    // 执行查询
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // 记录查询指标
      this.monitor.recordQuery(queryKey, duration);

      // 缓存结果
      if (this.config.enableQueryCache && result !== null) {
        await this.cache.set(queryKey, result, options);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitor.recordQuery(queryKey, duration, error);
      throw error;
    }
  }

  /**
   * 获取用户信息（优化版）
   */
  async getOptimizedUserInfo(userId: string) {
    return this.executeOptimizedQuery(
      this.cache.generateQueryKey('user', 'info', userId),
      async () => {
        return await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            email: true,
            userLevel: true,
            isActive: true,
            bio: true,
            createdAt: true,
            _count: {
              select: {
                posts: true,
                followers: true,
                following: true,
              }
            }
          }
        });
      },
      { ttl: 300 } // 5分钟缓存
    );
  }

  /**
   * 获取热门帖子（优化版）
   */
  async getOptimizedHotPosts(limit: number = 20, timeRange: TimeRange = 'day') {
    return this.executeOptimizedQuery(
      this.cache.generateQueryKey('posts', 'hot', timeRange, limit),
      async () => {
        const timeFilter = this.getTimeFilter(timeRange);

        return await this.prisma.post.findMany({
          where: {
            publishedAt: {
              gte: timeFilter
            }
          },
          select: {
            id: true,
            title: true,
            content: true,
            tags: true,
            publishedAt: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                userLevel: true
              }
            },
            media: {
              select: {
                id: true,
                url: true,
                thumbnailUrl: true,
              },
              take: 1
            }
          },
          orderBy: [
            { likeCount: 'desc' },
            { viewCount: 'desc' },
            { publishedAt: 'desc' }
          ],
          take: limit
        });
      },
      { ttl: this.cache.getCacheTTLForTimeRange(timeRange) }
    );
  }

  /**
   * 获取用户帖子列表（优化版）
   */
  async getOptimizedUserPosts(userId: string, page: number = 1, limit: number = 10) {
    return this.executeOptimizedQuery(
      this.cache.generateQueryKey('user', 'posts', userId, page, limit),
      async () => {
        const skip = (page - 1) * limit;

        return await this.prisma.post.findMany({
          where: {
            authorId: userId,
          },
          select: {
            id: true,
            title: true,
            content: true,
            tags: true,
            publishedAt: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            media: {
              select: {
                id: true,
                url: true,
                thumbnailUrl: true,
              },
              take: 1
            }
          },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit
        });
      },
      { ttl: 60 } // 1分钟缓存
    );
  }

  /**
   * 获取性能监控器
   */
  getMonitor(): QueryPerformanceMonitor {
    return this.monitor;
  }

  /**
   * 获取缓存管理器
   */
  getCache(): QueryCacheManager {
    return this.cache;
  }

  // ==================== 私有方法 ====================

  /**
   * 设置Prisma中间件
   */
  private setupPrismaMiddleware(): void {
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now();
      const { model, action } = params;

      try {
        const result = await next(params);
        const duration = Date.now() - startTime;

        // 记录查询模式
        const pattern = `${model}.${action}`;
        this.monitor.recordQueryPattern(pattern);

        // 检查是否为慢查询
        if (duration > this.config.slowQueryThreshold) {
          this.monitor.recordSlowQuery(pattern, duration, params);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('数据库查询失败', { model, action, duration, error });
        throw error;
      }
    });
  }

  /**
   * 获取时间过滤器
   */
  private getTimeFilter(timeRange: TimeRange): Date {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}
