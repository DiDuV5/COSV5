/**
 * @fileoverview 缓存中间件
 * @description 为tRPC路由提供自动缓存功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TRPCError } from '@trpc/server';
import { cacheService } from './redis-cache-service';
import { CACHE_KEYS, CACHE_TTL, CacheKeyGenerator } from './cache-keys';

/**
 * 缓存选项接口
 */
export interface CacheOptions {
  /** 缓存键 */
  key?: string;
  /** TTL（秒） */
  ttl?: number;
  /** 标签 */
  tags?: string[];
  /** 是否启用缓存 */
  enabled?: boolean;
  /** 缓存条件函数 */
  condition?: (input: any, ctx: any) => boolean;
  /** 自定义键生成函数 */
  keyGenerator?: (input: any, ctx: any) => string;
}

/**
 * 缓存装饰器
 */
export function withCache<TInput, TOutput>(
  options: CacheOptions
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, params: { input: TInput; ctx: any }) {
      const { input, ctx } = params;

      // 检查是否启用缓存
      if (options.enabled === false) {
        return await originalMethod.call(this, params);
      }

      // 检查缓存条件
      if (options.condition && !options.condition(input, ctx)) {
        return await originalMethod.call(this, params);
      }

      // 生成缓存键
      let cacheKey: string;
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator(input, ctx);
      } else if (options.key) {
        cacheKey = options.key;
      } else {
        // 默认键生成策略
        const inputStr = JSON.stringify(input);
        cacheKey = CacheKeyGenerator.hash(`${target.constructor.name}:${propertyKey}`, inputStr);
      }

      try {
        // 尝试从缓存获取
        const cachedResult = await cacheService.get<TOutput>(cacheKey);
        if (cachedResult !== null) {
          return cachedResult;
        }

        // 执行原方法
        const result = await originalMethod.call(this, params);

        // 缓存结果
        const ttl = options.ttl || CACHE_TTL.MEDIUM;
        await cacheService.set(cacheKey, result, ttl);

        return result;
      } catch (error) {
        // 缓存失败时仍然执行原方法
        console.warn('缓存操作失败:', error);
        return await originalMethod.call(this, params);
      }
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 */
export function invalidateCache(
  patterns: string[] | ((input: any, ctx: any) => string[])
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, params: { input: any; ctx: any }) {
      // 执行原方法
      const result = await originalMethod.call(this, params);

      try {
        // 获取要失效的缓存模式
        const invalidationPatterns = typeof patterns === 'function' 
          ? patterns(params.input, params.ctx)
          : patterns;

        // 批量失效缓存
        const invalidationPromises = invalidationPatterns.map(pattern => 
          cacheService.delPattern(pattern)
        );

        await Promise.allSettled(invalidationPromises);
      } catch (error) {
        console.warn('缓存失效操作失败:', error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存中间件工厂
 */
export class CacheMiddlewareFactory {
  /**
   * 创建用户查询缓存中间件
   */
  static createUserQueryCache(ttl: number = CACHE_TTL.USER_PROFILE) {
    return withCache({
      ttl,
      keyGenerator: (input: any, ctx: any) => {
        if (input.userId) {
          return CACHE_KEYS.USER.PROFILE(input.userId);
        }
        if (input.username) {
          return `user:profile:username:${input.username}`;
        }
        return CacheKeyGenerator.hash('user:query', JSON.stringify(input));
      },
      condition: (input: any, ctx: any) => {
        // 只缓存公开用户信息查询
        return !input.includePrivate;
      },
    });
  }

  /**
   * 创建帖子查询缓存中间件
   */
  static createPostQueryCache(ttl: number = CACHE_TTL.POST_DETAIL) {
    return withCache({
      ttl,
      keyGenerator: (input: any, ctx: any) => {
        if (input.postId) {
          return CACHE_KEYS.POST.DETAIL(input.postId);
        }
        if (input.slug) {
          return `post:detail:slug:${input.slug}`;
        }
        return CacheKeyGenerator.hash('post:query', JSON.stringify(input));
      },
      condition: (input: any, ctx: any) => {
        // 只缓存公开帖子
        return !input.includeDraft;
      },
    });
  }

  /**
   * 创建帖子列表缓存中间件
   */
  static createPostListCache(ttl: number = CACHE_TTL.POST_LIST) {
    return withCache({
      ttl,
      keyGenerator: (input: any, ctx: any) => {
        const filters = CacheKeyGenerator.withFilters('', {
          category: input.category || 'all',
          userLevel: input.userLevel || 'all',
          sortBy: input.sortBy || 'latest',
        });
        return CACHE_KEYS.POST.LIST(input.page || 1, filters);
      },
    });
  }

  /**
   * 创建评论查询缓存中间件
   */
  static createCommentQueryCache(ttl: number = CACHE_TTL.COMMENTS) {
    return withCache({
      ttl,
      keyGenerator: (input: any, ctx: any) => {
        if (input.postId) {
          return CACHE_KEYS.POST.COMMENTS(input.postId, input.page || 1);
        }
        return CacheKeyGenerator.hash('comment:query', JSON.stringify(input));
      },
    });
  }

  /**
   * 创建统计查询缓存中间件
   */
  static createStatsQueryCache(ttl: number = CACHE_TTL.STATS) {
    return withCache({
      ttl,
      keyGenerator: (input: any, ctx: any) => {
        if (input.type === 'global') {
          return CACHE_KEYS.STATS.GLOBAL();
        }
        if (input.userId) {
          return CACHE_KEYS.USER.STATS(input.userId);
        }
        if (input.postId) {
          return CACHE_KEYS.POST.STATS(input.postId);
        }
        return CacheKeyGenerator.hash('stats:query', JSON.stringify(input));
      },
    });
  }

  /**
   * 创建搜索查询缓存中间件
   */
  static createSearchQueryCache(ttl: number = CACHE_TTL.SEARCH) {
    return withCache({
      ttl,
      keyGenerator: (input: any, ctx: any) => {
        if (input.type === 'users') {
          return CACHE_KEYS.SEARCH.USERS(input.query, input.page || 1);
        }
        if (input.type === 'posts') {
          return CACHE_KEYS.SEARCH.POSTS(input.query, input.page || 1);
        }
        return CacheKeyGenerator.hash('search:query', JSON.stringify(input));
      },
      condition: (input: any, ctx: any) => {
        // 只缓存非空查询
        return input.query && input.query.trim().length > 0;
      },
    });
  }
}

/**
 * 缓存失效工厂
 */
export class CacheInvalidationFactory {
  /**
   * 创建用户数据失效中间件
   */
  static createUserInvalidation() {
    return invalidateCache((input: any, ctx: any) => {
      const userId = input.userId || ctx.session?.user?.id;
      if (!userId) return [];

      return [
        `user:profile:${userId}`,
        `user:stats:${userId}`,
        `user:posts:${userId}:*`,
        `user:followers:${userId}`,
        `user:following:${userId}`,
        'stats:*', // 失效全局统计
      ];
    });
  }

  /**
   * 创建帖子数据失效中间件
   */
  static createPostInvalidation() {
    return invalidateCache((input: any, ctx: any) => {
      const postId = input.postId || input.id;
      const authorId = input.authorId || ctx.session?.user?.id;
      
      const patterns = [
        `post:detail:${postId}`,
        `post:stats:${postId}`,
        `post:comments:${postId}:*`,
        'post:list:*', // 失效所有帖子列表
        'post:hot:*',
        'post:trending:*',
        'stats:*', // 失效统计
      ];

      if (authorId) {
        patterns.push(
          `user:stats:${authorId}`,
          `user:posts:${authorId}:*`
        );
      }

      return patterns;
    });
  }

  /**
   * 创建评论数据失效中间件
   */
  static createCommentInvalidation() {
    return invalidateCache((input: any, ctx: any) => {
      const postId = input.postId;
      const commentId = input.commentId || input.id;
      
      return [
        `comment:detail:${commentId}`,
        `comment:replies:${commentId}`,
        `comment:tree:${postId}`,
        `post:comments:${postId}:*`,
        `post:stats:${postId}`,
        'stats:*',
      ];
    });
  }
}

/**
 * 缓存预热器
 */
export class CacheWarmer {
  /**
   * 预热用户数据
   */
  static async warmUserData(userId: string): Promise<void> {
    try {
      // 这里可以预加载用户的常用数据
      // 例如：用户资料、统计信息、最新帖子等
      console.log(`预热用户数据: ${userId}`);
    } catch (error) {
      console.warn('用户数据预热失败:', error);
    }
  }

  /**
   * 预热热门内容
   */
  static async warmPopularContent(): Promise<void> {
    try {
      // 预加载热门帖子、推荐内容等
      console.log('预热热门内容');
    } catch (error) {
      console.warn('热门内容预热失败:', error);
    }
  }
}
