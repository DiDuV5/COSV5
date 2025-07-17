/**
 * @fileoverview 核心报告生成器
 * @description 负责生成性能报告的核心逻辑
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { DatabasePerformanceMonitor } from '../../database-performance-monitor';
import { ReportConfig, PerformanceReport } from '../types';
import { DEFAULT_REPORT_CONFIG } from '../constants';
import { RecommendationAnalyzer } from '../analyzers/RecommendationAnalyzer';
import { AlertManager } from './AlertManager';

/**
 * 核心报告生成器类
 */
export class ReportGenerator {
  private monitor: DatabasePerformanceMonitor;
  private recommendationAnalyzer: RecommendationAnalyzer;
  private alertManager: AlertManager;

  constructor() {
    this.monitor = DatabasePerformanceMonitor.getInstance();
    this.recommendationAnalyzer = new RecommendationAnalyzer();
    this.alertManager = new AlertManager();
  }

  /**
   * 生成性能报告
   */
  generateReport(config: Partial<ReportConfig> = {}): PerformanceReport {
    const finalConfig: ReportConfig = {
      ...DEFAULT_REPORT_CONFIG,
      ...config,
    };

    const now = new Date();
    const timeRange = {
      start: new Date(now.getTime() - finalConfig.timeRangeHours * 60 * 60 * 1000),
      end: now,
    };

    // 获取统计数据
    const overview = this.monitor.getStats(timeRange);
    const modelStats = this.monitor.getModelStats(timeRange);
    const slowQueries = this.monitor.getSlowQueries(finalConfig.maxSlowQueries);
    const frequentQueries = this.monitor.getFrequentQueries(finalConfig.maxFrequentQueries);

    // 生成建议和告警
    const recommendations = this.recommendationAnalyzer.generateRecommendations(
      overview, 
      modelStats, 
      slowQueries
    );
    const alerts = this.alertManager.generateAlerts(overview, modelStats, slowQueries);

    return {
      generatedAt: now,
      timeRange,
      overview,
      modelStats,
      slowQueries: finalConfig.includeDetails ? slowQueries : [],
      frequentQueries: finalConfig.includeDetails ? frequentQueries : [],
      recommendations,
      alerts,
    };
  }

  /**
   * 获取时间范围
   */
  private getTimeRange(hours: number): { start: Date; end: Date } {
    const now = new Date();
    return {
      start: new Date(now.getTime() - hours * 60 * 60 * 1000),
      end: now,
    };
  }

  /**
   * 验证配置
   */
  private validateConfig(config: ReportConfig): void {
    if (config.timeRangeHours <= 0) {
      throw new Error('时间范围必须大于0');
    }
    if (config.slowQueryThreshold <= 0) {
      throw new Error('慢查询阈值必须大于0');
    }
    if (config.maxSlowQueries <= 0) {
      throw new Error('最大慢查询数量必须大于0');
    }
    if (config.maxFrequentQueries <= 0) {
      throw new Error('最大频繁查询数量必须大于0');
    }
  }
}
