/**
 * @fileoverview 优化系统相关类型定义
 * @description 定义优化系统Hook使用的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 优化状态
 */
export interface OptimizationState {
  // 分析状态
  isAnalyzing: boolean;
  isOptimizing: boolean;
  isGeneratingReport: boolean;

  // 分析结果
  analysisResult?: {
    status: any;
    recommendations: any[];
    plan: any;
    summary: any;
  };

  // 优化结果
  optimizationResult?: {
    executed: any[];
    summary: any;
  };

  // 报告结果
  reportResult?: {
    executiveSummary: string;
    currentState: any;
    keyFindings: any[];
    actionItems: any[];
    metrics: any;
    timeline: any;
  };

  // 错误状态
  error?: string;

  // 进度信息
  progress: {
    stage: string;
    percentage: number;
    message: string;
  };
}

/**
 * 优化系统Hook配置
 */
export interface UseOptimizationSystemConfig {
  // 自动分析配置
  enableAutoAnalysis?: boolean;
  analysisInterval?: number; // 自动分析间隔（毫秒）

  // 优化配置
  enableAutoOptimization?: boolean;
  optimizationSafetyLevel?: 'conservative' | 'moderate' | 'aggressive';

  // 报告配置
  enableAutoReporting?: boolean;
  reportFormat?: 'json' | 'html' | 'pdf';

  // 调试配置
  enableDebugMode?: boolean;
}

/**
 * 优化选项
 */
export interface OptimizationOptions {
  includeRefactoring?: boolean;
  includeTesting?: boolean;
  includePerformance?: boolean;
  safetyLevel?: 'conservative' | 'moderate' | 'aggressive';
}

/**
 * 基准测试选项
 */
export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
}

/**
 * 优化系统Hook返回值
 */
export interface UseOptimizationSystemReturn {
  // 状态
  state: OptimizationState;

  // 分析方法
  performAnalysis: () => Promise<any>;
  analyzeCodeRefactoring: () => Promise<any>;
  analyzeTestCoverage: () => Promise<any>;
  performQuickAnalysis?: () => Promise<any>;
  analyzeModule?: (modulePath: string) => Promise<any>;

  // 优化方法
  performOptimization: (options?: OptimizationOptions) => Promise<any>;
  performDryRunOptimization?: (options?: OptimizationOptions) => Promise<any>;
  performSpecificOptimization?: (type: string) => Promise<any>;

  // 基准测试方法
  runBenchmark: (testName: string, options?: BenchmarkOptions) => Promise<any>;
  runBenchmarkSuite?: (testSuite: string[]) => Promise<any>;

  // 报告方法
  generateReport: () => Promise<any>;
  generateSummaryReport?: () => Promise<any>;
  generatePerformanceReport?: () => Promise<any>;
  generateSecurityReport?: () => Promise<any>;
  exportReport?: (format?: 'json' | 'html' | 'pdf') => Promise<any>;
  generateComparisonReport?: (beforeData: any, afterData: any) => Promise<any>;

  // 控制方法
  cancelOperation: () => void;
  clearResults: () => void;

  // 获取方法
  getOptimizationStatus: () => any;
  getRecommendations: (category?: string) => any[];
  getMetrics: () => any;
}

/**
 * 分析结果类型
 */
export interface AnalysisResult {
  status: {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    categories: {
      performance: number;
      maintainability: number;
      reliability: number;
      security: number;
    };
  };
  recommendations: Recommendation[];
  plan: OptimizationPlan;
  summary: AnalysisSummary;
}

/**
 * 建议类型
 */
export interface Recommendation {
  id: string;
  category: 'performance' | 'maintainability' | 'reliability' | 'security';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  automated: boolean;
}

/**
 * 优化计划类型
 */
export interface OptimizationPlan {
  phases: OptimizationPhase[];
  estimatedDuration: string;
  expectedImpact: string;
}

/**
 * 优化阶段类型
 */
export interface OptimizationPhase {
  id: string;
  name: string;
  description: string;
  tasks: OptimizationTask[];
  estimatedTime: string;
}

/**
 * 优化任务类型
 */
export interface OptimizationTask {
  id: string;
  name: string;
  description: string;
  automated: boolean;
  priority: 'high' | 'medium' | 'low';
}

/**
 * 分析摘要类型
 */
export interface AnalysisSummary {
  totalIssues: number;
  criticalIssues: number;
  automatedFixes: number;
  manualReviews: number;
  estimatedImpact: string;
}

/**
 * 优化结果类型
 */
export interface OptimizationResult {
  executed: ExecutedOptimization[];
  summary: OptimizationSummary;
}

/**
 * 已执行优化类型
 */
export interface ExecutedOptimization {
  id: string;
  name: string;
  category: string;
  status: 'success' | 'failed' | 'skipped';
  impact: string;
  details: string;
}

/**
 * 优化摘要类型
 */
export interface OptimizationSummary {
  totalOptimizations: number;
  successfulOptimizations: number;
  failedOptimizations: number;
  skippedOptimizations: number;
  overallImpact: string;
}

/**
 * 报告结果类型
 */
export interface ReportResult {
  executiveSummary: string;
  currentState: SystemState;
  keyFindings: Finding[];
  actionItems: ActionItem[];
  metrics: SystemMetrics;
  timeline: TimelineEvent[];
}

/**
 * 系统状态类型
 */
export interface SystemState {
  performance: PerformanceMetrics;
  maintainability: MaintainabilityMetrics;
  reliability: ReliabilityMetrics;
  security: SecurityMetrics;
}

/**
 * 性能指标类型
 */
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
}

/**
 * 可维护性指标类型
 */
export interface MaintainabilityMetrics {
  codeComplexity: number;
  testCoverage: number;
  documentation: number;
  codeQuality: number;
}

/**
 * 可靠性指标类型
 */
export interface ReliabilityMetrics {
  errorRate: number;
  uptime: number;
  testPassRate: number;
  bugDensity: number;
}

/**
 * 安全指标类型
 */
export interface SecurityMetrics {
  vulnerabilities: number;
  securityScore: number;
  complianceLevel: number;
}

/**
 * 发现类型
 */
export interface Finding {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
}

/**
 * 行动项类型
 */
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: string;
  status: 'pending' | 'in-progress' | 'completed';
}

/**
 * 系统指标类型
 */
export interface SystemMetrics {
  performance: PerformanceMetrics;
  maintainability: MaintainabilityMetrics;
  reliability: ReliabilityMetrics;
  security: SecurityMetrics;
}

/**
 * 时间线事件类型
 */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  event: string;
  description: string;
  impact: string;
}
