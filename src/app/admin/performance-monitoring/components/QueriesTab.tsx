/**
 * @fileoverview 慢查询分析标签页组件
 * @description 显示慢查询分析表格
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { SlowQueriesTable } from "./SlowQueriesTable";
import { PerformanceStats, ApiResponse } from '../types';

interface QueriesTabProps {
  performanceStats?: ApiResponse<PerformanceStats>;
  isLoadingStats: boolean;
}

export function QueriesTab({
  performanceStats,
  isLoadingStats,
}: QueriesTabProps) {
  return (
    <div className="space-y-6">
      <SlowQueriesTable
        data={performanceStats?.data?.slowQueriesData as any}
        isLoading={isLoadingStats}
      />
    </div>
  );
}
