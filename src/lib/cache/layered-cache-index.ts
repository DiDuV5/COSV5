/**
 * @fileoverview 分层缓存系统统一导出
 * @description 提供向后兼容的统一导出接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

// 导出所有类型定义
export * from './layered-cache-types';

// 导出配置管理
export { LayeredCacheConfigManager, DEFAULT_LAYERED_CACHE_CONFIG } from './layered-cache-config';

// 导出监控功能
export { LayeredCacheMonitoring } from './layered-cache-monitoring';

// 导出优化的日志管理器
export { OptimizedCacheLogger, DEFAULT_CACHE_LOGGER_CONFIG } from './optimized-cache-logger';
export type { CacheLoggerConfig } from './optimized-cache-logger';

// 导出操作功能
export { LayeredCacheOperations } from './layered-cache-operations';

// 导入依赖
import { LayeredCacheConfigManager } from './layered-cache-config';
import { LayeredCacheMonitoring } from './layered-cache-monitoring';
import { LayeredCacheOperations } from './layered-cache-operations';
import {
  LayeredCacheConfig,
  LayeredCacheStats,
  WarmupOptions,
  ClearOptions
} from './layered-cache-types';
import { CacheLoggerConfig } from './optimized-cache-logger';

/**
 * 分层缓存策略管理器（重构后的主类）
 */
export class LayeredCacheStrategy {
  private config: LayeredCacheConfig;
  private monitoring: LayeredCacheMonitoring;
  private operations: LayeredCacheOperations;

  constructor(config?: Partial<LayeredCacheConfig>) {
    this.config = LayeredCacheConfigManager.mergeConfig(config);

    // 使用配置中的日志设置初始化监控
    const loggerConfig = this.config.logging;
    this.monitoring = new LayeredCacheMonitoring(this.config, undefined, loggerConfig);
    this.operations = new LayeredCacheOperations(this.config, this.monitoring);

    if (this.config.monitoring.enabled) {
      this.monitoring.startMetricsCollection();
    }
  }

  /**
   * 获取缓存数据（分层查找）
   */
  async get<T>(key: string): Promise<T | null> {
    return this.operations.get<T>(key);
  }

  /**
   * 设置缓存数据（多层写入）
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    return this.operations.set(key, value, ttl);
  }

  /**
   * 删除缓存数据（多层删除）
   */
  async delete(key: string): Promise<boolean> {
    return this.operations.delete(key);
  }

  /**
   * 缓存预热
   */
  async warmup(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    const options: WarmupOptions = { keys, dataLoader };
    return this.operations.warmup(options);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): LayeredCacheStats {
    const l1Info = this.operations.getL1CacheInfo();
    return this.monitoring.getEnhancedStats(l1Info.size, l1Info.maxSize);
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.monitoring.resetStats();
  }

  /**
   * 更新日志配置
   */
  updateLoggerConfig(config: Partial<CacheLoggerConfig>): void {
    this.monitoring.updateLoggerConfig(config);
  }

  /**
   * 获取日志配置
   */
  getLoggerConfig(): CacheLoggerConfig {
    return this.monitoring.getLoggerConfig();
  }

  /**
   * 输出缓存活动摘要
   */
  logActivitySummary(): void {
    this.monitoring.logActivitySummary();
  }

  /**
   * 清理L1缓存
   */
  async clearL1Cache(): Promise<void> {
    return this.operations.clearL1Cache();
  }

  /**
   * 清理L2缓存
   */
  async clearL2Cache(pattern?: string): Promise<number> {
    return this.operations.clearL2Cache(pattern);
  }

  /**
   * 清理所有缓存层
   */
  async flush(): Promise<void> {
    return this.operations.flush();
  }

  /**
   * 清理指定缓存层
   */
  async clear(options: ClearOptions = {}): Promise<void> {
    return this.operations.clear(options);
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport() {
    return this.monitoring.generatePerformanceReport();
  }

  /**
   * 获取配置信息
   */
  getConfig(): LayeredCacheConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<LayeredCacheConfig>): void {
    this.config = LayeredCacheConfigManager.mergeConfig({
      ...this.config,
      ...newConfig
    });

    // 重新初始化监控
    this.monitoring.destroy();
    this.monitoring = new LayeredCacheMonitoring(this.config);

    if (this.config.monitoring.enabled) {
      this.monitoring.startMetricsCollection();
    }
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.monitoring.destroy();
    this.operations.destroy();
  }
}

// 创建默认实例以保持向后兼容
export const layeredCacheStrategy = new LayeredCacheStrategy();
