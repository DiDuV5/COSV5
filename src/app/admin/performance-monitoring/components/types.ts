/**
 * @fileoverview 实时性能指标组件类型定义
 * @description 定义实时性能监控相关的TypeScript类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

/**
 * 缓存统计数据
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  penetrationPrevented: number;
  warmupExecuted: number;
  dynamicTTLAdjustments: number;
}

/**
 * 权限统计数据
 */
export interface PermissionStats {
  totalChecks: number;
  averageCheckTime: number;
  cacheHits: number;
  auditLogsGenerated: number;
  resourceAccessChecks: number;
}

/**
 * 系统健康状态类型
 */
export type SystemHealth = 'excellent' | 'good' | 'warning' | 'critical';

/**
 * 实时指标数据
 */
export interface RealTimeMetricsData {
  currentQPS: number;
  averageResponseTime: number;
  activeConnections: number;
  recentSlowQueries: number;
  // 可选字段，如果API没有返回则使用默认值
  cacheHitRate?: number;
  systemHealth?: SystemHealth;
  redisConnected?: boolean;
  databaseConnected?: boolean;
  // P1级缓存优化监控数据
  cacheStats?: CacheStats;
  // P1级权限控制监控数据
  permissionStats?: PermissionStats;
}

/**
 * 实时指标组件Props
 */
export interface RealTimeMetricsProps {
  data?: RealTimeMetricsData;
  isLoading: boolean;
}

/**
 * 指标卡片通用Props
 */
export interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: {
    text: string;
    variant: 'outline' | 'default';
    className?: string;
  };
  className?: string;
}

/**
 * 系统健康状态卡片Props
 */
export interface SystemHealthCardProps {
  systemHealth: SystemHealth;
  redisConnected: boolean;
  databaseConnected: boolean;
  recentSlowQueries: number;
  className?: string;
}

/**
 * 缓存性能监控卡片Props
 */
export interface CachePerformanceCardProps {
  cacheStats: CacheStats;
  className?: string;
}

/**
 * 权限性能监控卡片Props
 */
export interface PermissionPerformanceCardProps {
  permissionStats: PermissionStats;
  className?: string;
}

/**
 * 工具函数类型
 */
export interface MetricsUtils {
  formatNumber: (num: number, decimals?: number) => string;
  formatPercentage: (num: number) => string;
  getHealthColor: (health: SystemHealth) => string;
  getHealthText: (health: SystemHealth) => string;
  getResponseTimeStatus: (time: number) => 'fast' | 'medium' | 'slow';
  getConnectionStatus: (connections: number) => 'low' | 'medium' | 'high';
  getCacheHitRateStatus: (rate: number) => 'excellent' | 'good' | 'poor';
}
