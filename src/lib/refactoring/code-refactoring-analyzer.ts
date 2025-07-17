/**
 * @fileoverview 代码重构分析器 - CoserEden平台（重构版）
 * @description 提供全面的代码分析和重构建议功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const analyzer = createCodeRefactoringAnalyzer('/path/to/project');
 *
 * // 执行完整分析
 * const result = await analyzer.analyzeProject();
 *
 * // 获取重构建议
 * const recommendations = await analyzer.getRecommendations();
 *
 * // 生成分析报告
 * const report = await analyzer.generateReport();
 * ```
 *
 * @dependencies
 * - ./core/refactoring-types: 类型定义
 * - ./core/syntax-analyzer: 语法分析
 * - ./core/structure-analyzer: 结构分析
 * - ./core/quality-analyzer: 质量分析
 * - ./core/suggestion-generator: 建议生成
 *
 * @changelog
 * - 3.0.0: 重构为模块化架构，拆分为专用分析器
 * - 2.0.0: 添加质量分析和建议生成功能
 * - 1.0.0: 初始版本
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { glob } from 'glob';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';

// 导入模块化组件
import { SyntaxAnalyzer } from './core/syntax-analyzer';
import { StructureAnalyzer } from './core/structure-analyzer';
import { QualityAnalyzer } from './core/quality-analyzer';
import { SuggestionGenerator } from './core/suggestion-generator';

// 导入类型定义
import type {
  AnalysisConfig,
  AnalysisResult,
  AnalysisSummary,
  RefactoringStats,
  RefactoringReport,
  RefactoringRecommendation,
  CodeDuplicationPattern,
  UnusedCodeItem,
  CodeComplexityAnalysis,
  RefactoringContext,
  IFileProcessor,
} from './core/refactoring-types';

// 重新导出类型以保持向后兼容
export type {
  AnalysisConfig,
  AnalysisResult,
  AnalysisSummary,
  RefactoringStats,
  RefactoringReport,
  RefactoringRecommendation,
  CodeDuplicationPattern,
  UnusedCodeItem,
  CodeComplexityAnalysis,
};

/**
 * 文件处理器实现
 */
class FileProcessor implements IFileProcessor {
  constructor(private config: AnalysisConfig) {}

  public async getProjectFiles(): Promise<string[]> {
    const patterns = this.config.includePatterns.length > 0
      ? this.config.includePatterns
      : ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];

    const allFiles: string[] = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: this.config.projectRoot,
        ignore: this.config.excludePatterns,
        absolute: true,
      });
      allFiles.push(...files);
    }

    // 去重并过滤有效文件
    const uniqueFiles = [...new Set(allFiles)];
    const validFiles = uniqueFiles.filter(file => this.validateFile(file));

    return validFiles;
  }

  public async readFileContent(file: string): Promise<string> {
    try {
      return await fs.readFile(file, 'utf-8');
    } catch (error) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.UPLOAD_FAILED,
        `无法读取文件: ${file}`,
        { context: { error: error instanceof Error ? error.message : '未知错误' } }
      );
    }
  }

  public validateFile(file: string): boolean {
    const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    const ext = extname(file);
    return validExtensions.includes(ext);
  }

  public async getFileStats(file: string): Promise<any> {
    try {
      const stats = await fs.stat(file);
      return {
        size: stats.size,
        mtime: stats.mtime,
        isFile: stats.isFile(),
      };
    } catch (error) {
      return null;
    }
  }
}

/**
 * 代码重构分析器主类
 * 整合所有分析功能的统一入口
 */
export class CodeRefactoringAnalyzer extends EventEmitter {
  private config: AnalysisConfig;
  private context: RefactoringContext;

  // 模块化组件
  private fileProcessor: FileProcessor;
  private syntaxAnalyzer: SyntaxAnalyzer;
  private structureAnalyzer: StructureAnalyzer;
  private qualityAnalyzer: QualityAnalyzer;
  private suggestionGenerator: SuggestionGenerator;

  // 分析结果缓存
  private lastAnalysis?: AnalysisResult;
  private analysisStats?: RefactoringStats;

  constructor(projectRoot: string, config?: Partial<AnalysisConfig>) {
    super();

    this.config = this.getDefaultConfig(projectRoot, config);

    // 初始化模块化组件
    this.fileProcessor = new FileProcessor(this.config);
    this.syntaxAnalyzer = new SyntaxAnalyzer();
    this.structureAnalyzer = new StructureAnalyzer();
    this.qualityAnalyzer = new QualityAnalyzer();
    this.suggestionGenerator = new SuggestionGenerator();

    // 创建分析上下文
    this.context = {
      config: this.config as any,
      fileProcessor: this.fileProcessor,
      syntaxAnalyzer: this.syntaxAnalyzer,
      structureAnalyzer: this.structureAnalyzer,
      qualityAnalyzer: this.qualityAnalyzer,
      suggestionGenerator: this.suggestionGenerator,
    };

    // 转发事件
    this.setupEventForwarding();
  }

  /**
   * 执行项目分析
   */
  public async analyzeProject(): Promise<AnalysisResult> {
    const startTime = Date.now();
    console.log('🔍 开始代码重构分析...');
    this.emit('analysisStarted');

    try {
      // 获取项目文件
      const files = await this.fileProcessor.getProjectFiles();
      console.log(`📁 发现 ${files.length} 个文件`);

      if (files.length === 0) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.RESOURCE_NOT_FOUND,
          '未找到符合条件的文件'
        );
      }

      // 并行执行各种分析
      const [duplications, unusedCode, complexity] = await Promise.all([
        this.structureAnalyzer.analyzeDuplications(files),
        this.structureAnalyzer.analyzeUnusedCode(files),
        this.qualityAnalyzer.analyzeComplexity(files),
      ]);

      // 生成重构建议
      const recommendations = this.suggestionGenerator.generateRecommendations(
        duplications,
        unusedCode,
        complexity
      );

      // 计算摘要
      const summary = this.calculateSummary(files, duplications, unusedCode, complexity);

      // 构建分析结果
      const result: AnalysisResult = {
        duplications,
        unusedCode,
        complexity,
        recommendations,
        summary,
      };

      // 计算统计信息
      const endTime = Date.now();
      this.analysisStats = {
        filesAnalyzed: files.length,
        functionsAnalyzed: complexity.filter(c => c.function).length,
        duplicationsFound: duplications.length,
        unusedItemsFound: unusedCode.length,
        complexFunctionsFound: complexity.filter(c =>
          c.cyclomaticComplexity > this.config.complexityThresholds.cyclomaticComplexity
        ).length,
        recommendationsGenerated: recommendations.length,
        analysisTime: endTime - startTime,
      };

      this.lastAnalysis = result;

      console.log('✅ 代码重构分析完成');
      console.log(`   - 重复模式: ${duplications.length}`);
      console.log(`   - 未使用项: ${unusedCode.length}`);
      console.log(`   - 复杂函数: ${this.analysisStats.complexFunctionsFound}`);
      console.log(`   - 重构建议: ${recommendations.length}`);

      this.emit('analysisCompleted', result);
      return result;

    } catch (error) {
      console.error('❌ 代码重构分析失败:', error);
      this.emit('analysisError', error);
      throw error;
    }
  }

  /**
   * 获取重构建议
   */
  public async getRecommendations(): Promise<RefactoringRecommendation[]> {
    if (!this.lastAnalysis) {
      await this.analyzeProject();
    }
    return this.lastAnalysis!.recommendations;
  }

  /**
   * 获取分析摘要
   */
  public getAnalysisSummary(): AnalysisSummary | null {
    return this.lastAnalysis?.summary || null;
  }

  /**
   * 获取分析统计
   */
  public getAnalysisStats(): RefactoringStats | null {
    return this.analysisStats || null;
  }

  /**
   * 生成分析报告
   */
  public async generateReport(): Promise<RefactoringReport> {
    if (!this.lastAnalysis || !this.analysisStats) {
      await this.analyzeProject();
    }

    const recommendations = this.categorizeRecommendations(this.lastAnalysis!.recommendations);

    return {
      timestamp: Date.now(),
      projectPath: this.config.projectRoot,
      analysis: this.lastAnalysis!,
      stats: this.analysisStats!,
      recommendations,
      codeQualityTrend: {
        current: this.lastAnalysis!.summary.codeQualityScore,
        improvement: 0, // 需要历史数据来计算
      },
    };
  }

  /**
   * 更新分析配置
   */
  public updateConfig(config: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...config };
    this.fileProcessor = new FileProcessor(this.config);

    // 更新上下文
    this.context.config = this.config as any;
    this.context.fileProcessor = this.fileProcessor;

    // 清除缓存的分析结果
    this.lastAnalysis = undefined;
    this.analysisStats = undefined;
  }

  /**
   * 获取项目统计
   */
  public async getProjectStats(): Promise<{
    totalFiles: number;
    totalLines: number;
    averageComplexity: number;
    duplicateRate: number;
    unusedRate: number;
  }> {
    if (!this.lastAnalysis) {
      await this.analyzeProject();
    }

    const { summary } = this.lastAnalysis!;
    const totalLines = summary.totalFiles > 0 ?
      this.lastAnalysis!.complexity.reduce((sum, c) => sum + c.linesOfCode, 0) : 0;

    const avgComplexity = this.lastAnalysis!.complexity.length > 0 ?
      this.lastAnalysis!.complexity.reduce((sum, c) => sum + c.cyclomaticComplexity, 0) /
      this.lastAnalysis!.complexity.length : 0;

    return {
      totalFiles: summary.totalFiles,
      totalLines,
      averageComplexity: avgComplexity,
      duplicateRate: totalLines > 0 ? (summary.duplicatedLines / totalLines) * 100 : 0,
      unusedRate: summary.totalFiles > 0 ? (summary.unusedItems / summary.totalFiles) * 100 : 0,
    };
  }

  // 私有方法

  private getDefaultConfig(projectRoot: string, config?: Partial<AnalysisConfig>): AnalysisConfig {
    const defaults: AnalysisConfig = {
      projectRoot,
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
      ],
      includePatterns: [
        '**/*.ts',
        '**/*.tsx',
        '**/*.js',
        '**/*.jsx',
      ],
      complexityThresholds: {
        cyclomaticComplexity: 10,
        cognitiveComplexity: 15,
        linesOfCode: 50,
        maintainabilityIndex: 60,
      },
      similarityThreshold: 0.7,
      enableAutoRemoval: false,
    };

    return { ...defaults, ...config };
  }

  private calculateSummary(
    files: string[],
    duplications: CodeDuplicationPattern[],
    unusedCode: UnusedCodeItem[],
    complexity: CodeComplexityAnalysis[]
  ): AnalysisSummary {
    const duplicatedLines = duplications.reduce((sum, dup) =>
      sum + dup.locations.reduce((locSum, loc) =>
        locSum + (loc.endLine - loc.startLine + 1), 0
      ), 0
    );

    const complexFunctions = complexity.filter(c =>
      c.cyclomaticComplexity > this.config.complexityThresholds.cyclomaticComplexity
    ).length;

    const codeQualityScore = this.qualityAnalyzer.assessCodeQuality({
      duplications,
      unusedCode,
      complexity,
      recommendations: [],
      summary: {} as AnalysisSummary,
    });

    return {
      totalFiles: files.length,
      duplicatedLines,
      unusedItems: unusedCode.length,
      complexFunctions,
      refactoringOpportunities: duplications.length + unusedCode.length + complexFunctions,
      codeQualityScore,
      estimatedSavings: {
        linesOfCode: duplicatedLines + unusedCode.length * 2, // 估算
        maintainabilityImprovement: Math.min(30, complexFunctions * 5),
        performanceGain: Math.min(20, duplications.length * 3),
      },
    };
  }

  private categorizeRecommendations(recommendations: RefactoringRecommendation[]): {
    immediate: RefactoringRecommendation[];
    shortTerm: RefactoringRecommendation[];
    longTerm: RefactoringRecommendation[];
  } {
    return {
      immediate: recommendations.filter(r => r.priority === 'critical'),
      shortTerm: recommendations.filter(r => r.priority === 'high'),
      longTerm: recommendations.filter(r => r.priority === 'medium' || r.priority === 'low'),
    };
  }

  private setupEventForwarding(): void {
    // 转发各分析器的事件
    [this.syntaxAnalyzer, this.structureAnalyzer, this.qualityAnalyzer, this.suggestionGenerator]
      .forEach(analyzer => {
        if (analyzer && typeof analyzer.on === 'function') {
          analyzer.on('progress', (data) => this.emit('progress', data));
          analyzer.on('error', (error) => this.emit('error', error));
        }
      });
  }
}

/**
 * 创建代码重构分析器实例
 */
export function createCodeRefactoringAnalyzer(
  projectRoot: string,
  config?: Partial<AnalysisConfig>
): CodeRefactoringAnalyzer {
  return new CodeRefactoringAnalyzer(projectRoot, config);
}
