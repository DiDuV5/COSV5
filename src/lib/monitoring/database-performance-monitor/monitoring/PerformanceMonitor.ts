/**
 * @fileoverview 性能监控器主类
 * @description 数据库性能监控的主要控制器
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  QueryMetrics,
  PerformanceStats,
  ModelStats,
  FrequentQuery,
  TimeRange,
  MonitorConfig
} from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { MetricsCollector } from '../core/MetricsCollector';
import { StatsCalculator } from '../core/StatsCalculator';
import { QueryAnalyzer } from '../core/QueryAnalyzer';
import { MockDataGenerator } from '../core/MockDataGenerator';

/**
 * 数据库性能监控器主类
 */
export class DatabasePerformanceMonitor {
  private static instance: DatabasePerformanceMonitor;
  private isEnabled: boolean = DEFAULT_CONFIG.ENABLED;

  private metricsCollector: MetricsCollector;
  private statsCalculator: StatsCalculator;
  private queryAnalyzer: QueryAnalyzer;
  private mockDataGenerator: MockDataGenerator;

  private constructor() {
    this.metricsCollector = new MetricsCollector();
    this.statsCalculator = new StatsCalculator();
    this.queryAnalyzer = new QueryAnalyzer();
    this.mockDataGenerator = new MockDataGenerator(this.metricsCollector);
  }

  /**
   * 获取监控器实例（单例模式）
   */
  static getInstance(): DatabasePerformanceMonitor {
    if (!DatabasePerformanceMonitor.instance) {
      DatabasePerformanceMonitor.instance = new DatabasePerformanceMonitor();
    }
    return DatabasePerformanceMonitor.instance;
  }

  /**
   * 配置监控器
   */
  configure(options: MonitorConfig): void {
    if (options.enabled !== undefined) {
      this.isEnabled = options.enabled;
    }

    this.metricsCollector.configure({
      slowQueryThreshold: options.slowQueryThreshold,
      maxMetricsSize: options.maxMetricsSize,
    });
  }

  /**
   * 记录查询指标
   */
  recordQuery(
    model: string,
    action: string,
    duration: number,
    params: any = {}
  ): void {
    if (!this.isEnabled) return;
    this.metricsCollector.recordQuery(model, action, duration, params);
  }

  /**
   * 获取性能统计
   */
  getStats(timeRange?: TimeRange): PerformanceStats {
    const metrics = this.metricsCollector.getMetrics();
    return this.statsCalculator.calculatePerformanceStats(metrics, timeRange);
  }

  /**
   * 获取模型性能统计
   */
  getModelStats(timeRange?: TimeRange): ModelStats {
    let metrics = this.metricsCollector.getMetrics();

    // 在开发环境中禁用模拟数据生成，避免产生大量慢查询日志
    if (metrics.length === 0 && process.env.NODE_ENV !== 'development') {
      this.mockDataGenerator.generateMockData();
      metrics = this.metricsCollector.getMetrics();
    }

    return this.statsCalculator.calculateModelStats(metrics, timeRange);
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit: number = 50): QueryMetrics[] {
    const metrics = this.metricsCollector.getMetrics();
    return this.queryAnalyzer.getSlowQueries(metrics, limit);
  }

  /**
   * 获取最频繁的查询
   */
  getFrequentQueries(limit: number = 20): FrequentQuery[] {
    const metrics = this.metricsCollector.getMetrics();
    return this.queryAnalyzer.getFrequentQueries(metrics, limit);
  }

  /**
   * 生成模拟数据用于演示
   */
  generateMockData(): void {
    this.mockDataGenerator.generateMockData();
  }

  /**
   * 清除所有指标数据
   */
  clearMetrics(): void {
    this.metricsCollector.clearMetrics();
  }

  /**
   * 获取监控器状态
   */
  getStatus(): {
    enabled: boolean;
    metricsCount: number;
    lastActivity?: Date;
  } {
    const metrics = this.metricsCollector.getMetrics();
    const lastActivity = metrics.length > 0
      ? metrics[metrics.length - 1].timestamp
      : undefined;

    return {
      enabled: this.isEnabled,
      metricsCount: metrics.length,
      lastActivity,
    };
  }
}
