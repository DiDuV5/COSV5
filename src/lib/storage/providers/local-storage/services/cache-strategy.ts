/**
 * @fileoverview 缓存策略服务
 * @description 处理本地存储的缓存策略和优化
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  type CacheConfig,
  DEFAULT_CACHE_CONFIG
} from '../types/local-storage-types';

/**
 * 缓存项
 */
interface CacheItem {
  key: string;
  data: Buffer;
  size: number;
  accessCount: number;
  lastAccessed: Date;
  createdAt: Date;
  etag: string;
}

/**
 * 缓存策略服务
 */
export class CacheStrategy {
  private cache = new Map<string, CacheItem>();
  private config: CacheConfig;
  private currentSize = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * 获取缓存项
   */
  get(key: string): Buffer | null {
    if (!this.config.enabled) {
      return null;
    }

    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    const now = new Date();
    const age = now.getTime() - item.createdAt.getTime();

    if (age > this.config.maxAge * 1000) {
      this.delete(key);
      return null;
    }

    // 更新访问信息
    item.lastAccessed = now;
    item.accessCount++;

    return item.data;
  }

  /**
   * 设置缓存项
   */
  set(key: string, data: Buffer, etag: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 检查大小限制
    if (data.length > this.config.maxSize) {
      return false;
    }

    // 如果缓存已满，执行清理策略
    if (this.currentSize + data.length > this.config.maxSize) {
      this.evict(data.length);
    }

    const now = new Date();
    const item: CacheItem = {
      key,
      data,
      size: data.length,
      accessCount: 1,
      lastAccessed: now,
      createdAt: now,
      etag,
    };

    // 删除旧项（如果存在）
    this.delete(key);

    // 添加新项
    this.cache.set(key, item);
    this.currentSize += data.length;

    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    this.cache.delete(key);
    this.currentSize -= item.size;

    return true;
  }

  /**
   * 检查缓存项是否存在且有效
   */
  has(key: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // 检查是否过期
    const now = new Date();
    const age = now.getTime() - item.createdAt.getTime();

    if (age > this.config.maxAge * 1000) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * 执行清理策略
   */
  private evict(requiredSpace: number): void {
    const itemsToEvict: string[] = [];
    let freedSpace = 0;

    // 根据策略选择要清理的项
    switch (this.config.strategy) {
      case 'lru':
        itemsToEvict.push(...this.getLRUItems(requiredSpace));
        break;
      case 'lfu':
        itemsToEvict.push(...this.getLFUItems(requiredSpace));
        break;
      case 'fifo':
        itemsToEvict.push(...this.getFIFOItems(requiredSpace));
        break;
    }

    // 删除选中的项
    for (const key of itemsToEvict) {
      const item = this.cache.get(key);
      if (item) {
        freedSpace += item.size;
        this.delete(key);

        if (freedSpace >= requiredSpace) {
          break;
        }
      }
    }
  }

  /**
   * 获取LRU（最近最少使用）项
   */
  private getLRUItems(requiredSpace: number): string[] {
    const items = Array.from(this.cache.values());
    items.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    const result: string[] = [];
    let freedSpace = 0;

    for (const item of items) {
      result.push(item.key);
      freedSpace += item.size;

      if (freedSpace >= requiredSpace) {
        break;
      }
    }

    return result;
  }

  /**
   * 获取LFU（最少使用频率）项
   */
  private getLFUItems(requiredSpace: number): string[] {
    const items = Array.from(this.cache.values());
    items.sort((a, b) => a.accessCount - b.accessCount);

    const result: string[] = [];
    let freedSpace = 0;

    for (const item of items) {
      result.push(item.key);
      freedSpace += item.size;

      if (freedSpace >= requiredSpace) {
        break;
      }
    }

    return result;
  }

  /**
   * 获取FIFO（先进先出）项
   */
  private getFIFOItems(requiredSpace: number): string[] {
    const items = Array.from(this.cache.values());
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const result: string[] = [];
    let freedSpace = 0;

    for (const item of items) {
      result.push(item.key);
      freedSpace += item.size;

      if (freedSpace >= requiredSpace) {
        break;
      }
    }

    return result;
  }

  /**
   * 清理过期项
   */
  cleanupExpired(): number {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      const age = now.getTime() - item.createdAt.getTime();

      if (age > this.config.maxAge * 1000) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    return expiredKeys.length;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    itemCount: number;
    hitRate: number;
    usage: number;
  } {
    const usage = this.config.maxSize > 0 ? (this.currentSize / this.config.maxSize) * 100 : 0;

    // 计算命中率（简化实现）
    const totalAccess = Array.from(this.cache.values()).reduce((sum, item) => sum + item.accessCount, 0);
    const hitRate = totalAccess > 0 ? (this.cache.size / totalAccess) * 100 : 0;

    return {
      size: this.currentSize,
      maxSize: this.config.maxSize,
      itemCount: this.cache.size,
      hitRate,
      usage,
    };
  }

  /**
   * 获取缓存项列表
   */
  getItems(): Array<{
    key: string;
    size: number;
    accessCount: number;
    lastAccessed: Date;
    createdAt: Date;
    age: number;
  }> {
    const now = new Date();

    return Array.from(this.cache.values()).map(item => ({
      key: item.key,
      size: item.size,
      accessCount: item.accessCount,
      lastAccessed: item.lastAccessed,
      createdAt: item.createdAt,
      age: now.getTime() - item.createdAt.getTime(),
    }));
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果禁用缓存，清空所有项
    if (!this.config.enabled) {
      this.clear();
    }

    // 如果减小了最大大小，执行清理
    if (this.currentSize > this.config.maxSize) {
      this.evict(this.currentSize - this.config.maxSize);
    }
  }

  /**
   * 预热缓存
   */
  async warmup(keys: string[], dataProvider: (key: string) => Promise<{ data: Buffer; etag: string }>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    for (const key of keys) {
      try {
        if (!this.has(key)) {
          const { data, etag } = await dataProvider(key);
          this.set(key, data, etag);
        }
      } catch (error) {
        console.warn('预热缓存失败:', key, error);
      }
    }
  }

  /**
   * 导出缓存到文件
   */
  async exportToFile(filePath: string): Promise<void> {
    const data = {
      config: this.config,
      items: this.getItems(),
      stats: this.getStats(),
    };

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * 从文件导入缓存配置
   */
  async importFromFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (data.config) {
        this.updateConfig(data.config);
      }
    } catch (error) {
      console.error('导入缓存配置失败:', error);
      throw new Error('导入缓存配置失败');
    }
  }
}
