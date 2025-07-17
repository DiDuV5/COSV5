/**
 * @fileoverview 缓存清理器 - CoserEden平台
 * @description 处理缓存相关的清理操作
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import {
  CleanupTaskType,
  type CleanupStats,
  type CacheCleanupOptions,
  type ICacheCleanup,
  type CleanupContext,
} from './cleanup-types';

/**
 * 缓存清理器类
 * 负责处理缓存相关的清理操作
 */
export class CacheCleanup extends EventEmitter implements ICacheCleanup {
  private redisClient?: any;
  private memoryCache: Map<string, any> = new Map();

  constructor(context: CleanupContext) {
    super();
    this.initializeRedisClient();
  }

  /**
   * 清理过期缓存
   */
  public async cleanupExpiredCache(options?: CacheCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.CACHE_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理过期缓存');
      this.emit('taskStarted', { taskType: CleanupTaskType.CACHE_CLEANUP });

      // 清理Redis缓存
      if (this.redisClient) {
        const redisStats = await this.cleanupRedisCache(options);
        stats.processedCount += redisStats.processedCount;
        stats.cleanedCount += redisStats.cleanedCount;
        stats.failedCount += redisStats.failedCount;
        stats.errors.push(...redisStats.errors);
      }

      // 清理内存缓存
      const memoryStats = await this.cleanupMemoryCache(options);
      stats.processedCount += memoryStats.processedCount;
      stats.cleanedCount += memoryStats.cleanedCount;
      stats.failedCount += memoryStats.failedCount;
      stats.errors.push(...memoryStats.errors);

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 过期缓存清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.CACHE_CLEANUP, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理过期缓存失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.CACHE_CLEANUP, error });
    }

    return stats;
  }

  /**
   * 清理会话缓存
   */
  public async cleanupSessionCache(options?: CacheCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.CACHE_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理会话缓存');

      if (this.redisClient) {
        // 获取所有会话键
        const sessionKeys = await this.redisClient.keys('session:*');
        stats.processedCount = sessionKeys.length;

        const maxAge = options?.maxAge || 24 * 60 * 60 * 1000; // 24小时
        const cutoffTime = Date.now() - maxAge;

        for (const key of sessionKeys) {
          try {
            // 获取会话数据
            const sessionData = await this.redisClient.get(key);
            if (sessionData) {
              const session = JSON.parse(sessionData);
              const lastAccess = session.lastAccess || session.createdAt || 0;

              if (lastAccess < cutoffTime) {
                await this.redisClient.del(key);
                stats.cleanedCount++;
                console.log(`✅ 清理过期会话: ${key}`);
              } else if (options?.preserveActive && session.isActive) {
                stats.skippedCount++;
              }
            }
          } catch (error) {
            stats.failedCount++;
            stats.errors.push(`会话${key}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 会话缓存清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个`);

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理会话缓存失败:', error);
    }

    return stats;
  }

  /**
   * 清理缩略图缓存
   */
  public async cleanupThumbnailCache(options?: CacheCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.THUMBNAILS,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理缩略图缓存');

      if (this.redisClient) {
        // 获取所有缩略图缓存键
        const thumbnailKeys = await this.redisClient.keys('thumbnail:*');
        stats.processedCount = thumbnailKeys.length;

        const maxAge = options?.maxAge || 7 * 24 * 60 * 60 * 1000; // 7天
        const cutoffTime = Date.now() - maxAge;

        for (const key of thumbnailKeys) {
          try {
            // 获取缓存时间戳
            const ttl = await this.redisClient.ttl(key);
            const createdTime = Date.now() - (ttl * 1000);

            if (createdTime < cutoffTime || ttl === -1) {
              await this.redisClient.del(key);
              stats.cleanedCount++;
              console.log(`✅ 清理过期缩略图: ${key}`);
            } else {
              stats.skippedCount++;
            }
          } catch (error) {
            stats.failedCount++;
            stats.errors.push(`缩略图${key}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 缩略图缓存清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个`);

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理缩略图缓存失败:', error);
    }

    return stats;
  }

  /**
   * 清空所有缓存
   */
  public async clearAllCache(): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.CACHE_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清空所有缓存');

      // 清空Redis缓存
      if (this.redisClient) {
        const allKeys = await this.redisClient.keys('*');
        stats.processedCount = allKeys.length;

        if (allKeys.length > 0) {
          await this.redisClient.flushall();
          stats.cleanedCount = allKeys.length;
          console.log(`✅ 清空Redis缓存: ${allKeys.length}个键`);
        }
      }

      // 清空内存缓存
      const memorySize = this.memoryCache.size;
      this.memoryCache.clear();
      stats.processedCount += memorySize;
      stats.cleanedCount += memorySize;
      console.log(`✅ 清空内存缓存: ${memorySize}个键`);

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 所有缓存清空完成: 清理${stats.cleanedCount}个键`);

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清空所有缓存失败:', error);
    }

    return stats;
  }

  /**
   * 获取缓存统计
   */
  public async getCacheStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {
      memory: {
        size: this.memoryCache.size,
        keys: Array.from(this.memoryCache.keys()),
      },
    };

    if (this.redisClient) {
      try {
        const info = await this.redisClient.info('memory');
        const keyspace = await this.redisClient.info('keyspace');

        stats.redis = {
          memory: this.parseRedisInfo(info),
          keyspace: this.parseRedisInfo(keyspace),
        };
      } catch (error) {
        console.error('获取Redis统计失败:', error);
        stats.redis = { error: '无法获取Redis统计' };
      }
    }

    return stats;
  }

  // 私有方法

  private initializeRedisClient(): void {
    try {
      // 这里应该初始化Redis客户端
      // 例如使用ioredis或redis包
      // this.redisClient = new Redis(process.env.COSEREEDEN_REDIS_URL);
      console.log('Redis客户端初始化（需要实际实现）');
    } catch (error) {
      console.warn('Redis客户端初始化失败，将仅使用内存缓存:', error);
    }
  }

  private async cleanupRedisCache(options?: CacheCleanupOptions): Promise<CleanupStats> {
    const stats: CleanupStats = {
      taskType: CleanupTaskType.CACHE_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    if (!this.redisClient) {
      return stats;
    }

    try {
      const patterns = options?.patterns || ['cache:*', 'temp:*', 'session:*'];

      for (const pattern of patterns) {
        const keys = await this.redisClient.keys(pattern);
        stats.processedCount += keys.length;

        for (const key of keys) {
          try {
            const ttl = await this.redisClient.ttl(key);

            // 如果键已过期或没有设置TTL且超过最大年龄
            if (ttl === -2 || (ttl === -1 && options?.maxAge)) {
              await this.redisClient.del(key);
              stats.cleanedCount++;
            } else {
              stats.skippedCount++;
            }
          } catch (error) {
            stats.failedCount++;
            stats.errors.push(`键${key}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      }
    } catch (error) {
      stats.errors.push(`Redis清理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return stats;
  }

  private async cleanupMemoryCache(options?: CacheCleanupOptions): Promise<CleanupStats> {
    const stats: CleanupStats = {
      taskType: CleanupTaskType.CACHE_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      const maxAge = options?.maxAge || 60 * 60 * 1000; // 1小时
      const cutoffTime = Date.now() - maxAge;

      stats.processedCount = this.memoryCache.size;

      for (const [key, value] of this.memoryCache.entries()) {
        try {
          const timestamp = value.timestamp || 0;

          if (timestamp < cutoffTime) {
            this.memoryCache.delete(key);
            stats.cleanedCount++;
          } else {
            stats.skippedCount++;
          }
        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`内存键${key}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    } catch (error) {
      stats.errors.push(`内存缓存清理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return stats;
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const result: Record<string, any> = {};

    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = isNaN(Number(value)) ? value : Number(value);
      }
    });

    return result;
  }
}
