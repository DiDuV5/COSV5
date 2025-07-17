/**
 * @fileoverview 指标收集器 - CoserEden平台
 * @description 系统指标收集和性能监控
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import type {
  MetricData,
  PerformanceMetric,
  MetricQueryOptions,
  PerformanceQueryOptions,
  LogLevel,
  IMetricsCollector,
  MonitoringConfig,
} from './monitoring-types';

/**
 * 指标收集器类
 * 负责收集系统指标和性能数据
 */
export class MetricsCollector extends EventEmitter implements IMetricsCollector {
  private metrics = new Map<string, MetricData[]>();
  private performanceMetrics: PerformanceMetric[] = [];
  private running = false;
  private collectionInterval?: NodeJS.Timeout;
  private config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
  }

  /**
   * 初始化指标收集器
   */
  public async initialize(): Promise<void> {
    this.log('INFO', '初始化指标收集器...');

    if (!this.config.enableMetrics) {
      this.log('INFO', '指标收集已禁用');
      return;
    }

    this.log('INFO', '✅ 指标收集器初始化完成');
  }

  /**
   * 启动指标收集
   */
  public start(): void {
    if (this.running) {
      this.log('WARN', '指标收集器已在运行');
      return;
    }

    if (!this.config.enableMetrics) {
      this.log('INFO', '指标收集已禁用，跳过启动');
      return;
    }

    this.running = true;
    this.startMetricsCollection();
    this.log('INFO', '✅ 指标收集器已启动');
  }

  /**
   * 停止指标收集
   */
  public stop(): void {
    if (!this.running) {
      this.log('WARN', '指标收集器未在运行');
      return;
    }

    this.running = false;

    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }

    this.log('INFO', '✅ 指标收集器已停止');
  }

  /**
   * 检查是否正在运行
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * 获取状态
   */
  public getStatus(): string {
    return this.running ? 'running' : 'stopped';
  }

  /**
   * 收集系统指标
   */
  public async collectMetrics(): Promise<void> {
    try {
      // 收集内存指标
      const memoryUsage = process.memoryUsage();
      this.recordMetric({
        name: 'system.memory.heap_used',
        value: memoryUsage.heapUsed,
        unit: 'bytes',
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'system.memory.heap_total',
        value: memoryUsage.heapTotal,
        unit: 'bytes',
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'system.memory.external',
        value: memoryUsage.external,
        unit: 'bytes',
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'system.memory.rss',
        value: memoryUsage.rss,
        unit: 'bytes',
        timestamp: Date.now(),
      });

      // 收集CPU指标
      const cpuUsage = process.cpuUsage();
      this.recordMetric({
        name: 'system.cpu.user',
        value: cpuUsage.user,
        unit: 'microseconds',
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'system.cpu.system',
        value: cpuUsage.system,
        unit: 'microseconds',
        timestamp: Date.now(),
      });

      // 收集运行时间
      this.recordMetric({
        name: 'system.uptime',
        value: process.uptime(),
        unit: 'seconds',
        timestamp: Date.now(),
      });

      // 收集事件循环延迟
      await this.collectEventLoopDelay();

      // 收集负载平均值
      this.collectLoadAverage();

    } catch (error) {
      this.log('ERROR', '指标收集失败', { error });
    }
  }

  /**
   * 记录指标
   */
  public recordMetric(metric: MetricData): void {
    if (!this.config.enableMetrics) return;

    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricHistory = this.metrics.get(metric.name)!;
    metricHistory.push(metric);

    // 保持最近的指标数据
    const maxMetrics = this.config.maxMetricsPerType || 1000;
    if (metricHistory.length > maxMetrics) {
      metricHistory.shift();
    }

    this.emit('metric', metric);
    this.log('DEBUG', `记录指标: ${metric.name} = ${metric.value} ${metric.unit}`, { tags: metric.tags });
  }

  /**
   * 记录性能指标
   */
  public recordPerformance(operation: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    if (!this.config.enableMetrics) return;

    const performanceMetric: PerformanceMetric = {
      operation,
      duration,
      success,
      timestamp: Date.now(),
      metadata,
    };

    this.performanceMetrics.push(performanceMetric);

    // 保持最近的性能记录
    const maxPerformanceMetrics = this.config.maxPerformanceMetrics || 10000;
    if (this.performanceMetrics.length > maxPerformanceMetrics) {
      this.performanceMetrics.shift();
    }

    // 记录相关指标
    this.recordMetric({
      name: `performance.${operation}.duration`,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      tags: { success: success.toString() },
    });

    this.recordMetric({
      name: `performance.${operation}.count`,
      value: 1,
      unit: 'count',
      timestamp: Date.now(),
      tags: { success: success.toString() },
    });

    this.emit('performance', performanceMetric);
    this.log('DEBUG', `性能记录: ${operation} ${duration}ms (${success ? '成功' : '失败'})`, metadata);
  }

  /**
   * 创建性能计时器
   */
  public createTimer(operation: string): (success?: boolean, metadata?: Record<string, any>) => void {
    const startTime = Date.now();

    return (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, success, metadata);
    };
  }

  /**
   * 获取指标数据
   */
  public getMetrics(options?: MetricQueryOptions): MetricData[] {
    if (options?.name) {
      const metrics = this.metrics.get(options.name) || [];
      return this.filterMetricsByTimeRange(metrics, options.timeRange);
    }

    // 返回所有指标
    const allMetrics: MetricData[] = [];
    for (const metrics of Array.from(this.metrics.values())) {
      allMetrics.push(...metrics);
    }

    return this.filterMetricsByTimeRange(allMetrics, options?.timeRange);
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(options?: PerformanceQueryOptions): PerformanceMetric[] {
    let metrics = this.performanceMetrics;

    if (options?.operation) {
      metrics = metrics.filter(m => m.operation === options.operation);
    }

    if (options?.success !== undefined) {
      metrics = metrics.filter(m => m.success === options.success);
    }

    if (options?.timeRange) {
      metrics = metrics.filter(m =>
        m.timestamp >= options.timeRange!.start &&
        m.timestamp <= options.timeRange!.end
      );
    }

    if (options?.limit) {
      metrics = metrics.slice(-options.limit);
    }

    return metrics;
  }

  /**
   * 清理旧数据
   */
  public cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.config.dataRetentionHours || 24) * 60 * 60 * 1000;

    // 清理旧的性能指标
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoffTime);

    // 清理旧的指标数据
    for (const [name, metrics] of Array.from(this.metrics)) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(name, filteredMetrics);
    }

    this.log('DEBUG', '完成指标数据清理');
  }

  /**
   * 获取指标统计
   */
  public getMetricStats(): { totalMetrics: number; totalPerformanceMetrics: number; metricTypes: number } {
    let totalMetrics = 0;
    for (const metrics of Array.from(this.metrics.values())) {
      totalMetrics += metrics.length;
    }

    return {
      totalMetrics,
      totalPerformanceMetrics: this.performanceMetrics.length,
      metricTypes: this.metrics.size,
    };
  }

  // 私有方法

  private startMetricsCollection(): void {
    const interval = this.config.metricsCollectionInterval || 10000;

    this.collectionInterval = setInterval(async () => {
      await this.collectMetrics();
    }, interval);

    this.log('INFO', `启动指标收集，间隔: ${interval}ms`);
  }

  private async collectEventLoopDelay(): Promise<void> {
    const start = process.hrtime.bigint();

    return new Promise((resolve) => {
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1000000; // 转换为毫秒
        this.recordMetric({
          name: 'system.event_loop_delay',
          value: delay,
          unit: 'ms',
          timestamp: Date.now(),
        });
        resolve();
      });
    });
  }

  private collectLoadAverage(): void {
    try {
      const loadAverage = os.loadavg();

      this.recordMetric({
        name: 'system.load_average.1m',
        value: loadAverage[0],
        unit: 'load',
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'system.load_average.5m',
        value: loadAverage[1],
        unit: 'load',
        timestamp: Date.now(),
      });

      this.recordMetric({
        name: 'system.load_average.15m',
        value: loadAverage[2],
        unit: 'load',
        timestamp: Date.now(),
      });
    } catch (error) {
      this.log('WARN', '无法收集负载平均值', { error });
    }
  }

  private filterMetricsByTimeRange(metrics: MetricData[], timeRange?: { start: number; end: number }): MetricData[] {
    if (!timeRange) return metrics;

    return metrics.filter(m =>
      m.timestamp >= timeRange.start &&
      m.timestamp <= timeRange.end
    );
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    switch (level) {
      case 'ERROR':
        console.error(logMessage, metadata);
        break;
      case 'WARN':
        console.warn(logMessage, metadata);
        break;
      case 'INFO':
        console.info(logMessage, metadata);
        break;
      case 'DEBUG':
        console.debug(logMessage, metadata);
        break;
    }

    this.emit('log', { timestamp, level, message, metadata, service: 'metrics-collector' });
  }
}
