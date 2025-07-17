/**
 * @fileoverview Redis缓存配置管理
 * @description 缓存配置初始化和连接管理
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import Redis from 'ioredis';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { logger } from '@/lib/logging/log-deduplicator';
import { getRedis } from '@/lib/redis';
import { RedisConfigManager } from '@/lib/config/redis-config';
import type { CacheConfig, CacheStats } from './types';

/**
 * 默认缓存配置
 * 使用统一的Redis配置管理器
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = (() => {
  const redisConfig = RedisConfigManager.getConnectionConfig();
  return {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    keyPrefix: redisConfig.keyPrefix,
    defaultTTL: 1800, // 减少默认TTL到30分钟，提高缓存更新频率
    maxRetries: redisConfig.maxRetries,
    retryDelayOnFailover: redisConfig.retryDelayOnFailover,
    // 新增默认配置
    enableDynamicTTL: true,
    enableCacheWarmup: true,
    enablePenetrationProtection: true,
    hitRateThreshold: 70, // 降低到70%命中率阈值，更容易达到
    warmupBatchSize: 10,
    penetrationCacheTTL: 60, // 穿透防护缓存1分钟
  };
})();

/**
 * 初始化缓存统计
 */
export const createInitialStats = (): CacheStats => ({
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  hitRate: 0,
  totalRequests: 0,
  avgResponseTime: 0,
  errorRate: 0,
  penetrationPrevented: 0,
  warmupExecuted: 0,
  dynamicTTLAdjustments: 0,
  lastOptimization: null
});

/**
 * 缓存配置管理器
 */
export class CacheConfigManager {
  private config: CacheConfig;
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      ...DEFAULT_CACHE_CONFIG,
      ...config
    };
  }

  /**
   * 获取配置
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(updates: Partial<CacheConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }

  /**
   * 初始化Redis连接
   */
  public async initializeRedis(): Promise<Redis> {
    if (this.isConnected && this.redis && this.redis.status === 'ready') {
      return this.redis;
    }

    try {
      // 优先使用全局Redis连接
      const globalRedis = getRedis();
      if (globalRedis && globalRedis.status === 'ready') {
        this.redis = globalRedis;
        this.isConnected = true;
        logger.info('使用全局Redis连接');
        return this.redis;
      }

      // 创建新的Redis连接
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetries,
        lazyConnect: this.config.lazyConnect,
        enableOfflineQueue: this.config.enableOfflineQueue,
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
      });

      // 设置事件监听器
      this.setupRedisEventListeners();

      // 等待连接建立
      await this.redis.ping();
      this.isConnected = true;

      logger.info('Redis缓存管理器连接成功', {
        host: this.config.host,
        port: this.config.port,
        db: this.config.db
      });

      return this.redis;
    } catch (error) {
      this.isConnected = false;
      logger.error('Redis连接失败', { error });
      throw TRPCErrorHandler.businessError(
        'SERVICE_UNAVAILABLE' as any,
        'Redis连接失败，缓存服务不可用'
      );
    }
  }

  /**
   * 设置Redis事件监听器
   */
  private setupRedisEventListeners(): void {
    if (!this.redis) return;

    this.redis.on('connect', () => {
      logger.info('Redis连接已建立');
      this.isConnected = true;
    });

    this.redis.on('ready', () => {
      logger.info('Redis连接就绪');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      logger.error('Redis连接错误', { error });
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      logger.warn('Redis连接已关闭');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      logger.info('Redis正在重连...');
    });
  }

  /**
   * 检查Redis是否可用
   */
  public isRedisAvailable(): boolean {
    return this.redis !== null &&
           (this.redis.status === 'ready' || this.redis.status === 'connect') &&
           this.isConnected;
  }

  /**
   * 获取Redis实例
   */
  public getRedis(): Redis | null {
    return this.redis;
  }

  /**
   * 检查连接状态
   */
  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 要求Redis连接
   */
  public requireRedisConnection(): void {
    if (!this.isConnected || !this.redis) {
      throw TRPCErrorHandler.businessError(
        'SERVICE_UNAVAILABLE' as any,
        'Redis连接不可用，请检查Redis服务状态'
      );
    }
  }

  /**
   * 断开Redis连接
   */
  public async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
      logger.info('Redis连接已断开');
    }
  }

  /**
   * 格式化缓存键
   */
  public formatKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * 获取默认TTL
   */
  public getDefaultTTL(): number {
    return this.config.defaultTTL;
  }
}
