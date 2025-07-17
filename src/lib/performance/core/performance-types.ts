/**
 * @fileoverview 性能优化类型定义 - CoserEden平台
 * @description 性能优化系统的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'cpu' | 'memory' | 'io' | 'network' | 'database' | 'custom';
  tags?: Record<string, string>;
}

/**
 * 性能瓶颈
 */
export interface PerformanceBottleneck {
  id: string;
  type: 'cpu_intensive' | 'memory_leak' | 'slow_query' | 'blocking_io' | 'inefficient_algorithm';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: {
    file: string;
    function: string;
    line?: number;
  };
  description: string;
  impact: {
    responseTime: number; // 影响的响应时间（毫秒）
    throughput: number;   // 影响的吞吐量（请求/秒）
    resourceUsage: number; // 资源使用率影响（百分比）
  };
  suggestions: string[];
  estimatedImprovement: {
    responseTime: number; // 预期改善的响应时间（毫秒）
    throughput: number;   // 预期改善的吞吐量（请求/秒）
    resourceSavings: number; // 预期节省的资源（百分比）
  };
}

/**
 * 性能优化建议
 */
export interface PerformanceOptimization {
  id: string;
  category: 'algorithm' | 'caching' | 'database' | 'memory' | 'io' | 'concurrency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
    codeChanges: string[];
    dependencies: string[];
  };
  benefits: {
    performanceGain: number; // 性能提升百分比
    resourceSavings: number; // 资源节省百分比
    userExperience: 'minor' | 'moderate' | 'significant' | 'major';
  };
  risks: string[];
  testingRequirements: string[];
}

/**
 * 性能基准测试结果
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  operationsPerSecond: number;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
}

/**
 * 基准测试选项
 */
export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  timeout?: number;
}

/**
 * 性能分析结果
 */
export interface PerformanceAnalysisResult {
  metrics: PerformanceMetric[];
  bottlenecks: PerformanceBottleneck[];
  optimizations: PerformanceOptimization[];
  summary: {
    overallScore: number;
    criticalIssues: number;
    improvementOpportunities: number;
    estimatedGains: {
      responseTime: number;
      throughput: number;
      resourceSavings: number;
    };
  };
}

/**
 * 基准测试比较结果
 */
export interface BenchmarkComparison {
  current: BenchmarkResult;
  previous?: BenchmarkResult;
  improvement: {
    responseTime: number; // 百分比
    throughput: number;   // 百分比
    memoryEfficiency: number; // 百分比
  };
  trend: 'improving' | 'degrading' | 'stable' | 'unknown';
}

/**
 * 性能计时器接口
 */
export interface PerformanceTimer {
  start: () => void;
  end: () => number;
  mark: (label: string) => void;
  measure: (startMark: string, endMark: string) => number;
}

/**
 * 性能监控配置
 */
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  interval: number;
  maxMetrics: number;
  enableBrowserMetrics: boolean;
  enableSystemMetrics: boolean;
  enableCustomMetrics: boolean;
}

/**
 * 系统性能指标
 */
export interface SystemPerformanceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  eventLoop: {
    delay: number;
    utilization: number;
  };
  gc: {
    collections: number;
    duration: number;
    reclaimedMemory: number;
  };
}

/**
 * 数据库性能指标
 */
export interface DatabasePerformanceMetrics {
  connectionPool: {
    active: number;
    idle: number;
    total: number;
  };
  queries: {
    total: number;
    slow: number;
    failed: number;
    averageTime: number;
  };
  transactions: {
    active: number;
    committed: number;
    rolledBack: number;
  };
}

/**
 * 网络性能指标
 */
export interface NetworkPerformanceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number;
  };
  bandwidth: {
    incoming: number;
    outgoing: number;
  };
  connections: {
    active: number;
    established: number;
    closed: number;
  };
}

/**
 * 缓存性能指标
 */
export interface CachePerformanceMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
  averageAccessTime: number;
}

/**
 * 性能优化策略
 */
export interface OptimizationStrategy {
  name: string;
  description: string;
  applicableScenarios: string[];
  implementation: () => Promise<void>;
  rollback: () => Promise<void>;
  validate: () => Promise<boolean>;
}

/**
 * 性能阈值配置
 */
export interface PerformanceThresholds {
  responseTime: {
    warning: number;
    critical: number;
  };
  throughput: {
    minimum: number;
    target: number;
  };
  memoryUsage: {
    warning: number;
    critical: number;
  };
  cpuUsage: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  timestamp: number;
  period: {
    start: number;
    end: number;
  };
  summary: {
    overallScore: number;
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    keyMetrics: {
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
      availability: number;
    };
  };
  trends: {
    responseTime: 'improving' | 'degrading' | 'stable';
    throughput: 'improving' | 'degrading' | 'stable';
    errorRate: 'improving' | 'degrading' | 'stable';
  };
  bottlenecks: PerformanceBottleneck[];
  recommendations: PerformanceOptimization[];
  benchmarks: BenchmarkResult[];
}

/**
 * 性能事件类型
 */
export type PerformanceEventType = 
  | 'metricRecorded'
  | 'bottleneckDetected'
  | 'optimizationSuggested'
  | 'benchmarkCompleted'
  | 'thresholdExceeded'
  | 'monitoringStarted'
  | 'monitoringStopped';

/**
 * 性能事件数据
 */
export interface PerformanceEvent {
  type: PerformanceEventType;
  timestamp: number;
  data: any;
  source: string;
}

/**
 * 性能监控器接口
 */
export interface IPerformanceMonitor {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getMetrics(): PerformanceMetric[];
  recordMetric(metric: PerformanceMetric): void;
}

/**
 * 性能分析器接口
 */
export interface IPerformanceAnalyzer {
  analyze(): Promise<PerformanceAnalysisResult>;
  detectBottlenecks(): Promise<PerformanceBottleneck[]>;
  generateOptimizations(): Promise<PerformanceOptimization[]>;
}

/**
 * 基准测试器接口
 */
export interface IBenchmarkRunner {
  runBenchmark(name: string, testFunction: () => Promise<any> | any, options?: BenchmarkOptions): Promise<BenchmarkResult>;
  compareBenchmarks(name: string): BenchmarkComparison | null;
  getBenchmarkHistory(name: string): BenchmarkResult[];
}
