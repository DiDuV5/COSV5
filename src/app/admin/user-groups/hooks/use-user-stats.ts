/**
 * @fileoverview 用户统计数据Hook
 * @description 处理用户统计数据的获取、缓存和状态管理
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/trpc/react";
import {
  type UserGroupStats,
  type UserStatsOverview,
  type ChartDataPoint,
  generateMockStats,
  calculateStatsOverview,
  generateChartData,
} from "../types/user-groups-types";

export interface UseUserStatsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseUserStatsReturn {
  // 数据状态
  groupStats: UserGroupStats[] | null;
  overview: UserStatsOverview | null;
  chartData: ChartDataPoint[];

  // 加载状态
  isPending: boolean;
  isError: boolean;
  error: Error | null;

  // 操作方法
  refetch: () => void;
  refresh: () => void;
}

/**
 * 用户统计数据Hook
 */
export function useUserStats({
  autoRefresh = false,
  refreshInterval = 30000,
}: UseUserStatsProps = {}): UseUserStatsReturn {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // 获取用户组统计数据
  const {
    data: groupStats,
    isPending: isPending,
    error,
    refetch,
  } = api.admin?.settings?.getUserGroupStats?.useQuery(
    undefined,
    {
      enabled: true,
      refetchInterval: autoRefresh ? refreshInterval : false,
      // 使用模拟数据作为fallback
      placeholderData: generateMockStats(),
    }
  ) || {
    data: generateMockStats(),
    isPending: false,
    error: null,
    refetch: () => {},
  };

  // 计算概览统计
  const overview = useMemo((): UserStatsOverview | null => {
    if (!groupStats) return null;
    return calculateStatsOverview(groupStats);
  }, [groupStats]);

  // 生成图表数据
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!groupStats) return [];
    return generateChartData(groupStats);
  }, [groupStats]);

  // 自动刷新逻辑
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  // 手动刷新方法
  const refresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  return {
    // 数据状态
    groupStats,
    overview,
    chartData,

    // 加载状态
    isPending,
    isError: !!error,
    error: error as Error | null,

    // 操作方法
    refetch,
    refresh,
  };
}

/**
 * 用户详细列表Hook
 */
export function useUserList(filters?: {
  userLevel?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const {
    data: userList,
    isPending: isPending,
    error,
    refetch,
  } = api.admin?.getUsers?.useQuery(
    {
      userLevel: filters?.userLevel,
      isActive: filters?.isActive,
      search: filters?.search,
      cursor: undefined,
      limit: filters?.limit || 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    {
      enabled: true,
    }
  ) || {
    data: null,
    isPending: false,
    error: null,
    refetch: () => {},
  };

  return {
    userList,
    isPending,
    error,
    refetch,
  };
}

/**
 * 批量操作Hook
 */
export function useBatchOperations() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // 批量更新用户等级
  const updateUserLevel = api.admin?.batchUpdateUserLevel?.useMutation({
    onMutate: () => setIsProcessing(true),
    onSettled: () => setIsProcessing(false),
    onSuccess: () => {
      setSelectedUserIds([]);
    },
  }) || {
    mutate: () => {},
    isPending: false,
  };

  // 批量更新用户状态 - 使用userManagement子路由
  const updateUserStatus = api.admin?.userManagement?.batchUpdateUserStatus?.useMutation({
    onMutate: () => setIsProcessing(true),
    onSettled: () => setIsProcessing(false),
    onSuccess: () => {
      setSelectedUserIds([]);
    },
  }) || {
    mutate: () => {},
    isPending: false,
  };

  // 批量删除用户 - 使用userManagement子路由
  const deleteUsers = api.admin?.userManagement?.batchDeleteUsers?.useMutation({
    onMutate: () => setIsProcessing(true),
    onSettled: () => setIsProcessing(false),
    onSuccess: () => {
      setSelectedUserIds([]);
    },
  }) || {
    mutate: () => {},
    isPending: false,
  };

  // 选择用户
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = (userIds: string[]) => {
    setSelectedUserIds(prev =>
      prev.length === userIds.length ? [] : userIds
    );
  };

  // 清空选择
  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  return {
    // 状态
    isProcessing,
    selectedUserIds,

    // 操作方法
    updateUserLevel,
    updateUserStatus,
    deleteUsers,
    toggleUserSelection,
    toggleSelectAll,
    clearSelection,
  };
}

/**
 * 用户搜索Hook
 */
export function useUserSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    userLevel: "",
    isActive: undefined as boolean | undefined,
  });

  // 搜索用户 - 使用getUsers API
  const {
    data: searchResults,
    isPending: isSearching,
    error: searchError,
  } = api.admin?.getUsers?.useQuery(
    {
      search: searchTerm,
      userLevel: filters.userLevel || undefined,
      isActive: filters.isActive,
      limit: 50,
      cursor: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    {
      enabled: searchTerm.length > 0,
    }
  ) || {
    data: null,
    isPending: false,
    error: null,
  };

  // 更新搜索词
  const updateSearchTerm = (term: string) => {
    setSearchTerm(term);
  };

  // 更新过滤器
  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // 清空搜索
  const clearSearch = () => {
    setSearchTerm("");
    setFilters({
      userLevel: "",
      isActive: undefined,
    });
  };

  return {
    // 状态
    searchTerm,
    filters,
    searchResults,
    isSearching,
    searchError,

    // 操作方法
    updateSearchTerm,
    updateFilters,
    clearSearch,
  };
}

/**
 * 用户活动统计Hook
 */
export function useUserActivity(timeRange: 'day' | 'week' | 'month' = 'week') {
  const {
    data: activityData,
    isPending: isPending,
    error,
    refetch,
  } = api.admin?.analytics?.getUserActivityStats?.useQuery(
    undefined, // 该路由不接受参数
    {
      enabled: true,
      refetchInterval: 60000, // 每分钟刷新一次
    }
  ) || {
    data: null,
    isPending: false,
    error: null,
    refetch: () => {},
  };

  // 计算活动指标
  const activityMetrics = useMemo(() => {
    if (!activityData || !Array.isArray(activityData)) return null;

    return {
      totalSessions: activityData.reduce((sum: number, item: any) => sum + (item.sessions || 0), 0),
      avgSessionDuration: activityData.reduce((sum: number, item: any) => sum + (item.avgDuration || 0), 0) / activityData.length,
      totalPageViews: activityData.reduce((sum: number, item: any) => sum + (item.pageViews || 0), 0),
      bounceRate: activityData.reduce((sum: number, item: any) => sum + (item.bounceRate || 0), 0) / activityData.length,
    };
  }, [activityData]);

  return {
    activityData,
    activityMetrics,
    isPending,
    error,
    refetch,
  };
}

/**
 * 用户增长趋势Hook
 */
export function useUserGrowthTrend(days: number = 30) {
  const {
    data: growthData,
    isPending: isPending,
    error,
    refetch,
  } = api.admin?.analytics?.getUserGrowthStats?.useQuery(
    undefined, // 该路由不接受参数
    {
      enabled: true,
    }
  ) || {
    data: null,
    isPending: false,
    error: null,
    refetch: () => {},
  };

  // 计算增长指标
  const growthMetrics = useMemo(() => {
    if (!growthData) return null;

    // growthData 是对象，不是数组
    const { newUsers, growthRate } = growthData;

    return {
      totalGrowth: newUsers?.last30Days || 0,
      dailyGrowth: newUsers?.last24Hours || 0,
      growthRate: growthRate?.daily || 0,
      avgDailyGrowth: (newUsers?.last30Days || 0) / 30,
    };
  }, [growthData, days]);

  return {
    growthData,
    growthMetrics,
    isPending,
    error,
    refetch,
  };
}
