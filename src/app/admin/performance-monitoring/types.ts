/**
 * @fileoverview 性能监控页面类型定义
 * @description 性能监控相关的接口和类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 时间范围接口
 */
export interface TimeRange {
  label: string;
  value: number;
}

/**
 * 实时性能数据接口
 */
export interface RealTimePerformanceData {
  currentQPS?: number;
  averageResponseTime?: number;
  activeConnections?: number;
  recentSlowQueries?: number;
  cacheHitRate?: number;
  systemHealth?: 'excellent' | 'good' | 'warning' | 'critical';
  redisConnected?: boolean;
  databaseConnected?: boolean;
  cacheStats?: {
    hits: number;
    misses: number;
    hitRate: number;
    penetrationPrevented: number;
    warmupExecuted: number;
    dynamicTTLAdjustments: number;
  };
  permissionStats?: {
    totalChecks: number;
    averageCheckTime: number;
    cacheHits: number;
    auditLogsGenerated: number;
    resourceAccessChecks: number;
  };
  queriesPerSecond?: number;
  errorRate?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * 性能统计数据接口
 */
export interface PerformanceStats {
  totalQueries: number;
  slowQueries: number;
  averageDuration: number;
  slowQueryRatio: number;
  queryDistribution: Array<{
    model: string;
    count: number;
    averageDuration: number;
  }>;
  slowQueriesData?: Array<{
    id: string;
    query: string;
    duration: number;
    timestamp: string;
    model: string;
  }>;
}

/**
 * 性能报告数据接口
 */
export interface PerformanceReportData {
  overview: {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    slowQueryRatio: number;
  };
  modelStats: Record<string, {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
  }>;
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
  recommendations: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
  }>;
}

/**
 * 模型统计数据接口
 */
export interface ModelStats {
  [modelName: string]: {
    totalQueries: number;
    averageDuration: number;
    slowQueries: number;
    errorRate: number;
  };
}

/**
 * 系统监控数据接口
 */
export interface SystemMonitorData {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number;
  loadAverage: number[];
}

/**
 * 缓存性能数据接口
 */
export interface CachePerformanceData {
  timestamp: string;
  hitRate: number;
  responseTime: number;
  penetrationPrevented: number;
}

/**
 * 权限性能数据接口
 */
export interface PermissionPerformanceData {
  timestamp: string;
  checkTime: number;
  totalChecks: number;
  cacheHits: number;
}

/**
 * 增强性能图表数据接口
 */
export interface EnhancedPerformanceData {
  cachePerformance: CachePerformanceData[];
  permissionPerformance: PermissionPerformanceData[];
  performanceComparison: {
    beforeOptimization: {
      cacheHitRate: number;
      permissionCheckTime: number;
      systemResponseTime: number;
    };
    afterOptimization: {
      cacheHitRate: number;
      permissionCheckTime: number;
      systemResponseTime: number;
    };
  };
}

/**
 * 导出格式类型
 */
export type ExportFormat = 'json' | 'markdown';

/**
 * 更新间隔类型
 */
export type UpdateInterval = 5000 | 10000 | 30000 | 60000;

/**
 * 标签页类型
 */
export type TabValue = 'overview' | 'enhanced' | 'system' | 'charts' | 'reports' | 'queries';

/**
 * 性能监控配置接口
 */
export interface PerformanceMonitoringConfig {
  selectedTimeRange: number;
  updateInterval: UpdateInterval;
  enableRealTime: boolean;
  enableWebSocket: boolean;
  autoRefresh: boolean;
}

/**
 * API响应包装接口
 */
export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 性能监控Hook返回值接口
 */
export interface UsePerformanceDataReturn {
  realTimeMetrics: ApiResponse<RealTimePerformanceData> | undefined;
  performanceStats: ApiResponse<PerformanceStats> | undefined;
  performanceReport: ApiResponse<PerformanceReportData> | undefined;
  modelStats: ApiResponse<ModelStats> | undefined;
  isLoadingRealTime: boolean;
  isLoadingStats: boolean;
  isLoadingReport: boolean;
  isLoadingModelStats: boolean;
  refetchAll: () => Promise<void>;
}

/**
 * 性能监控操作Hook返回值接口
 */
export interface UsePerformanceActionsReturn {
  isRefreshing: boolean;
  lastUpdated: Date;
  handleRefresh: () => Promise<void>;
  handleUpdateInterval: (interval: UpdateInterval) => void;
  handleExport: (format: ExportFormat) => Promise<void>;
}
