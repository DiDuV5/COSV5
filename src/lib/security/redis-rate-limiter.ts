/**
 * @fileoverview 基于Redis的速率限制器
 * @description 支持分布式部署的速率限制实现
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { NextRequest } from 'next/server';
import { getRedis, REDIS_KEYS, RedisUtils } from '@/lib/redis';

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

/**
 * 速率限制结果
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * 获取客户端标识符
 */
function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || req.ip || 'unknown';
  
  // 结合IP和User-Agent生成更精确的标识符
  const userAgent = req.headers.get('user-agent') || '';
  const identifier = `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
  
  return identifier;
}

/**
 * Redis速率限制器类
 */
export class RedisRateLimiter {
  private redis = getRedis();

  /**
   * 检查速率限制
   */
  async checkRateLimit(
    req: NextRequest,
    config: RateLimitConfig,
    customKey?: string
  ): Promise<RateLimitResult> {
    const identifier = customKey || getClientIdentifier(req);
    const key = `${REDIS_KEYS.RATE_LIMIT}${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // 使用Redis事务确保原子性
      const multi = this.redis.multi();
      
      // 清理过期记录
      multi.zremrangebyscore(key, 0, windowStart);
      
      // 获取当前窗口内的请求数
      multi.zcard(key);
      
      // 添加当前请求
      multi.zadd(key, now, `${now}-${Math.random()}`);
      
      // 设置过期时间
      multi.expire(key, Math.ceil(config.windowMs / 1000));
      
      const results = await multi.exec();
      
      if (!results) {
        throw new Error('Redis事务执行失败');
      }

      const currentCount = (results[1][1] as number) || 0;
      const resetTime = now + config.windowMs;

      // 检查是否超过限制
      if (currentCount >= config.maxRequests) {
        // 移除刚添加的请求记录
        await this.redis.zrem(key, `${now}-${Math.random()}`);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil(config.windowMs / 1000),
        };
      }

      return {
        allowed: true,
        remaining: config.maxRequests - currentCount - 1,
        resetTime,
      };
    } catch (error) {
      console.error('Redis速率限制检查失败:', error);
      
      // Redis失败时的降级策略 - 允许请求但记录错误
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }
  }

  /**
   * 重置特定标识符的速率限制
   */
  async resetRateLimit(identifier: string): Promise<void> {
    const key = `${REDIS_KEYS.RATE_LIMIT}${identifier}`;
    await this.redis.del(key);
  }

  /**
   * 获取速率限制状态
   */
  async getRateLimitStatus(identifier: string): Promise<{
    requestCount: number;
    ttl: number;
  }> {
    const key = `${REDIS_KEYS.RATE_LIMIT}${identifier}`;
    
    const [requestCount, ttl] = await Promise.all([
      this.redis.zcard(key),
      this.redis.ttl(key),
    ]);

    return {
      requestCount,
      ttl,
    };
  }
}

/**
 * 全局速率限制器实例
 */
export const rateLimiter = new RedisRateLimiter();

/**
 * 预定义的速率限制配置
 */
export const RATE_LIMIT_CONFIGS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 5, // 最多5次尝试
    skipSuccessfulRequests: true,
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3, // 最多3次注册
  },
  API: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 100, // 最多100次请求
  },
  STRICT: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10, // 最多10次请求
  },
  UPLOAD: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 5, // 最多5次上传
  },
} as const;

/**
 * 创建速率限制中间件
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: NextRequest) => {
    const result = await rateLimiter.checkRateLimit(req, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: '请求过于频繁，请稍后再试',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      );
    }
    
    return null; // 允许继续
  };
}
