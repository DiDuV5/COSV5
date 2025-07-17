/**
 * @fileoverview Turnstile缓存管理器
 * @description 管理Turnstile功能状态的内存缓存
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import type { TurnstileFeatureId } from '@/types/turnstile';
import type { 
  ICacheManager, 
  FeatureStatusCacheEntry, 
  CacheStatus 
} from './types';

/**
 * Turnstile缓存管理器实现
 */
export class TurnstileCacheManager implements ICacheManager {
  private cache: Map<TurnstileFeatureId, FeatureStatusCacheEntry> = new Map();
  private readonly cacheExpiry: number;

  constructor(cacheExpiryMs: number = 5 * 60 * 1000) { // 默认5分钟
    this.cacheExpiry = cacheExpiryMs;
  }

  /**
   * 获取缓存条目
   */
  get(featureId: TurnstileFeatureId): FeatureStatusCacheEntry | undefined {
    const entry = this.cache.get(featureId);
    
    // 检查是否过期
    if (entry && this.isExpired(entry)) {
      this.cache.delete(featureId);
      return undefined;
    }
    
    return entry;
  }

  /**
   * 设置缓存条目
   */
  set(featureId: TurnstileFeatureId, entry: FeatureStatusCacheEntry): void {
    this.cache.set(featureId, {
      ...entry,
      lastUpdated: new Date()
    });
  }

  /**
   * 删除缓存条目
   */
  delete(featureId: TurnstileFeatureId): boolean {
    return this.cache.delete(featureId);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    console.log('🧹 已清理所有Turnstile功能状态缓存');
  }

  /**
   * 清理过期缓存
   */
  clearExpired(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [featureId, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(featureId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 清理了 ${removedCount} 个过期的缓存条目`);
    }
  }

  /**
   * 获取缓存状态
   */
  getStatus(): CacheStatus {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([featureId, entry]) => ({
        featureId,
        enabled: entry.enabled,
        lastUpdated: entry.lastUpdated
      }))
    };
  }

  /**
   * 检查缓存条目是否过期
   */
  private isExpired(entry: FeatureStatusCacheEntry): boolean {
    return Date.now() - entry.lastUpdated.getTime() >= this.cacheExpiry;
  }

  /**
   * 检查特定功能的缓存是否有效
   */
  isValid(featureId: TurnstileFeatureId): boolean {
    const entry = this.cache.get(featureId);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    cacheHitRate: number;
  } {
    const totalEntries = this.cache.size;
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries,
      validEntries,
      expiredEntries,
      cacheHitRate: totalEntries > 0 ? validEntries / totalEntries : 0
    };
  }
}
