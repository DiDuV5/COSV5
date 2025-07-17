/**
 * @fileoverview 性能监控主页面组件
 * @description 性能监控页面的主要组件，整合所有子组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

"use client";

import React, { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";

// 组件导入
import { PageHeader } from './PageHeader';
import { StatusBar } from './StatusBar';
import { OverviewTab } from './OverviewTab';
import { EnhancedTab } from './EnhancedTab';
import { SystemTab } from './SystemTab';
import { ChartsTab } from './ChartsTab';
import { ReportsTab } from './ReportsTab';
import { QueriesTab } from './QueriesTab';

// Hook导入
import { useRealTimePerformance } from "../hooks/useRealTimePerformance";
import { usePerformanceData } from '../hooks/usePerformanceData';
import { usePerformanceActions } from '../hooks/usePerformanceActions';

// 类型和常量导入
import { UpdateInterval } from '../types';
import { DEFAULT_CONFIG, TABS_CONFIG } from '../constants';

export function PerformanceMonitoringPage() {
  // 状态管理
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(DEFAULT_CONFIG.TIME_RANGE);
  const [updateInterval, setUpdateInterval] = useState<UpdateInterval>(DEFAULT_CONFIG.UPDATE_INTERVAL);

  // 实时性能监控Hook
  const {
    data: realTimeData,
    isLoading: isRealTimeLoading,
    isConnected,
    error: realTimeError,
    lastUpdated: realTimeLastUpdated,
    refresh: refreshRealTime,
    updateConfig: updateRealTimeConfig,
  } = useRealTimePerformance({
    updateInterval,
    enableWebSocket: DEFAULT_CONFIG.ENABLE_WEBSOCKET,
    autoStart: DEFAULT_CONFIG.AUTO_REFRESH,
  });

  // 性能数据Hook
  const performanceData = usePerformanceData(selectedTimeRange);

  // 操作逻辑Hook
  const {
    isRefreshing,
    lastUpdated,
    handleRefresh,
    handleUpdateInterval,
    handleExport,
  } = usePerformanceActions(performanceData, updateRealTimeConfig);

  // 处理刷新间隔更新
  const onUpdateIntervalChange = (newInterval: UpdateInterval) => {
    setUpdateInterval(newInterval);
    handleUpdateInterval(newInterval);
  };

  // 处理手动刷新
  const onRefresh = async () => {
    await Promise.all([
      handleRefresh(),
      refreshRealTime(),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <PageHeader
        selectedTimeRange={selectedTimeRange}
        updateInterval={updateInterval}
        isRefreshing={isRefreshing}
        isLoadingReport={performanceData.isLoadingReport}
        onTimeRangeChange={setSelectedTimeRange}
        onUpdateIntervalChange={onUpdateIntervalChange}
        onRefresh={onRefresh}
        onExport={handleExport}
      />

      {/* 状态栏 */}
      <StatusBar
        lastUpdated={lastUpdated || undefined}
        realTimeLastUpdated={realTimeLastUpdated || undefined}
        isConnected={isConnected}
        realTimeError={realTimeError || undefined}
        updateInterval={updateInterval}
      />

      {/* 主要内容区域 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
          {TABS_CONFIG.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs md:text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 实时概览 */}
        <TabsContent value="overview">
          <OverviewTab
            realTimeData={realTimeData || undefined}
            performanceStats={performanceData.performanceStats}
            modelStats={performanceData.modelStats}
            isRealTimeLoading={isRealTimeLoading}
            isLoadingStats={performanceData.isLoadingStats}
            isLoadingModelStats={performanceData.isLoadingModelStats}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        {/* P1级优化监控 */}
        <TabsContent value="enhanced">
          <EnhancedTab
            realTimeData={realTimeData || undefined}
            isRealTimeLoading={isRealTimeLoading}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        {/* 系统监控 */}
        <TabsContent value="system">
          <SystemTab />
        </TabsContent>

        {/* 性能图表 */}
        <TabsContent value="charts">
          <ChartsTab
            performanceStats={performanceData.performanceStats}
            realTimeData={realTimeData || undefined}
            isLoadingStats={performanceData.isLoadingStats}
            isRealTimeLoading={isRealTimeLoading}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        {/* 详细报告 */}
        <TabsContent value="reports">
          <ReportsTab
            performanceReport={performanceData.performanceReport}
            isLoadingReport={performanceData.isLoadingReport}
            timeRange={selectedTimeRange}
          />
        </TabsContent>

        {/* 慢查询分析 */}
        <TabsContent value="queries">
          <QueriesTab
            performanceStats={performanceData.performanceStats}
            isLoadingStats={performanceData.isLoadingStats}
          />
        </TabsContent>
      </Tabs>

      {/* 帮助信息 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>使用说明：</strong>
          实时指标每5秒自动更新，图表数据每30秒更新。您可以选择不同的时间范围查看历史性能数据，
          或使用导出功能保存性能报告。慢查询阈值可在系统设置中调整。
        </AlertDescription>
      </Alert>
    </div>
  );
}
