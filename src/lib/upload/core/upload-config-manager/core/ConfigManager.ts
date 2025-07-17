/**
 * @fileoverview 核心配置管理器
 * @description 配置管理的核心功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { CacheManager } from './CacheManager';

/**
 * 核心配置管理器类
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private cacheManager: CacheManager;

  private constructor() {
    this.cacheManager = new CacheManager();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * 获取缓存管理器
   */
  public getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  /**
   * 获取配置统计信息
   */
  public getStatistics(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    lastUpdate: Date | null;
  } {
    return {
      cacheSize: this.cacheManager.getSize(),
      cacheHits: this.cacheManager.getHits(),
      cacheMisses: this.cacheManager.getMisses(),
      lastUpdate: this.cacheManager.getLastUpdate(),
    };
  }

  /**
   * 清除所有缓存
   */
  public clearAllCache(): void {
    this.cacheManager.clearAll();
    console.log('🧹 所有配置缓存已清除');
  }

  /**
   * 重置管理器状态
   */
  public reset(): void {
    this.cacheManager.clearAll();
    console.log('🔄 配置管理器已重置');
  }

  /**
   * 获取管理器健康状态
   */
  public getHealthStatus(): {
    healthy: boolean;
    cacheSize: number;
    memoryUsage: number;
  } {
    const cacheSize = this.cacheManager.getSize();
    const memoryUsage = process.memoryUsage().heapUsed;

    return {
      healthy: cacheSize < 1000, // 缓存项目少于1000个认为健康
      cacheSize,
      memoryUsage,
    };
  }
}
