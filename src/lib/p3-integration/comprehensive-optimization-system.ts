/**
 * @fileoverview 综合优化系统 - CoserEden平台（重构版）
 * @description 整合代码重构、测试覆盖和性能调优的完整解决方案
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const optimizer = ComprehensiveOptimizationSystem.getInstance('/path/to/project');
 *
 * // 执行综合分析
 * const analysis = await optimizer.performComprehensiveAnalysis();
 *
 * // 执行自动优化
 * const result = await optimizer.performAutomaticOptimizations({
 *   includeRefactoring: true,
 *   includeTesting: true,
 *   safetyLevel: 'moderate'
 * });
 *
 * // 生成优化报告
 * const report = await optimizer.generateOptimizationReport();
 * ```
 *
 * @dependencies
 * - ./core/optimization-types: 类型定义
 * - ./core/optimization-analyzer: 优化分析
 * - ./core/optimization-executor: 优化执行
 * - ./core/optimization-reporter: 报告生成
 * - ./core/optimization-config: 配置管理
 *
 * @changelog
 * - 3.0.0: 重构为模块化架构，拆分为专用处理器
 * - 2.0.0: 添加自动优化和报告功能
 * - 1.0.0: 初始版本
 */

import { EventEmitter } from 'events';
import { createCodeRefactoringAnalyzer } from '../refactoring/code-refactoring-analyzer';
// import { createComprehensiveTestGenerator } from '../testing/comprehensive-test-generator'; // 已删除测试模块
import { advancedPerformanceOptimizer } from '../performance/advanced-performance-optimizer';
// import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler'; // 暂时注释掉，避免导入错误

// 临时错误处理类型定义
enum BusinessErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  ANALYSIS_ERROR = 'ANALYSIS_ERROR',
}

class TRPCErrorHandler {
  static businessError(type: BusinessErrorType, message: string, context?: any) {
    return new Error(`${type}: ${message}`);
  }
}

// 导入模块化组件
import { OptimizationAnalyzer } from './core/optimization-analyzer';
import { OptimizationExecutor } from './core/optimization-executor';
import { OptimizationReporter } from './core/optimization-reporter';
import { OptimizationConfigManager } from './core/optimization-config';

// 导入类型定义
import type {
  ComprehensiveOptimizationStatus,
  OptimizationRecommendation,
  OptimizationPlan,
  OptimizationReport,
  AutoOptimizationOptions,
  AutoOptimizationResult,
  AnalysisResult,
  KeyFinding,
  ActionItem,
  OptimizationMetrics,
  OptimizationTimeline,
} from './core/optimization-types';

// 重新导出类型以保持向后兼容
export type {
  ComprehensiveOptimizationStatus,
  OptimizationRecommendation,
  OptimizationPlan,
  OptimizationReport,
  AutoOptimizationOptions,
  AutoOptimizationResult,
  AnalysisResult,
  KeyFinding,
  ActionItem,
  OptimizationMetrics,
  OptimizationTimeline,
};

/**
 * 综合优化系统主类
 * 整合所有优化功能的统一入口
 */
export class ComprehensiveOptimizationSystem extends EventEmitter {
  private static instance: ComprehensiveOptimizationSystem;
  private initialized = false;

  // 基础组件
  private projectRoot: string;
  private codeAnalyzer: any;
  private testGenerator: any;
  private performanceOptimizer: any;

  // 模块化组件
  private optimizationAnalyzer: OptimizationAnalyzer;
  private optimizationExecutor: OptimizationExecutor;
  private optimizationReporter: OptimizationReporter;
  private configManager: OptimizationConfigManager;

  // 状态数据
  private lastAnalysis?: AnalysisResult;
  private recommendations: OptimizationRecommendation[] = [];
  private optimizationPlans: OptimizationPlan[] = [];

  private constructor(projectRoot: string) {
    super();
    this.projectRoot = projectRoot;

    // 初始化基础组件
    this.codeAnalyzer = createCodeRefactoringAnalyzer(projectRoot);
    // this.testGenerator = createComprehensiveTestGenerator(projectRoot); // 已删除测试模块
    this.performanceOptimizer = advancedPerformanceOptimizer;

    // 初始化模块化组件
    this.optimizationAnalyzer = new OptimizationAnalyzer(
      this.codeAnalyzer,
      this.testGenerator,
      this.performanceOptimizer
    );
    this.optimizationExecutor = new OptimizationExecutor(
      this.codeAnalyzer,
      this.testGenerator,
      this.performanceOptimizer
    );
    this.optimizationReporter = new OptimizationReporter();
    this.configManager = OptimizationConfigManager.getInstance();

    // 转发事件
    this.setupEventForwarding();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(projectRoot?: string): ComprehensiveOptimizationSystem {
    if (!ComprehensiveOptimizationSystem.instance) {
      if (!projectRoot) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_ERROR,
          '首次创建实例时必须提供 projectRoot'
        );
      }
      ComprehensiveOptimizationSystem.instance = new ComprehensiveOptimizationSystem(projectRoot);
    }
    return ComprehensiveOptimizationSystem.instance;
  }

  /**
   * 初始化优化系统
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 初始化综合优化系统...');

      // 初始化性能优化器
      await this.performanceOptimizer.initialize();

      this.initialized = true;
      console.log('✅ 综合优化系统初始化完成');

    } catch (error) {
      console.error('优化系统初始化失败:', error);
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.INITIALIZATION_ERROR,
        '优化系统初始化失败',
        { context: { error: error instanceof Error ? error.message : '未知错误' } }
      );
    }
  }

  /**
   * 执行综合分析
   */
  public async performComprehensiveAnalysis(): Promise<{
    status: ComprehensiveOptimizationStatus;
    recommendations: OptimizationRecommendation[];
    plan: OptimizationPlan;
    summary: {
      criticalIssues: string[];
      quickWins: string[];
      longTermGoals: string[];
    };
  }> {
    console.log('🔍 开始综合优化分析...');

    try {
      // 执行项目分析
      const analysis = await this.optimizationAnalyzer.analyzeProject();
      this.lastAnalysis = analysis;

      // 生成状态报告
      const status = this.optimizationAnalyzer.calculateStatus(analysis);

      // 生成综合建议
      const recommendations = await this.optimizationAnalyzer.generateRecommendations(analysis);
      this.recommendations = recommendations;

      // 生成优化计划
      const plan = this.generateOptimizationPlan(recommendations);

      // 生成摘要
      const summary = this.generateSummary(recommendations);

      console.log('✅ 综合优化分析完成');
      return { status, recommendations, plan, summary };

    } catch (error) {
      console.error('❌ 综合优化分析失败:', error);
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.ANALYSIS_ERROR,
        '综合优化分析失败',
        { context: { error: error instanceof Error ? error.message : '未知错误' } }
      );
    }
  }

  /**
   * 执行自动优化
   */
  public async performAutomaticOptimizations(options: AutoOptimizationOptions = {}): Promise<AutoOptimizationResult> {
    const defaultOptions: AutoOptimizationOptions = {
      includeRefactoring: true,
      includeTesting: true,
      includePerformance: false, // 性能优化默认不自动执行
      safetyLevel: 'moderate',
    };

    const finalOptions = { ...defaultOptions, ...options };
    return this.optimizationExecutor.executeOptimizations(finalOptions);
  }

  /**
   * 生成优化报告
   */
  public async generateOptimizationReport(): Promise<OptimizationReport> {
    if (!this.lastAnalysis) {
      await this.performComprehensiveAnalysis();
    }

    return this.optimizationReporter.generateReport(this.lastAnalysis!);
  }

  /**
   * 获取优化状态
   */
  public getOptimizationStatus(): ComprehensiveOptimizationStatus | null {
    if (!this.lastAnalysis) {
      return null;
    }
    return this.optimizationAnalyzer.calculateStatus(this.lastAnalysis);
  }

  /**
   * 获取优化建议
   */
  public getOptimizationRecommendations(category?: 'refactoring' | 'testing' | 'performance'): OptimizationRecommendation[] {
    if (category) {
      return this.recommendations.filter(r => r.category === category);
    }
    return this.recommendations;
  }

  /**
   * 获取优化计划
   */
  public getOptimizationPlans(): OptimizationPlan[] {
    return this.optimizationPlans;
  }

  /**
   * 获取配置管理器
   */
  public getConfigManager(): OptimizationConfigManager {
    return this.configManager;
  }

  /**
   * 获取系统统计
   */
  public getSystemStats(): {
    projectRoot: string;
    lastAnalysisTime: number | null;
    recommendationsCount: number;
    plansCount: number;
    configSummary: ReturnType<OptimizationConfigManager['getConfigSummary']>;
  } {
    return {
      projectRoot: this.projectRoot,
      lastAnalysisTime: this.lastAnalysis?.timestamp || null,
      recommendationsCount: this.recommendations.length,
      plansCount: this.optimizationPlans.length,
      configSummary: this.configManager.getConfigSummary(),
    };
  }

  // 私有方法

  private generateOptimizationPlan(recommendations: OptimizationRecommendation[]): OptimizationPlan {
    const criticalRecs = recommendations.filter(r => r.priority === 'critical');
    const highRecs = recommendations.filter(r => r.priority === 'high');
    const mediumRecs = recommendations.filter(r => r.priority === 'medium');
    const lowRecs = recommendations.filter(r => r.priority === 'low');

    const plan: OptimizationPlan = {
      id: `plan_${Date.now()}`,
      name: 'CoserEden 综合优化计划',
      description: '基于代码重构、测试覆盖和性能分析的综合优化计划',
      phases: [
        {
          id: 'phase1',
          name: '紧急修复阶段',
          recommendations: criticalRecs.map(r => r.id),
          estimatedDuration: '1-2周',
          prerequisites: [],
        },
        {
          id: 'phase2',
          name: '核心优化阶段',
          recommendations: highRecs.map(r => r.id),
          estimatedDuration: '2-4周',
          prerequisites: ['phase1'],
        },
        {
          id: 'phase3',
          name: '质量提升阶段',
          recommendations: mediumRecs.map(r => r.id),
          estimatedDuration: '4-6周',
          prerequisites: ['phase2'],
        },
        {
          id: 'phase4',
          name: '持续改进阶段',
          recommendations: lowRecs.map(r => r.id),
          estimatedDuration: '持续进行',
          prerequisites: ['phase3'],
        },
      ],
      totalEstimatedTime: '3-4个月',
      expectedBenefits: {
        codeQualityImprovement: 40,
        testCoverageIncrease: 30,
        performanceGain: 25,
        maintainabilityIncrease: 50,
      },
      risks: [
        '重构可能引入新的bug',
        '性能优化可能影响功能',
        '需要大量测试验证',
      ],
      successCriteria: [
        '代码质量分数提升到85+',
        '测试覆盖率达到80%+',
        '性能分数提升到90+',
        '关键问题全部解决',
      ],
    };

    this.optimizationPlans = [plan];
    return plan;
  }

  private generateSummary(recommendations: OptimizationRecommendation[]): {
    criticalIssues: string[];
    quickWins: string[];
    longTermGoals: string[];
  } {
    const criticalIssues = recommendations
      .filter(r => r.priority === 'critical')
      .map(r => r.title);

    const quickWins = recommendations
      .filter(r => r.effort.complexity === 'low' && r.priority === 'high')
      .map(r => r.title);

    const longTermGoals = recommendations
      .filter(r => r.effort.complexity === 'high' || r.priority === 'low')
      .map(r => r.title);

    return {
      criticalIssues,
      quickWins,
      longTermGoals,
    };
  }

  private setupEventForwarding(): void {
    // 转发各组件的事件
    this.optimizationAnalyzer.on('analysisStarted', () => this.emit('analysisStarted'));
    this.optimizationAnalyzer.on('analysisCompleted', (result) => this.emit('analysisCompleted', result));
    this.optimizationAnalyzer.on('recommendationGenerated', (recs) => this.emit('recommendationGenerated', recs));

    this.optimizationExecutor.on('optimizationStarted', (options) => this.emit('optimizationStarted', options));
    this.optimizationExecutor.on('optimizationCompleted', (result) => this.emit('optimizationCompleted', result));

    this.optimizationReporter.on('reportGenerated', (report) => this.emit('reportGenerated', report));

    this.configManager.on('configUpdated', (config) => this.emit('configUpdated', config));
    this.configManager.on('safetyLevelUpdated', (level) => this.emit('safetyLevelUpdated', level));
  }
}

/**
 * 导出默认实例创建函数
 */
export function createComprehensiveOptimizationSystem(projectRoot: string): ComprehensiveOptimizationSystem {
  return ComprehensiveOptimizationSystem.getInstance(projectRoot);
}
