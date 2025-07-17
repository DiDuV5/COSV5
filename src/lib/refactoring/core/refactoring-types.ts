/**
 * @fileoverview 重构分析类型定义 - CoserEden平台
 * @description 代码重构分析系统的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

/**
 * 代码重复模式
 */
export interface CodeDuplicationPattern {
  id: string;
  type: 'function' | 'class' | 'interface' | 'constant' | 'import';
  pattern: string;
  locations: Array<{
    file: string;
    startLine: number;
    endLine: number;
    content: string;
  }>;
  similarity: number; // 相似度 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

/**
 * 未使用代码项
 */
export interface UnusedCodeItem {
  id: string;
  type: 'import' | 'function' | 'variable' | 'class' | 'interface' | 'type';
  name: string;
  file: string;
  line: number;
  reason: string;
  canAutoRemove: boolean;
  dependencies: string[];
}

/**
 * 代码复杂度分析
 */
export interface CodeComplexityAnalysis {
  file: string;
  function?: string;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  suggestions: string[];
}

/**
 * 重构建议
 */
export interface RefactoringRecommendation {
  id: string;
  type: 'extract_function' | 'merge_similar' | 'remove_unused' | 'simplify_logic' | 'optimize_imports';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  files: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
  benefits: string[];
  risks: string[];
  autoApplicable: boolean;
}

/**
 * 函数信息
 */
export interface FunctionInfo {
  name: string;
  content: string;
  line: number;
  file: string;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
}

/**
 * 导入信息
 */
export interface ImportInfo {
  name: string;
  source: string;
  type: 'default' | 'named' | 'namespace' | 'side-effect';
  line: number;
  isUsed: boolean;
}

/**
 * 导出信息
 */
export interface ExportInfo {
  name: string;
  type: 'default' | 'named' | 'namespace';
  line: number;
  isUsed: boolean;
}

/**
 * 代码使用信息
 */
export interface UsageInfo {
  name: string;
  type: 'function' | 'variable' | 'class' | 'interface' | 'type';
  line: number;
  context: string;
}

/**
 * 分析配置
 */
export interface AnalysisConfig {
  projectRoot: string;
  excludePatterns: string[];
  includePatterns: string[];
  complexityThresholds: {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
  };
  similarityThreshold: number;
  enableAutoRemoval: boolean;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  duplications: CodeDuplicationPattern[];
  unusedCode: UnusedCodeItem[];
  complexity: CodeComplexityAnalysis[];
  recommendations: RefactoringRecommendation[];
  summary: AnalysisSummary;
}

/**
 * 分析摘要
 */
export interface AnalysisSummary {
  totalFiles: number;
  duplicatedLines: number;
  unusedItems: number;
  complexFunctions: number;
  refactoringOpportunities: number;
  codeQualityScore: number;
  estimatedSavings: {
    linesOfCode: number;
    maintainabilityImprovement: number;
    performanceGain: number;
  };
}

/**
 * 重构统计
 */
export interface RefactoringStats {
  filesAnalyzed: number;
  functionsAnalyzed: number;
  duplicationsFound: number;
  unusedItemsFound: number;
  complexFunctionsFound: number;
  recommendationsGenerated: number;
  analysisTime: number;
}

/**
 * 语法分析器接口
 */
export interface ISyntaxAnalyzer {
  extractFunctions(content: string, file: string): FunctionInfo[];
  extractImports(content: string): ImportInfo[];
  extractExports(content: string): ExportInfo[];
  extractUsages(content: string): UsageInfo[];
  validateSyntax(content: string): boolean;
}

/**
 * 结构分析器接口
 */
export interface IStructureAnalyzer {
  analyzeDuplications(files: string[]): Promise<CodeDuplicationPattern[]>;
  analyzeUnusedCode(files: string[]): Promise<UnusedCodeItem[]>;
  analyzeFileStructure(file: string): Promise<any>;
  calculateSimilarity(content1: string, content2: string): number;
}

/**
 * 质量分析器接口
 */
export interface IQualityAnalyzer {
  analyzeComplexity(files: string[]): Promise<CodeComplexityAnalysis[]>;
  calculateCyclomaticComplexity(content: string): number;
  calculateCognitiveComplexity(content: string): number;
  calculateMaintainabilityIndex(complexity: number, linesOfCode: number, content: string): number;
  assessCodeQuality(analysis: AnalysisResult): number;
}

/**
 * 建议生成器接口
 */
export interface ISuggestionGenerator {
  generateRecommendations(
    duplications: CodeDuplicationPattern[],
    unusedCode: UnusedCodeItem[],
    complexity: CodeComplexityAnalysis[]
  ): RefactoringRecommendation[];
  generateDuplicationRecommendations(duplications: CodeDuplicationPattern[]): RefactoringRecommendation[];
  generateUnusedCodeRecommendations(unusedCode: UnusedCodeItem[]): RefactoringRecommendation[];
  generateComplexityRecommendations(complexity: CodeComplexityAnalysis[]): RefactoringRecommendation[];
  prioritizeRecommendations(recommendations: RefactoringRecommendation[]): RefactoringRecommendation[];
}

/**
 * 文件处理器接口
 */
export interface IFileProcessor {
  getProjectFiles(): Promise<string[]>;
  readFileContent(file: string): Promise<string>;
  validateFile(file: string): boolean;
  getFileStats(file: string): Promise<any>;
}

/**
 * 重构执行器接口
 */
export interface IRefactoringExecutor {
  executeRecommendation(recommendation: RefactoringRecommendation): Promise<boolean>;
  removeUnusedImports(file: string, unusedImports: string[]): Promise<boolean>;
  extractFunction(file: string, startLine: number, endLine: number, functionName: string): Promise<boolean>;
  mergeSimularFunctions(files: string[], pattern: CodeDuplicationPattern): Promise<boolean>;
  validateChanges(file: string, originalContent: string): Promise<boolean>;
}

/**
 * 重构事件类型
 */
export type RefactoringEventType = 
  | 'analysisStarted'
  | 'analysisCompleted'
  | 'duplicationFound'
  | 'unusedCodeFound'
  | 'complexityAnalyzed'
  | 'recommendationGenerated'
  | 'refactoringExecuted'
  | 'errorOccurred';

/**
 * 重构事件数据
 */
export interface RefactoringEvent {
  type: RefactoringEventType;
  timestamp: number;
  data: any;
  source: string;
}

/**
 * 重构报告
 */
export interface RefactoringReport {
  timestamp: number;
  projectPath: string;
  analysis: AnalysisResult;
  stats: RefactoringStats;
  recommendations: {
    immediate: RefactoringRecommendation[];
    shortTerm: RefactoringRecommendation[];
    longTerm: RefactoringRecommendation[];
  };
  codeQualityTrend: {
    current: number;
    previous?: number;
    improvement: number;
  };
}

/**
 * 重构配置
 */
export interface RefactoringConfig extends AnalysisConfig {
  autoExecute: boolean;
  backupEnabled: boolean;
  testRequired: boolean;
  reviewRequired: boolean;
  notifications: {
    enabled: boolean;
    channels: string[];
  };
}

/**
 * 重构上下文
 */
export interface RefactoringContext {
  config: RefactoringConfig;
  fileProcessor: IFileProcessor;
  syntaxAnalyzer: ISyntaxAnalyzer;
  structureAnalyzer: IStructureAnalyzer;
  qualityAnalyzer: IQualityAnalyzer;
  suggestionGenerator: ISuggestionGenerator;
  executor?: IRefactoringExecutor;
}
