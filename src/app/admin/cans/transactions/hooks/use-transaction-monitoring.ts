/**
 * @fileoverview 交易监控Hook
 * @description 管理交易监控状态和逻辑的自定义Hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/trpc/react';
import type {
  Transaction,
  SearchFilters,
  MonitoringState,
  RealTimeConfig,
  AnomalyDetectionConfig,
  TransactionStats
} from '../types';
import {
  DEFAULT_SEARCH_FILTERS,
  DEFAULT_REALTIME_CONFIG,
  DEFAULT_ANOMALY_CONFIG
} from '../data/constants';

/**
 * 交易监控Hook返回值接口
 */
interface UseTransactionMonitoringReturn {
  // 状态
  monitoringState: MonitoringState;
  searchFilters: SearchFilters;
  realTimeConfig: RealTimeConfig;
  anomalyConfig: AnomalyDetectionConfig;

  // 数据
  transactions: Transaction[];
  transactionStats: TransactionStats | null;
  isPending: boolean;
  error: string | null;

  // 操作函数
  updateSearchFilters: (_filters: Partial<SearchFilters>) => void;
  updateRealTimeConfig: (_config: Partial<RealTimeConfig>) => void;
  updateAnomalyConfig: (config: Partial<AnomalyDetectionConfig>) => void;
  refreshData: () => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  exportData: (format: 'csv' | 'excel' | 'pdf') => Promise<void>;

  // 查询函数
  searchTransactions: (query: string) => void;
  filterTransactions: (filters: SearchFilters) => void;

  // 实时监控
  isMonitoring: boolean;
  lastUpdate: Date;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

/**
 * 交易监控管理Hook
 */
export function useTransactionMonitoring(): UseTransactionMonitoringReturn {
  // 状态管理
  const [monitoringState, setMonitoringState] = useState<MonitoringState>({
    isPending: false,
    error: null,
    lastUpdate: new Date(),
    connectionStatus: 'disconnected',
  });

  const [searchFilters, setSearchFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [realTimeConfig, setRealTimeConfig] = useState<RealTimeConfig>(DEFAULT_REALTIME_CONFIG);
  const [anomalyConfig, setAnomalyConfig] = useState<AnomalyDetectionConfig>(DEFAULT_ANOMALY_CONFIG);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // 定时器引用
  const monitoringInterval = useRef<NodeJS.Timeout | null>(null);

  // API查询
  const {
    data: transactionsData,
    refetch: refetchTransactions,
    isPending: isLoadingTransactions,
    error: transactionsError
  } = api.cans.transactions.getRecentTransactions.useQuery({
    limit: 50,
  });

  const {
    data: statsData,
    refetch: refetchStats,
    isPending: isLoadingStats
  } = api.cans.transactions.getTransactionStats.useQuery();

  // 导出数据mutation (暂时注释掉，方法不存在)
  // const exportMutation = api.cans.transactions.exportTransactions.useMutation();

  /**
   * 更新搜索筛选条件
   */
  const updateSearchFilters = useCallback((filters: Partial<SearchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...filters }));
  }, []);

  /**
   * 更新实时配置
   */
  const updateRealTimeConfig = useCallback((config: Partial<RealTimeConfig>) => {
    setRealTimeConfig(prev => ({ ...prev, ...config }));
  }, []);

  /**
   * 更新异常检测配置
   */
  const updateAnomalyConfig = useCallback((config: Partial<AnomalyDetectionConfig>) => {
    setAnomalyConfig(prev => ({ ...prev, ...config }));
  }, []);

  /**
   * 刷新数据
   */
  const refreshData = useCallback(async () => {
    setMonitoringState(prev => ({ ...prev, isPending: true, error: null }));

    try {
      await Promise.all([
        refetchTransactions(),
        refetchStats(),
      ]);

      setLastUpdate(new Date());
      setMonitoringState(prev => ({
        ...prev,
        isPending: false,
        lastUpdate: new Date(),
        connectionStatus: 'connected'
      }));
    } catch (error) {
      setMonitoringState(prev => ({
        ...prev,
        isPending: false,
        error: error instanceof Error ? error.message : '刷新失败',
        connectionStatus: 'disconnected'
      }));
    }
  }, [refetchTransactions, refetchStats]);

  /**
   * 开始监控
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    setMonitoringState(prev => ({ ...prev, connectionStatus: 'connected' }));

    // 设置定时刷新
    monitoringInterval.current = setInterval(() => {
      refreshData();
    }, realTimeConfig.refreshInterval);

    // 立即刷新一次
    refreshData();
  }, [isMonitoring, realTimeConfig.refreshInterval, refreshData]);

  /**
   * 停止监控
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    setMonitoringState(prev => ({ ...prev, connectionStatus: 'disconnected' }));

    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
  }, [isMonitoring]);

  /**
   * 导出数据
   */
  const exportData = useCallback(async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      setMonitoringState(prev => ({ ...prev, isPending: true }));

      // const result = await exportMutation.mutateAsync({
      //   format,
      //   filters: searchFilters,
      //   dateRange: {
      //     start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
      //     end: new Date(),
      //   },
      // });
      const result = { downloadUrl: null, filename: 'export.csv' };

      // 触发下载
      if (result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setMonitoringState(prev => ({ ...prev, isPending: false }));
    } catch (error) {
      setMonitoringState(prev => ({
        ...prev,
        isPending: false,
        error: error instanceof Error ? error.message : '导出失败'
      }));
    }
  }, []);

  /**
   * 搜索交易
   */
  const searchTransactions = useCallback((query: string) => {
    updateSearchFilters({ searchTerm: query });
  }, [updateSearchFilters]);

  /**
   * 筛选交易
   */
  const filterTransactions = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
  }, []);

  /**
   * 监听实时配置变化，重新设置定时器
   */
  useEffect(() => {
    if (isMonitoring && monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = setInterval(() => {
        refreshData();
      }, realTimeConfig.refreshInterval);
    }
  }, [realTimeConfig.refreshInterval, isMonitoring, refreshData]);

  /**
   * 组件卸载时清理定时器
   */
  useEffect(() => {
    return () => {
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
    };
  }, []);

  /**
   * 监听错误状态
   */
  useEffect(() => {
    if (transactionsError) {
      setMonitoringState(prev => ({
        ...prev,
        error: transactionsError.message,
        connectionStatus: 'disconnected'
      }));
    }
  }, [transactionsError]);

  /**
   * 自动重连逻辑
   */
  useEffect(() => {
    if (monitoringState.connectionStatus === 'disconnected' && isMonitoring) {
      const reconnectTimer = setTimeout(() => {
        setMonitoringState(prev => ({ ...prev, connectionStatus: 'reconnecting' }));
        refreshData();
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
    // 如果不满足条件，返回undefined（可选的清理函数）
    return undefined;
  }, [monitoringState.connectionStatus, isMonitoring, refreshData]);

  return {
    // 状态
    monitoringState,
    searchFilters,
    realTimeConfig,
    anomalyConfig,

    // 数据
    transactions: (transactionsData?.transactions || []) as unknown as Transaction[],
    transactionStats: (statsData || null) as unknown as TransactionStats | null,
    isPending: isLoadingTransactions || isLoadingStats || monitoringState.isPending,
    error: monitoringState.error,

    // 操作函数
    updateSearchFilters,
    updateRealTimeConfig,
    updateAnomalyConfig,
    refreshData,
    startMonitoring,
    stopMonitoring,
    exportData,

    // 查询函数
    searchTransactions,
    filterTransactions,

    // 实时监控
    isMonitoring,
    lastUpdate,
    connectionStatus: monitoringState.connectionStatus,
  };
}
