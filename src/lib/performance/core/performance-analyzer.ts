/**
 * @fileoverview 性能分析器 - CoserEden平台
 * @description 性能瓶颈检测和优化建议生成
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type {
  PerformanceMetric,
  PerformanceBottleneck,
  PerformanceOptimization,
  PerformanceAnalysisResult,
  PerformanceThresholds,
  IPerformanceAnalyzer,
} from './performance-types';

/**
 * 性能分析器类
 * 负责分析性能数据，检测瓶颈，生成优化建议
 */
export class PerformanceAnalyzer extends EventEmitter implements IPerformanceAnalyzer {
  private bottlenecks: PerformanceBottleneck[] = [];
  private optimizations: PerformanceOptimization[] = [];
  private thresholds: PerformanceThresholds;
  private cachedMetrics: PerformanceMetric[] = [];

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    super();
    this.thresholds = this.getDefaultThresholds(thresholds);
  }

  /**
   * 设置缓存的指标数据
   */
  public setMetrics(metrics: PerformanceMetric[]): void {
    this.cachedMetrics = metrics;
  }

  /**
   * 执行性能分析 - 接口实现
   */
  public async analyze(): Promise<PerformanceAnalysisResult> {
    return this.analyzeWithMetrics(this.cachedMetrics);
  }

  /**
   * 执行性能分析 - 带参数版本
   */
  public async analyzeWithMetrics(metrics: PerformanceMetric[]): Promise<PerformanceAnalysisResult> {
    console.log('📊 执行性能分析...');

    // 检测瓶颈
    const bottlenecks = await this.detectBottlenecksWithMetrics(metrics);

    // 生成优化建议
    const optimizations = await this.generateOptimizationsWithData(metrics, bottlenecks);

    // 计算摘要
    const summary = this.calculatePerformanceSummary(metrics, bottlenecks, optimizations);

    console.log('✅ 性能分析完成');
    return {
      metrics,
      bottlenecks,
      optimizations,
      summary
    };
  }

  /**
   * 检测性能瓶颈 - 接口实现
   */
  public async detectBottlenecks(): Promise<PerformanceBottleneck[]> {
    return this.detectBottlenecksWithMetrics(this.cachedMetrics);
  }

  /**
   * 检测性能瓶颈 - 带参数版本
   */
  public async detectBottlenecksWithMetrics(metrics: PerformanceMetric[]): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];

    // 检测内存瓶颈
    bottlenecks.push(...this.detectMemoryBottlenecks(metrics));

    // 检测CPU瓶颈
    bottlenecks.push(...this.detectCpuBottlenecks(metrics));

    // 检测I/O瓶颈
    bottlenecks.push(...this.detectIoBottlenecks(metrics));

    // 检测数据库瓶颈
    bottlenecks.push(...this.detectDatabaseBottlenecks(metrics));

    // 检测网络瓶颈
    bottlenecks.push(...this.detectNetworkBottlenecks(metrics));

    this.bottlenecks = bottlenecks;
    bottlenecks.forEach(bottleneck => this.emit('bottleneckDetected', bottleneck));

    return bottlenecks;
  }

  /**
   * 生成优化建议 - 接口实现
   */
  public async generateOptimizations(): Promise<PerformanceOptimization[]> {
    const bottlenecks = await this.detectBottlenecks();
    return this.generateOptimizationsWithData(this.cachedMetrics, bottlenecks);
  }

  /**
   * 生成优化建议 - 带参数版本
   */
  public async generateOptimizationsWithData(
    metrics: PerformanceMetric[],
    bottlenecks: PerformanceBottleneck[]
  ): Promise<PerformanceOptimization[]> {
    const optimizations: PerformanceOptimization[] = [];

    // 基于瓶颈生成优化建议
    for (const bottleneck of bottlenecks) {
      optimizations.push(...this.generateBottleneckOptimizations(bottleneck));
    }

    // 基于指标生成通用优化建议
    optimizations.push(...this.generateGeneralOptimizations(metrics));

    // 去重和排序
    const uniqueOptimizations = this.deduplicateOptimizations(optimizations);
    const sortedOptimizations = this.sortOptimizationsByPriority(uniqueOptimizations);

    this.optimizations = sortedOptimizations;
    sortedOptimizations.forEach(optimization => this.emit('optimizationSuggested', optimization));

    return sortedOptimizations;
  }

  /**
   * 获取性能瓶颈
   */
  public getBottlenecks(severity?: 'low' | 'medium' | 'high' | 'critical'): PerformanceBottleneck[] {
    if (severity) {
      return this.bottlenecks.filter(b => b.severity === severity);
    }
    return this.bottlenecks;
  }

  /**
   * 获取优化建议
   */
  public getOptimizations(category?: string, priority?: 'low' | 'medium' | 'high' | 'critical'): PerformanceOptimization[] {
    let optimizations = this.optimizations;

    if (category) {
      optimizations = optimizations.filter(o => o.category === category);
    }

    if (priority) {
      optimizations = optimizations.filter(o => o.priority === priority);
    }

    return optimizations;
  }

  /**
   * 更新性能阈值
   */
  public updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  // 私有方法

  private detectMemoryBottlenecks(metrics: PerformanceMetric[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const memoryMetrics = metrics.filter(m => m.category === 'memory');

    // 检测内存使用过高
    const heapUsedMetrics = memoryMetrics.filter(m => m.name.includes('heap_used'));
    if (heapUsedMetrics.length > 0) {
      const avgHeapUsed = heapUsedMetrics.reduce((sum, m) => sum + m.value, 0) / heapUsedMetrics.length;
      const heapUsedMB = avgHeapUsed / (1024 * 1024);

      if (heapUsedMB > this.thresholds.memoryUsage.critical) {
        bottlenecks.push({
          id: `memory_high_usage_${Date.now()}`,
          type: 'memory_leak',
          severity: 'critical',
          location: { file: 'system', function: 'memory_management' },
          description: `内存使用过高: ${heapUsedMB.toFixed(2)}MB`,
          impact: {
            responseTime: 200,
            throughput: -30,
            resourceUsage: 80,
          },
          suggestions: [
            '检查内存泄漏',
            '优化数据结构',
            '实现对象池',
            '增加垃圾回收频率',
          ],
          estimatedImprovement: {
            responseTime: 150,
            throughput: 25,
            resourceSavings: 40,
          },
        });
      }
    }

    return bottlenecks;
  }

  private detectCpuBottlenecks(metrics: PerformanceMetric[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const cpuMetrics = metrics.filter(m => m.category === 'cpu');

    // 检测CPU使用过高
    const loadMetrics = cpuMetrics.filter(m => m.name.includes('load_average'));
    if (loadMetrics.length > 0) {
      const avgLoad = loadMetrics.reduce((sum, m) => sum + m.value, 0) / loadMetrics.length;

      if (avgLoad > this.thresholds.cpuUsage.critical) {
        bottlenecks.push({
          id: `cpu_high_load_${Date.now()}`,
          type: 'cpu_intensive',
          severity: 'high',
          location: { file: 'system', function: 'cpu_processing' },
          description: `CPU负载过高: ${avgLoad.toFixed(2)}`,
          impact: {
            responseTime: 300,
            throughput: -40,
            resourceUsage: 90,
          },
          suggestions: [
            '优化算法复杂度',
            '使用异步处理',
            '实现任务队列',
            '考虑水平扩展',
          ],
          estimatedImprovement: {
            responseTime: 200,
            throughput: 30,
            resourceSavings: 50,
          },
        });
      }
    }

    return bottlenecks;
  }

  private detectIoBottlenecks(metrics: PerformanceMetric[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const ioMetrics = metrics.filter(m => m.category === 'io');

    // 检测事件循环延迟
    const eventLoopMetrics = ioMetrics.filter(m => m.name.includes('event_loop_delay'));
    if (eventLoopMetrics.length > 0) {
      const avgDelay = eventLoopMetrics.reduce((sum, m) => sum + m.value, 0) / eventLoopMetrics.length;

      if (avgDelay > 100) { // 100ms
        bottlenecks.push({
          id: `io_event_loop_delay_${Date.now()}`,
          type: 'blocking_io',
          severity: 'medium',
          location: { file: 'system', function: 'event_loop' },
          description: `事件循环延迟过高: ${avgDelay.toFixed(2)}ms`,
          impact: {
            responseTime: 150,
            throughput: -20,
            resourceUsage: 60,
          },
          suggestions: [
            '避免阻塞操作',
            '使用Worker线程',
            '优化I/O操作',
            '实现连接池',
          ],
          estimatedImprovement: {
            responseTime: 100,
            throughput: 15,
            resourceSavings: 30,
          },
        });
      }
    }

    return bottlenecks;
  }

  private detectDatabaseBottlenecks(metrics: PerformanceMetric[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const dbMetrics = metrics.filter(m => m.category === 'database');

    // 检测慢查询
    const queryMetrics = dbMetrics.filter(m => m.name.includes('query_time'));
    if (queryMetrics.length > 0) {
      const avgQueryTime = queryMetrics.reduce((sum, m) => sum + m.value, 0) / queryMetrics.length;

      if (avgQueryTime > 1000) { // 1秒
        bottlenecks.push({
          id: `db_slow_query_${Date.now()}`,
          type: 'slow_query',
          severity: 'high',
          location: { file: 'database', function: 'query_execution' },
          description: `数据库查询过慢: ${avgQueryTime.toFixed(2)}ms`,
          impact: {
            responseTime: 500,
            throughput: -50,
            resourceUsage: 70,
          },
          suggestions: [
            '添加数据库索引',
            '优化查询语句',
            '实现查询缓存',
            '考虑数据分片',
          ],
          estimatedImprovement: {
            responseTime: 400,
            throughput: 40,
            resourceSavings: 35,
          },
        });
      }
    }

    return bottlenecks;
  }

  private detectNetworkBottlenecks(metrics: PerformanceMetric[]): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const networkMetrics = metrics.filter(m => m.category === 'network');

    // 这里可以添加网络瓶颈检测逻辑
    // 例如：高延迟、低带宽、连接超时等

    return bottlenecks;
  }

  private generateBottleneckOptimizations(bottleneck: PerformanceBottleneck): PerformanceOptimization[] {
    const optimizations: PerformanceOptimization[] = [];

    switch (bottleneck.type) {
      case 'memory_leak':
        optimizations.push({
          id: `opt_memory_${Date.now()}`,
          category: 'memory',
          priority: 'high',
          title: '内存优化',
          description: '优化内存使用，减少内存泄漏',
          implementation: {
            difficulty: 'medium',
            estimatedTime: '2-3天',
            codeChanges: ['实现对象池', '优化数据结构', '添加内存监控'],
            dependencies: [],
          },
          benefits: {
            performanceGain: 30,
            resourceSavings: 40,
            userExperience: 'significant',
          },
          risks: ['可能影响现有功能'],
          testingRequirements: ['内存压力测试', '长时间运行测试'],
        });
        break;

      case 'cpu_intensive':
        optimizations.push({
          id: `opt_cpu_${Date.now()}`,
          category: 'algorithm',
          priority: 'high',
          title: 'CPU优化',
          description: '优化CPU密集型操作',
          implementation: {
            difficulty: 'hard',
            estimatedTime: '1-2周',
            codeChanges: ['算法优化', '异步处理', '任务队列'],
            dependencies: ['Redis', 'Bull Queue'],
          },
          benefits: {
            performanceGain: 40,
            resourceSavings: 50,
            userExperience: 'major',
          },
          risks: ['复杂度增加', '可能引入新bug'],
          testingRequirements: ['性能测试', '负载测试'],
        });
        break;
    }

    return optimizations;
  }

  private generateGeneralOptimizations(metrics: PerformanceMetric[]): PerformanceOptimization[] {
    const optimizations: PerformanceOptimization[] = [];

    // 基于指标生成通用优化建议
    optimizations.push({
      id: `opt_caching_${Date.now()}`,
      category: 'caching',
      priority: 'medium',
      title: '实现缓存策略',
      description: '添加多层缓存以提高响应速度',
      implementation: {
        difficulty: 'medium',
        estimatedTime: '3-5天',
        codeChanges: ['Redis缓存', '内存缓存', 'CDN缓存'],
        dependencies: ['Redis'],
      },
      benefits: {
        performanceGain: 25,
        resourceSavings: 20,
        userExperience: 'moderate',
      },
      risks: ['缓存一致性问题'],
      testingRequirements: ['缓存测试', '一致性测试'],
    });

    return optimizations;
  }

  private deduplicateOptimizations(optimizations: PerformanceOptimization[]): PerformanceOptimization[] {
    const seen = new Set<string>();
    return optimizations.filter(opt => {
      if (seen.has(opt.title)) {
        return false;
      }
      seen.add(opt.title);
      return true;
    });
  }

  private sortOptimizationsByPriority(optimizations: PerformanceOptimization[]): PerformanceOptimization[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return optimizations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private calculatePerformanceSummary(
    metrics: PerformanceMetric[],
    bottlenecks: PerformanceBottleneck[],
    optimizations: PerformanceOptimization[]
  ) {
    const criticalIssues = bottlenecks.filter(b => b.severity === 'critical').length;
    const improvementOpportunities = optimizations.filter(o => o.priority === 'high' || o.priority === 'critical').length;

    // 计算预期收益
    const estimatedGains = optimizations.reduce(
      (acc, opt) => ({
        responseTime: acc.responseTime + (opt.benefits.performanceGain * 10),
        throughput: acc.throughput + opt.benefits.performanceGain,
        resourceSavings: acc.resourceSavings + opt.benefits.resourceSavings,
      }),
      { responseTime: 0, throughput: 0, resourceSavings: 0 }
    );

    // 计算整体评分
    const overallScore = Math.max(0, 100 - (criticalIssues * 20) - (bottlenecks.length * 5));

    return {
      overallScore,
      criticalIssues,
      improvementOpportunities,
      estimatedGains,
    };
  }

  private getDefaultThresholds(overrides?: Partial<PerformanceThresholds>): PerformanceThresholds {
    const defaults: PerformanceThresholds = {
      responseTime: { warning: 500, critical: 2000 },
      throughput: { minimum: 100, target: 1000 },
      memoryUsage: { warning: 512, critical: 1024 },
      cpuUsage: { warning: 70, critical: 90 },
      errorRate: { warning: 1, critical: 5 },
    };

    return { ...defaults, ...overrides };
  }
}
