/**
 * @fileoverview 配置缓存管理器
 * @description 管理审批配置的缓存机制
 * @author Augment AI
 * @date 2025-07-03
 */

import {
  ApprovalConfig,
  ConfigCacheItem,
  ConfigPerformanceMetrics
} from '../types/config-types';

/**
 * 审批配置缓存类
 */
export class ApprovalConfigCache {
  private cache = new Map<string, ConfigCacheItem>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5分钟
  private hitCount = 0;
  private missCount = 0;
  private lastCleanup = Date.now();

  /**
   * 获取缓存配置
   */
  get(key: string): ApprovalConfig | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return item.data;
  }

  /**
   * 设置缓存配置
   */
  set(key: string, config: ApprovalConfig, ttl?: number): void {
    const item: ConfigCacheItem = {
      data: config,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };

    this.cache.set(key, item);
    
    // 定期清理过期缓存
    this.scheduleCleanup();
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存命中率
   */
  getHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? this.hitCount / total : 0;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: this.getHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): ConfigPerformanceMetrics {
    return {
      cacheHitRate: this.getHitRate(),
      averageLoadTime: 0, // 这里需要实际测量
      updateFrequency: 0, // 这里需要实际统计
      memoryUsage: this.estimateMemoryUsage(),
      lastOptimization: new Date(this.lastCleanup)
    };
  }

  /**
   * 刷新缓存项
   */
  refresh(key: string, config: ApprovalConfig): void {
    if (this.cache.has(key)) {
      this.set(key, config);
    }
  }

  /**
   * 预热缓存
   */
  async warmup(configs: Record<string, ApprovalConfig>): Promise<void> {
    console.log('🔥 预热配置缓存');
    
    Object.entries(configs).forEach(([key, config]) => {
      this.set(key, config);
    });

    console.log(`✅ 缓存预热完成，加载了 ${Object.keys(configs).length} 个配置`);
  }

  /**
   * 获取所有缓存键
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有有效的缓存项
   */
  getValidItems(): Record<string, ApprovalConfig> {
    const validItems: Record<string, ApprovalConfig> = {};
    const now = Date.now();

    this.cache.forEach((item, key) => {
      if (now <= item.timestamp + item.ttl) {
        validItems[key] = item.data;
      }
    });

    return validItems;
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.cache.forEach((item, key) => {
      if (now > item.timestamp + item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    });

    this.lastCleanup = now;
    
    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期缓存项`);
    }

    return cleanedCount;
  }

  /**
   * 定期清理过期缓存
   */
  private scheduleCleanup(): void {
    const now = Date.now();
    
    // 每5分钟清理一次
    if (now - this.lastCleanup > 5 * 60 * 1000) {
      setTimeout(() => {
        this.cleanup();
      }, 0);
    }
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    this.cache.forEach((item) => {
      // 粗略估算每个配置项的内存占用
      totalSize += JSON.stringify(item).length * 2; // 假设每个字符占用2字节
    });

    return totalSize;
  }

  /**
   * 设置缓存TTL
   */
  setTTL(key: string, ttl: number): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    item.ttl = ttl;
    this.cache.set(key, item);
    return true;
  }

  /**
   * 获取缓存项的剩余TTL
   */
  getTTL(key: string): number {
    const item = this.cache.get(key);
    
    if (!item) {
      return -1;
    }

    const remaining = (item.timestamp + item.ttl) - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * 检查缓存健康状态
   */
  healthCheck(): {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // 检查缓存大小
    if (this.cache.size > 100) {
      issues.push('缓存项过多，可能影响性能');
      recommendations.push('考虑减少缓存TTL或增加清理频率');
    }

    // 检查命中率
    const hitRate = this.getHitRate();
    if (hitRate < 0.5) {
      issues.push('缓存命中率过低');
      recommendations.push('考虑增加缓存TTL或优化缓存策略');
    }

    // 检查内存使用
    const memoryUsage = this.estimateMemoryUsage();
    if (memoryUsage > 10 * 1024 * 1024) { // 10MB
      issues.push('缓存内存使用过高');
      recommendations.push('考虑压缩缓存数据或减少缓存项');
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 导出缓存数据
   */
  export(): Record<string, ConfigCacheItem> {
    const exported: Record<string, ConfigCacheItem> = {};
    
    this.cache.forEach((item, key) => {
      exported[key] = { ...item };
    });

    return exported;
  }

  /**
   * 导入缓存数据
   */
  import(data: Record<string, ConfigCacheItem>): void {
    this.clear();
    
    Object.entries(data).forEach(([key, item]) => {
      this.cache.set(key, item);
    });
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.lastCleanup = Date.now();
  }
}

// 创建全局缓存实例
export const configCache = new ApprovalConfigCache();
