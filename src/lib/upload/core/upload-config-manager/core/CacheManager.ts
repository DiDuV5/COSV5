/**
 * @fileoverview 缓存管理器
 * @description 专门处理配置缓存逻辑
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 缓存项接口
 */
interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * 缓存管理器类
 */
export class CacheManager {
  private cache: Map<string, CacheItem> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟
  private hits = 0;
  private misses = 0;
  private lastUpdate: Date | null = null;

  /**
   * 从缓存获取数据
   */
  public get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return item.data;
  }

  /**
   * 设置缓存数据
   */
  public set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
    this.lastUpdate = new Date();
  }

  /**
   * 删除缓存项
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查缓存是否存在
   */
  public has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // 检查是否过期
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清除所有缓存
   */
  public clearAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.lastUpdate = null;
  }

  /**
   * 按模式清除缓存
   */
  public clearByPattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清理过期缓存
   */
  public cleanupExpired(): void {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.timestamp + item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存大小
   */
  public getSize(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存命中次数
   */
  public getHits(): number {
    return this.hits;
  }

  /**
   * 获取缓存未命中次数
   */
  public getMisses(): number {
    return this.misses;
  }

  /**
   * 获取缓存命中率
   */
  public getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * 获取最后更新时间
   */
  public getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  /**
   * 获取所有缓存键
   */
  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}
