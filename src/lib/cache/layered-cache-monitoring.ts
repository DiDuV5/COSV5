/**
 * @fileoverview 分层缓存监控系统
 * @description 提供缓存性能监控、统计和指标收集功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { CacheLevel, LayeredCacheStats, LayeredCacheConfig } from './layered-cache-types';
import { OptimizedCacheLogger, CacheLoggerConfig } from './optimized-cache-logger';

// 临时logger
const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  debug: (message: string, data?: any) => console.log(message, data),
  warn: (message: string, data?: any) => console.warn(message, data),
  error: (message: string, data?: any) => console.error(message, data)
};

/**
 * 缓存监控管理器
 */
export class LayeredCacheMonitoring {
  private stats: LayeredCacheStats;
  private metricsTimer?: NodeJS.Timeout;
  private config: LayeredCacheConfig;
  private optimizedLogger: OptimizedCacheLogger;

  constructor(config: LayeredCacheConfig, initialStats?: LayeredCacheStats, loggerConfig?: Partial<CacheLoggerConfig>) {
    this.config = config;
    this.stats = initialStats || this.initializeStats();

    // 初始化优化的日志管理器
    const envLoggerConfig = OptimizedCacheLogger.createEnvironmentConfig();
    this.optimizedLogger = new OptimizedCacheLogger({ ...envLoggerConfig, ...loggerConfig });
  }

  /**
   * 记录缓存命中
   */
  recordHit(level: CacheLevel, responseTime: number): void {
    this.stats.overall.totalRequests++;
    this.stats.overall.totalHits++;

    switch (level) {
      case CacheLevel.L1_MEMORY:
        this.stats.l1Stats.hits++;
        this.updateAvgResponseTime(this.stats.l1Stats, responseTime);
        break;
      case CacheLevel.L2_REDIS:
        this.stats.l2Stats.hits++;
        this.updateAvgResponseTime(this.stats.l2Stats, responseTime);
        break;
      case CacheLevel.L3_DATABASE:
        this.stats.l3Stats.hits++;
        this.updateAvgResponseTime(this.stats.l3Stats, responseTime);
        break;
    }

    this.updateHitRates();
  }

  /**
   * 记录缓存未命中
   */
  recordMiss(level: CacheLevel, responseTime: number): void {
    this.stats.overall.totalRequests++;

    switch (level) {
      case CacheLevel.L1_MEMORY:
        this.stats.l1Stats.misses++;
        break;
      case CacheLevel.L2_REDIS:
        this.stats.l2Stats.misses++;
        break;
      case CacheLevel.L3_DATABASE:
        this.stats.l3Stats.misses++;
        this.updateAvgResponseTime(this.stats.l3Stats, responseTime);
        break;
    }

    this.updateHitRates();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): LayeredCacheStats {
    return { ...this.stats };
  }

  /**
   * 获取增强的统计信息
   */
  getEnhancedStats(l1Size?: number, l1MaxSize?: number): LayeredCacheStats {
    const enhancedStats: LayeredCacheStats = {
      l1Stats: {
        ...this.stats.l1Stats,
        size: l1Size,
        maxSize: l1MaxSize,
      },
      l2Stats: {
        ...this.stats.l2Stats,
        // Redis详细信息将在API层获取
      },
      l3Stats: {
        ...this.stats.l3Stats,
        // 数据库详细信息将在API层获取
      },
      overall: {
        ...this.stats.overall,
      },
    };

    return enhancedStats;
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * 开始指标收集
   */
  startMetricsCollection(): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.metricsTimer = setInterval(() => {
      const stats = this.getStats();

      // 使用优化的日志管理器输出指标
      this.optimizedLogger.logCacheMetrics(stats);

      // 检查性能警告（现在由优化日志管理器处理）
      // this.checkPerformanceWarnings(stats);
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * 停止指标收集
   */
  stopMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }

  /**
   * 检查性能警告
   */
  private checkPerformanceWarnings(stats: LayeredCacheStats): void {
    // 在开发环境下，如果总请求数太少，跳过命中率检查
    const isDevelopment = process.env.NODE_ENV === 'development';
    const minRequestsForWarning = isDevelopment ? 1000 : 10; // 开发环境需要更多请求才警告

    if (stats.overall.totalRequests < minRequestsForWarning) {
      return; // 请求数太少，不进行警告检查
    }

    // 检查总体命中率
    const hitRateThreshold = isDevelopment ? 30 : 70; // 开发环境降低阈值
    if (stats.overall.overallHitRate < hitRateThreshold) {
      logger.warn('缓存命中率过低', {
        hitRate: stats.overall.overallHitRate,
        threshold: hitRateThreshold
      });
    }

    // 检查L1缓存命中率
    const l1HitRateThreshold = isDevelopment ? 10 : 30; // 开发环境降低阈值
    if (stats.l1Stats.hitRate < l1HitRateThreshold) {
      logger.warn('L1缓存命中率过低', {
        hitRate: stats.l1Stats.hitRate,
        threshold: l1HitRateThreshold
      });
    }

    // 检查响应时间
    if (stats.overall.avgResponseTime > 100) {
      logger.warn('平均响应时间过高', {
        avgResponseTime: stats.overall.avgResponseTime,
        threshold: 100
      });
    }

    // 检查L1缓存使用率
    if (stats.l1Stats.size && stats.l1Stats.maxSize) {
      const usageRate = (stats.l1Stats.size / stats.l1Stats.maxSize) * 100;
      if (usageRate > 90) {
        logger.warn('L1缓存使用率过高', {
          usageRate,
          threshold: 90
        });
      }
    }
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): {
    summary: string;
    recommendations: string[];
    metrics: LayeredCacheStats;
  } {
    const stats = this.getStats();
    const recommendations: string[] = [];

    // 分析命中率
    if (stats.overall.overallHitRate < 85) {
      recommendations.push('考虑增加缓存TTL或优化缓存策略以提高命中率');
    }

    // 分析响应时间
    if (stats.l1Stats.avgResponseTime > 1) {
      recommendations.push('L1缓存响应时间过高，考虑优化内存缓存配置');
    }
    if (stats.l2Stats.avgResponseTime > 10) {
      recommendations.push('L2缓存响应时间过高，检查Redis连接和网络延迟');
    }

    // 分析缓存分布
    const l1HitRatio = stats.l1Stats.hits / (stats.overall.totalHits || 1);
    if (l1HitRatio < 0.4) {
      recommendations.push('L1缓存命中比例较低，考虑增加L1缓存大小或调整TTL');
    }

    const summary = `
总体命中率: ${stats.overall.overallHitRate.toFixed(2)}%
平均响应时间: ${stats.overall.avgResponseTime.toFixed(2)}ms
总请求数: ${stats.overall.totalRequests}
L1命中率: ${stats.l1Stats.hitRate.toFixed(2)}%
L2命中率: ${stats.l2Stats.hitRate.toFixed(2)}%
    `.trim();

    return {
      summary,
      recommendations,
      metrics: stats
    };
  }

  /**
   * 更新平均响应时间
   */
  private updateAvgResponseTime(stats: any, responseTime: number): void {
    const totalRequests = stats.hits + stats.misses;
    if (totalRequests > 0) {
      stats.avgResponseTime = (stats.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
  }

  /**
   * 更新命中率
   */
  private updateHitRates(): void {
    // L1命中率
    const l1Total = this.stats.l1Stats.hits + this.stats.l1Stats.misses;
    this.stats.l1Stats.hitRate = l1Total > 0 ? (this.stats.l1Stats.hits / l1Total) * 100 : 0;

    // L2命中率
    const l2Total = this.stats.l2Stats.hits + this.stats.l2Stats.misses;
    this.stats.l2Stats.hitRate = l2Total > 0 ? (this.stats.l2Stats.hits / l2Total) * 100 : 0;

    // L3命中率
    const l3Total = this.stats.l3Stats.hits + this.stats.l3Stats.misses;
    this.stats.l3Stats.hitRate = l3Total > 0 ? (this.stats.l3Stats.hits / l3Total) * 100 : 0;

    // 总体命中率
    this.stats.overall.overallHitRate = this.stats.overall.totalRequests > 0
      ? (this.stats.overall.totalHits / this.stats.overall.totalRequests) * 100
      : 0;

    // 总体平均响应时间
    const totalResponseTime =
      this.stats.l1Stats.avgResponseTime * this.stats.l1Stats.hits +
      this.stats.l2Stats.avgResponseTime * this.stats.l2Stats.hits +
      this.stats.l3Stats.avgResponseTime * this.stats.l3Stats.misses;

    this.stats.overall.avgResponseTime = this.stats.overall.totalRequests > 0
      ? totalResponseTime / this.stats.overall.totalRequests
      : 0;
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): LayeredCacheStats {
    return {
      l1Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      l2Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      l3Stats: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
      overall: { totalRequests: 0, totalHits: 0, overallHitRate: 0, avgResponseTime: 0 }
    };
  }

  /**
   * 更新日志配置
   */
  updateLoggerConfig(config: Partial<CacheLoggerConfig>): void {
    this.optimizedLogger.updateConfig(config);
  }

  /**
   * 获取日志配置
   */
  getLoggerConfig(): CacheLoggerConfig {
    return this.optimizedLogger.getConfig();
  }

  /**
   * 输出缓存活动摘要
   */
  logActivitySummary(): void {
    const stats = this.getStats();
    this.optimizedLogger.logActivitySummary(stats);
  }

  /**
   * 输出调试信息
   */
  logDebugInfo(message: string, data?: any): void {
    this.optimizedLogger.logDebugInfo(message, data);
  }

  /**
   * 重置日志状态
   */
  resetLoggerState(): void {
    this.optimizedLogger.reset();
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stopMetricsCollection();
    this.optimizedLogger.reset();
  }
}
