/**
 * @fileoverview 查询性能监控器
 * @description 提供查询性能监控和统计功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { QueryStats, QueryOptimizationConfig, PERFORMANCE_THRESHOLDS } from './types';

/**
 * 查询性能监控器
 */
export class QueryPerformanceMonitor {
  private stats: QueryStats;
  private config: QueryOptimizationConfig;

  constructor(config: QueryOptimizationConfig) {
    this.config = config;
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      slowQueries: 0,
    };
  }

  /**
   * 记录查询统计
   */
  recordQuery(queryTime: number): void {
    this.stats.totalQueries++;

    // 更新平均查询时间
    this.stats.averageQueryTime =
      (this.stats.averageQueryTime * (this.stats.totalQueries - 1) + queryTime) /
      this.stats.totalQueries;

    // 记录慢查询
    if (queryTime > this.config.slowQueryThreshold) {
      this.stats.slowQueries++;

      if (this.config.enableQueryLogging) {
        this.logSlowQuery(queryTime);
      }
    }
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(): void {
    this.stats.cacheHits++;
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(): void {
    this.stats.cacheMisses++;
  }

  /**
   * 记录慢查询日志
   */
  private logSlowQuery(queryTime: number): void {
    const severity = this.getQuerySeverity(queryTime);
    const emoji = this.getSeverityEmoji(severity);
    
    console.warn(
      `${emoji} 慢查询检测: ${queryTime}ms (阈值: ${this.config.slowQueryThreshold}ms) - ${severity}`
    );

    // 如果是超慢查询，记录更详细的信息
    if (queryTime > PERFORMANCE_THRESHOLDS.VERY_SLOW_QUERY) {
      console.error(`🚨 超慢查询警告: ${queryTime}ms - 需要立即优化!`);
    }
  }

  /**
   * 获取查询严重程度
   */
  private getQuerySeverity(queryTime: number): string {
    if (queryTime > PERFORMANCE_THRESHOLDS.VERY_SLOW_QUERY) {
      return 'CRITICAL';
    } else if (queryTime > this.config.slowQueryThreshold * 2) {
      return 'HIGH';
    } else if (queryTime > this.config.slowQueryThreshold) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * 获取严重程度对应的表情符号
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '🐌';
      default:
        return 'ℹ️';
    }
  }

  /**
   * 获取查询统计信息
   */
  getStats(): QueryStats {
    return { ...this.stats };
  }

  /**
   * 获取详细的性能报告
   */
  getPerformanceReport(): {
    stats: QueryStats;
    cacheHitRate: number;
    slowQueryRate: number;
    performance: string;
    recommendations: string[];
  } {
    const totalCacheRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? this.stats.cacheHits / totalCacheRequests : 0;
    const slowQueryRate = this.stats.totalQueries > 0 ? this.stats.slowQueries / this.stats.totalQueries : 0;

    // 评估性能等级
    let performance = 'EXCELLENT';
    const recommendations: string[] = [];

    if (cacheHitRate < PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE) {
      performance = 'POOR';
      recommendations.push('缓存命中率过低，建议优化缓存策略');
    }

    if (slowQueryRate > 0.1) {
      performance = 'POOR';
      recommendations.push('慢查询比例过高，建议优化查询语句');
    } else if (slowQueryRate > 0.05) {
      performance = 'FAIR';
      recommendations.push('存在一定数量的慢查询，建议关注查询性能');
    }

    if (this.stats.averageQueryTime > this.config.slowQueryThreshold / 2) {
      if (performance === 'EXCELLENT') performance = 'GOOD';
      recommendations.push('平均查询时间较长，建议优化数据库索引');
    }

    if (recommendations.length === 0) {
      recommendations.push('查询性能良好，继续保持');
    }

    return {
      stats: this.getStats(),
      cacheHitRate,
      slowQueryRate,
      performance,
      recommendations,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      slowQueries: 0,
    };
  }

  /**
   * 检查性能健康状态
   */
  checkHealth(): {
    healthy: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    const totalCacheRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 ? this.stats.cacheHits / totalCacheRequests : 1;
    const slowQueryRate = this.stats.totalQueries > 0 ? this.stats.slowQueries / this.stats.totalQueries : 0;

    // 检查缓存命中率
    if (cacheHitRate < 0.5) {
      issues.push(`缓存命中率过低: ${(cacheHitRate * 100).toFixed(1)}%`);
    } else if (cacheHitRate < PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE) {
      warnings.push(`缓存命中率偏低: ${(cacheHitRate * 100).toFixed(1)}%`);
    }

    // 检查慢查询率
    if (slowQueryRate > 0.2) {
      issues.push(`慢查询比例过高: ${(slowQueryRate * 100).toFixed(1)}%`);
    } else if (slowQueryRate > 0.1) {
      warnings.push(`慢查询比例偏高: ${(slowQueryRate * 100).toFixed(1)}%`);
    }

    // 检查平均查询时间
    if (this.stats.averageQueryTime > this.config.slowQueryThreshold) {
      issues.push(`平均查询时间过长: ${this.stats.averageQueryTime.toFixed(0)}ms`);
    } else if (this.stats.averageQueryTime > this.config.slowQueryThreshold / 2) {
      warnings.push(`平均查询时间偏长: ${this.stats.averageQueryTime.toFixed(0)}ms`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * 生成性能监控报告
   */
  generateReport(): string {
    const report = this.getPerformanceReport();
    const health = this.checkHealth();

    let output = '📊 查询性能监控报告\n';
    output += '========================\n\n';

    // 基础统计
    output += '📈 基础统计:\n';
    output += `  总查询数: ${report.stats.totalQueries}\n`;
    output += `  缓存命中: ${report.stats.cacheHits}\n`;
    output += `  缓存未命中: ${report.stats.cacheMisses}\n`;
    output += `  慢查询数: ${report.stats.slowQueries}\n`;
    output += `  平均查询时间: ${report.stats.averageQueryTime.toFixed(2)}ms\n\n`;

    // 性能指标
    output += '🎯 性能指标:\n';
    output += `  缓存命中率: ${(report.cacheHitRate * 100).toFixed(1)}%\n`;
    output += `  慢查询率: ${(report.slowQueryRate * 100).toFixed(1)}%\n`;
    output += `  性能等级: ${report.performance}\n\n`;

    // 健康状态
    output += '🏥 健康状态:\n';
    output += `  状态: ${health.healthy ? '✅ 健康' : '❌ 异常'}\n`;
    
    if (health.issues.length > 0) {
      output += '  问题:\n';
      health.issues.forEach(issue => {
        output += `    ❌ ${issue}\n`;
      });
    }

    if (health.warnings.length > 0) {
      output += '  警告:\n';
      health.warnings.forEach(warning => {
        output += `    ⚠️ ${warning}\n`;
      });
    }

    // 建议
    output += '\n💡 优化建议:\n';
    report.recommendations.forEach(rec => {
      output += `  • ${rec}\n`;
    });

    return output;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<QueryOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): QueryOptimizationConfig {
    return { ...this.config };
  }
}
