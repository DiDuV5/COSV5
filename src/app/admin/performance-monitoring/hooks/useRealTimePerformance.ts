/**
 * @fileoverview 实时性能监控Hook
 * @description 提供WebSocket实时更新和性能数据管理
 */

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface RealTimePerformanceData {
  currentQPS: number;
  averageResponseTime: number;
  activeConnections: number;
  recentSlowQueries: number;
  cacheHitRate: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  redisConnected: boolean;
  databaseConnected: boolean;
  // P1级缓存优化监控数据
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    penetrationPrevented: number;
    warmupExecuted: number;
    dynamicTTLAdjustments: number;
  };
  // P1级权限控制监控数据
  permissionStats: {
    totalChecks: number;
    averageCheckTime: number;
    cacheHits: number;
    auditLogsGenerated: number;
    resourceAccessChecks: number;
  };
}

interface UseRealTimePerformanceOptions {
  /** 更新间隔（毫秒），默认5000ms */
  updateInterval?: number;
  /** 是否启用WebSocket实时更新 */
  enableWebSocket?: boolean;
  /** 是否自动开始监控 */
  autoStart?: boolean;
}

interface UseRealTimePerformanceReturn {
  /** 实时性能数据 */
  data: RealTimePerformanceData | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否连接中 */
  isConnected: boolean;
  /** 错误信息 */
  error: string | null;
  /** 最后更新时间 */
  lastUpdated: Date | null;
  /** 手动刷新数据 */
  refresh: () => Promise<void>;
  /** 开始监控 */
  start: () => void;
  /** 停止监控 */
  stop: () => void;
  /** 更新配置 */
  updateConfig: (options: Partial<UseRealTimePerformanceOptions>) => void;
}

export function useRealTimePerformance(
  options: UseRealTimePerformanceOptions = {}
): UseRealTimePerformanceReturn {
  const {
    updateInterval = 5000,
    enableWebSocket = false, // 暂时禁用WebSocket，使用轮询
    autoStart = true,
  } = options;

  const [data, setData] = useState<RealTimePerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isActive, setIsActive] = useState(autoStart);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef(options);

  // 更新配置
  const updateConfig = useCallback((newOptions: Partial<UseRealTimePerformanceOptions>) => {
    configRef.current = { ...configRef.current, ...newOptions };
  }, []);

  // 获取实时性能数据
  const fetchRealTimeData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 主要通过tRPC API获取实时指标，包含缓存统计
      const [realTimeMetrics, permissionStatsResponse, redisHealthResponse] = await Promise.all([
        // 使用fetch直接调用tRPC API - 这个API现在包含了完整的缓存统计
        fetch('/api/trpc/admin.performance.getRealTimeMetrics?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D')
          .then(res => res.ok ? res.json() : null)
          .catch(() => null),
        // 调用权限统计API
        fetch('/api/permissions/stats').then(res => res.ok ? res.json() : null).catch(() => null),
        // 调用Redis健康检查API
        fetch('/api/redis/health').then(res => res.ok ? res.json() : null).catch(() => null),
      ]);

      // 解析tRPC响应格式 - 支持多种可能的响应结构
      let realTimeData: any = null;

      // 尝试不同的响应结构 - 按优先级排序
      console.log('🔍 解析前检查:', {
        hasRealTimeMetrics: !!realTimeMetrics,
        isArray: Array.isArray(realTimeMetrics),
        firstItem: realTimeMetrics?.[0],
        hasJson: !!realTimeMetrics?.[0]?.json,
        hasJsonData: !!realTimeMetrics?.[0]?.json?.data,
        hasResultData: !!realTimeMetrics?.[0]?.result?.data,
        resultDataStructure: realTimeMetrics?.[0]?.result?.data
      });

      if (realTimeMetrics?.[0]?.json?.data) {
        // 直接的 json.data 结构
        realTimeData = realTimeMetrics[0].json.data;
        console.log('✅ 使用 json.data 路径:', realTimeData);
      } else if (realTimeMetrics?.[0]?.result?.data?.json?.data) {
        // 嵌套的 result.data.json.data 结构
        realTimeData = realTimeMetrics[0].result.data.json.data;
        console.log('✅ 使用 result.data.json.data 路径:', realTimeData);
      } else if (realTimeMetrics?.[0]?.result?.data) {
        realTimeData = realTimeMetrics[0].result.data;
        console.log('✅ 使用 result.data 路径:', realTimeData);
      } else if (realTimeMetrics?.[0]?.data) {
        realTimeData = realTimeMetrics[0].data;
        console.log('✅ 使用 data 路径:', realTimeData);
      } else if (realTimeMetrics?.[0]?.result) {
        realTimeData = realTimeMetrics[0].result;
        console.log('✅ 使用 result 路径:', realTimeData);
      } else if (realTimeMetrics?.[0]) {
        realTimeData = realTimeMetrics[0];
        console.log('✅ 使用 [0] 路径:', realTimeData);
      } else if (realTimeMetrics?.data) {
        realTimeData = realTimeMetrics.data;
        console.log('✅ 使用 metrics.data 路径:', realTimeData);
      } else if (realTimeMetrics && typeof realTimeMetrics === 'object') {
        realTimeData = realTimeMetrics;
        console.log('✅ 使用 metrics 路径:', realTimeData);
      }

      // 从tRPC API获取缓存统计，如果没有则从独立API获取
      const permissionStats = permissionStatsResponse?.success ? permissionStatsResponse.data : null;
      const redisHealth = redisHealthResponse?.success ? redisHealthResponse.data : null;

      // 详细调试日志
      console.log('🔍 实时性能数据调试:', {
        rawRealTimeMetrics: realTimeMetrics,
        parsedRealTimeData: realTimeData,
        databaseConnected: realTimeData?.databaseConnected,
        redisConnected: realTimeData?.redisConnected,
        systemHealth: realTimeData?.systemHealth,
        dataType: typeof realTimeData,
        dataKeys: realTimeData ? Object.keys(realTimeData) : null,
        redisHealthData: redisHealth,
      });

      // 更详细的JSON调试
      if (realTimeData && typeof realTimeData === 'object') {
        console.log('📊 完整数据结构:', JSON.stringify(realTimeData, null, 2));
      }

      if (realTimeData) {
        const enhancedData: RealTimePerformanceData = {
          // 基础性能数据
          currentQPS: realTimeData.currentQPS || 0,
          averageResponseTime: realTimeData.averageResponseTime || 0,
          activeConnections: realTimeData.activeConnections || 0,
          recentSlowQueries: realTimeData.recentSlowQueries || 0,
          cacheHitRate: realTimeData.cacheHitRate || 0,
          systemHealth: realTimeData.systemHealth || 'good',
          redisConnected: redisHealth?.isConnected ?? realTimeData.redisConnected ?? false,
          databaseConnected: realTimeData.databaseConnected ?? false,

          // 集成P1级缓存统计 - 优先使用tRPC API中的缓存统计
          cacheStats: {
            hits: realTimeData.cacheStats?.hits || 0,
            misses: realTimeData.cacheStats?.misses || 0,
            hitRate: realTimeData.cacheHitRate || 0, // 使用tRPC API的缓存命中率
            penetrationPrevented: realTimeData.cacheStats?.penetrationPrevented || 0,
            warmupExecuted: realTimeData.cacheStats?.warmupExecuted || 0,
            dynamicTTLAdjustments: realTimeData.cacheStats?.dynamicTTLAdjustments || 0,
          },

          // 集成P1级权限统计
          permissionStats: permissionStats ? {
            totalChecks: permissionStats.totalChecks || 0,
            averageCheckTime: permissionStats.averageCheckTime || 0,
            cacheHits: permissionStats.cacheHits || 0,
            auditLogsGenerated: permissionStats.auditLogsGenerated || 0,
            resourceAccessChecks: permissionStats.resourceAccessChecks || 0,
          } : {
            totalChecks: 0,
            averageCheckTime: 0,
            cacheHits: 0,
            auditLogsGenerated: 0,
            resourceAccessChecks: 0,
          },
        };

        setData(enhancedData);
        setLastUpdated(new Date());
        setIsConnected(true);

        // 调试最终数据
        console.log('✅ 最终处理后的数据:', {
          databaseConnected: enhancedData.databaseConnected,
          redisConnected: enhancedData.redisConnected,
          systemHealth: enhancedData.systemHealth,
        });
      } else {
        throw new Error('获取实时指标失败：无法解析响应数据');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      setIsConnected(false);
      console.error('获取实时性能数据失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 手动刷新
  const refresh = useCallback(async () => {
    await fetchRealTimeData();
  }, [fetchRealTimeData]);

  // 开始监控
  const start = useCallback(() => {
    setIsActive(true);
  }, []);

  // 停止监控
  const stop = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // WebSocket连接管理
  const setupWebSocket = useCallback(() => {
    if (!enableWebSocket || typeof window === 'undefined') {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/performance`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket连接已建立');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const receivedData = JSON.parse(event.data);
          if (receivedData.type === 'performance-update') {
            setData(receivedData.data);
            setLastUpdated(new Date());
          }
        } catch (err) {
          console.error('解析WebSocket消息失败:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket连接已关闭');
        setIsConnected(false);
        wsRef.current = null;

        // 自动重连
        if (isActive) {
          setTimeout(() => {
            if (isActive) {
              setupWebSocket();
            }
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setError('WebSocket连接错误');
        setIsConnected(false);
      };
    } catch (err) {
      console.error('创建WebSocket连接失败:', err);
      setError('无法建立WebSocket连接');
    }
  }, [enableWebSocket, isActive]);

  // 轮询管理
  const setupPolling = useCallback(() => {
    if (enableWebSocket) {
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (isActive) {
        fetchRealTimeData();
      }
    }, updateInterval);

    // 立即执行一次
    if (isActive) {
      fetchRealTimeData();
    }
  }, [enableWebSocket, isActive, updateInterval, fetchRealTimeData]);

  // 效果管理
  useEffect(() => {
    if (isActive) {
      if (enableWebSocket) {
        setupWebSocket();
      } else {
        setupPolling();
      }
    } else {
      stop();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isActive, enableWebSocket, setupWebSocket, setupPolling, stop]);

  // 页面可见性变化处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时暂停更新
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // 页面显示时恢复更新
        if (isActive && !enableWebSocket) {
          setupPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, enableWebSocket, setupPolling]);

  return {
    data,
    isLoading,
    isConnected,
    error,
    lastUpdated,
    refresh,
    start,
    stop,
    updateConfig,
  };
}
