/**
 * @fileoverview 性能数据获取Hook
 * @description 管理性能监控数据的获取和状态
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { api } from "@/lib/api";
import { 
  UsePerformanceDataReturn,
  RealTimePerformanceData,
  PerformanceStats,
  PerformanceReportData,
  ModelStats,
  ApiResponse
} from '../types';
import { REFRESH_INTERVALS } from '../constants';

/**
 * 性能数据获取Hook
 * @param selectedTimeRange 选中的时间范围
 * @returns 性能数据和加载状态
 */
export function usePerformanceData(selectedTimeRange: number): UsePerformanceDataReturn {
  // 实时指标查询
  const {
    data: realTimeMetrics,
    isLoading: isLoadingRealTime,
    refetch: refetchRealTime,
  } = api.admin.performance.getRealTimeMetrics.useQuery(undefined, {
    refetchInterval: REFRESH_INTERVALS.REAL_TIME_METRICS,
  });

  // 性能统计查询
  const {
    data: performanceStats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = api.admin.performance.getStats.useQuery(
    { hours: selectedTimeRange },
    {
      refetchInterval: REFRESH_INTERVALS.PERFORMANCE_STATS,
    }
  );

  // 性能报告查询
  const {
    data: performanceReport,
    isLoading: isLoadingReport,
    refetch: refetchReport,
  } = api.admin.performance.generateReport.useQuery(
    { hours: selectedTimeRange },
    {
      refetchInterval: REFRESH_INTERVALS.PERFORMANCE_REPORT,
    }
  );

  // 模型统计查询
  const {
    data: modelStats,
    isLoading: isLoadingModelStats,
    refetch: refetchModelStats,
  } = api.admin.performance.getModelStats.useQuery(
    { hours: selectedTimeRange },
    {
      refetchInterval: REFRESH_INTERVALS.MODEL_STATS,
    }
  );

  /**
   * 刷新所有数据
   */
  const refetchAll = async (): Promise<void> => {
    await Promise.all([
      refetchRealTime(),
      refetchStats(),
      refetchReport(),
      refetchModelStats(),
    ]);
  };

  return {
    realTimeMetrics: realTimeMetrics as ApiResponse<RealTimePerformanceData> | undefined,
    performanceStats: performanceStats as ApiResponse<PerformanceStats> | undefined,
    performanceReport: performanceReport as ApiResponse<PerformanceReportData> | undefined,
    modelStats: modelStats as ApiResponse<ModelStats> | undefined,
    isLoadingRealTime,
    isLoadingStats,
    isLoadingReport,
    isLoadingModelStats,
    refetchAll,
  };
}
