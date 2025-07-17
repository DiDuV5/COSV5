/**
 * @fileoverview 分层缓存操作实现
 * @description 实现L1(内存) -> L2(Redis) -> L3(数据库)三级缓存的核心操作
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { LRUCache } from 'lru-cache';
import { redisCacheManager } from './redis-cache-manager';
import { 
  CacheLevel, 
  CacheItem, 
  LayeredCacheConfig, 
  WarmupOptions,
  ClearOptions 
} from './layered-cache-types';
import { LayeredCacheMonitoring } from './layered-cache-monitoring';

// 临时logger
const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  debug: (message: string, data?: any) => console.log(message, data),
  warn: (message: string, data?: any) => console.warn(message, data),
  error: (message: string, data?: any) => console.error(message, data)
};

/**
 * 分层缓存操作管理器
 */
export class LayeredCacheOperations {
  private l1Cache: LRUCache<string, CacheItem<any>>;
  private config: LayeredCacheConfig;
  private monitoring: LayeredCacheMonitoring;

  constructor(config: LayeredCacheConfig, monitoring: LayeredCacheMonitoring) {
    this.config = config;
    this.monitoring = monitoring;

    // 初始化L1内存缓存
    this.l1Cache = new LRUCache({
      max: this.config.l1Config.maxSize,
      ttl: this.config.l1Config.ttl,
      updateAgeOnGet: this.config.l1Config.updateAgeOnGet,
      dispose: (value, key) => {
        logger.debug(`L1缓存项过期: ${key}`);
      }
    });
  }

  /**
   * 获取缓存数据（分层查找）
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      // L1: 内存缓存查找
      const l1Result = await this.getFromL1<T>(key);
      if (l1Result !== null) {
        this.monitoring.recordHit(CacheLevel.L1_MEMORY, Date.now() - startTime);
        return l1Result;
      }

      // L2: Redis缓存查找
      const l2Result = await this.getFromL2<T>(key);
      if (l2Result !== null) {
        // 回填到L1缓存
        await this.setToL1(key, l2Result, this.config.l1Config.ttl);
        this.monitoring.recordHit(CacheLevel.L2_REDIS, Date.now() - startTime);
        return l2Result;
      }

      // L3: 数据库缓存未命中
      this.monitoring.recordMiss(CacheLevel.L3_DATABASE, Date.now() - startTime);
      return null;

    } catch (error) {
      logger.error('分层缓存获取失败', { key, error });
      return null;
    }
  }

  /**
   * 设置缓存数据（多层写入）
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    const startTime = Date.now();

    try {
      const effectiveTTL = ttl || this.config.l2Config.defaultTTL;

      // 同时写入L1和L2缓存
      const [l1Success, l2Success] = await Promise.all([
        this.setToL1(key, value, this.config.l1Config.ttl),
        this.setToL2(key, value, effectiveTTL)
      ]);

      const success = l1Success && l2Success;
      logger.debug(`分层缓存设置${success ? '成功' : '失败'}`, {
        key,
        ttl: effectiveTTL,
        duration: Date.now() - startTime
      });

      return success;
    } catch (error) {
      logger.error('分层缓存设置失败', { key, error });
      return false;
    }
  }

  /**
   * 删除缓存数据（多层删除）
   */
  async delete(key: string): Promise<boolean> {
    try {
      const [l1Success, l2Success] = await Promise.all([
        this.deleteFromL1(key),
        this.deleteFromL2(key)
      ]);

      return l1Success && l2Success;
    } catch (error) {
      logger.error('分层缓存删除失败', { key, error });
      return false;
    }
  }

  /**
   * 缓存预热
   */
  async warmup(options: WarmupOptions): Promise<void> {
    if (!this.config.warmupConfig.enabled) {
      return;
    }

    const { keys, dataLoader } = options;
    const batchSize = options.batchSize || this.config.warmupConfig.batchSize;

    logger.info(`开始缓存预热，共${keys.length}个键`);
    const startTime = Date.now();

    const batches = this.chunkArray(keys, batchSize);

    for (const batch of batches) {
      const promises = batch.map(async (key) => {
        try {
          const data = await dataLoader(key);
          if (data !== null) {
            await this.set(key, data);
          }
        } catch (error) {
          logger.warn(`预热键失败: ${key}`, { error });
        }
      });

      await Promise.all(promises);
    }

    const duration = Date.now() - startTime;
    logger.info(`缓存预热完成，耗时${duration}ms`);
  }

  /**
   * 清理L1缓存
   */
  async clearL1Cache(): Promise<void> {
    this.l1Cache.clear();
    logger.info('L1内存缓存已清理');
  }

  /**
   * 清理L2缓存
   */
  async clearL2Cache(pattern?: string): Promise<number> {
    if (pattern) {
      return await redisCacheManager.deletePattern(pattern);
    } else {
      await redisCacheManager.flush();
      return 1;
    }
  }

  /**
   * 清理所有缓存层
   */
  async flush(): Promise<void> {
    await this.clearL1Cache();
    await this.clearL2Cache();
    logger.info('所有缓存层已清理');
  }

  /**
   * 清理指定缓存层
   */
  async clear(options: ClearOptions = {}): Promise<void> {
    const { level, pattern, force } = options;

    if (!level || level === CacheLevel.L1_MEMORY || (Array.isArray(level) && level.includes(CacheLevel.L1_MEMORY))) {
      await this.clearL1Cache();
    }

    if (!level || level === CacheLevel.L2_REDIS || (Array.isArray(level) && level.includes(CacheLevel.L2_REDIS))) {
      await this.clearL2Cache(pattern);
    }

    if (force) {
      await this.flush();
    }
  }

  /**
   * 获取L1缓存大小信息
   */
  getL1CacheInfo(): { size: number; maxSize: number } {
    return {
      size: this.l1Cache.size,
      maxSize: this.config.l1Config.maxSize
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 从L1缓存获取数据
   */
  private async getFromL1<T>(key: string): Promise<T | null> {
    const item = this.l1Cache.get(key);
    if (item && !this.isExpired(item)) {
      return item.data;
    }
    return null;
  }

  /**
   * 从L2缓存获取数据
   */
  private async getFromL2<T>(key: string): Promise<T | null> {
    try {
      const data = await redisCacheManager.get<T>(this.formatKey(key));
      return data;
    } catch (error) {
      logger.warn('L2缓存获取失败', { key, error });
      return null;
    }
  }

  /**
   * 设置L1缓存
   */
  private async setToL1<T>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      const item: CacheItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        level: CacheLevel.L1_MEMORY
      };
      this.l1Cache.set(key, item);
      return true;
    } catch (error) {
      logger.warn('L1缓存设置失败', { key, error });
      return false;
    }
  }

  /**
   * 设置L2缓存
   */
  private async setToL2<T>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      return await redisCacheManager.set(this.formatKey(key), value, ttl);
    } catch (error) {
      logger.warn('L2缓存设置失败', { key, error });
      return false;
    }
  }

  /**
   * 从L1缓存删除
   */
  private async deleteFromL1(key: string): Promise<boolean> {
    try {
      return this.l1Cache.delete(key);
    } catch (error) {
      logger.warn('L1缓存删除失败', { key, error });
      return false;
    }
  }

  /**
   * 从L2缓存删除
   */
  private async deleteFromL2(key: string): Promise<boolean> {
    try {
      return await redisCacheManager.delete(this.formatKey(key));
    } catch (error) {
      logger.warn('L2缓存删除失败', { key, error });
      return false;
    }
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 格式化缓存键
   */
  private formatKey(key: string): string {
    return `${this.config.l2Config.keyPrefix}:${key}`;
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.l1Cache.clear();
  }
}
