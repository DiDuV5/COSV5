/**
 * @fileoverview 指标收集器
 * @description 负责收集和存储查询性能指标
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { QueryMetrics } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { generateQueryId, generateQueryHash } from '../utils/hashUtils';
import { sanitizeParams } from '../utils/sanitizeUtils';
import { isMockData } from '../utils/queryUtils';

/**
 * 指标收集器类
 */
export class MetricsCollector {
  private metrics: QueryMetrics[] = [];
  private slowQueryThreshold: number = DEFAULT_CONFIG.SLOW_QUERY_THRESHOLD;
  private maxMetricsSize: number = DEFAULT_CONFIG.MAX_METRICS_SIZE;

  /**
   * 配置收集器
   */
  configure(options: {
    slowQueryThreshold?: number;
    maxMetricsSize?: number;
  }): void {
    if (options.slowQueryThreshold !== undefined) {
      this.slowQueryThreshold = options.slowQueryThreshold;
    }
    if (options.maxMetricsSize !== undefined) {
      this.maxMetricsSize = options.maxMetricsSize;
    }
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
    const queryId = generateQueryId();
    const queryHash = generateQueryHash(model, action, params);
    const isSlow = duration > this.slowQueryThreshold;

    const metric: QueryMetrics = {
      queryId,
      model,
      action,
      duration,
      params: sanitizeParams(params),
      timestamp: new Date(),
      isSlow,
      queryHash,
    };

    this.metrics.push(metric);

    // 限制指标数量
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // 记录慢查询
    if (isSlow) {
      this.logSlowQuery(metric);
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): QueryMetrics[] {
    return [...this.metrics];
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 记录慢查询日志
   */
  private logSlowQuery(metric: QueryMetrics): void {
    // 检查是否是模拟数据
    const isMock = isMockData(metric);

    // 如果是模拟数据，减少日志频率
    if (isMock) {
      const now = Date.now();
      const lastLogKey = 'mock_slow_query_log';
      const lastLogTime = (global as any)[lastLogKey] || 0;
      const shouldLog = now - lastLogTime > 60000; // 60秒间隔

      if (!shouldLog) return;
      (global as any)[lastLogKey] = now;
    }

    console.warn(`🐌 慢查询检测:`, {
      model: metric.model,
      action: metric.action,
      duration: `${metric.duration}ms`,
      threshold: `${this.slowQueryThreshold}ms`,
      queryId: metric.queryId,
      timestamp: metric.timestamp.toISOString(),
      ...(isMock && { note: '模拟数据' }),
    });
  }
}
