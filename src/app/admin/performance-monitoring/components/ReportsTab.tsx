/**
 * @fileoverview 详细报告标签页组件
 * @description 显示性能监控的详细报告
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { PerformanceReport } from "./PerformanceReport";
import { PerformanceReportData, ApiResponse } from '../types';

interface ReportsTabProps {
  performanceReport?: ApiResponse<PerformanceReportData>;
  isLoadingReport: boolean;
  timeRange: number;
}

export function ReportsTab({
  performanceReport,
  isLoadingReport,
  timeRange,
}: ReportsTabProps) {
  return (
    <div className="space-y-6">
      <PerformanceReport
        data={performanceReport?.data as any}
        isLoading={isLoadingReport}
        timeRange={timeRange}
      />
    </div>
  );
}
