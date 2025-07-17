/**
 * @fileoverview 查询工具函数
 * @description 查询相关的工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { QueryMetrics, TimeRange } from '../types';

/**
 * 过滤指定时间范围内的查询指标
 * @param metrics 查询指标数组
 * @param timeRange 时间范围
 * @returns 过滤后的指标数组
 */
export const filterMetricsByTimeRange = (
  metrics: QueryMetrics[],
  timeRange?: TimeRange
): QueryMetrics[] => {
  if (!timeRange) {
    return metrics;
  }

  return metrics.filter(
    m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
  );
};

/**
 * 按查询哈希分组指标
 * @param metrics 查询指标数组
 * @returns 分组后的指标Map
 */
export const groupMetricsByHash = (
  metrics: QueryMetrics[]
): Map<string, QueryMetrics[]> => {
  const groups = new Map<string, QueryMetrics[]>();

  metrics.forEach(metric => {
    const key = metric.queryHash;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(metric);
  });

  return groups;
};

/**
 * 计算时间跨度（秒）
 * @param timeRange 时间范围
 * @param metrics 查询指标数组（用于计算默认时间跨度）
 * @returns 时间跨度（秒）
 */
export const calculateTimeSpan = (
  timeRange?: TimeRange,
  metrics?: QueryMetrics[]
): number => {
  if (timeRange) {
    return (timeRange.end.getTime() - timeRange.start.getTime()) / 1000;
  }

  if (metrics && metrics.length > 0) {
    return (Date.now() - metrics[0].timestamp.getTime()) / 1000;
  }

  return 0;
};

/**
 * 检查是否为模拟数据
 * @param metric 查询指标
 * @returns 是否为模拟数据
 */
export const isMockData = (metric: QueryMetrics): boolean => {
  return metric.params?.query?.includes('.') &&
         metric.params?.timestamp instanceof Date;
};
