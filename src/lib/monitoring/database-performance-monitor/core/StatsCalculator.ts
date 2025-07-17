/**
 * @fileoverview 统计计算器
 * @description 负责计算各种性能统计信息
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { QueryMetrics, PerformanceStats, ModelStats, TimeRange } from '../types';
import { filterMetricsByTimeRange, calculateTimeSpan } from '../utils/queryUtils';

/**
 * 统计计算器类
 */
export class StatsCalculator {
  /**
   * 计算性能统计
   */
  calculatePerformanceStats(
    metrics: QueryMetrics[],
    timeRange?: TimeRange
  ): PerformanceStats {
    const filteredMetrics = filterMetricsByTimeRange(metrics, timeRange);

    if (filteredMetrics.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        queriesPerSecond: 0,
        errorQueries: 0,
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const slowQueries = filteredMetrics.filter(m => m.isSlow).length;
    const timeSpan = calculateTimeSpan(timeRange, filteredMetrics);

    return {
      totalQueries: filteredMetrics.length,
      slowQueries,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      queriesPerSecond: timeSpan > 0 ? filteredMetrics.length / timeSpan : 0,
      errorQueries: 0, // TODO: 实现错误查询统计
    };
  }

  /**
   * 计算模型性能统计
   */
  calculateModelStats(
    metrics: QueryMetrics[],
    timeRange?: TimeRange
  ): ModelStats {
    const filteredMetrics = filterMetricsByTimeRange(metrics, timeRange);
    const modelStats: ModelStats = {};

    filteredMetrics.forEach(metric => {
      const { model, action, duration, isSlow } = metric;

      if (!modelStats[model]) {
        modelStats[model] = {
          queries: 0,
          averageDuration: 0,
          slowQueries: 0,
          actions: {},
        };
      }

      const modelStat = modelStats[model];
      modelStat.queries++;

      if (isSlow) {
        modelStat.slowQueries++;
      }

      // 更新平均执行时间
      modelStat.averageDuration =
        (modelStat.averageDuration * (modelStat.queries - 1) + duration) / modelStat.queries;

      // 统计操作类型
      if (!modelStat.actions[action]) {
        modelStat.actions[action] = {
          count: 0,
          averageDuration: 0,
        };
      }

      const actionStat = modelStat.actions[action];
      actionStat.count++;
      actionStat.averageDuration =
        (actionStat.averageDuration * (actionStat.count - 1) + duration) / actionStat.count;
    });

    return modelStats;
  }
}
