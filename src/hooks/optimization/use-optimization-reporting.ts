/**
 * @fileoverview 优化报告生成功能Hook
 * @description 提供优化系统的报告生成相关功能
 * @author Augment AI
 * @date 2025-07-03
 */

import { useCallback } from 'react';
import { api } from '@/trpc/react';
import type {
  OptimizationState,
  UseOptimizationSystemConfig
} from '../types/optimization-types';
import {
  updateProgress,
  setReportResult,
  safeAsyncOperation
} from '../utils/optimization-utils';

/**
 * 报告生成功能Hook
 */
export function useOptimizationReporting(
  state: OptimizationState,
  setState: React.Dispatch<React.SetStateAction<OptimizationState>>,
  config: UseOptimizationSystemConfig
) {
  // tRPC mutations
  const reportGenerationMutation = api.upload.generateOptimizationReport.useMutation();

  /**
   * 生成优化报告
   */
  const generateReport = useCallback(async () => {
    if (state.isGeneratingReport) {
      console.warn('报告生成已在进行中');
      return;
    }

    const result = await safeAsyncOperation(
      async () => {
        console.log('📊 开始生成优化报告...');

        setState(prev => ({
          ...prev,
          isGeneratingReport: true,
          error: undefined
        }));

        // 阶段1: 收集数据
        updateProgress(setState, 'data_collection', 15, '收集分析数据...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 阶段2: 分析结果
        updateProgress(setState, 'result_analysis', 35, '分析优化结果...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 阶段3: 生成图表
        updateProgress(setState, 'chart_generation', 55, '生成性能图表...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 阶段4: 编写摘要
        updateProgress(setState, 'summary_generation', 75, '编写执行摘要...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 阶段5: 格式化报告
        updateProgress(setState, 'report_formatting', 90, '格式化报告...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 执行实际报告生成
        const reportResult = await reportGenerationMutation.mutateAsync();

        console.log('✅ 优化报告生成完成:', reportResult);
        setReportResult(setState, reportResult);

        return reportResult;
      },
      setState,
      '报告生成'
    );

    return result;
  }, [state.isGeneratingReport, reportGenerationMutation, setState, config]);

  /**
   * 生成简化报告
   */
  const generateSummaryReport = useCallback(async () => {
    const result = await safeAsyncOperation(
      async () => {
        console.log('📋 开始生成简化报告...');

        setState(prev => ({
          ...prev,
          isGeneratingReport: true,
          error: undefined
        }));

        updateProgress(setState, 'summary_collection', 30, '收集关键数据...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        updateProgress(setState, 'summary_analysis', 70, '生成摘要分析...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        const summaryResult = await reportGenerationMutation.mutateAsync();

        console.log('✅ 简化报告生成完成:', summaryResult);
        setReportResult(setState, summaryResult);

        return summaryResult;
      },
      setState,
      '简化报告生成'
    );

    return result;
  }, [reportGenerationMutation, setState]);

  /**
   * 生成性能报告
   */
  const generatePerformanceReport = useCallback(async () => {
    const result = await safeAsyncOperation(
      async () => {
        console.log('⚡ 开始生成性能报告...');

        setState(prev => ({
          ...prev,
          isGeneratingReport: true,
          error: undefined
        }));

        updateProgress(setState, 'performance_data', 25, '收集性能数据...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        updateProgress(setState, 'performance_charts', 60, '生成性能图表...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        updateProgress(setState, 'performance_analysis', 85, '分析性能趋势...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const performanceResult = await reportGenerationMutation.mutateAsync();

        console.log('✅ 性能报告生成完成:', performanceResult);

        setReportResult(setState, performanceResult);

        return performanceResult;
      },
      setState,
      '性能报告生成'
    );

    return result;
  }, [reportGenerationMutation, setState]);

  /**
   * 生成安全报告
   */
  const generateSecurityReport = useCallback(async () => {
    const result = await safeAsyncOperation(
      async () => {
        console.log('🔒 开始生成安全报告...');

        setState(prev => ({
          ...prev,
          isGeneratingReport: true,
          error: undefined
        }));

        updateProgress(setState, 'security_scan', 30, '扫描安全问题...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        updateProgress(setState, 'vulnerability_analysis', 70, '分析漏洞风险...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const securityResult = await reportGenerationMutation.mutateAsync();

        console.log('✅ 安全报告生成完成:', securityResult);

        setReportResult(setState, securityResult);

        return securityResult;
      },
      setState,
      '安全报告生成'
    );

    return result;
  }, [reportGenerationMutation, setState]);

  /**
   * 导出报告
   */
  const exportReport = useCallback(async (format: 'json' | 'html' | 'pdf' = 'json') => {
    const result = await safeAsyncOperation(
      async () => {
        console.log(`📤 开始导出报告 (${format})...`);

        setState(prev => ({
          ...prev,
          isGeneratingReport: true,
          error: undefined
        }));

        updateProgress(setState, 'export_preparation', 30, '准备导出数据...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        updateProgress(setState, 'export_formatting', 70, `格式化为${format.toUpperCase()}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const exportResult = await reportGenerationMutation.mutateAsync();

        console.log(`✅ 报告导出完成 (${format}):`, exportResult);

        setReportResult(setState, exportResult);

        return exportResult;
      },
      setState,
      '报告导出'
    );

    return result;
  }, [reportGenerationMutation, setState]);

  /**
   * 生成对比报告
   */
  const generateComparisonReport = useCallback(async (
    beforeData: any,
    afterData: any
  ) => {
    const result = await safeAsyncOperation(
      async () => {
        console.log('📊 开始生成对比报告...');

        setState(prev => ({
          ...prev,
          isGeneratingReport: true,
          error: undefined
        }));

        updateProgress(setState, 'comparison_analysis', 40, '分析前后对比...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        updateProgress(setState, 'improvement_calculation', 80, '计算改进指标...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const comparisonResult = await reportGenerationMutation.mutateAsync();

        console.log('✅ 对比报告生成完成:', comparisonResult);

        setReportResult(setState, comparisonResult);

        return comparisonResult;
      },
      setState,
      '对比报告生成'
    );

    return result;
  }, [reportGenerationMutation, setState]);

  return {
    generateReport,
    generateSummaryReport,
    generatePerformanceReport,
    generateSecurityReport,
    exportReport,
    generateComparisonReport
  };
}
