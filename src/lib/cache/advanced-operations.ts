/**
 * @fileoverview Redis缓存高级操作
 * @description 高级缓存操作：模式删除、标签管理、批量操作等
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { logger } from '@/lib/logging/log-deduplicator';
import type { CacheStats } from './types';
import type { CacheConfigManager } from './config';

/**
 * 高级缓存操作类
 */
export class AdvancedCacheOperations {
  private configManager: CacheConfigManager;
  private stats: CacheStats;

  constructor(configManager: CacheConfigManager, stats: CacheStats) {
    this.configManager = configManager;
    this.stats = stats;
  }

  /**
   * 按模式删除缓存
   */
  public async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const formattedPattern = this.configManager.formatKey(pattern);
        
        // 使用SCAN代替KEYS，避免阻塞Redis
        let cursor = '0';
        let deletedCount = 0;
        
        do {
          const result = await redis.scan(cursor, 'MATCH', formattedPattern, 'COUNT', 100);
          cursor = result[0];
          const keys = result[1];
          
          if (keys.length > 0) {
            const pipeline = redis.pipeline();
            keys.forEach(key => pipeline.del(key));
            await pipeline.exec();
            deletedCount += keys.length;
          }
        } while (cursor !== '0');
        
        this.stats.deletes += deletedCount;
        logger.info('按模式删除缓存完成', { pattern, deletedCount });
        return deletedCount;
      }
      
      return 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('按模式删除缓存失败', { pattern, error });
      return 0;
    }
  }

  /**
   * 按模式删除缓存（兼容旧版本）
   */
  public async deleteByPattern(pattern: string): Promise<void> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const formattedPattern = this.configManager.formatKey(pattern);
        const keys = await redis.keys(formattedPattern);
        
        if (keys.length > 0) {
          const pipeline = redis.pipeline();
          keys.forEach(key => pipeline.del(key));
          await pipeline.exec();
          this.stats.deletes += keys.length;
        }
        
        logger.info('按模式删除缓存完成', { pattern, deletedCount: keys.length });
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('按模式删除缓存失败', { pattern, error });
    }
  }

  /**
   * 按标签清理缓存
   */
  public async clearByTag(tag: string): Promise<number> {
    try {
      if (!this.configManager.getRedis()) {
        return 0;
      }

      const redis = this.configManager.getRedis()!;
      
      // 获取标签对应的键集合
      const tagKey = this.configManager.formatKey(`tag:${tag}`);
      const keys = await redis.smembers(tagKey);
      
      if (keys.length === 0) {
        return 0;
      }

      // 批量删除键
      const pipeline = redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      pipeline.del(tagKey); // 同时删除标签键
      
      await pipeline.exec();
      
      this.stats.deletes += keys.length;
      logger.info('按标签清理缓存完成', { tag, deletedCount: keys.length });
      
      return keys.length;
    } catch (error) {
      this.stats.errors++;
      logger.error('按标签清理缓存失败', { tag, error });
      return 0;
    }
  }

  /**
   * 为缓存键添加标签
   */
  public async addTag(key: string, tag: string): Promise<boolean> {
    try {
      if (!this.configManager.isRedisAvailable()) {
        return false;
      }

      const redis = this.configManager.getRedis()!;
      const formattedKey = this.configManager.formatKey(key);
      const tagKey = this.configManager.formatKey(`tag:${tag}`);
      
      await redis.sadd(tagKey, formattedKey);
      
      logger.debug('为缓存键添加标签', { key, tag });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('添加缓存标签失败', { key, tag, error });
      return false;
    }
  }

  /**
   * 从缓存键移除标签
   */
  public async removeTag(key: string, tag: string): Promise<boolean> {
    try {
      if (!this.configManager.isRedisAvailable()) {
        return false;
      }

      const redis = this.configManager.getRedis()!;
      const formattedKey = this.configManager.formatKey(key);
      const tagKey = this.configManager.formatKey(`tag:${tag}`);
      
      await redis.srem(tagKey, formattedKey);
      
      logger.debug('从缓存键移除标签', { key, tag });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('移除缓存标签失败', { key, tag, error });
      return false;
    }
  }

  /**
   * 获取标签下的所有键
   */
  public async getKeysByTag(tag: string): Promise<string[]> {
    try {
      if (!this.configManager.isRedisAvailable()) {
        return [];
      }

      const redis = this.configManager.getRedis()!;
      const tagKey = this.configManager.formatKey(`tag:${tag}`);
      const keys = await redis.smembers(tagKey);
      
      // 移除键前缀
      const prefix = this.configManager.getConfig().keyPrefix;
      return keys.map(key => key.startsWith(prefix) ? key.slice(prefix.length) : key);
    } catch (error) {
      this.stats.errors++;
      logger.error('获取标签键列表失败', { tag, error });
      return [];
    }
  }

  /**
   * 清空所有缓存
   */
  public async flush(): Promise<boolean> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        await redis.flushdb();
        logger.info('Redis缓存已清空');
      }
      
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('清空缓存失败', { error });
      return false;
    }
  }

  /**
   * 获取缓存键的信息
   */
  public async getKeyInfo(key: string): Promise<{
    exists: boolean;
    ttl: number;
    type: string;
    size?: number;
  } | null> {
    try {
      if (!this.configManager.isRedisAvailable()) {
        return null;
      }

      const redis = this.configManager.getRedis()!;
      const formattedKey = this.configManager.formatKey(key);
      
      const [exists, ttl, type] = await Promise.all([
        redis.exists(formattedKey),
        redis.ttl(formattedKey),
        redis.type(formattedKey)
      ]);

      if (exists === 0) {
        return { exists: false, ttl: -1, type: 'none' };
      }

      let size: number | undefined;
      try {
        if (type === 'string') {
          size = await redis.strlen(formattedKey);
        } else if (type === 'list') {
          size = await redis.llen(formattedKey);
        } else if (type === 'set') {
          size = await redis.scard(formattedKey);
        } else if (type === 'hash') {
          size = await redis.hlen(formattedKey);
        } else if (type === 'zset') {
          size = await redis.zcard(formattedKey);
        }
      } catch (sizeError) {
        logger.warn('获取键大小失败', { key, sizeError });
      }

      return {
        exists: true,
        ttl,
        type,
        size
      };
    } catch (error) {
      this.stats.errors++;
      logger.error('获取缓存键信息失败', { key, error });
      return null;
    }
  }

  /**
   * 批量检查键是否存在
   */
  public async batchExists(keys: string[]): Promise<boolean[]> {
    try {
      if (!this.configManager.isRedisAvailable()) {
        return keys.map(() => false);
      }

      const redis = this.configManager.getRedis()!;
      const formattedKeys = keys.map(key => this.configManager.formatKey(key));
      
      const pipeline = redis.pipeline();
      formattedKeys.forEach(key => pipeline.exists(key));
      
      const results = await pipeline.exec();
      
      return results?.map(result => result[1] === 1) || keys.map(() => false);
    } catch (error) {
      this.stats.errors++;
      logger.error('批量检查键存在性失败', { keyCount: keys.length, error });
      return keys.map(() => false);
    }
  }

  /**
   * 批量设置过期时间
   */
  public async batchExpire(keyTTLPairs: Array<{ key: string; ttl: number }>): Promise<boolean[]> {
    try {
      if (!this.configManager.isRedisAvailable()) {
        return keyTTLPairs.map(() => false);
      }

      const redis = this.configManager.getRedis()!;
      const pipeline = redis.pipeline();
      
      keyTTLPairs.forEach(({ key, ttl }) => {
        const formattedKey = this.configManager.formatKey(key);
        pipeline.expire(formattedKey, ttl);
      });
      
      const results = await pipeline.exec();
      
      return results?.map(result => result[1] === 1) || keyTTLPairs.map(() => false);
    } catch (error) {
      this.stats.errors++;
      logger.error('批量设置过期时间失败', { pairCount: keyTTLPairs.length, error });
      return keyTTLPairs.map(() => false);
    }
  }

  /**
   * 模式匹配检查
   */
  public matchPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  /**
   * 获取匹配模式的键列表
   */
  public async getKeysByPattern(pattern: string, limit = 100): Promise<string[]> {
    try {
      if (!this.configManager.isRedisAvailable()) {
        return [];
      }

      const redis = this.configManager.getRedis()!;
      const formattedPattern = this.configManager.formatKey(pattern);
      
      let cursor = '0';
      const keys: string[] = [];
      
      do {
        const result = await redis.scan(cursor, 'MATCH', formattedPattern, 'COUNT', limit);
        cursor = result[0];
        keys.push(...result[1]);
        
        if (keys.length >= limit) {
          break;
        }
      } while (cursor !== '0');
      
      // 移除键前缀
      const prefix = this.configManager.getConfig().keyPrefix;
      return keys
        .map(key => key.startsWith(prefix) ? key.slice(prefix.length) : key)
        .slice(0, limit);
    } catch (error) {
      this.stats.errors++;
      logger.error('获取模式匹配键列表失败', { pattern, error });
      return [];
    }
  }
}
