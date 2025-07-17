/**
 * @fileoverview 高级性能优化器 - CoserEden平台（重构版）
 * @description 提供全面的性能监控、分析和优化功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const optimizer = AdvancedPerformanceOptimizer.getInstance();
 * await optimizer.initialize();
 *
 * // 开始性能监控
 * optimizer.startMonitoring();
 *
 * // 运行基准测试
 * const result = await optimizer.runBenchmark('api_test', async () => {
 *   // 测试代码
 * });
 *
 * // 获取性能分析
 * const analysis = await optimizer.analyzePerformance();
 * ```
 *
 * @dependencies
 * - ./core/performance-types: 类型定义
 * - ./core/performance-monitor: 性能监控
 * - ./core/benchmark-runner: 基准测试
 * - ./core/performance-analyzer: 性能分析
 *
 * @changelog
 * - 3.0.0: 重构为模块化架构，拆分为专用处理器
 * - 2.0.0: 添加基准测试和性能分析功能
 * - 1.0.0: 初始版本
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// 导入模块化组件
import { PerformanceMonitor } from './core/performance-monitor';
import { BenchmarkRunner } from './core/benchmark-runner';
import { PerformanceAnalyzer } from './core/performance-analyzer';

// 导入类型定义
import type {
  PerformanceMetric,
  PerformanceAnalysisResult,
  BenchmarkResult,
  BenchmarkOptions,
  BenchmarkComparison,
  PerformanceBottleneck,
  PerformanceOptimization,
  PerformanceMonitoringConfig,
  PerformanceThresholds,
  PerformanceReport,
  PerformanceTimer,
} from './core/performance-types';

// 重新导出类型以保持向后兼容
export type {
  PerformanceMetric,
  PerformanceAnalysisResult,
  BenchmarkResult,
  BenchmarkOptions,
  BenchmarkComparison,
  PerformanceBottleneck,
  PerformanceOptimization,
  PerformanceMonitoringConfig,
  PerformanceThresholds,
  PerformanceReport,
  PerformanceTimer,
};

/**
 * 高级性能优化器主类
 * 整合所有性能相关功能的统一入口
 */
export class AdvancedPerformanceOptimizer extends EventEmitter {
  private static instance: AdvancedPerformanceOptimizer;
  private initialized = false;

  // 模块化组件
  private performanceMonitor: PerformanceMonitor;
  private benchmarkRunner: BenchmarkRunner;
  private performanceAnalyzer: PerformanceAnalyzer;

  // 配置和状态
  private config: PerformanceMonitoringConfig;
  private isEnabled = false;

  private constructor() {
    super();

    // 获取配置
    this.config = this.getDefaultConfig();

    // 初始化模块化组件
    this.performanceMonitor = new PerformanceMonitor(this.config);
    this.benchmarkRunner = new BenchmarkRunner();
    this.performanceAnalyzer = new PerformanceAnalyzer();

    // 转发事件
    this.setupEventForwarding();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): AdvancedPerformanceOptimizer {
    if (!AdvancedPerformanceOptimizer.instance) {
      AdvancedPerformanceOptimizer.instance = new AdvancedPerformanceOptimizer();
    }
    return AdvancedPerformanceOptimizer.instance;
  }

  /**
   * 初始化性能优化器
   */
  public async initialize(config?: Partial<PerformanceMonitoringConfig>): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 初始化高级性能优化器...');

      // 更新配置
      if (config) {
        this.config = { ...this.config, ...config };
        this.performanceMonitor = new PerformanceMonitor(this.config);
      }

      this.isEnabled = this.config.enabled;

      if (!this.isEnabled) {
        console.log('性能优化器已禁用');
        return;
      }

      this.initialized = true;
      console.log('✅ 高级性能优化器初始化完成');

    } catch (error) {
      console.error('性能优化器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 开始性能监控
   */
  public startMonitoring(): void {
    if (!this.isEnabled) {
      console.log('性能监控已禁用');
      return;
    }

    this.performanceMonitor.start();
    console.log('✅ 性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  public stopMonitoring(): void {
    this.performanceMonitor.stop();
    console.log('⏹️ 性能监控已停止');
  }

  /**
   * 记录性能指标
   */
  public recordMetric(name: string, value: number, unit: string, category: PerformanceMetric['category'] = 'custom'): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      category,
    };

    this.performanceMonitor.recordMetric(metric);
  }

  /**
   * 创建性能计时器
   */
  public createTimer(name: string): PerformanceTimer {
    const marks: Record<string, number> = {};
    let startTime: number;

    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.recordMetric(`timer.${name}`, duration, 'ms', 'custom');
        return duration;
      },
      mark: (label: string) => {
        marks[label] = performance.now();
      },
      measure: (startMark: string, endMark: string) => {
        const startMarkTime = marks[startMark];
        const endMarkTime = marks[endMark];
        if (startMarkTime && endMarkTime) {
          return endMarkTime - startMarkTime;
        }
        return 0;
      },
    };
  }

  /**
   * 运行基准测试
   */
  public async runBenchmark(
    name: string,
    testFunction: () => Promise<any> | any,
    options?: BenchmarkOptions
  ): Promise<BenchmarkResult> {
    return this.benchmarkRunner.runBenchmark(name, testFunction, options);
  }

  /**
   * 比较基准测试结果
   */
  public compareBenchmarks(name: string): BenchmarkComparison | null {
    return this.benchmarkRunner.compareBenchmarks(name);
  }

  /**
   * 获取基准测试历史
   */
  public getBenchmarkHistory(name: string): BenchmarkResult[] {
    return this.benchmarkRunner.getBenchmarkHistory(name);
  }

  /**
   * 执行性能分析
   */
  public async analyzePerformance(): Promise<PerformanceAnalysisResult> {
    const metrics = this.performanceMonitor.getMetrics();
    this.performanceAnalyzer.setMetrics(metrics);
    return this.performanceAnalyzer.analyze();
  }

  /**
   * 检测性能瓶颈
   */
  public async detectBottlenecks(): Promise<PerformanceBottleneck[]> {
    const metrics = this.performanceMonitor.getMetrics();
    this.performanceAnalyzer.setMetrics(metrics);
    return this.performanceAnalyzer.detectBottlenecks();
  }

  /**
   * 生成优化建议
   */
  public async generateOptimizations(): Promise<PerformanceOptimization[]> {
    const metrics = this.performanceMonitor.getMetrics();
    this.performanceAnalyzer.setMetrics(metrics);
    return this.performanceAnalyzer.generateOptimizations();
  }

  /**
   * 获取性能指标
   */
  public getMetrics(name?: string, timeRange?: { start: number; end: number }): PerformanceMetric[] {
    return this.performanceMonitor.getMetrics(name, timeRange);
  }

  /**
   * 获取系统性能快照
   */
  public getSystemSnapshot() {
    return this.performanceMonitor.getSystemPerformanceSnapshot();
  }

  /**
   * 生成性能报告
   */
  public async generateReport(period?: { start: number; end: number }): Promise<PerformanceReport> {
    const now = Date.now();
    const reportPeriod = period || {
      start: now - 24 * 60 * 60 * 1000, // 过去24小时
      end: now,
    };

    const metrics = this.getMetrics(undefined, reportPeriod);
    this.performanceAnalyzer.setMetrics(metrics);
    const analysis = await this.performanceAnalyzer.analyze();
    const benchmarks = this.getAllBenchmarks();

    // 计算关键指标
    const responseTimeMetrics = metrics.filter(m => m.name.includes('response_time'));
    const averageResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;

    const throughputMetrics = metrics.filter(m => m.name.includes('throughput'));
    const throughput = throughputMetrics.length > 0
      ? throughputMetrics[throughputMetrics.length - 1].value
      : 0;

    // 计算性能等级
    const performanceGrade = this.calculatePerformanceGrade(analysis.summary.overallScore);

    return {
      timestamp: now,
      period: reportPeriod,
      summary: {
        overallScore: analysis.summary.overallScore,
        performanceGrade,
        keyMetrics: {
          averageResponseTime,
          throughput,
          errorRate: 0, // 需要从错误指标计算
          availability: 99.9, // 需要从健康检查计算
        },
      },
      trends: {
        responseTime: 'stable', // 需要趋势分析
        throughput: 'stable',
        errorRate: 'stable',
      },
      bottlenecks: analysis.bottlenecks,
      recommendations: analysis.optimizations,
      benchmarks,
    };
  }

  /**
   * 清理旧数据
   */
  public cleanupOldData(retentionHours: number = 24): void {
    this.performanceMonitor.cleanupOldData(retentionHours);
    this.benchmarkRunner.cleanupOldResults();
  }

  /**
   * 获取优化器统计
   */
  public getOptimizerStats() {
    const monitoringStats = this.performanceMonitor.getMonitoringStats();
    const benchmarkStats = this.benchmarkRunner.getStatistics();

    return {
      monitoring: monitoringStats,
      benchmarks: benchmarkStats,
      isEnabled: this.isEnabled,
      isMonitoring: this.performanceMonitor.isRunning(),
    };
  }

  /**
   * 更新性能阈值
   */
  public updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.performanceAnalyzer.updateThresholds(thresholds);
  }

  // 私有方法

  private getDefaultConfig(): PerformanceMonitoringConfig {
    return {
      enabled: true,
      interval: 10000, // 10秒
      maxMetrics: 1000,
      enableBrowserMetrics: false,
      enableSystemMetrics: true,
      enableCustomMetrics: true,
    };
  }

  private setupEventForwarding(): void {
    // 转发各组件的事件
    this.performanceMonitor.on('metricRecorded', (metric) => this.emit('metricRecorded', metric));
    this.performanceMonitor.on('monitoringStarted', () => this.emit('monitoringStarted'));
    this.performanceMonitor.on('monitoringStopped', () => this.emit('monitoringStopped'));

    this.benchmarkRunner.on('benchmarkCompleted', (result) => this.emit('benchmarkCompleted', result));

    this.performanceAnalyzer.on('bottleneckDetected', (bottleneck) => this.emit('bottleneckDetected', bottleneck));
    this.performanceAnalyzer.on('optimizationSuggested', (optimization) => this.emit('optimizationSuggested', optimization));
  }

  private getAllBenchmarks(): BenchmarkResult[] {
    const benchmarkNames = this.benchmarkRunner.getBenchmarkNames();
    const allBenchmarks: BenchmarkResult[] = [];

    for (const name of benchmarkNames) {
      const history = this.benchmarkRunner.getBenchmarkHistory(name);
      if (history.length > 0) {
        allBenchmarks.push(history[history.length - 1]); // 最新结果
      }
    }

    return allBenchmarks;
  }

  private calculatePerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

/**
 * 导出默认实例
 */
export const advancedPerformanceOptimizer = AdvancedPerformanceOptimizer.getInstance();
