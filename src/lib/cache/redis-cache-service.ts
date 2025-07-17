/**
 * @fileoverview Redis缓存服务
 * @description 提供Redis缓存功能，替换模拟缓存实现
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import Redis from 'ioredis';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { RedisConfigManager } from '@/lib/config/redis-config';

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  /** Redis连接URL */
  redisUrl?: string;
  /** 默认TTL（秒） */
  defaultTTL: number;
  /** 键前缀 */
  keyPrefix: string;
  /** 是否启用缓存 */
  enabled: boolean;
  /** 是否启用压缩 */
  compression: boolean;
}

/**
 * 缓存项接口
 */
export interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Redis缓存服务类
 */
export class RedisCacheService {
  private redis: Redis | null = null;
  private config: CacheConfig;
  private fallbackCache = new Map<string, CacheItem>();

  constructor(config: Partial<CacheConfig> = {}) {
    const redisUrlConfig = RedisConfigManager.getUrlConfig();
    this.config = {
      redisUrl: redisUrlConfig.url,
      defaultTTL: redisUrlConfig.defaultTTL,
      keyPrefix: redisUrlConfig.keyPrefix,
      enabled: redisUrlConfig.enabled,
      compression: redisUrlConfig.compression,
      ...config,
    };

    if (this.config.enabled) {
      this.initializeRedis();
    }
  }

  /**
   * 初始化Redis连接
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redis = new Redis(this.config.redisUrl!, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        family: 4,
        keyPrefix: this.config.keyPrefix,
      });

      this.redis.on('error', (error: Error) => {
        console.error('Redis连接错误:', error.message);
        this.redis = null;
      });

      this.redis.on('connect', () => {
        console.log('Redis连接成功');
      });

      this.redis.on('ready', () => {
        console.log('Redis准备就绪');
      });

      // 测试连接
      await this.redis.ping();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('Redis初始化失败，将使用内存缓存:', errorMessage);
      this.redis = null;
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * 序列化数据
   */
  private serialize(data: any): string {
    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      ttl: this.config.defaultTTL,
    };

    const serialized = JSON.stringify(item);

    // 如果启用压缩且数据较大，可以在这里添加压缩逻辑
    if (this.config.compression && serialized.length > 1024) {
      // 这里可以添加压缩算法，如gzip
      // 为简化实现，暂时不压缩
    }

    return serialized;
  }

  /**
   * 反序列化数据
   */
  private deserialize<T>(serialized: string): T | null {
    try {
      const item: CacheItem<T> = JSON.parse(serialized);

      // 检查是否过期
      if (Date.now() - item.timestamp > item.ttl * 1000) {
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('缓存数据反序列化失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const finalTTL = ttl || this.config.defaultTTL;

    try {
      if (this.redis) {
        // 使用Redis
        const serialized = this.serialize(value);
        await this.redis.setex(key, finalTTL, serialized);
        return true;
      } else {
        // 使用内存缓存作为fallback
        this.fallbackCache.set(this.generateKey(key), {
          data: value,
          timestamp: Date.now(),
          ttl: finalTTL,
        });

        // 设置过期清理
        setTimeout(() => {
          this.fallbackCache.delete(this.generateKey(key));
        }, finalTTL * 1000);

        return true;
      }
    } catch (error) {
      console.error('设置缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        // 使用Redis
        const serialized = await this.redis.get(key);
        if (!serialized) return null;

        return this.deserialize<T>(serialized);
      } else {
        // 使用内存缓存作为fallback
        const item = this.fallbackCache.get(this.generateKey(key));
        if (!item) return null;

        // 检查是否过期
        if (Date.now() - item.timestamp > item.ttl * 1000) {
          this.fallbackCache.delete(this.generateKey(key));
          return null;
        }

        return item.data as T;
      }
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.fallbackCache.delete(this.generateKey(key));
      }
      return true;
    } catch (error) {
      console.error('删除缓存失败:', error);
      return false;
    }
  }

  /**
   * 批量删除缓存（支持模式匹配）
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return keys.length;
      } else {
        // 内存缓存的模式匹配删除
        const regex = new RegExp(pattern.replace('*', '.*'));
        let deleted = 0;

        for (const key of this.fallbackCache.keys()) {
          if (regex.test(key)) {
            this.fallbackCache.delete(key);
            deleted++;
          }
        }

        return deleted;
      }
    } catch (error) {
      console.error('批量删除缓存失败:', error);
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      } else {
        const item = this.fallbackCache.get(this.generateKey(key));
        if (!item) return false;

        // 检查是否过期
        if (Date.now() - item.timestamp > item.ttl * 1000) {
          this.fallbackCache.delete(this.generateKey(key));
          return false;
        }

        return true;
      }
    } catch (error) {
      console.error('检查缓存存在性失败:', error);
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.expire(key, ttl);
        return true;
      } else {
        const item = this.fallbackCache.get(this.generateKey(key));
        if (item) {
          item.ttl = ttl;
          item.timestamp = Date.now();

          // 重新设置过期清理
          setTimeout(() => {
            this.fallbackCache.delete(this.generateKey(key));
          }, ttl * 1000);
        }
        return true;
      }
    } catch (error) {
      console.error('设置缓存过期时间失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    isRedisConnected: boolean;
    fallbackCacheSize: number;
    redisInfo?: any;
  }> {
    const stats = {
      isRedisConnected: !!this.redis,
      fallbackCacheSize: this.fallbackCache.size,
      redisInfo: undefined as any,
    };

    if (this.redis) {
      try {
        stats.redisInfo = await this.redis.info('memory');
      } catch (error) {
        console.warn('获取Redis信息失败:', error);
      }
    }

    return stats;
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<boolean> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      }
      this.fallbackCache.clear();
      return true;
    } catch (error) {
      console.error('清空缓存失败:', error);
      return false;
    }
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    this.fallbackCache.clear();
  }

  /**
   * 验证Redis服务可用性（用于关键操作）
   */
  async validateRedisAvailability(): Promise<void> {
    if (!this.config.enabled) {
      throw TRPCErrorHandler.businessError(
        'SERVICE_UNAVAILABLE' as any,
        'Redis缓存服务已禁用',
        {
          context: { enabled: this.config.enabled },
          recoveryActions: ['启用Redis缓存服务', '检查REDIS_ENABLED环境变量'],
        }
      );
    }

    if (!this.redis) {
      throw TRPCErrorHandler.businessError(
        'SERVICE_UNAVAILABLE' as any,
        'Redis连接不可用，无法执行关键缓存操作',
        {
          context: {
            redisUrl: this.config.redisUrl,
            enabled: this.config.enabled,
          },
          recoveryActions: [
            '检查Redis服务状态',
            '验证Redis连接配置',
            '重启应用程序',
          ],
        }
      );
    }

    try {
      await this.redis.ping();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw TRPCErrorHandler.businessError(
        'SERVICE_UNAVAILABLE' as any,
        'Redis服务响应异常，无法执行关键操作',
        {
          context: {
            error: errorMessage,
            redisUrl: this.config.redisUrl,
          },
          recoveryActions: [
            '检查Redis服务健康状态',
            '验证网络连接',
            '稍后重试操作',
          ],
        }
      );
    }
  }
}

// 创建全局缓存服务实例
export const cacheService = new RedisCacheService();
