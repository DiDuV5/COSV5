/**
 * @fileoverview 访客分析数据获取Hook
 * @description 处理访客分析数据的获取、缓存和状态管理
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/trpc/react";
import {
  type TimeRange,
  type VisitorStats,
  type RegistrationStats,
  type UserVisitorStats,
  type OverviewStats,
  type TrendDataPoint,
  type ChartData,
  generateMockVisitorStats,
  generateChartData,
  calculateGrowthRate,
  getUserLevelColor,
  getUserLevelLabel,
  CHART_COLORS,
} from "../types/analytics-types";

export interface UseAnalyticsDataProps {
  timeRange?: TimeRange;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseAnalyticsDataReturn {
  // 数据状态
  visitorStats: VisitorStats | null;
  registrationStats: RegistrationStats | null;
  userVisitorStats: UserVisitorStats[] | null;
  overviewStats: OverviewStats | null;
  trendData: TrendDataPoint[] | null;

  // 加载状态
  isPending: boolean;
  isError: boolean;
  error: Error | null;

  // 图表数据
  visitorChartData: ChartData[];
  deviceChartData: ChartData[];
  browserChartData: ChartData[];
  locationChartData: ChartData[];

  // 操作方法
  refetch: () => void;
  setTimeRange: (range: TimeRange) => void;
  timeRange: TimeRange;
}

/**
 * 访客分析数据Hook
 */
export function useAnalyticsData({
  timeRange: initialTimeRange = 'week',
  autoRefresh = false,
  refreshInterval = 30000,
}: UseAnalyticsDataProps = {}): UseAnalyticsDataReturn {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // 获取访客统计数据
  const {
    data: visitorStats,
    isPending: visitorLoading,
    error: visitorError,
    refetch: refetchVisitor,
  } = api.admin.getVisitorStats.useQuery(
    { timeRange: timeRange === 'today' ? 'day' : timeRange === 'year' ? 'month' : timeRange },
    {
      enabled: true,
      refetchInterval: autoRefresh ? refreshInterval : false,
    }
  );

  // 获取注册来源统计
  const {
    data: registrationStats,
    isPending: registrationLoading,
    error: registrationError,
    refetch: refetchRegistration,
  } = api.admin.getRegistrationStats.useQuery(
    { timeRange: timeRange === 'today' ? 'day' : timeRange === 'year' ? 'month' : timeRange },
    {
      enabled: true,
      refetchInterval: autoRefresh ? refreshInterval : false,
    }
  );

  // 获取用户访客统计 - 使用Mock数据
  const userVisitorStats = null;
  const userVisitorLoading = false;
  const userVisitorError = null;
  const refetchUserVisitor = () => Promise.resolve();

  // 获取趋势数据
  const {
    data: trendData,
    isPending: trendLoading,
    error: trendError,
    refetch: refetchTrend,
  } = api.admin.getTrendData.useQuery(
    { timeRange: timeRange === 'today' ? 'day' : timeRange === 'year' ? 'month' : timeRange },
    {
      enabled: true,
      refetchInterval: autoRefresh ? refreshInterval : false,
    }
  );

  // 计算加载状态
  const isPending = visitorLoading || registrationLoading || userVisitorLoading || trendLoading;
  const isError = !!(visitorError || registrationError || userVisitorError || trendError);
  const error = visitorError || registrationError || userVisitorError || trendError || null;

  // 计算概览统计数据
  const overviewStats = useMemo((): OverviewStats | null => {
    if (!visitorStats || !registrationStats) return null;

    // 类型断言以处理tRPC返回的数据
    const visitorData = visitorStats as any;
    const registrationData = registrationStats as any;

    const newRegistrations = registrationData.sources?.reduce(
      (sum: any, source: any) => sum + (source._count?.id || 0),
      0
    ) || 0;

    return {
      totalVisitors: visitorData.totalVisitors || 0,
      uniqueVisitors: visitorData.uniqueVisitors || 0,
      pageViews: visitorData.pageViews || 0,
      newRegistrations,
      growth: registrationData.growth || 0,
      bounceRate: visitorData.bounceRate || 0,
      avgSessionDuration: visitorData.avgSessionDuration || 0,
    };
  }, [visitorStats, registrationStats]);

  // 生成访客类型图表数据
  const visitorChartData = useMemo((): ChartData[] => {
    const visitorData = visitorStats as any;
    if (!visitorData?.userLevels) return [];

    return visitorData.userLevels.map((level: any) => ({
      name: getUserLevelLabel(level.userLevel),
      value: level._count.id,
      color: getUserLevelColor(level.userLevel),
      percentage: level.percentage,
    }));
  }, [visitorStats]);

  // 生成设备类型图表数据
  const deviceChartData = useMemo((): ChartData[] => {
    const visitorData = visitorStats as any;
    if (!visitorData?.devices) return [];

    return generateChartData(
      visitorData.devices.map((device: any) => ({
        name: device.device === 'desktop' ? '桌面端' :
              device.device === 'mobile' ? '移动端' :
              device.device === 'tablet' ? '平板端' : '未知设备',
        count: device._count.id,
      })),
      CHART_COLORS
    );
  }, [visitorStats]);

  // 生成浏览器图表数据
  const browserChartData = useMemo((): ChartData[] => {
    const visitorData = visitorStats as any;
    if (!visitorData?.browsers) return [];

    return generateChartData(
      visitorData.browsers.map((browser: any) => ({
        name: browser.browser,
        count: browser._count.id,
      })),
      CHART_COLORS
    );
  }, [visitorStats]);

  // 生成地理位置图表数据
  const locationChartData = useMemo((): ChartData[] => {
    const visitorData = visitorStats as any;
    if (!visitorData?.locations) return [];

    return generateChartData(
      visitorData.locations.map((location: any) => ({
        name: location.city ? `${location.country} ${location.city}` : location.country,
        count: location._count.id,
      })),
      CHART_COLORS
    );
  }, [visitorStats]);

  // 统一刷新方法
  const refetch = () => {
    refetchVisitor();
    refetchRegistration();
    refetchUserVisitor();
    refetchTrend();
  };

  return {
    // 数据状态
    visitorStats: (visitorStats as any) || null,
    registrationStats: (registrationStats as any) || null,
    userVisitorStats: userVisitorStats || null,
    overviewStats: overviewStats || null,
    trendData: (trendData as any)?.data || null,

    // 加载状态
    isPending,
    isError,
    error: (error as any) || null,

    // 图表数据
    visitorChartData,
    deviceChartData,
    browserChartData,
    locationChartData,

    // 操作方法
    refetch,
    setTimeRange,
    timeRange,
  };
}

/**
 * 实时访客数据Hook
 */
export function useRealTimeVisitors() {
  const [onlineUsers, setOnlineUsers] = useState<UserVisitorStats[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 这里可以实现WebSocket连接来获取实时数据
    // 目前使用模拟数据
    const mockOnlineUsers: UserVisitorStats[] = [
      {
        userId: '1',
        username: 'user1',
        displayName: '用户1',
        userLevel: 'USER',
        visitCount: 5,
        lastVisit: new Date(),
        totalTimeSpent: 1800,
        pagesViewed: 10,
        isOnline: true,
      },
      {
        userId: '2',
        username: 'creator1',
        displayName: '创作者1',
        userLevel: 'CREATOR',
        visitCount: 15,
        lastVisit: new Date(Date.now() - 2 * 60 * 1000),
        totalTimeSpent: 3600,
        pagesViewed: 25,
        isOnline: true,
      },
    ];

    setOnlineUsers(mockOnlineUsers);
    setIsConnected(true);

    return () => {
      setIsConnected(false);
    };
  }, []);

  return {
    onlineUsers,
    isConnected,
    onlineCount: onlineUsers.length,
  };
}

/**
 * 页面性能数据Hook
 */
export function usePagePerformance(timeRange: TimeRange = 'week') {
  const {
    data: pageStats,
    isPending: isPending,
    error,
    refetch,
  } = api.admin.getPageStats.useQuery(
    { timeRange: timeRange === 'today' ? 'day' : timeRange === 'year' ? 'month' : timeRange },
    { enabled: true }
  );

  // 计算页面性能指标
  const performanceMetrics = useMemo(() => {
    if (!pageStats || !Array.isArray((pageStats as any)?.pages)) return null;

    const pages = (pageStats as any).pages || [];
    const totalViews = pages.reduce((sum: number, page: any) => sum + (page.views || 0), 0);
    const avgBounceRate = pages.length > 0 ? pages.reduce((sum: number, page: any) => sum + (page.bounceRate || 0), 0) / pages.length : 0;
    const avgTimeOnPage = pages.length > 0 ? pages.reduce((sum: number, page: any) => sum + (page.avgTimeOnPage || 0), 0) / pages.length : 0;

    return {
      totalPages: pages.length,
      totalViews,
      avgBounceRate,
      avgTimeOnPage,
      topPages: pages.slice(0, 10),
    };
  }, [pageStats]);

  return {
    pageStats,
    performanceMetrics,
    isPending,
    error,
    refetch,
  };
}

/**
 * 导出数据Hook
 */
export function useExportData() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCsv = async (data: any[], filename: string) => {
    setIsExporting(true);

    try {
      // 这里实现CSV导出逻辑
      const csvContent = convertToCSV(data);
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async (data: any[], filename: string) => {
    setIsExporting(true);

    try {
      // 这里实现Excel导出逻辑
      console.log('导出Excel:', filename, data);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportToCsv,
    exportToExcel,
  };
}

// 辅助函数
function convertToCSV(data: any[]): string {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
