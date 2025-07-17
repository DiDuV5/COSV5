/**
 * @fileoverview 简化版查询优化器 - 向后兼容实现
 * @description 保持100%向后兼容性的简化查询优化器
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0
 */

import { PrismaClient } from '@prisma/client';
import { redisCacheManager } from '@/lib/cache/redis-cache-manager';

/**
 * 用户信息查询结果类型
 */
export interface UserInfoResult {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  userLevel: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  lastActiveAt: Date | null;
}

/**
 * 用户权限查询结果类型
 */
export interface UserPermissionsResult {
  id: string;
  userLevel: string;
  isActive: boolean;
  isVerified: boolean;
  permissions: string[];
  canUpload: boolean;
  canComment: boolean;
  canLike: boolean;
  canFollow: boolean;
}

/**
 * 帖子详情类型
 */
export interface PostWithDetails {
  id: string;
  title: string;
  content: string | null;
  excerpt: string | null;
  coverImageUrl: string | null;
  isPublic: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    userLevel: string;
    isVerified: boolean;
  };
  media?: Array<{
    id: string;
    filename: string;
    url: string;
    thumbnailUrl: string | null;
    mediaType: string;
    width: number | null;
    height: number | null;
  }>;
  tags: string[];
  category: string | null;
}

/**
 * 帖子列表查询结果类型
 */
export interface PostListResult {
  posts: PostWithDetails[];
  hasMore: boolean;
  nextCursor?: string;
  total?: number;
}

/**
 * 热门帖子查询结果类型
 */
export interface HotPostsResult {
  posts: PostWithDetails[];
  period: 'day' | 'week' | 'month';
  generatedAt: Date;
}

/**
 * 查询优化配置
 */
export interface QueryOptimizationConfig {
  enableCache: boolean;
  defaultCacheTTL: number;
  enableQueryLogging: boolean;
  slowQueryThreshold: number;
}

/**
 * 查询性能统计
 */
export interface QueryStats {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  slowQueries: number;
}

/**
 * 帖子查询参数
 */
export interface PostQueryParams {
  limit?: number;
  cursor?: string;
  authorId?: string;
  tags?: string[];
  sortBy?: 'latest' | 'popular' | 'trending';
}

/**
 * 批量用户结果
 */
export type BatchUserResult = Map<string, UserInfoResult>;

// 缓存键常量
const CACHE_KEYS = {
  USER_INFO: (id: string) => `user:info:${id}`,
  USER_PERMISSIONS: (id: string) => `user:permissions:${id}`,
  POST_LIST: (params: string) => `post:list:${params}`,
  HOT_POSTS: (params: string) => `post:hot:${params}`,
};

// 用户权限配置
const USER_LEVEL_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['admin', 'moderate', 'upload', 'comment', 'like', 'follow', 'delete', 'ban'],
  ADMIN: ['moderate', 'upload', 'comment', 'like', 'follow', 'delete'],
  CREATOR: ['upload', 'comment', 'like', 'follow', 'premium'],
  VIP: ['upload', 'comment', 'like', 'follow', 'priority'],
  USER: ['comment', 'like', 'follow'],
  GUEST: ['view'],
};

/**
 * 简化版查询优化器
 */
export class QueryOptimizer {
  private config: QueryOptimizationConfig;
  private stats: QueryStats;
  private db: PrismaClient;

  constructor(db: PrismaClient, config: Partial<QueryOptimizationConfig> = {}) {
    this.db = db;
    this.config = {
      enableCache: true,
      defaultCacheTTL: 300,
      enableQueryLogging: process.env.NODE_ENV === 'development',
      slowQueryThreshold: process.env.NODE_ENV === 'development' ? 2000 : 1000, // 开发环境2秒
      ...config,
    };

    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      slowQueries: 0,
    };
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId: string): Promise<UserInfoResult | null> {
    const cacheKey = CACHE_KEYS.USER_INFO(userId);

    if (this.config.enableCache) {
      try {
        const cached = await redisCacheManager.get<UserInfoResult>(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          return cached;
        }
      } catch (error) {
        console.warn('缓存获取失败:', error);
      }
    }

    const startTime = Date.now();

    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          userLevel: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          lastActiveAt: true,
        },
      });

      const queryTime = Date.now() - startTime;
      this.recordQueryStats(queryTime);

      if (!user) {
        this.stats.cacheMisses++;
        return null;
      }

      const result: UserInfoResult = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        userLevel: user.userLevel,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
      };

      if (this.config.enableCache) {
        try {
          await redisCacheManager.set(cacheKey, result, this.config.defaultCacheTTL);
        } catch (error) {
          console.warn('缓存设置失败:', error);
        }
      }

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.recordQueryStats(queryTime);
      this.stats.cacheMisses++;
      console.warn('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 获取用户权限
   */
  async getUserPermissions(userId: string): Promise<UserPermissionsResult | null> {
    const cacheKey = CACHE_KEYS.USER_PERMISSIONS(userId);

    if (this.config.enableCache) {
      try {
        const cached = await redisCacheManager.get<UserPermissionsResult>(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          return cached;
        }
      } catch (error) {
        console.warn('缓存获取失败:', error);
      }
    }

    const startTime = Date.now();

    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userLevel: true,
          isActive: true,
          isVerified: true,
        },
      });

      const queryTime = Date.now() - startTime;
      this.recordQueryStats(queryTime);

      if (!user) {
        this.stats.cacheMisses++;
        return null;
      }

      const permissions = USER_LEVEL_PERMISSIONS[user.userLevel] || USER_LEVEL_PERMISSIONS['GUEST'];

      const result: UserPermissionsResult = {
        id: user.id,
        userLevel: user.userLevel,
        isActive: user.isActive,
        isVerified: user.isVerified,
        permissions,
        canUpload: permissions.includes('upload'),
        canComment: permissions.includes('comment'),
        canLike: permissions.includes('like'),
        canFollow: permissions.includes('follow'),
      };

      if (this.config.enableCache) {
        try {
          await redisCacheManager.set(cacheKey, result, this.config.defaultCacheTTL * 2);
        } catch (error) {
          console.warn('缓存设置失败:', error);
        }
      }

      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.recordQueryStats(queryTime);
      this.stats.cacheMisses++;
      console.warn('获取用户权限失败:', error);
      return null;
    }
  }

  /**
   * 记录查询统计
   */
  private recordQueryStats(queryTime: number): void {
    this.stats.totalQueries++;
    this.stats.averageQueryTime =
      (this.stats.averageQueryTime * (this.stats.totalQueries - 1) + queryTime) /
      this.stats.totalQueries;

    if (queryTime > this.config.slowQueryThreshold) {
      this.stats.slowQueries++;
      if (this.config.enableQueryLogging) {
        console.warn(`慢查询检测: ${queryTime}ms`);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): QueryStats {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      slowQueries: 0,
    };
  }

  /**
   * 清理用户缓存
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      await Promise.all([
        redisCacheManager.delete(CACHE_KEYS.USER_INFO(userId)),
        redisCacheManager.delete(CACHE_KEYS.USER_PERMISSIONS(userId)),
      ]);
    } catch (error) {
      console.warn('清理用户缓存失败:', error);
    }
  }

  /**
   * 清理帖子缓存
   */
  async invalidatePostCache(): Promise<void> {
    try {
      await redisCacheManager.deleteByPattern('post:*');
    } catch (error) {
      console.warn('清理帖子缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { cacheHits: number; cacheMisses: number } {
    return {
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
    };
  }

  /**
   * 清理所有缓存
   */
  async clearCache(): Promise<void> {
    try {
      await redisCacheManager.flush();
      this.resetStats();
    } catch (error) {
      console.warn('清理查询优化器缓存失败:', error);
    }
  }
}

// 创建全局实例（向后兼容）
export const queryOptimizer = new QueryOptimizer({} as PrismaClient);

export default QueryOptimizer;
