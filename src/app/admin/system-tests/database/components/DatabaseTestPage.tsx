/**
 * @fileoverview 数据库测试主页面组件
 * @description 数据库测试页面的主要组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

'use client';

import React from 'react';
import { useDatabaseTests } from '../hooks/useDatabaseTests';
import { useDatabaseStats } from '../hooks/useDatabaseStats';
import { PageHeader } from './PageHeader';
import { TestListCard } from './TestListCard';
import { TestOverviewCard } from './TestOverviewCard';
import { DatabaseStatsCard } from './DatabaseStatsCard';
import { PerformanceCard } from './PerformanceCard';
import { DatabaseInfoCard } from './DatabaseInfoCard';
import { QuickLinksSection } from './QuickLinksSection';

/**
 * 数据库测试主页面组件
 */
export const DatabaseTestPage: React.FC = () => {
  const {
    tests,
    isRunning,
    runSingleTest,
    runAllTests,
    resetTests,
  } = useDatabaseTests();

  const {
    stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useDatabaseStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <PageHeader
          tests={tests}
          isRunning={isRunning}
          onRunAllTests={runAllTests}
          onResetTests={resetTests}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：测试列表 */}
          <div className="lg:col-span-2">
            <TestListCard
              tests={tests}
              onRunTest={runSingleTest}
              isRunning={isRunning}
            />
          </div>

          {/* 右侧：信息卡片 */}
          <div className="space-y-6">
            {/* 测试概览 */}
            <TestOverviewCard tests={tests} />

            {/* 数据库统计 */}
            <DatabaseStatsCard
              stats={stats}
              isLoading={statsLoading}
              error={statsError}
              onRefresh={refetchStats}
            />

            {/* 数据库信息 */}
            <DatabaseInfoCard />
          </div>
        </div>

        {/* 底部区域 */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 性能指标 */}
          <PerformanceCard tests={tests} />

          {/* 快速链接 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">相关工具</h3>
            <QuickLinksSection />
          </div>
        </div>
      </div>
    </div>
  );
};
