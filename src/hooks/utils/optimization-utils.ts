/**
 * @fileoverview 优化系统工具函数
 * @description 提供优化系统相关的工具函数
 * @author Augment AI
 * @date 2025-07-03
 */

import type { OptimizationState, AnalysisResult, OptimizationResult } from '../types/optimization-types';

/**
 * 生成唯一操作ID
 */
export function generateOperationId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建初始优化状态
 */
export function createInitialOptimizationState(): OptimizationState {
  return {
    isAnalyzing: false,
    isOptimizing: false,
    isGeneratingReport: false,
    progress: {
      stage: 'idle',
      percentage: 0,
      message: '准备就绪'
    }
  };
}

/**
 * 更新进度状态
 */
export function updateProgress(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  stage: string,
  percentage: number,
  message: string
): void {
  setState(prev => ({
    ...prev,
    progress: {
      stage,
      percentage,
      message
    }
  }));
}

/**
 * 设置错误状态
 */
export function setErrorState(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  error: string
): void {
  setState(prev => ({
    ...prev,
    error,
    isAnalyzing: false,
    isOptimizing: false,
    isGeneratingReport: false,
    progress: {
      stage: 'error',
      percentage: 0,
      message: error
    }
  }));
}

/**
 * 清除错误状态
 */
export function clearErrorState(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>
): void {
  setState(prev => ({
    ...prev,
    error: undefined
  }));
}

/**
 * 设置分析结果
 */
export function setAnalysisResult(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  result: any
): void {
  // 适配API返回格式到AnalysisResult
  const adaptedResult = {
    status: result.analysisResults || {
      overall: 'good' as const,
      score: 80,
      categories: {
        performance: result.analysisResults?.performance || 80,
        maintainability: result.analysisResults?.maintainability || 80,
        reliability: 85,
        security: result.analysisResults?.security || 90
      }
    },
    recommendations: result.recommendations || [],
    plan: result.plan || {
      phases: [],
      estimatedDuration: '1-2 weeks',
      expectedImpact: 'Medium'
    },
    summary: result.summary || {
      totalIssues: 0,
      criticalIssues: 0,
      automatedFixes: 0,
      manualReviews: 0,
      estimatedImpact: 'Medium'
    }
  };

  setState(prev => ({
    ...prev,
    analysisResult: adaptedResult,
    isAnalyzing: false,
    progress: {
      stage: 'analysis_complete',
      percentage: 100,
      message: '分析完成'
    }
  }));
}

/**
 * 设置优化结果
 */
export function setOptimizationResult(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  result: any
): void {
  // 适配API返回格式到OptimizationResult
  const adaptedResult = {
    executed: result.optimizationsApplied?.map((opt: string, index: number) => ({
      id: `opt-${index}`,
      name: opt,
      category: 'general',
      status: 'success' as const,
      impact: 'Medium',
      details: `已执行: ${opt}`
    })) || [],
    summary: result.summary || {
      totalOptimizations: result.optimizationsApplied?.length || 0,
      successfulOptimizations: result.optimizationsApplied?.length || 0,
      failedOptimizations: 0,
      skippedOptimizations: 0,
      overallImpact: 'Medium'
    }
  };

  setState(prev => ({
    ...prev,
    optimizationResult: adaptedResult,
    isOptimizing: false,
    progress: {
      stage: 'optimization_complete',
      percentage: 100,
      message: '优化完成'
    }
  }));
}

/**
 * 设置报告结果
 */
export function setReportResult(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  result: any
): void {
  // 适配API返回格式到ReportResult
  const adaptedResult = {
    executiveSummary: result.report?.summary || '报告生成完成',
    currentState: result.report || {
      totalIssues: 0,
      fixedIssues: 0,
      remainingIssues: 0,
      performanceGain: '0%',
      codeQualityScore: 80
    },
    keyFindings: result.recommendations || [],
    actionItems: result.actionItems || [],
    metrics: result.metrics || {},
    timeline: result.timeline || []
  };

  setState(prev => ({
    ...prev,
    reportResult: adaptedResult,
    isGeneratingReport: false,
    progress: {
      stage: 'report_complete',
      percentage: 100,
      message: '报告生成完成'
    }
  }));
}

/**
 * 重置所有状态
 */
export function resetAllStates(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>
): void {
  setState(prev => ({
    ...prev,
    isAnalyzing: false,
    isOptimizing: false,
    isGeneratingReport: false,
    error: undefined,
    progress: {
      stage: 'idle',
      percentage: 0,
      message: '准备就绪'
    }
  }));
}

/**
 * 清理结果数据
 */
export function clearResults(
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>
): void {
  setState(prev => ({
    ...prev,
    analysisResult: undefined,
    optimizationResult: undefined,
    reportResult: undefined,
    error: undefined,
    progress: {
      stage: 'idle',
      percentage: 0,
      message: '准备就绪'
    }
  }));
}

/**
 * 获取优化状态
 */
export function getOptimizationStatus(state: OptimizationState): any {
  return state.analysisResult?.status;
}

/**
 * 获取建议列表
 */
export function getRecommendations(state: OptimizationState, category?: string): any[] {
  const recommendations = state.analysisResult?.recommendations || [];
  if (category) {
    return recommendations.filter((r: any) => r.category === category);
  }
  return recommendations;
}

/**
 * 获取指标数据
 */
export function getMetrics(state: OptimizationState): any {
  return state.reportResult?.metrics;
}

/**
 * 检查是否有操作正在进行
 */
export function isAnyOperationInProgress(state: OptimizationState): boolean {
  return state.isAnalyzing || state.isOptimizing || state.isGeneratingReport;
}

/**
 * 获取当前操作类型
 */
export function getCurrentOperation(state: OptimizationState): string | null {
  if (state.isAnalyzing) return 'analysis';
  if (state.isOptimizing) return 'optimization';
  if (state.isGeneratingReport) return 'reporting';
  return null;
}

/**
 * 格式化进度百分比
 */
export function formatProgressPercentage(percentage: number): string {
  return `${Math.round(percentage)}%`;
}

/**
 * 获取操作状态描述
 */
export function getOperationStatusDescription(state: OptimizationState): string {
  if (state.error) {
    return `错误: ${state.error}`;
  }

  if (state.isAnalyzing) {
    return `分析中... ${formatProgressPercentage(state.progress.percentage)}`;
  }

  if (state.isOptimizing) {
    return `优化中... ${formatProgressPercentage(state.progress.percentage)}`;
  }

  if (state.isGeneratingReport) {
    return `生成报告中... ${formatProgressPercentage(state.progress.percentage)}`;
  }

  return state.progress.message;
}

/**
 * 验证配置参数
 */
export function validateConfig(config: any): boolean {
  // 验证分析间隔
  if (config.analysisInterval && config.analysisInterval < 60000) {
    console.warn('分析间隔不应少于1分钟');
    return false;
  }

  // 验证安全级别
  if (config.optimizationSafetyLevel &&
      !['conservative', 'moderate', 'aggressive'].includes(config.optimizationSafetyLevel)) {
    console.warn('无效的优化安全级别');
    return false;
  }

  // 验证报告格式
  if (config.reportFormat &&
      !['json', 'html', 'pdf'].includes(config.reportFormat)) {
    console.warn('无效的报告格式');
    return false;
  }

  return true;
}

/**
 * 创建AbortController
 */
export function createAbortController(): AbortController {
  return new AbortController();
}

/**
 * 处理异步操作错误
 */
export function handleAsyncError(
  error: any,
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  operationType: string
): void {
  console.error(`${operationType}失败:`, error);

  const errorMessage = error instanceof Error
    ? error.message
    : `${operationType}过程中发生未知错误`;

  setErrorState(setState, errorMessage);
}

/**
 * 延迟执行函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全执行异步操作
 */
export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  operationType: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleAsyncError(error, setState, operationType);
    return null;
  }
}
