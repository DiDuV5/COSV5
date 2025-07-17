/**
 * @fileoverview 查询优化器类型定义
 * @description 查询优化器相关的类型定义和配置
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { getEnvWithFallback, getNumberEnv, getBooleanEnv } from '@/lib/config/env-compatibility';

/**
 * 查询优化配置
 */
export interface QueryOptimizationConfig {
  /** 是否启用缓存 */
  enableCache: boolean;
  /** 默认缓存时间（秒） */
  defaultCacheTTL: number;
  /** 是否启用查询日志 */
  enableQueryLogging: boolean;
  /** 慢查询阈值（毫秒） */
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
 * 作品列表查询参数
 */
export interface PostsListParams {
  limit?: number;
  cursor?: string;
  authorId?: string;
  tags?: string[];
  sortBy?: 'latest' | 'popular' | 'trending';
}

/**
 * 作品列表查询结果
 */
export interface PostsListResult {
  posts: any[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * 热门作品查询参数
 */
export interface HotPostsParams {
  period: 'day' | 'week' | 'month';
  limit: number;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

/**
 * 优化的用户查询选项
 */
export const OPTIMIZED_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  userLevel: true,
  isVerified: true,
  isActive: true,
} as const;

/**
 * 优化的作品查询包含选项
 */
export const OPTIMIZED_POST_INCLUDE = {
  author: {
    select: OPTIMIZED_USER_SELECT,
  },
  media: {
    select: {
      id: true,
      filename: true,
      mimeType: true,
      mediaType: true,
      url: true,
      cdnUrl: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      order: true,
    },
    orderBy: { order: 'asc' as const },
    take: 10,
  },
  _count: {
    select: {
      likes: true,
      comments: true,
      views: true,
    },
  },
} as const;

/**
 * 缓存键生成器
 */
export const CACHE_KEYS = {
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  USER_INFO: (id: string) => `user:info:${id}`,
  USER_PERMISSIONS: (id: string) => `user:permissions:${id}`,
  POST_DETAILS: (id: string) => `post:details:${id}`,
  POST_LIST: (params: string) => `post:list:${params}`,
  HOT_POSTS: (params: string) => `post:hot:${params}`,
  COMMENT_THREAD: (id: string) => `comment:thread:${id}`,
} as const;

/**
 * 缓存标签
 */
export const CACHE_TAGS = {
  USER: 'user',
  POST: 'post',
  COMMENT: 'comment',
  PERMISSION: 'permission',
} as const;

/**
 * 默认查询优化配置（从环境变量获取）
 */
export const DEFAULT_QUERY_CONFIG: QueryOptimizationConfig = {
  enableCache: getBooleanEnv('COSEREEDEN_ENABLE_QUERY_CACHE', true),
  defaultCacheTTL: getNumberEnv('COSEREEDEN_DEFAULT_CACHE_TTL', 300), // 5分钟
  enableQueryLogging: getBooleanEnv('COSEREEDEN_ENABLE_QUERY_LOGGING', getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'development'),
  slowQueryThreshold: getNumberEnv('COSEREEDEN_SLOW_QUERY_THRESHOLD', getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'development' ? 2000 : 1000),
};

/**
 * 缓存TTL配置（从环境变量获取）
 */
export const CACHE_TTL = {
  /** 用户信息缓存时间 */
  USER_INFO: getNumberEnv('COSEREEDEN_CACHE_TTL_USER_INFO', 300), // 5分钟
  /** 用户权限缓存时间 */
  USER_PERMISSIONS: getNumberEnv('COSEREEDEN_CACHE_TTL_USER_PERMISSIONS', 600), // 10分钟
  /** 作品列表缓存时间 */
  POST_LIST: getNumberEnv('COSEREEDEN_CACHE_TTL_POST_LIST', 60), // 1分钟
  /** 热门作品缓存时间 */
  HOT_POSTS: {
    day: getNumberEnv('COSEREEDEN_CACHE_TTL_HOT_POSTS_DAY', 300), // 日榜5分钟
    week: getNumberEnv('COSEREEDEN_CACHE_TTL_HOT_POSTS_WEEK', 1800), // 周榜30分钟
    month: getNumberEnv('COSEREEDEN_CACHE_TTL_HOT_POSTS_MONTH', 1800), // 月榜30分钟
  },
  /** 短期缓存 */
  SHORT: getNumberEnv('COSEREEDEN_CACHE_TTL_SHORT', 60), // 1分钟
  /** 长期缓存 */
  LONG: getNumberEnv('COSEREEDEN_CACHE_TTL_LONG', 3600), // 1小时
} as const;

/**
 * 查询排序选项
 */
export const SORT_OPTIONS = {
  latest: { publishedAt: 'desc' as const },
  popular: [
    { likeCount: 'desc' as const },
    { viewCount: 'desc' as const },
    { publishedAt: 'desc' as const },
  ],
  trending: [
    { viewCount: 'desc' as const },
    { likeCount: 'desc' as const },
    { publishedAt: 'desc' as const },
  ],
} as const;

/**
 * 查询限制常量（从环境变量获取）
 */
export const QUERY_LIMITS = {
  /** 默认分页大小 */
  DEFAULT_PAGE_SIZE: getNumberEnv('COSEREEDEN_DEFAULT_PAGE_SIZE', 20),
  /** 最大分页大小 */
  MAX_PAGE_SIZE: getNumberEnv('COSEREEDEN_MAX_PAGE_SIZE', 100),
  /** 批量查询最大数量 */
  MAX_BATCH_SIZE: getNumberEnv('COSEREEDEN_MAX_BATCH_SIZE', 1000),
  /** 媒体文件查询限制 */
  MEDIA_LIMIT: getNumberEnv('COSEREEDEN_MEDIA_QUERY_LIMIT', 10),
} as const;

/**
 * 查询性能阈值（从环境变量获取）
 */
export const PERFORMANCE_THRESHOLDS = {
  /** 慢查询阈值（毫秒） - 开发环境使用2000ms */
  SLOW_QUERY: getNumberEnv('COSEREEDEN_SLOW_QUERY_THRESHOLD', getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'development' ? 2000 : 1000),
  /** 超慢查询阈值（毫秒） */
  VERY_SLOW_QUERY: getNumberEnv('COSEREEDEN_VERY_SLOW_QUERY_THRESHOLD', 3000),
  /** 缓存命中率警告阈值 */
  LOW_CACHE_HIT_RATE: getNumberEnv('COSEREEDEN_LOW_CACHE_HIT_RATE_THRESHOLD', 70) / 100, // 转换为小数
} as const;
