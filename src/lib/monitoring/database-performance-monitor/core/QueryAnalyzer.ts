/**
 * @fileoverview 查询分析器
 * @description 负责分析查询模式和频率
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { QueryMetrics, FrequentQuery } from '../types';
import { groupMetricsByHash } from '../utils/queryUtils';

/**
 * 查询分析器类
 */
export class QueryAnalyzer {
  /**
   * 获取慢查询列表
   */
  getSlowQueries(metrics: QueryMetrics[], limit: number = 50): QueryMetrics[] {
    return metrics
      .filter(m => m.isSlow)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * 获取最频繁的查询
   */
  getFrequentQueries(metrics: QueryMetrics[], limit: number = 20): FrequentQuery[] {
    const queryGroups = groupMetricsByHash(metrics);

    const frequentQueries = Array.from(queryGroups.entries())
      .map(([queryHash, queryMetrics]) => {
        const totalDuration = queryMetrics.reduce((sum, m) => sum + m.duration, 0);
        return {
          queryHash,
          model: queryMetrics[0].model,
          action: queryMetrics[0].action,
          count: queryMetrics.length,
          averageDuration: totalDuration / queryMetrics.length,
          totalDuration,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return frequentQueries;
  }

  /**
   * 分析查询模式
   */
  analyzeQueryPatterns(metrics: QueryMetrics[]): {
    topModels: Array<{ model: string; count: number; percentage: number }>;
    topActions: Array<{ action: string; count: number; percentage: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
  } {
    const totalQueries = metrics.length;

    // 分析模型使用情况
    const modelCounts = new Map<string, number>();
    const actionCounts = new Map<string, number>();
    const hourlyCounts = new Map<number, number>();

    metrics.forEach(metric => {
      // 统计模型
      modelCounts.set(metric.model, (modelCounts.get(metric.model) || 0) + 1);
      
      // 统计操作
      actionCounts.set(metric.action, (actionCounts.get(metric.action) || 0) + 1);
      
      // 统计小时分布
      const hour = metric.timestamp.getHours();
      hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
    });

    // 转换为排序数组
    const topModels = Array.from(modelCounts.entries())
      .map(([model, count]) => ({
        model,
        count,
        percentage: (count / totalQueries) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({
        action,
        count,
        percentage: (count / totalQueries) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const hourlyDistribution = Array.from(hourlyCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    return {
      topModels,
      topActions,
      hourlyDistribution,
    };
  }
}
