/**
 * @fileoverview 性能监控器 - CoserEden平台
 * @description 系统性能监控和指标收集
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import type {
  PerformanceMetric,
  SystemPerformanceMetrics,
  PerformanceMonitoringConfig,
  IPerformanceMonitor,
} from './performance-types';

/**
 * 性能监控器类
 * 负责收集和监控系统性能指标
 */
export class PerformanceMonitor extends EventEmitter implements IPerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;
  private config: PerformanceMonitoringConfig;

  constructor(config: PerformanceMonitoringConfig) {
    super();
    this.config = config;
    this.setupPerformanceObserver();
  }

  /**
   * 开始性能监控
   */
  public start(): void {
    if (this.isMonitoring) {
      console.warn('性能监控已在运行中');
      return;
    }

    if (!this.config.enabled) {
      console.log('性能监控已禁用');
      return;
    }

    console.log('🚀 开始性能监控...');
    this.isMonitoring = true;

    // 定期收集性能指标
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.interval);

    // 启动性能观察器
    if (this.performanceObserver && this.config.enableBrowserMetrics) {
      this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }

    this.emit('monitoringStarted');
  }

  /**
   * 停止性能监控
   */
  public stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('⏹️ 停止性能监控');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.emit('monitoringStopped');
  }

  /**
   * 检查是否正在运行
   */
  public isRunning(): boolean {
    return this.isMonitoring;
  }

  /**
   * 记录性能指标
   */
  public recordMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricHistory = this.metrics.get(metric.name)!;
    metricHistory.push(metric);

    // 保持最近的指标数据
    const maxMetrics = this.config.maxMetrics || 1000;
    if (metricHistory.length > maxMetrics) {
      metricHistory.shift();
    }

    this.emit('metricRecorded', metric);
  }

  /**
   * 获取性能指标
   */
  public getMetrics(name?: string, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      if (timeRange) {
        return metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
      }
      return metrics;
    }

    return this.getAllMetrics(timeRange);
  }

  /**
   * 收集系统性能指标
   */
  public collectSystemMetrics(): void {
    if (!this.config.enableSystemMetrics) return;

    try {
      // 收集内存指标
      const memoryUsage = process.memoryUsage();
      this.recordMetric({
        name: 'system.memory.heap_used',
        value: memoryUsage.heapUsed,
        unit: 'bytes',
        timestamp: Date.now(),
        category: 'memory',
      });

      this.recordMetric({
        name: 'system.memory.heap_total',
        value: memoryUsage.heapTotal,
        unit: 'bytes',
        timestamp: Date.now(),
        category: 'memory',
      });

      this.recordMetric({
        name: 'system.memory.external',
        value: memoryUsage.external,
        unit: 'bytes',
        timestamp: Date.now(),
        category: 'memory',
      });

      this.recordMetric({
        name: 'system.memory.rss',
        value: memoryUsage.rss,
        unit: 'bytes',
        timestamp: Date.now(),
        category: 'memory',
      });

      // 收集CPU指标
      const cpuUsage = process.cpuUsage();
      this.recordMetric({
        name: 'system.cpu.user',
        value: cpuUsage.user,
        unit: 'microseconds',
        timestamp: Date.now(),
        category: 'cpu',
      });

      this.recordMetric({
        name: 'system.cpu.system',
        value: cpuUsage.system,
        unit: 'microseconds',
        timestamp: Date.now(),
        category: 'cpu',
      });

      // 收集运行时间
      this.recordMetric({
        name: 'system.uptime',
        value: process.uptime(),
        unit: 'seconds',
        timestamp: Date.now(),
        category: 'custom',
      });

      // 收集事件循环延迟
      this.collectEventLoopDelay();

      // 收集负载平均值
      this.collectLoadAverage();

    } catch (error) {
      console.error('收集系统指标失败:', error);
    }
  }

  /**
   * 获取系统性能快照
   */
  public getSystemPerformanceSnapshot(): SystemPerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = this.getLoadAverage();

    return {
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // 转换为毫秒
        loadAverage,
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal + memoryUsage.external,
        percentage: (memoryUsage.heapUsed / (memoryUsage.heapTotal + memoryUsage.external)) * 100,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      },
      eventLoop: {
        delay: 0, // 需要实际测量
        utilization: 0, // 需要实际测量
      },
      gc: {
        collections: 0, // 需要GC监控
        duration: 0,
        reclaimedMemory: 0,
      },
    };
  }

  /**
   * 清理旧数据
   */
  public cleanupOldData(retentionHours: number = 24): void {
    const cutoffTime = Date.now() - (retentionHours * 60 * 60 * 1000);

    for (const [name, metrics] of Array.from(this.metrics)) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(name, filteredMetrics);
    }

    console.log('完成性能数据清理');
  }

  /**
   * 获取监控统计
   */
  public getMonitoringStats(): {
    totalMetrics: number;
    metricTypes: number;
    isRunning: boolean;
    uptime: number;
  } {
    let totalMetrics = 0;
    for (const metrics of Array.from(this.metrics.values())) {
      totalMetrics += metrics.length;
    }

    return {
      totalMetrics,
      metricTypes: this.metrics.size,
      isRunning: this.isMonitoring,
      uptime: process.uptime(),
    };
  }

  // 私有方法

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric({
            name: `browser.${entry.entryType}.${entry.name}`,
            value: entry.duration || 0,
            unit: 'ms',
            timestamp: Date.now(),
            category: 'custom',
          });
        }
      });
    }
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
          category: 'custom',
        });
        resolve();
      });
    });
  }

  private collectLoadAverage(): void {
    try {
      const loadAverage = this.getLoadAverage();

      this.recordMetric({
        name: 'system.load_average.1m',
        value: loadAverage[0],
        unit: 'load',
        timestamp: Date.now(),
        category: 'cpu',
      });

      this.recordMetric({
        name: 'system.load_average.5m',
        value: loadAverage[1],
        unit: 'load',
        timestamp: Date.now(),
        category: 'cpu',
      });

      this.recordMetric({
        name: 'system.load_average.15m',
        value: loadAverage[2],
        unit: 'load',
        timestamp: Date.now(),
        category: 'cpu',
      });
    } catch (error) {
      console.warn('无法收集负载平均值:', error);
    }
  }

  private getLoadAverage(): number[] {
    try {
      return require('os').loadavg();
    } catch (error) {
      return [0, 0, 0];
    }
  }

  private getAllMetrics(timeRange?: { start: number; end: number }): PerformanceMetric[] {
    const allMetrics: PerformanceMetric[] = [];

    for (const metrics of Array.from(this.metrics.values())) {
      if (timeRange) {
        allMetrics.push(...metrics.filter(m =>
          m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        ));
      } else {
        allMetrics.push(...metrics);
      }
    }

    return allMetrics.sort((a, b) => a.timestamp - b.timestamp);
  }
}
