/**
 * @fileoverview 优化系统Hook - P3前端集成
 * @description 提供综合优化系统的前端接口
 * @author Augment AI
 * @date 2025-07-03
 * @version 2.0.0 - 重构版本
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// 导入重构后的模块
import type {
  OptimizationState,
  UseOptimizationSystemConfig,
  UseOptimizationSystemReturn
} from './types/optimization-types';

import {
  createInitialOptimizationState,
  resetAllStates,
  clearResults,
  getOptimizationStatus,
  getRecommendations,
  getMetrics,
  isAnyOperationInProgress,
  validateConfig
} from './utils/optimization-utils';

import { useOptimizationAnalysis } from './optimization/use-optimization-analysis';
import { useOptimizationExecution } from './optimization/use-optimization-execution';
import { useOptimizationReporting } from './optimization/use-optimization-reporting';

/**
 * 优化系统Hook
 */
export function useOptimizationSystem(
  config: UseOptimizationSystemConfig = {}
): UseOptimizationSystemReturn {
  // 验证配置
  if (!validateConfig(config)) {
    console.warn('优化系统配置验证失败，使用默认配置');
  }

  // 状态管理
  const [state, setState] = useState<OptimizationState>(createInitialOptimizationState);

  // 引用管理
  const abortController = useRef<AbortController | null>(null);
  const autoAnalysisInterval = useRef<NodeJS.Timeout | null>(null);

  // 使用分离的功能Hook
  const analysisHook = useOptimizationAnalysis(state, setState, config);
  const executionHook = useOptimizationExecution(state, setState, config);
  const reportingHook = useOptimizationReporting(state, setState, config);

  /**
   * 取消操作
   */
  const cancelOperation = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }

    // 清理自动分析定时器
    if (autoAnalysisInterval.current) {
      clearInterval(autoAnalysisInterval.current);
      autoAnalysisInterval.current = null;
    }

    // 重置状态
    resetAllStates(setState);

    console.log('🛑 操作已取消');
  }, []);

  /**
   * 清理结果
   */
  const clearResultsCallback = useCallback(() => {
    clearResults(setState);
    console.log('🧹 结果已清理');
  }, []);

  /**
   * 获取优化状态
   */
  const getOptimizationStatusCallback = useCallback(() => {
    return getOptimizationStatus(state);
  }, [state]);

  /**
   * 获取建议
   */
  const getRecommendationsCallback = useCallback((category?: string) => {
    return getRecommendations(state, category);
  }, [state]);

  /**
   * 获取指标
   */
  const getMetricsCallback = useCallback(() => {
    return getMetrics(state);
  }, [state]);

  /**
   * 设置自动分析
   */
  useEffect(() => {
    if (config.enableAutoAnalysis && config.analysisInterval) {
      console.log(`🔄 启用自动分析，间隔: ${config.analysisInterval}ms`);

      autoAnalysisInterval.current = setInterval(() => {
        if (!isAnyOperationInProgress(state)) {
          console.log('🔄 执行自动分析...');
          analysisHook.performQuickAnalysis();
        }
      }, config.analysisInterval);

      return () => {
        if (autoAnalysisInterval.current) {
          clearInterval(autoAnalysisInterval.current);
          autoAnalysisInterval.current = null;
        }
      };
    }
    // 如果不满足条件，返回undefined（可选的清理函数）
    return undefined;
  }, [config.enableAutoAnalysis, config.analysisInterval, state, analysisHook]);

  /**
   * 自动优化
   */
  useEffect(() => {
    if (config.enableAutoOptimization && state.analysisResult && !state.isOptimizing) {
      console.log('🚀 触发自动优化...');
      executionHook.performOptimization({
        safetyLevel: config.optimizationSafetyLevel || 'moderate'
      });
    }
  }, [config.enableAutoOptimization, config.optimizationSafetyLevel, state.analysisResult, state.isOptimizing, executionHook]);

  /**
   * 自动报告生成
   */
  useEffect(() => {
    if (config.enableAutoReporting && state.optimizationResult && !state.isGeneratingReport) {
      console.log('📊 触发自动报告生成...');
      reportingHook.generateReport();
    }
  }, [config.enableAutoReporting, state.optimizationResult, state.isGeneratingReport, reportingHook]);

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      cancelOperation();
    };
  }, [cancelOperation]);

  /**
   * 调试模式日志
   */
  useEffect(() => {
    if (config.enableDebugMode) {
      console.log('🐛 优化系统状态更新:', {
        stage: state.progress.stage,
        percentage: state.progress.percentage,
        message: state.progress.message,
        isAnalyzing: state.isAnalyzing,
        isOptimizing: state.isOptimizing,
        isGeneratingReport: state.isGeneratingReport,
        hasError: !!state.error
      });
    }
  }, [config.enableDebugMode, state]);

  return {
    // 状态
    state,

    // 分析方法
    performAnalysis: analysisHook.performAnalysis,
    analyzeCodeRefactoring: analysisHook.analyzeCodeRefactoring,
    analyzeTestCoverage: analysisHook.analyzeTestCoverage,
    performQuickAnalysis: analysisHook.performQuickAnalysis,
    analyzeModule: analysisHook.analyzeModule,

    // 优化方法
    performOptimization: executionHook.performOptimization,
    performDryRunOptimization: executionHook.performDryRunOptimization,
    performSpecificOptimization: (type: string) =>
      executionHook.performSpecificOptimization(type as "performance" | "bundle" | "memory" | "security"),

    // 基准测试方法
    runBenchmark: executionHook.runBenchmark,
    runBenchmarkSuite: executionHook.runBenchmarkSuite,

    // 报告方法
    generateReport: reportingHook.generateReport,
    generateSummaryReport: reportingHook.generateSummaryReport,
    generatePerformanceReport: reportingHook.generatePerformanceReport,
    generateSecurityReport: reportingHook.generateSecurityReport,
    exportReport: reportingHook.exportReport,
    generateComparisonReport: reportingHook.generateComparisonReport,

    // 控制方法
    cancelOperation,
    clearResults: clearResultsCallback,

    // 获取方法
    getOptimizationStatus: getOptimizationStatusCallback,
    getRecommendations: getRecommendationsCallback,
    getMetrics: getMetricsCallback
  };
}

// 重新导出类型以保持向后兼容
export type {
  OptimizationState,
  UseOptimizationSystemConfig,
  UseOptimizationSystemReturn,
  OptimizationOptions,
  BenchmarkOptions
} from './types/optimization-types';

// 重新导出工具函数
export { generateOperationId } from './utils/optimization-utils';
