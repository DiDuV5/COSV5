/**
 * @fileoverview 性能图表标签页组件
 * @description 显示详细的性能图表和P1级优化图表
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { PerformanceCharts } from "./PerformanceCharts";
import { CachePerformanceChart, PermissionPerformanceChart } from "./PerformanceChart";
import {
  PerformanceStats,
  RealTimePerformanceData,
  ApiResponse
} from '../types';
import {
  MOCK_CACHE_PERFORMANCE_DATA,
  MOCK_PERMISSION_PERFORMANCE_DATA
} from '../constants';

interface ChartsTabProps {
  performanceStats?: ApiResponse<PerformanceStats>;
  realTimeData?: RealTimePerformanceData;
  isLoadingStats: boolean;
  isRealTimeLoading: boolean;
  timeRange: number;
}

export function ChartsTab({
  performanceStats,
  realTimeData,
  isLoadingStats,
  isRealTimeLoading,
  timeRange,
}: ChartsTabProps) {
  // 构建缓存性能数据（包含实时数据）
  const cachePerformanceData = [
    ...MOCK_CACHE_PERFORMANCE_DATA.slice(0, -1),
    {
      timestamp: new Date().toISOString(),
      hitRate: realTimeData?.cacheStats?.hitRate || 90,
      responseTime: 6,
      penetrationPrevented: 2,
    },
  ];

  // 构建权限性能数据（包含实时数据）
  const permissionPerformanceData = [
    ...MOCK_PERMISSION_PERFORMANCE_DATA.slice(0, -1),
    {
      timestamp: new Date().toISOString(),
      checkTime: realTimeData?.permissionStats?.averageCheckTime || 8,
      totalChecks: 1800,
      cacheHits: 1600,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 原有的性能图表 */}
      <PerformanceCharts
        data={performanceStats?.data as any}
        isLoading={isLoadingStats}
        timeRange={timeRange}
        detailed={true}
      />

      {/* 新的P1级优化图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 缓存性能图表 */}
        <CachePerformanceChart
          data={cachePerformanceData}
          isLoading={isRealTimeLoading}
        />

        {/* 权限性能图表 */}
        <PermissionPerformanceChart
          data={permissionPerformanceData}
          isLoading={isRealTimeLoading}
        />
      </div>
    </div>
  );
}
