/**
 * @fileoverview tRPC缓存中间件
 * @description 为tRPC路由提供自动缓存功能，提升查询性能
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * export const userRouter = createTRPCRouter({
 *   getById: publicProcedure
 *     .use(cacheMiddleware({ prefix: 'user', ttl: 3600 }))
 *     .input(z.object({ id: z.string() }))
 *     .query(async ({ ctx, input }) => { ... })
 * })
 *
 * @dependencies
 * - @trpc/server: ^10.0.0
 * - TypeScript 5.0+
 *
 * @changelog
 * - 2025-06-16: 初始版本创建，支持自动缓存和失效
 */

// import { TRPCError } from '@trpc/server'; // 暂时未使用
import { redisCacheManager } from '@/lib/cache/redis-cache-manager';
import { CacheUtils, CacheTTL } from '@/lib/cache/cache-decorators';
import type { Session } from 'next-auth';
import type { PrismaClient } from '@prisma/client';

/**
 * tRPC上下文类型定义
 */
interface TRPCContext {
  session: Session | null;
  db: PrismaClient;
  prisma: PrismaClient;
}

/**
 * tRPC中间件参数类型
 */
interface TRPCMiddlewareParams {
  ctx: TRPCContext;
  next: () => Promise<unknown>;
  input: unknown;
  path: string;
  type: 'query' | 'mutation' | 'subscription';
}

/**
 * 缓存中间件选项
 */
export interface CacheMiddlewareOptions {
  /** 缓存键前缀 */
  prefix: string;
  /** 过期时间（秒） */
  ttl?: number;
  /** 是否启用缓存 */
  enabled?: boolean;
  /** 缓存版本 */
  version?: string;
  /** 自定义键生成器 */
  keyGenerator?: (input: unknown, ctx: TRPCContext) => string;
  /** 缓存条件检查 */
  condition?: (input: unknown, ctx: TRPCContext) => boolean;
  /** 是否缓存空结果 */
  cacheEmpty?: boolean;
}

/**
 * 默认键生成器
 */
const defaultKeyGenerator = (input: unknown, ctx: TRPCContext): string => {
  const inputStr = input ? JSON.stringify(input) : 'no-input';
  const userStr = ctx.session?.user?.id || 'anonymous';
  return `${inputStr}:${userStr}`;
};

/**
 * 创建缓存中间件
 */
export function cacheMiddleware(options: CacheMiddlewareOptions) {
  const {
    prefix,
    ttl = CacheTTL.HOUR,
    enabled = true,
    version = '1.0',
    keyGenerator = defaultKeyGenerator,
    condition = () => true,
    cacheEmpty = false
  } = options;

  // 返回一个中间件函数，而不是使用 t.middleware
  return async function cacheMiddlewareFunction({ ctx, next, input, path, type }: TRPCMiddlewareParams) {
    // 只对查询操作启用缓存
    if (type !== 'query' || !enabled) {
      return next();
    }

    // 检查缓存条件
    if (!condition(input, ctx)) {
      return next();
    }

    try {
      // 生成缓存键
      const keyPart = keyGenerator(input, ctx);
      const cacheKey = version ? `${prefix}:${keyPart}:v${version}` : `${prefix}:${keyPart}`;

      // 尝试从缓存获取
      const cachedResult = await redisCacheManager.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // 执行原始查询
      const result = await next();

      // 检查是否应该缓存结果
      const shouldCache = result !== null && result !== undefined;
      const shouldCacheEmpty = cacheEmpty && (result === null || result === undefined);

      if (shouldCache || shouldCacheEmpty) {
        await redisCacheManager.set(cacheKey, result, ttl);
      }

      return result;
    } catch (error) {
      console.error(`缓存中间件错误 (${prefix}):`, error);
      // 缓存失败时继续执行原始查询
      return next();
    }
  };
}

/**
 * 用户相关缓存中间件
 */
export const userCacheMiddleware = (ttl: number = CacheTTL.THIRTY_MINUTES) =>
  cacheMiddleware({
    prefix: 'user',
    ttl,
    keyGenerator: (input: unknown, ctx: TRPCContext) => {
      const typedInput = input as { id?: string; username?: string };
      if (typedInput?.id) return `id:${typedInput.id}`;
      if (typedInput?.username) return `username:${typedInput.username}`;
      if (ctx.session?.user?.id) return `current:${ctx.session.user.id}`;
      return 'unknown';
    }
  });

/**
 * 内容相关缓存中间件
 */
export const postCacheMiddleware = (ttl: number = CacheTTL.FIFTEEN_MINUTES) =>
  cacheMiddleware({
    prefix: 'post',
    ttl,
    keyGenerator: (input: unknown, ctx: TRPCContext) => {
      const typedInput = input as { id?: string; authorId?: string };
      if (typedInput?.id) return `id:${typedInput.id}`;
      if (typedInput?.authorId) return `author:${typedInput.authorId}:${JSON.stringify(input)}`;
      return `list:${JSON.stringify(input)}`;
    }
  });

/**
 * 推荐内容缓存中间件
 */
export const recommendationCacheMiddleware = (ttl: number = CacheTTL.FIFTEEN_MINUTES) =>
  cacheMiddleware({
    prefix: 'recommendation',
    ttl,
    keyGenerator: (input: unknown) => {
      const typedInput = input as { type?: string; limit?: number };
      const type = typedInput?.type || 'featured';
      const limit = typedInput?.limit || 10;
      const params = { ...typedInput, type, limit };
      return `${type}:${JSON.stringify(params)}`;
    }
  });

/**
 * 评论相关缓存中间件
 */
export const commentCacheMiddleware = (ttl: number = CacheTTL.FIVE_MINUTES) =>
  cacheMiddleware({
    prefix: 'comment',
    ttl,
    keyGenerator: (input: unknown) => {
      const typedInput = input as { postId?: string; id?: string };
      if (typedInput?.postId) return `post:${typedInput.postId}:${JSON.stringify(input)}`;
      if (typedInput?.id) return `id:${typedInput.id}`;
      return `list:${JSON.stringify(input)}`;
    }
  });

/**
 * 标签相关缓存中间件
 */
export const tagCacheMiddleware = (ttl: number = CacheTTL.HOUR) =>
  cacheMiddleware({
    prefix: 'tag',
    ttl,
    keyGenerator: (input: unknown) => {
      const typedInput = input as { name?: string; names?: string[] };
      if (typedInput?.name) return `name:${typedInput.name}`;
      if (typedInput?.names) return `names:${typedInput.names.sort().join(',')}`;
      return `list:${JSON.stringify(input)}`;
    }
  });

/**
 * 统计数据缓存中间件
 */
export const statsCacheMiddleware = (ttl: number = CacheTTL.FIVE_MINUTES) =>
  cacheMiddleware({
    prefix: 'stats',
    ttl,
    keyGenerator: (input: unknown, ctx: TRPCContext) => {
      const userId = ctx.session?.user?.id || 'anonymous';
      return `${userId}:${JSON.stringify(input)}`;
    }
  });

/**
 * 缓存失效工具
 */
export class CacheInvalidator {
  /**
   * 失效用户相关缓存
   */
  static async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      redisCacheManager.deletePattern(`user:*${userId}*`),
      redisCacheManager.deletePattern(`post:author:${userId}*`),
      redisCacheManager.deletePattern(`stats:${userId}*`)
    ]);
  }

  /**
   * 失效内容相关缓存
   */
  static async invalidatePost(postId: string, authorId?: string): Promise<void> {
    await Promise.all([
      redisCacheManager.deletePattern(`post:id:${postId}*`),
      redisCacheManager.deletePattern(`post:list:*`),
      redisCacheManager.deletePattern(`recommendation:*`),
      redisCacheManager.deletePattern(`comment:post:${postId}*`),
      ...(authorId ? [redisCacheManager.deletePattern(`post:author:${authorId}*`)] : [])
    ]);
  }

  /**
   * 失效推荐内容缓存
   */
  static async invalidateRecommendations(): Promise<void> {
    await redisCacheManager.deletePattern('recommendation:*');
  }

  /**
   * 失效评论相关缓存
   */
  static async invalidateComments(postId: string): Promise<void> {
    await Promise.all([
      redisCacheManager.deletePattern(`comment:post:${postId}*`),
      redisCacheManager.deletePattern(`post:id:${postId}*`) // 评论数变化影响内容缓存
    ]);
  }

  /**
   * 失效标签相关缓存
   */
  static async invalidateTags(tagNames?: string[]): Promise<void> {
    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        await redisCacheManager.deletePattern(`tag:name:${tagName}*`);
      }
    }
    await redisCacheManager.deletePattern('tag:list:*');
  }

  /**
   * 失效所有列表缓存
   */
  static async invalidateAllLists(): Promise<void> {
    await Promise.all([
      redisCacheManager.deletePattern('post:list:*'),
      redisCacheManager.deletePattern('user:list:*'),
      redisCacheManager.deletePattern('recommendation:*'),
      redisCacheManager.deletePattern('tag:list:*')
    ]);
  }
}

/**
 * 缓存预热工具
 */
export class CacheWarmer {
  /**
   * 预热用户缓存
   */
  static async warmupUser(userId: string, userData: unknown): Promise<void> {
    await redisCacheManager.set(`user:id:${userId}:v1.0`, userData, CacheTTL.THIRTY_MINUTES);
  }

  /**
   * 预热内容缓存
   */
  static async warmupPost(postId: string, postData: unknown): Promise<void> {
    await redisCacheManager.set(`post:id:${postId}:v1.0`, postData, CacheTTL.FIFTEEN_MINUTES);
  }

  /**
   * 预热推荐内容
   */
  static async warmupRecommendations(type: string, data: unknown): Promise<void> {
    const cacheKey = `recommendation:${type}:${JSON.stringify({ limit: 10 })}:v1.0`;
    await redisCacheManager.set(cacheKey, data, CacheTTL.FIFTEEN_MINUTES);
  }
}

/**
 * 缓存监控工具
 */
export class CacheMonitor {
  /**
   * 获取缓存统计
   */
  static getStats() {
    return redisCacheManager.getStats();
  }

  /**
   * 检查缓存健康状态
   */
  static async checkHealth(): Promise<{
    redis: boolean;
    stats: unknown;
    timestamp: string;
  }> {
    return {
      redis: redisCacheManager.isRedisConnected(),
      stats: redisCacheManager.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置统计信息
   */
  static resetStats() {
    redisCacheManager.resetStats();
  }
}
