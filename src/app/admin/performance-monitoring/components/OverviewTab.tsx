/**
 * @fileoverview 性能监控概览标签页组件
 * @description 显示实时指标和基础性能图表
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { RealTimeMetrics } from "./RealTimeMetrics";
import { PerformanceCharts } from "./PerformanceCharts";
import { ModelStatsChart } from "./ModelStatsChart";
import { LayeredCacheMonitoringCard } from "./LayeredCacheMonitoringCard";
import { useLayeredCacheStats } from "@/hooks/admin/use-layered-cache";
import {
  RealTimePerformanceData,
  PerformanceStats,
  ModelStats,
  ApiResponse
} from '../types';

interface OverviewTabProps {
  realTimeData?: RealTimePerformanceData;
  performanceStats?: ApiResponse<PerformanceStats>;
  modelStats?: ApiResponse<ModelStats>;
  isRealTimeLoading: boolean;
  isLoadingStats: boolean;
  isLoadingModelStats: boolean;
  timeRange: number;
}

export function OverviewTab({
  realTimeData,
  performanceStats,
  modelStats,
  isRealTimeLoading,
  isLoadingStats,
  isLoadingModelStats,
  timeRange,
}: OverviewTabProps) {
  // 获取三级缓存数据
  const { data: layeredCacheStats, isLoading: isLoadingLayeredCache } = useLayeredCacheStats();

  return (
    <div className="space-y-6">
      {/* 实时指标 */}
      <RealTimeMetrics
        data={realTimeData as any}
        isLoading={isRealTimeLoading}
      />

      {/* 三级缓存架构监控 */}
      {layeredCacheStats?.data && (
        <LayeredCacheMonitoringCard
          stats={layeredCacheStats.data}
          isLoading={isLoadingLayeredCache}
          className="col-span-full"
        />
      )}

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 模型统计图表 */}
        <ModelStatsChart
          data={modelStats?.data as any}
          isLoading={isLoadingModelStats}
          timeRange={timeRange}
        />

        {/* 性能图表 */}
        <PerformanceCharts
          data={performanceStats?.data as any}
          isLoading={isLoadingStats}
          timeRange={timeRange}
        />
      </div>
    </div>
  );
}
