/**
 * @fileoverview Redis连接配置
 * @description 统一的Redis连接管理，支持分布式缓存和会话存储，使用Next.js官方推荐的global对象模式
 * @author Augment AI
 * @date 2025-07-02
 * @version 2.0.0
 *
 * @changelog
 * - 2025-07-08: 重构为Next.js官方推荐的global对象模式，解决serverless环境中的重复初始化问题
 */

import Redis from 'ioredis';
import { RedisSecurityManager } from './security/redis-security-manager';
import { logger } from './logging/log-deduplicator';

/**
 * 全局Redis连接类型定义
 */
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  securityManager: RedisSecurityManager | undefined;
};

/**
 * Redis安全管理器实例（使用global对象模式）
 */
const securityManager = globalForRedis.securityManager ?? new RedisSecurityManager();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.securityManager = securityManager;
}

/**
 * Redis配置选项
 */
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
}

/**
 * 获取Redis配置（使用安全管理器）
 */
function getRedisConfig(): any {
  return securityManager.getRedisConnectionConfig();
}

/**
 * Redis连接日志状态跟踪
 */
let lastConnectionLog = 0;
let lastReadyLog = 0;
let connectionCount = 0;

/**
 * 创建Redis连接
 */
function createRedisConnection(): Redis {
  const config = getRedisConfig();

  const redisInstance = new Redis(config);
  connectionCount++;

  // 连接事件监听（使用日志去重和频率控制）
  redisInstance.on('connect', () => {
    const now = Date.now();
    // 30秒内不重复输出连接成功日志
    if (now - lastConnectionLog > 30000) {
      logger.info('Redis连接成功', {
        event: 'connect',
        connectionId: connectionCount,
        interval: now - lastConnectionLog
      });
      lastConnectionLog = now;
    }
  });

  redisInstance.on('ready', () => {
    const now = Date.now();
    // 30秒内不重复输出准备就绪日志
    if (now - lastReadyLog > 30000) {
      logger.info('Redis准备就绪', {
        event: 'ready',
        connectionId: connectionCount,
        interval: now - lastReadyLog
      });
      lastReadyLog = now;
    }
  });

  redisInstance.on('error', (error) => {
    // 错误日志始终输出（重要）
    logger.error('Redis连接错误', {
      event: 'error',
      error: error.message,
      code: (error as any).code || 'UNKNOWN',
      connectionId: connectionCount
    });
  });

  redisInstance.on('close', () => {
    // 连接关闭日志（重要状态变化）
    logger.warn('Redis连接关闭', {
      event: 'close',
      connectionId: connectionCount
    });
  });

  redisInstance.on('reconnecting', () => {
    // 重连日志（重要状态变化）
    logger.info('Redis重新连接中', {
      event: 'reconnecting',
      connectionId: connectionCount
    });
  });

  return redisInstance;
}

/**
 * 获取Redis实例（使用Next.js官方推荐的global对象单例模式）
 */
export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisConnection();

    // 在开发环境中保持全局引用，避免热重载时重复创建
    if (process.env.NODE_ENV !== "production") {
      // 全局引用已在上面设置
    }
  }
  return globalForRedis.redis;
}

/**
 * 预连接Redis（确保连接建立）
 */
export async function ensureRedisConnection(): Promise<boolean> {
  try {
    const redisInstance = getRedis();

    // 如果已经连接，直接返回
    if (redisInstance.status === 'ready') {
      return true;
    }

    // 等待连接建立或超时
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('Redis连接超时，但继续运行');
        resolve(false);
      }, 5000);

      redisInstance.once('ready', () => {
        clearTimeout(timeout);
        resolve(true);
      });

      redisInstance.once('error', (error) => {
        clearTimeout(timeout);
        console.error('Redis预连接失败:', error);
        resolve(false);
      });

      // 如果连接状态是connecting，等待连接完成
      if (redisInstance.status === 'connecting') {
        return;
      }

      // 尝试ping来建立连接
      redisInstance.ping().catch(() => {
        // ping失败不影响连接建立
      });
    });
  } catch (error) {
    console.error('Redis预连接失败:', error);
    return false;
  }
}

/**
 * 关闭Redis连接
 */
export async function closeRedis(): Promise<void> {
  if (globalForRedis.redis) {
    await globalForRedis.redis.quit();
    globalForRedis.redis = undefined;
  }
}

/**
 * 检查Redis连接状态
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const redisInstance = getRedis();
    const result = await redisInstance.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis健康检查失败:', error);
    return false;
  }
}

/**
 * 同步检查Redis连接状态（用于性能监控）
 */
export function checkRedisHealthSync(): boolean {
  try {
    if (!globalForRedis.redis) {
      // 如果Redis实例不存在，尝试创建
      globalForRedis.redis = createRedisConnection();
      // 对于懒连接，我们需要触发一次连接
      globalForRedis.redis.ping().catch(() => {}); // 异步ping，不等待结果
      return false; // 首次创建时返回false，下次检查时应该就连接了
    }

    // 检查Redis实例状态 - 包含更多可能的正常状态
    const validStatuses = ['ready', 'connect', 'connecting'];
    const isConnected = validStatuses.includes(globalForRedis.redis.status);

    // 使用日志去重系统记录状态检查
    logger.debug('Redis状态检查', {
      status: globalForRedis.redis.status,
      isConnected,
      operation: 'healthCheck'
    });

    // 如果状态显示未连接，但实例存在，尝试触发连接
    if (!isConnected && (globalForRedis.redis.status === 'wait' || globalForRedis.redis.status === 'close')) {
      logger.info('Redis状态为wait/close，尝试触发连接', {
        status: globalForRedis.redis.status,
        operation: 'triggerConnection'
      });
      globalForRedis.redis.ping().catch((error: any) => {
        logger.warn('Redis ping触发连接失败', {
          error: error.message,
          operation: 'ping'
        });
      });
    }

    return isConnected;
  } catch (error) {
    logger.error('Redis同步健康检查失败', {
      error: error instanceof Error ? error.message : String(error),
      operation: 'syncHealthCheck'
    });
    return false;
  }
}

/**
 * Redis键名前缀
 */
export const REDIS_KEYS = {
  IP_BLACKLIST: 'security:blacklist:ip:',
  RATE_LIMIT: 'security:ratelimit:',
  USER_SESSION: 'session:user:',
  PERMISSION_CACHE: 'cache:permission:',
  AUDIT_LOG: 'audit:log:',
} as const;

/**
 * Redis工具函数
 */
export const RedisUtils = {
  /**
   * 设置带过期时间的键值
   */
  async setWithExpiry(key: string, value: string, ttlSeconds: number): Promise<void> {
    const redisInstance = getRedis();
    await redisInstance.setex(key, ttlSeconds, value);
  },

  /**
   * 获取键值
   */
  async get(key: string): Promise<string | null> {
    const redisInstance = getRedis();
    return await redisInstance.get(key);
  },

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    const redisInstance = getRedis();
    return await redisInstance.del(key);
  },

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const redisInstance = getRedis();
    const result = await redisInstance.exists(key);
    return result === 1;
  },

  /**
   * 原子递增
   */
  async incr(key: string): Promise<number> {
    const redisInstance = getRedis();
    return await redisInstance.incr(key);
  },

  /**
   * 设置过期时间
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const redisInstance = getRedis();
    const result = await redisInstance.expire(key, ttlSeconds);
    return result === 1;
  },

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    const redisInstance = getRedis();
    return await redisInstance.ttl(key);
  },
};

export default getRedis;
