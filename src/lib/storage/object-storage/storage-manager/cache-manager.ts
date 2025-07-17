/**
 * @fileoverview 缓存管理器
 * @description 管理存储操作的缓存
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import type { CacheItem } from './types';

/**
 * 缓存管理器
 */
export class CacheManager extends EventEmitter {
  private cache = new Map<string, CacheItem<any>>();
  private cacheTtl: number;

  constructor(cacheTtl: number = 300000) {
    super();
    this.cacheTtl = cacheTtl;
  }

  /**
   * 从缓存获取数据
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T): void {
    const expiresAt = new Date(Date.now() + this.cacheTtl);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * 清除缓存数据
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.emit('cacheCleared');
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = new Date();
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (item.expiresAt < now) {
        this.cache.delete(key);
      }
    });
  }
}
