/**
 * @fileoverview 优化系统类型定义 - CoserEden平台
 * @description 综合优化系统的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

/**
 * 优化建议
 */
export interface OptimizationRecommendation {
  id: string;
  category: 'refactoring' | 'testing' | 'performance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    codeQuality: number;
    performance: number;
    maintainability: number;
    testability: number;
  };
  effort: {
    timeEstimate: string;
    complexity: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
  };
  implementation: {
    steps: string[];
    dependencies: string[];
    rollbackPlan: string;
  };
  metrics: {
    before: Record<string, number>;
    expectedAfter: Record<string, number>;
  };
}

/**
 * 优化计划阶段
 */
export interface OptimizationPhase {
  id: string;
  name: string;
  recommendations: string[];
  estimatedDuration: string;
  prerequisites: string[];
}

/**
 * 优化计划
 */
export interface OptimizationPlan {
  id: string;
  name: string;
  description: string;
  phases: OptimizationPhase[];
  totalEstimatedTime: string;
  expectedBenefits: {
    codeQualityImprovement: number;
    testCoverageIncrease: number;
    performanceGain: number;
    maintainabilityIncrease: number;
  };
  risks: string[];
  successCriteria: string[];
}

/**
 * 重构状态
 */
export interface RefactoringStatus {
  analyzed: boolean;
  duplications: number;
  unusedItems: number;
  complexFunctions: number;
  refactoringOpportunities: number;
  codeQualityScore: number;
}

/**
 * 测试状态
 */
export interface TestingStatus {
  analyzed: boolean;
  overallCoverage: number;
  missingTests: number;
  generatedTests: number;
  testQualityScore: number;
}

/**
 * 性能状态
 */
export interface PerformanceStatus {
  monitored: boolean;
  bottlenecks: number;
  optimizations: number;
  performanceScore: number;
  benchmarksRun: number;
}

/**
 * 整体状态
 */
export interface OverallStatus {
  optimizationScore: number;
  readyForProduction: boolean;
  criticalIssues: number;
  improvementOpportunities: number;
}

/**
 * 综合优化状态
 */
export interface ComprehensiveOptimizationStatus {
  timestamp: number;
  refactoring: RefactoringStatus;
  testing: TestingStatus;
  performance: PerformanceStatus;
  overall: OverallStatus;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  refactoring: any;
  testing: any;
  performance: any;
  timestamp: number;
}

/**
 * 优化执行结果
 */
export interface OptimizationExecutionResult {
  type: 'refactoring' | 'testing' | 'performance';
  action: string;
  result: 'success' | 'failed' | 'skipped';
  details: string;
}

/**
 * 优化执行摘要
 */
export interface OptimizationExecutionSummary {
  totalExecuted: number;
  successful: number;
  failed: number;
  skipped: number;
}

/**
 * 关键发现
 */
export interface KeyFinding {
  category: string;
  finding: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

/**
 * 行动项目
 */
export interface ActionItem {
  priority: 'immediate' | 'short_term' | 'long_term';
  items: string[];
}

/**
 * 指标数据
 */
export interface MetricData {
  current: number;
  target: number;
  improvement: number;
}

/**
 * 优化指标
 */
export interface OptimizationMetrics {
  codeQuality: MetricData;
  testCoverage: MetricData;
  performance: MetricData;
}

/**
 * 时间线
 */
export interface OptimizationTimeline {
  immediate: string[];
  nextWeek: string[];
  nextMonth: string[];
  nextQuarter: string[];
}

/**
 * 优化报告
 */
export interface OptimizationReport {
  executiveSummary: string;
  currentState: ComprehensiveOptimizationStatus;
  keyFindings: KeyFinding[];
  actionItems: ActionItem[];
  metrics: OptimizationMetrics;
  timeline: OptimizationTimeline;
}

/**
 * 自动优化选项
 */
export interface AutoOptimizationOptions {
  includeRefactoring?: boolean;
  includeTesting?: boolean;
  includePerformance?: boolean;
  safetyLevel?: 'conservative' | 'moderate' | 'aggressive';
}

/**
 * 自动优化结果
 */
export interface AutoOptimizationResult {
  executed: OptimizationExecutionResult[];
  summary: OptimizationExecutionSummary;
}

/**
 * 分析配置
 */
export interface AnalysisConfig {
  enableRefactoring: boolean;
  enableTesting: boolean;
  enablePerformance: boolean;
  projectRoot: string;
  excludePatterns: string[];
  includePatterns: string[];
}

/**
 * 优化配置
 */
export interface OptimizationConfig {
  autoOptimization: {
    enabled: boolean;
    safetyLevel: 'conservative' | 'moderate' | 'aggressive';
    schedule: string;
  };
  thresholds: {
    codeQuality: number;
    testCoverage: number;
    performance: number;
  };
  notifications: {
    enabled: boolean;
    channels: string[];
  };
}

/**
 * 优化事件类型
 */
export type OptimizationEventType = 
  | 'analysisStarted'
  | 'analysisCompleted'
  | 'optimizationStarted'
  | 'optimizationCompleted'
  | 'recommendationGenerated'
  | 'planCreated'
  | 'reportGenerated';

/**
 * 优化事件数据
 */
export interface OptimizationEvent {
  type: OptimizationEventType;
  timestamp: number;
  data: any;
  source: string;
}

/**
 * 优化分析器接口
 */
export interface IOptimizationAnalyzer {
  analyzeProject(): Promise<AnalysisResult>;
  generateRecommendations(analysis: AnalysisResult): Promise<OptimizationRecommendation[]>;
  calculateStatus(analysis: AnalysisResult): ComprehensiveOptimizationStatus;
}

/**
 * 优化执行器接口
 */
export interface IOptimizationExecutor {
  executeOptimizations(options: AutoOptimizationOptions): Promise<AutoOptimizationResult>;
  executeRefactoring(safetyLevel: string): Promise<OptimizationExecutionResult[]>;
  executeTesting(safetyLevel: string): Promise<OptimizationExecutionResult[]>;
  executePerformance(safetyLevel: string): Promise<OptimizationExecutionResult[]>;
}

/**
 * 优化报告器接口
 */
export interface IOptimizationReporter {
  generateReport(analysis: AnalysisResult): Promise<OptimizationReport>;
  generateExecutiveSummary(status: ComprehensiveOptimizationStatus, findings: KeyFinding[], metrics: OptimizationMetrics): string;
  generateKeyFindings(analysis: AnalysisResult): KeyFinding[];
  generateActionItems(recommendations: OptimizationRecommendation[]): ActionItem[];
  generateMetrics(analysis: AnalysisResult): OptimizationMetrics;
  generateTimeline(recommendations: OptimizationRecommendation[]): OptimizationTimeline;
}

/**
 * 优化配置管理器接口
 */
export interface IOptimizationConfigManager {
  getConfig(): OptimizationConfig;
  updateConfig(config: Partial<OptimizationConfig>): void;
  getAnalysisConfig(): AnalysisConfig;
  updateAnalysisConfig(config: Partial<AnalysisConfig>): void;
  validateConfig(config: OptimizationConfig): boolean;
}
