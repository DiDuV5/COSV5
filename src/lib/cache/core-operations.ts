/**
 * @fileoverview Redis缓存核心操作
 * @description 基础缓存操作：get, set, delete, exists, expire等
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { logger } from '@/lib/logging/log-deduplicator';
import type { CacheItem, CacheStats, BatchSetItem } from './types';
import type { CacheConfigManager } from './config';

/**
 * 核心缓存操作类
 */
export class CoreCacheOperations {
  private configManager: CacheConfigManager;
  private stats: CacheStats;
  private fallbackCache = new Map<string, CacheItem>();
  private penetrationCache = new Map<string, number>(); // 穿透防护缓存

  constructor(configManager: CacheConfigManager, stats: CacheStats) {
    this.configManager = configManager;
    this.stats = stats;
  }

  /**
   * 获取缓存数据
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      let cacheData: string | null = null;

      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const formattedKey = this.configManager.formatKey(key);
        cacheData = await redis.get(formattedKey);
      }

      if (cacheData) {
        this.stats.hits++;
        this.updateHitRate();
        
        try {
          const parsed = JSON.parse(cacheData);
          return parsed.data;
        } catch {
          return cacheData as unknown as T;
        }
      }

      // 检查内存回退缓存
      const fallbackItem = this.fallbackCache.get(key);
      if (fallbackItem) {
        const now = Date.now();
        const expiry = fallbackItem.timestamp + (fallbackItem.ttl * 1000);
        
        if (now < expiry) {
          this.stats.hits++;
          this.updateHitRate();
          return fallbackItem.data;
        } else {
          this.fallbackCache.delete(key);
        }
      }

      this.stats.misses++;
      this.updateHitRate();
      
      // 缓存穿透防护
      if (this.configManager.getConfig().enablePenetrationProtection) {
        this.handleCachePenetration(key);
      }
      
      return null;
    } catch (error) {
      this.stats.errors++;
      logger.error('缓存获取失败', { key, error });
      
      // 尝试从回退缓存获取
      const fallbackItem = this.fallbackCache.get(key);
      if (fallbackItem) {
        return fallbackItem.data;
      }
      
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const config = this.configManager.getConfig();
      const finalTTL = ttl || config.defaultTTL;
      const formattedKey = this.configManager.formatKey(key);
      
      // 动态TTL调整
      const adjustedTTL = config.enableDynamicTTL 
        ? this.calculateDynamicTTL(key, finalTTL)
        : finalTTL;

      const cacheItem: CacheItem = {
        data: value,
        timestamp: Date.now(),
        ttl: adjustedTTL
      };

      const serializedData = JSON.stringify(cacheItem);

      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        await redis.setex(formattedKey, adjustedTTL, serializedData);
      }

      // 同时存储到内存回退缓存
      this.fallbackCache.set(key, cacheItem);
      
      this.stats.sets++;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('缓存设置失败', { key, error });
      
      // 至少保存到内存缓存
      try {
        const cacheItem: CacheItem = {
          data: value,
          timestamp: Date.now(),
          ttl: ttl || this.configManager.getDefaultTTL()
        };
        this.fallbackCache.set(key, cacheItem);
        this.stats.sets++;
        return true;
      } catch (fallbackError) {
        logger.error('内存缓存设置也失败', { key, fallbackError });
        return false;
      }
    }
  }

  /**
   * 删除缓存数据
   */
  public async delete(key: string): Promise<boolean> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const formattedKey = this.configManager.formatKey(key);
        await redis.del(formattedKey);
      }

      // 同时从内存缓存删除
      this.fallbackCache.delete(key);
      
      this.stats.deletes++;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('缓存删除失败', { key, error });
      
      // 至少从内存缓存删除
      this.fallbackCache.delete(key);
      this.stats.deletes++;
      return false;
    }
  }

  /**
   * 批量设置缓存
   */
  public async mset(items: BatchSetItem[]): Promise<boolean> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const pipeline = redis.pipeline();
        
        for (const item of items) {
          const config = this.configManager.getConfig();
          const finalTTL = item.ttl || config.defaultTTL;
          const formattedKey = this.configManager.formatKey(item.key);
          
          const cacheItem: CacheItem = {
            data: item.value,
            timestamp: Date.now(),
            ttl: finalTTL
          };
          
          const serializedData = JSON.stringify(cacheItem);
          pipeline.setex(formattedKey, finalTTL, serializedData);
          
          // 同时设置到内存缓存
          this.fallbackCache.set(item.key, cacheItem);
        }
        
        await pipeline.exec();
      } else {
        // 仅使用内存缓存
        for (const item of items) {
          const finalTTL = item.ttl || this.configManager.getDefaultTTL();
          const cacheItem: CacheItem = {
            data: item.value,
            timestamp: Date.now(),
            ttl: finalTTL
          };
          this.fallbackCache.set(item.key, cacheItem);
        }
      }

      this.stats.sets += items.length;
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('批量缓存设置失败', { itemCount: items.length, error });
      return false;
    }
  }

  /**
   * 批量获取缓存
   */
  public async mget<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const formattedKeys = keys.map(key => this.configManager.formatKey(key));
        const results = await redis.mget(...formattedKeys);
        
        return results.map((result, index) => {
          if (result) {
            this.stats.hits++;
            try {
              const parsed = JSON.parse(result);
              return parsed.data;
            } catch {
              return result as unknown as T;
            }
          } else {
            this.stats.misses++;
            
            // 检查内存回退缓存
            const fallbackItem = this.fallbackCache.get(keys[index]);
            if (fallbackItem) {
              const now = Date.now();
              const expiry = fallbackItem.timestamp + (fallbackItem.ttl * 1000);
              
              if (now < expiry) {
                this.stats.hits++;
                return fallbackItem.data;
              } else {
                this.fallbackCache.delete(keys[index]);
              }
            }
            
            return null;
          }
        });
      } else {
        // 仅使用内存缓存
        return keys.map(key => {
          const fallbackItem = this.fallbackCache.get(key);
          if (fallbackItem) {
            const now = Date.now();
            const expiry = fallbackItem.timestamp + (fallbackItem.ttl * 1000);
            
            if (now < expiry) {
              this.stats.hits++;
              return fallbackItem.data;
            } else {
              this.fallbackCache.delete(key);
            }
          }
          
          this.stats.misses++;
          return null;
        });
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('批量缓存获取失败', { keyCount: keys.length, error });
      return keys.map(() => null);
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * 检查缓存是否存在
   */
  public async exists(key: string): Promise<boolean> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const formattedKey = this.configManager.formatKey(key);
        const result = await redis.exists(formattedKey);
        return result === 1;
      }

      // 检查内存缓存
      return this.fallbackCache.has(key);
    } catch (error) {
      this.stats.errors++;
      logger.error('缓存存在性检查失败', { key, error });
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    try {
      if (this.configManager.isRedisAvailable()) {
        const redis = this.configManager.getRedis()!;
        const formattedKey = this.configManager.formatKey(key);
        const result = await redis.expire(formattedKey, ttl);
        return result === 1;
      }

      // 更新内存缓存的TTL
      const item = this.fallbackCache.get(key);
      if (item) {
        item.ttl = ttl;
        item.timestamp = Date.now();
        return true;
      }

      return false;
    } catch (error) {
      this.stats.errors++;
      logger.error('缓存过期时间设置失败', { key, ttl, error });
      return false;
    }
  }

  /**
   * 清理内存缓存
   */
  public cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, item] of this.fallbackCache.entries()) {
      const expiry = item.timestamp + (item.ttl * 1000);
      if (now >= expiry) {
        this.fallbackCache.delete(key);
      }
    }
  }

  /**
   * 处理缓存穿透
   */
  private handleCachePenetration(key: string): void {
    const now = Date.now();
    const lastAccess = this.penetrationCache.get(key) || 0;
    const config = this.configManager.getConfig();
    
    if (now - lastAccess < config.penetrationCacheTTL * 1000) {
      this.stats.penetrationPrevented++;
      return;
    }
    
    this.penetrationCache.set(key, now);
  }

  /**
   * 计算动态TTL
   */
  private calculateDynamicTTL(key: string, baseTTL: number): number {
    const config = this.configManager.getConfig();
    if (!config.enableDynamicTTL) {
      return baseTTL;
    }

    // 根据命中率调整TTL
    let adjustedTTL = baseTTL;
    
    if (this.stats.hitRate > config.hitRateThreshold) {
      // 高命中率，延长TTL
      adjustedTTL = Math.min(baseTTL * 1.5, baseTTL + 3600);
    } else if (this.stats.hitRate < 50) {
      // 低命中率，缩短TTL
      adjustedTTL = Math.max(baseTTL * 0.7, 300);
    }

    // 根据键的类型进行特殊处理
    if (key.includes('user:')) {
      adjustedTTL = Math.min(adjustedTTL, 1800); // 用户数据最多30分钟
    } else if (key.includes('session:')) {
      adjustedTTL = Math.min(adjustedTTL, 3600); // 会话数据最多1小时
    } else if (key.includes('config:')) {
      adjustedTTL = Math.max(adjustedTTL, 7200); // 配置数据至少2小时
    }

    if (adjustedTTL !== baseTTL) {
      this.stats.dynamicTTLAdjustments++;
    }

    return Math.round(adjustedTTL);
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * 获取内存缓存大小
   */
  public getMemoryCacheSize(): number {
    return this.fallbackCache.size;
  }

  /**
   * 清空内存缓存
   */
  public clearMemoryCache(): void {
    this.fallbackCache.clear();
    this.penetrationCache.clear();
  }
}
