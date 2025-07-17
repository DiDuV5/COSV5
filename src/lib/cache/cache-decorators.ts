/**
 * @fileoverview 缓存装饰器和工具函数
 * @description 提供便捷的缓存装饰器和工具函数，简化缓存使用
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * @Cache('user', 3600)
 * async function getUserById(id: string) {
 *   return await prisma.user.findUnique({ where: { id } })
 * }
 *
 * @dependencies
 * - TypeScript 5.0+
 *
 * @changelog
 * - 2025-06-16: 初始版本创建，支持方法缓存装饰器
 */

import { redisCacheManager } from './redis-cache-manager';

/**
 * 缓存键生成器类型
 */
export type CacheKeyGenerator = (...args: any[]) => string;

/**
 * 缓存选项接口
 */
export interface CacheOptions {
  /** 缓存键前缀 */
  prefix: string;
  /** 过期时间（秒） */
  ttl?: number;
  /** 自定义键生成器 */
  keyGenerator?: CacheKeyGenerator;
  /** 是否启用缓存 */
  enabled?: boolean;
  /** 缓存版本 */
  version?: string;
}

/**
 * 默认键生成器
 */
const defaultKeyGenerator: CacheKeyGenerator = (...args: any[]) => {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return JSON.stringify(arg);
    }
    return String(arg);
  }).join(':');
};

/**
 * 缓存装饰器
 * @param prefix 缓存键前缀
 * @param ttl 过期时间（秒）
 * @param keyGenerator 自定义键生成器
 */
export function Cache(
  prefix: string,
  ttl: number = 3600,
  keyGenerator: CacheKeyGenerator = defaultKeyGenerator
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const cacheKey = `${prefix}:${keyGenerator(...args)}`;

      try {
        // 尝试从缓存获取
        const cachedResult = await redisCacheManager.get(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }

        // 执行原方法
        const result = await method.apply(this, args);

        // 存储到缓存
        if (result !== null && result !== undefined) {
          await redisCacheManager.set(cacheKey, result, ttl);
        }

        return result;
      } catch (error) {
        console.error(`缓存装饰器错误 (${cacheKey}):`, error);
        // 缓存失败时直接执行原方法
        return await method.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 * @param patterns 要失效的缓存模式数组
 */
export function CacheEvict(patterns: string[]) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // 执行原方法
        const result = await method.apply(this, args);

        // 失效相关缓存
        for (const pattern of patterns) {
          await redisCacheManager.deletePattern(pattern);
        }

        return result;
      } catch (error) {
        console.error('缓存失效装饰器错误:', error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 缓存工具类
 */
export class CacheUtils {
  /**
   * 缓存函数结果
   */
  static async cached<T>(
    key: string,
    fn: () => Promise<T>,
    options: Partial<CacheOptions> = {}
  ): Promise<T> {
    const {
      ttl = 3600,
      enabled = true,
      version = '1.0'
    } = options;

    if (!enabled) {
      return await fn();
    }

    const cacheKey = version ? `${key}:v${version}` : key;

    try {
      // 尝试从缓存获取
      const cachedResult = await redisCacheManager.get<T>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // 执行函数
      const result = await fn();

      // 存储到缓存
      if (result !== null && result !== undefined) {
        await redisCacheManager.set(cacheKey, result, ttl);
      }

      return result;
    } catch (error) {
      console.error(`缓存工具错误 (${cacheKey}):`, error);
      return await fn();
    }
  }

  /**
   * 批量缓存函数结果
   */
  static async batchCached<T>(
    items: Array<{
      key: string;
      fn: () => Promise<T>;
      ttl?: number;
    }>
  ): Promise<T[]> {
    const keys = items.map(item => item.key);
    const cachedResults = await redisCacheManager.mget<T>(keys);
    const results: T[] = [];
    const toCache: Array<{ key: string; value: T; ttl?: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cachedResult = cachedResults[i];

      if (cachedResult !== null) {
        results[i] = cachedResult;
      } else {
        try {
          const result = await item.fn();
          results[i] = result;

          if (result !== null && result !== undefined) {
            toCache.push({
              key: item.key,
              value: result,
              ttl: item.ttl
            });
          }
        } catch (error) {
          console.error(`批量缓存错误 (${item.key}):`, error);
          throw error;
        }
      }
    }

    // 批量设置缓存
    if (toCache.length > 0) {
      await redisCacheManager.mset(toCache);
    }

    return results;
  }

  /**
   * 生成用户相关缓存键
   */
  static userKey(userId: string, suffix?: string): string {
    return suffix ? `user:${userId}:${suffix}` : `user:${userId}`;
  }

  /**
   * 生成内容相关缓存键
   */
  static postKey(postId: string, suffix?: string): string {
    return suffix ? `post:${postId}:${suffix}` : `post:${postId}`;
  }

  /**
   * 生成列表缓存键
   */
  static listKey(type: string, params: Record<string, any>): string {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return `list:${type}:${paramStr}`;
  }

  /**
   * 生成标签相关缓存键
   */
  static tagKey(tagName: string, suffix?: string): string {
    return suffix ? `tag:${tagName}:${suffix}` : `tag:${tagName}`;
  }

  /**
   * 失效用户相关缓存
   */
  static async evictUserCache(userId: string): Promise<void> {
    await redisCacheManager.deletePattern(`user:${userId}:*`);
    await redisCacheManager.deletePattern(`list:*user=${userId}*`);
  }

  /**
   * 失效内容相关缓存
   */
  static async evictPostCache(postId: string): Promise<void> {
    await redisCacheManager.deletePattern(`post:${postId}:*`);
    await redisCacheManager.deletePattern(`list:*post=${postId}*`);
  }

  /**
   * 失效列表缓存
   */
  static async evictListCache(type: string): Promise<void> {
    await redisCacheManager.deletePattern(`list:${type}:*`);
  }

  /**
   * 预热缓存
   */
  static async warmup<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<void> {
    try {
      const result = await fn();
      if (result !== null && result !== undefined) {
        await redisCacheManager.set(key, result, ttl);
      }
    } catch (error) {
      console.error(`缓存预热失败 (${key}):`, error);
    }
  }

  /**
   * 获取缓存统计
   */
  static getStats() {
    return redisCacheManager.getStats();
  }

  /**
   * 重置缓存统计
   */
  static resetStats() {
    redisCacheManager.resetStats();
  }
}

/**
 * 常用缓存时间常量
 */
export const CacheTTL = {
  /** 1分钟 */
  MINUTE: 60,
  /** 5分钟 */
  FIVE_MINUTES: 300,
  /** 15分钟 */
  FIFTEEN_MINUTES: 900,
  /** 30分钟 */
  THIRTY_MINUTES: 1800,
  /** 1小时 */
  HOUR: 3600,
  /** 6小时 */
  SIX_HOURS: 21600,
  /** 12小时 */
  TWELVE_HOURS: 43200,
  /** 1天 */
  DAY: 86400,
  /** 1周 */
  WEEK: 604800,
  /** 1个月 */
  MONTH: 2592000
} as const;

/**
 * 缓存键模式常量
 */
export const CachePatterns = {
  /** 用户相关 */
  USER: 'user:*',
  /** 内容相关 */
  POST: 'post:*',
  /** 评论相关 */
  COMMENT: 'comment:*',
  /** 标签相关 */
  TAG: 'tag:*',
  /** 列表相关 */
  LIST: 'list:*',
  /** 统计相关 */
  STATS: 'stats:*',
  /** 推荐相关 */
  RECOMMENDATION: 'recommendation:*'
} as const;
