/**
 * @fileoverview Redis缓存管理器主类
 * @description 重构后的Redis缓存管理器，整合所有功能模块
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0
 */

import { logger } from '@/lib/logging/log-deduplicator';
import { CacheConfigManager, createInitialStats } from './config';
import { CoreCacheOperations } from './core-operations';
import { AdvancedCacheOperations } from './advanced-operations';
import { CacheStatsMonitoring } from './stats-monitoring';
import { CacheOptimization } from './optimization';
import type {
  CacheConfig,
  CacheStats,
  WarmupConfig,
  BatchSetItem,
  ICacheManager
} from './types';

/**
 * Redis缓存管理器主类
 */
export class RedisCacheManager implements ICacheManager {
  private configManager: CacheConfigManager;
  private stats: CacheStats;
  private coreOps: CoreCacheOperations;
  private advancedOps: AdvancedCacheOperations;
  private statsMonitoring: CacheStatsMonitoring;
  private optimization: CacheOptimization;

  constructor(config?: Partial<CacheConfig>) {
    this.configManager = new CacheConfigManager(config);
    this.stats = createInitialStats();

    // 初始化功能模块
    this.coreOps = new CoreCacheOperations(this.configManager, this.stats);
    this.advancedOps = new AdvancedCacheOperations(this.configManager, this.stats);
    this.statsMonitoring = new CacheStatsMonitoring(this.configManager, this.stats);
    this.optimization = new CacheOptimization(this.configManager, this.stats);
  }

  /**
   * 初始化Redis连接
   */
  public async initialize(): Promise<void> {
    try {
      await this.configManager.initializeRedis();
      logger.info('Redis缓存管理器初始化成功');
    } catch (error) {
      logger.error('Redis缓存管理器初始化失败', { error });
      throw error;
    }
  }

  // ==================== 基础操作 ====================

  /**
   * 获取缓存数据
   */
  public async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const result = await this.coreOps.get<T>(key);
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      return result;
    } catch (error) {
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 设置缓存数据
   */
  public async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const startTime = Date.now();
    try {
      const result = await this.coreOps.set(key, value, ttl);
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      return result;
    } catch (error) {
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 删除缓存数据
   */
  public async delete(key: string): Promise<boolean> {
    return await this.coreOps.delete(key);
  }

  /**
   * 检查缓存是否存在
   */
  public async exists(key: string): Promise<boolean> {
    return await this.coreOps.exists(key);
  }

  /**
   * 设置缓存过期时间
   */
  public async expire(key: string, ttl: number): Promise<boolean> {
    return await this.coreOps.expire(key, ttl);
  }

  // ==================== 批量操作 ====================

  /**
   * 批量获取缓存
   */
  public async mget<T>(keys: string[]): Promise<Array<T | null>> {
    const startTime = Date.now();
    try {
      const result = await this.coreOps.mget<T>(keys);
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      return result;
    } catch (error) {
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * 批量设置缓存
   */
  public async mset(items: BatchSetItem[]): Promise<boolean> {
    const startTime = Date.now();
    try {
      const result = await this.coreOps.mset(items);
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      return result;
    } catch (error) {
      this.statsMonitoring.recordPerformance(Date.now() - startTime);
      throw error;
    }
  }

  // ==================== 高级操作 ====================

  /**
   * 按模式删除缓存
   */
  public async deletePattern(pattern: string): Promise<number> {
    return await this.advancedOps.deletePattern(pattern);
  }

  /**
   * 按模式删除缓存（兼容旧版本）
   */
  public async deleteByPattern(pattern: string): Promise<void> {
    await this.advancedOps.deleteByPattern(pattern);
  }

  /**
   * 按标签清理缓存
   */
  public async clearByTag(tag: string): Promise<number> {
    return await this.advancedOps.clearByTag(tag);
  }

  /**
   * 为缓存键添加标签
   */
  public async addTag(key: string, tag: string): Promise<boolean> {
    return await this.advancedOps.addTag(key, tag);
  }

  /**
   * 从缓存键移除标签
   */
  public async removeTag(key: string, tag: string): Promise<boolean> {
    return await this.advancedOps.removeTag(key, tag);
  }

  /**
   * 获取标签下的所有键
   */
  public async getKeysByTag(tag: string): Promise<string[]> {
    return await this.advancedOps.getKeysByTag(tag);
  }

  /**
   * 清空所有缓存
   */
  public async flush(): Promise<boolean> {
    return await this.advancedOps.flush();
  }

  // ==================== 统计和监控 ====================

  /**
   * 获取缓存统计信息
   */
  public getStats(): CacheStats {
    this.statsMonitoring.updateStats();
    return this.statsMonitoring.getStats();
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.statsMonitoring.resetStats();
  }

  /**
   * 获取详细的缓存信息
   */
  public async getDetailedInfo() {
    return await this.statsMonitoring.getDetailedInfo();
  }

  /**
   * 获取缓存健康状态
   */
  public getCacheHealth() {
    return this.statsMonitoring.getCacheHealth();
  }

  /**
   * 生成性能报告
   */
  public generatePerformanceReport() {
    return this.statsMonitoring.generatePerformanceReport();
  }

  // ==================== 优化功能 ====================

  /**
   * 缓存预热
   */
  public async warmupCache(config: WarmupConfig): Promise<void> {
    await this.optimization.warmupCache(config);
  }

  /**
   * 自动优化
   */
  public async autoOptimize(): Promise<void> {
    await this.optimization.autoOptimize();
  }

  /**
   * 获取预热推荐
   */
  public async getWarmupRecommendations() {
    return await this.optimization.getWarmupRecommendations();
  }

  /**
   * 运行性能基准测试
   */
  public async runPerformanceBenchmark() {
    return await this.optimization.runPerformanceBenchmark();
  }

  // ==================== 连接管理 ====================

  /**
   * 检查Redis连接状态
   */
  public isRedisConnected(): boolean {
    return this.configManager.isRedisConnected();
  }

  /**
   * 检查Redis是否可用
   */
  public isRedisAvailable(): boolean {
    return this.configManager.isRedisAvailable();
  }

  /**
   * 执行Redis ping测试
   */
  public async ping(): Promise<string> {
    const redis = this.configManager.getRedis();
    if (!redis) {
      throw new Error('Redis连接不可用');
    }
    return await redis.ping();
  }

  /**
   * 要求Redis连接
   */
  public requireRedisConnection(): void {
    this.configManager.requireRedisConnection();
  }

  /**
   * 断开Redis连接
   */
  public async disconnect(): Promise<void> {
    await this.configManager.disconnect();
  }

  // ==================== 内部维护 ====================

  /**
   * 清理内存缓存
   */
  public cleanupMemoryCache(): void {
    this.coreOps.cleanupMemoryCache();
  }

  /**
   * 获取内存缓存大小
   */
  public getMemoryCacheSize(): number {
    return this.coreOps.getMemoryCacheSize();
  }

  /**
   * 清空内存缓存
   */
  public clearMemoryCache(): void {
    this.coreOps.clearMemoryCache();
  }

  // ==================== 兼容性方法 ====================

  /**
   * 模式匹配检查（兼容旧版本）
   */
  public matchPattern(key: string, pattern: string): boolean {
    return this.advancedOps.matchPattern(key, pattern);
  }

  /**
   * 更新统计信息（兼容旧版本）
   */
  public updateStats(): void {
    this.statsMonitoring.updateStats();
  }

  /**
   * 带降级策略的缓存获取（兼容旧版本）
   */
  public async getWithFallback<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // 缓存未命中，调用回调函数获取数据
      const data = await fallbackFn();

      // 设置缓存
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }

      return data;
    } catch (_error) {
      // 发生错误时，直接调用回调函数
      return await fallbackFn();
    }
  }
}

// 创建默认实例
export const redisCacheManager = new RedisCacheManager();

// 导出类型
export type { CacheConfig, CacheStats, WarmupConfig, BatchSetItem, ICacheManager };
