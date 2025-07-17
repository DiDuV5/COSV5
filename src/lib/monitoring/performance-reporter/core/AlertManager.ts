/**
 * @fileoverview 告警管理器
 * @description 负责生成和管理性能告警
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { PerformanceStats, ModelStats } from '../../database-performance-monitor';
import { PerformanceAlert } from '../types';
import { ALERT_THRESHOLDS } from '../constants';

/**
 * 告警管理器类
 */
export class AlertManager {
  /**
   * 生成告警信息
   */
  generateAlerts(
    overview: PerformanceStats,
    modelStats: ModelStats,
    slowQueries: any[]
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    // 严重慢查询告警
    alerts.push(...this.checkCriticalSlowQueries(slowQueries));

    // 慢查询比例告警
    alerts.push(...this.checkSlowQueryRatio(overview));

    // 高频查询告警
    alerts.push(...this.checkHighFrequency(overview));

    // 模型性能告警
    alerts.push(...this.checkModelPerformance(modelStats));

    return alerts;
  }

  /**
   * 检查严重慢查询
   */
  private checkCriticalSlowQueries(slowQueries: any[]): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const criticalSlowQueries = slowQueries.filter(
      q => q.duration > ALERT_THRESHOLDS.CRITICAL_SLOW_QUERY
    );

    if (criticalSlowQueries.length > 0) {
      alerts.push({
        level: 'critical',
        type: 'slow_query',
        message: `检测到 ${criticalSlowQueries.length} 个严重慢查询 (>5秒)`,
        data: criticalSlowQueries.slice(0, 5),
        suggestion: '立即检查并优化这些查询',
      });
    }

    return alerts;
  }

  /**
   * 检查慢查询比例
   */
  private checkSlowQueryRatio(overview: PerformanceStats): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const slowQueryRatio = overview.totalQueries > 0 
      ? (overview.slowQueries / overview.totalQueries) * 100 
      : 0;

    if (slowQueryRatio > ALERT_THRESHOLDS.HIGH_SLOW_QUERY_RATIO) {
      alerts.push({
        level: 'error',
        type: 'poor_performance',
        message: `慢查询比例过高: ${slowQueryRatio.toFixed(2)}%`,
        suggestion: '检查数据库索引和查询优化',
      });
    } else if (slowQueryRatio > ALERT_THRESHOLDS.WARNING_SLOW_QUERY_RATIO) {
      alerts.push({
        level: 'warning',
        type: 'poor_performance',
        message: `慢查询比例偏高: ${slowQueryRatio.toFixed(2)}%`,
        suggestion: '考虑优化频繁的慢查询',
      });
    }

    return alerts;
  }

  /**
   * 检查高频查询
   */
  private checkHighFrequency(overview: PerformanceStats): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (overview.queriesPerSecond > ALERT_THRESHOLDS.HIGH_QUERY_FREQUENCY) {
      alerts.push({
        level: 'warning',
        type: 'high_frequency',
        message: `查询频率过高: ${overview.queriesPerSecond.toFixed(2)}/秒`,
        suggestion: '考虑增加缓存或连接池优化',
      });
    }

    return alerts;
  }

  /**
   * 检查模型性能
   */
  private checkModelPerformance(modelStats: ModelStats): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    Object.entries(modelStats).forEach(([model, stats]) => {
      // 检查模型慢查询比例
      if (stats.slowQueries > stats.queries * 0.3) {
        alerts.push({
          level: 'warning',
          type: 'poor_performance',
          message: `模型 ${model} 慢查询比例过高: ${((stats.slowQueries / stats.queries) * 100).toFixed(2)}%`,
          suggestion: `优化模型 ${model} 的相关查询`,
        });
      }

      // 检查模型平均执行时间
      if (stats.averageDuration > ALERT_THRESHOLDS.LONG_AVERAGE_DURATION) {
        alerts.push({
          level: 'warning',
          type: 'poor_performance',
          message: `模型 ${model} 平均执行时间过长: ${stats.averageDuration.toFixed(2)}ms`,
          suggestion: `检查模型 ${model} 的查询复杂度`,
        });
      }
    });

    return alerts;
  }
}
