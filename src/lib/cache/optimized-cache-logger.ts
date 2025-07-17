/**
 * @fileoverview 优化的缓存日志管理器
 * @description 提供简洁、智能的缓存性能日志输出，避免冗长重复的日志信息
 * @author Augment AI
 * @date 2025-07-16
 * @version 1.0.0
 */

import { LayeredCacheStats } from './layered-cache-types';

/**
 * 日志输出配置
 */
export interface CacheLoggerConfig {
  /** 是否启用简洁模式 */
  compactMode: boolean;
  /** 最小输出间隔（毫秒） */
  minOutputInterval: number;
  /** 仅在有活动时输出 */
  onlyLogWhenActive: boolean;
  /** 命中率变化阈值（百分比） */
  hitRateChangeThreshold: number;
  /** 是否启用详细调试日志 */
  enableDebugLogs: boolean;
  /** 零值统计是否输出 */
  showZeroStats: boolean;
}

/**
 * 默认日志配置（优化版本）
 */
export const DEFAULT_CACHE_LOGGER_CONFIG: CacheLoggerConfig = {
  compactMode: true,
  minOutputInterval: 60000, // 60秒（减少频率）
  onlyLogWhenActive: true,
  hitRateChangeThreshold: 10, // 10%变化才输出（提高阈值）
  enableDebugLogs: process.env.NODE_ENV === 'development', // 只在开发环境启用
  showZeroStats: false,
};

/**
 * 优化的缓存日志管理器
 */
export class OptimizedCacheLogger {
  private config: CacheLoggerConfig;
  private lastLogTime: number = 0;
  private lastStats: LayeredCacheStats | null = null;
  private consecutiveZeroOutputs: number = 0;
  private maxConsecutiveZeroOutputs: number = 3;

  constructor(config: Partial<CacheLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_LOGGER_CONFIG, ...config };
  }

  /**
   * 记录缓存性能指标
   */
  logCacheMetrics(stats: LayeredCacheStats): void {
    const now = Date.now();

    // 检查是否应该输出日志
    if (!this.shouldLogMetrics(stats, now)) {
      return;
    }

    // 根据配置选择输出格式
    if (this.config.compactMode) {
      this.logCompactMetrics(stats);
    } else {
      this.logDetailedMetrics(stats);
    }

    // 更新状态
    this.lastLogTime = now;
    this.lastStats = { ...stats };
  }

  /**
   * 判断是否应该输出日志
   */
  private shouldLogMetrics(stats: LayeredCacheStats, now: number): boolean {
    // 检查时间间隔
    if (now - this.lastLogTime < this.config.minOutputInterval) {
      return false;
    }

    // 检查是否有活动
    if (this.config.onlyLogWhenActive && this.isStatsEmpty(stats)) {
      this.consecutiveZeroOutputs++;
      // 允许少量零值输出，但不要太频繁
      return this.consecutiveZeroOutputs <= this.maxConsecutiveZeroOutputs;
    }

    // 重置零值计数器
    this.consecutiveZeroOutputs = 0;

    // 检查命中率变化
    if (this.lastStats && this.config.hitRateChangeThreshold > 0) {
      const hitRateChange = Math.abs(
        stats.overall.overallHitRate - this.lastStats.overall.overallHitRate
      );

      // 如果命中率变化不大且请求数变化不大，跳过输出
      const requestChange = stats.overall.totalRequests - this.lastStats.overall.totalRequests;
      if (hitRateChange < this.config.hitRateChangeThreshold && requestChange < 10) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查统计数据是否为空
   */
  private isStatsEmpty(stats: LayeredCacheStats): boolean {
    return stats.overall.totalRequests === 0 &&
           stats.overall.totalHits === 0 &&
           stats.l1Stats.hits === 0 &&
           stats.l2Stats.hits === 0 &&
           stats.l3Stats.hits === 0;
  }

  /**
   * 输出简洁格式的指标
   */
  private logCompactMetrics(stats: LayeredCacheStats): void {
    const { overall, l1Stats, l2Stats, l3Stats } = stats;

    // 如果不显示零值统计且所有值都为0，则跳过
    if (!this.config.showZeroStats && this.isStatsEmpty(stats)) {
      return;
    }

    // 构建简洁的单行日志
    const l1Info = `L1(${l1Stats.hits}/${l1Stats.misses}/${l1Stats.hitRate.toFixed(0)}%)`;
    const l2Info = `L2(${l2Stats.hits}/${l2Stats.misses}/${l2Stats.hitRate.toFixed(0)}%)`;
    const l3Info = `L3(${l3Stats.hits}/${l3Stats.misses}/${l3Stats.hitRate.toFixed(0)}%)`;
    const overallInfo = `总计(${overall.totalRequests}req/${overall.avgResponseTime.toFixed(1)}ms/${overall.overallHitRate.toFixed(1)}%)`;

    console.log(`🚀 缓存统计: ${l1Info} ${l2Info} ${l3Info} ${overallInfo}`);

    // 如果有显著的性能问题，额外输出警告
    this.logPerformanceWarnings(stats);
  }

  /**
   * 输出详细格式的指标
   */
  private logDetailedMetrics(stats: LayeredCacheStats): void {
    console.log('📊 分层缓存性能指标:', {
      overall: {
        requests: stats.overall.totalRequests,
        hits: stats.overall.totalHits,
        hitRate: `${stats.overall.overallHitRate.toFixed(2)}%`,
        avgResponseTime: `${stats.overall.avgResponseTime.toFixed(2)}ms`
      },
      l1: {
        hits: stats.l1Stats.hits,
        misses: stats.l1Stats.misses,
        hitRate: `${stats.l1Stats.hitRate.toFixed(2)}%`,
        responseTime: `${stats.l1Stats.avgResponseTime.toFixed(2)}ms`
      },
      l2: {
        hits: stats.l2Stats.hits,
        misses: stats.l2Stats.misses,
        hitRate: `${stats.l2Stats.hitRate.toFixed(2)}%`,
        responseTime: `${stats.l2Stats.avgResponseTime.toFixed(2)}ms`
      },
      l3: {
        hits: stats.l3Stats.hits,
        misses: stats.l3Stats.misses,
        hitRate: `${stats.l3Stats.hitRate.toFixed(2)}%`,
        responseTime: `${stats.l3Stats.avgResponseTime.toFixed(2)}ms`
      }
    });
  }

  /**
   * 输出性能警告
   */
  private logPerformanceWarnings(stats: LayeredCacheStats): void {
    const warnings: string[] = [];

    // 检查命中率
    if (stats.overall.overallHitRate < 50 && stats.overall.totalRequests > 100) {
      warnings.push(`总体命中率过低(${stats.overall.overallHitRate.toFixed(1)}%)`);
    }

    // 检查响应时间
    if (stats.overall.avgResponseTime > 100) {
      warnings.push(`响应时间过高(${stats.overall.avgResponseTime.toFixed(1)}ms)`);
    }

    // 检查L1缓存效率
    if (stats.l1Stats.hitRate < 30 && (stats.l1Stats.hits + stats.l1Stats.misses) > 50) {
      warnings.push(`L1缓存效率低(${stats.l1Stats.hitRate.toFixed(1)}%)`);
    }

    // 输出警告
    if (warnings.length > 0) {
      console.warn(`⚠️  缓存性能警告: ${warnings.join(', ')}`);
    }
  }

  /**
   * 输出缓存活动摘要
   */
  logActivitySummary(stats: LayeredCacheStats): void {
    if (this.isStatsEmpty(stats)) {
      return;
    }

    const totalActivity = stats.overall.totalRequests;
    const hitRatio = stats.overall.overallHitRate;

    if (totalActivity > 0) {
      console.log(`📈 缓存活动摘要: ${totalActivity}次请求, ${hitRatio.toFixed(1)}%命中率`);
    }
  }

  /**
   * 输出调试信息
   */
  logDebugInfo(message: string, data?: any): void {
    if (this.config.enableDebugLogs) {
      console.debug(`🔍 [缓存调试] ${message}`, data);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CacheLoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): CacheLoggerConfig {
    return { ...this.config };
  }

  /**
   * 重置日志状态
   */
  reset(): void {
    this.lastLogTime = 0;
    this.lastStats = null;
    this.consecutiveZeroOutputs = 0;
  }

  /**
   * 创建环境特定的配置
   */
  static createEnvironmentConfig(env: string = process.env.NODE_ENV || 'development'): CacheLoggerConfig {
    switch (env) {
      case 'production':
        return {
          compactMode: true,
          minOutputInterval: 60000, // 1分钟
          onlyLogWhenActive: true,
          hitRateChangeThreshold: 10, // 10%变化才输出
          enableDebugLogs: false,
          showZeroStats: false,
        };

      case 'test':
        return {
          compactMode: true,
          minOutputInterval: 0, // 测试环境不限制
          onlyLogWhenActive: false,
          hitRateChangeThreshold: 0, // 测试环境输出所有变化
          enableDebugLogs: true,
          showZeroStats: true,
        };

      default: // development
        return {
          compactMode: true,
          minOutputInterval: 30000, // 30秒
          onlyLogWhenActive: true,
          hitRateChangeThreshold: 5, // 5%变化才输出
          enableDebugLogs: false,
          showZeroStats: false,
        };
    }
  }
}
