/**
 * @fileoverview R2监控服务类型定义
 * @description 定义R2监控相关的所有类型和接口
 */

/**
 * R2监控配置
 */
export interface R2MonitorConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  endpoint: string;
  cdnDomain?: string;
  monitoringInterval: number;
  maxRetries: number;
  timeout: number;
  enableCDNMonitoring: boolean;
  alertThresholds: R2AlertThresholds;
}

/**
 * R2告警阈值配置
 */
export interface R2AlertThresholds {
  connectionTimeout: number;
  responseTime: number;
  errorRate: number;
  storageUsage: number;
  cdnResponseTime: number;
  healthScore: number;
}

/**
 * R2监控指标
 */
export interface R2Metrics {
  timestamp: Date;
  connection: R2ConnectionMetrics;
  performance: R2PerformanceMetrics;
  storage: R2StorageMetrics;
  cdn: R2CDNMetrics;
  health: R2HealthStatus;
}

/**
 * R2连接指标
 */
export interface R2ConnectionMetrics {
  isConnected: boolean;
  connectionTime: number;
  lastError?: string;
  retryCount: number;
  endpoint: string;
  region: string;
}

/**
 * R2性能指标
 */
export interface R2PerformanceMetrics {
  listObjectsTime: number;
  headBucketTime: number;
  averageResponseTime: number;
  throughput: number; // MB/s
  operationsPerSecond: number;
  errorRate: number;
  latencyP95: number;
  latencyP99: number;
}

/**
 * R2存储指标
 */
export interface R2StorageMetrics {
  objectCount: number;
  totalSize: number; // bytes
  bucketExists: boolean;
  lastModified?: Date;
  storageClass: string;
  versioning: boolean;
  encryption: boolean;
  lifecycle: boolean;
}

/**
 * R2 CDN指标
 */
export interface R2CDNMetrics {
  cdnResponseTime: number;
  cdnAvailable: boolean;
  cacheHitRate: number;
  edgeLocations: string[];
  bandwidth: number;
  requests: number;
  errors: number;
}

/**
 * R2健康状态
 */
export interface R2HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  recommendations: string[];
  score: number; // 0-100
  components: {
    connection: 'healthy' | 'degraded' | 'unhealthy';
    performance: 'healthy' | 'degraded' | 'unhealthy';
    storage: 'healthy' | 'degraded' | 'unhealthy';
    cdn: 'healthy' | 'degraded' | 'unhealthy';
  };
}

/**
 * R2告警事件
 */
export interface R2AlertEvent {
  id: string;
  type: R2AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metrics: R2Metrics;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * R2告警类型
 */
export type R2AlertType =
  | 'connection_failed'
  | 'high_response_time'
  | 'high_error_rate'
  | 'storage_quota_exceeded'
  | 'cdn_unavailable'
  | 'health_degraded';

/**
 * R2监控报告
 */
export interface R2MonitoringReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    uptime: number;
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    storageUsed: number;
    cdnHitRate: number;
  };
  trends: {
    responseTime: number[];
    throughput: number[];
    errorRate: number[];
    storageGrowth: number[];
  };
  incidents: R2AlertEvent[];
  recommendations: string[];
}

/**
 * R2操作统计
 */
export interface R2OperationStats {
  operation: string;
  count: number;
  totalTime: number;
  averageTime: number;
  successRate: number;
  errors: string[];
}

/**
 * 默认R2监控配置
 */
export const DEFAULT_R2_MONITOR_CONFIG: Partial<R2MonitorConfig> = {
  region: 'auto',
  monitoringInterval: 60000, // 1分钟
  maxRetries: 3,
  timeout: 30000, // 30秒
  enableCDNMonitoring: true,
  alertThresholds: {
    connectionTimeout: 10000, // 10秒
    responseTime: 5000, // 5秒
    errorRate: 0.05, // 5%
    storageUsage: 0.9, // 90%
    cdnResponseTime: 2000, // 2秒
    healthScore: 70, // 70分以下告警
  },
};

/**
 * R2监控事件类型
 */
export type R2MonitorEventType =
  | 'metrics'
  | 'alert'
  | 'error'
  | 'connected'
  | 'disconnected'
  | 'performance_degraded'
  | 'storage_warning';

/**
 * R2监控事件数据
 */
export interface R2MonitorEventData {
  metrics: { metrics: R2Metrics };
  alert: { alert: R2AlertEvent };
  error: { error: Error };
  connected: { connectionTime: number };
  disconnected: { reason: string };
  performance_degraded: { metrics: R2PerformanceMetrics };
  storage_warning: { usage: number; threshold: number };
}

/**
 * 工具函数：格式化存储大小
 */
export function formatStorageSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 工具函数：计算健康分数
 */
export function calculateHealthScore(metrics: R2Metrics): number {
  let score = 100;

  // 连接状态 (30%)
  if (!metrics.connection.isConnected) {
    score -= 30;
  } else if (metrics.connection.connectionTime > 5000) {
    score -= 15;
  }

  // 性能指标 (40%)
  if (metrics.performance.averageResponseTime > 3000) {
    score -= 20;
  } else if (metrics.performance.averageResponseTime > 1000) {
    score -= 10;
  }

  if (metrics.performance.errorRate > 0.05) {
    score -= 20;
  } else if (metrics.performance.errorRate > 0.01) {
    score -= 10;
  }

  // 存储状态 (20%)
  if (!metrics.storage.bucketExists) {
    score -= 20;
  }

  // CDN状态 (10%)
  if (!metrics.cdn.cdnAvailable) {
    score -= 10;
  } else if (metrics.cdn.cdnResponseTime > 2000) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * 工具函数：确定健康状态
 */
export function determineHealthStatus(score: number): 'healthy' | 'degraded' | 'unhealthy' {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'degraded';
  return 'unhealthy';
}

/**
 * 工具函数：生成健康建议
 */
export function generateHealthRecommendations(metrics: R2Metrics): string[] {
  const recommendations: string[] = [];

  if (!metrics.connection.isConnected) {
    recommendations.push('检查R2服务连接配置和网络状态');
  }

  if (metrics.performance.averageResponseTime > 3000) {
    recommendations.push('优化请求频率或考虑使用CDN加速');
  }

  if (metrics.performance.errorRate > 0.05) {
    recommendations.push('检查API调用逻辑，减少错误请求');
  }

  if (metrics.storage.totalSize > 1024 * 1024 * 1024 * 100) { // 100GB
    recommendations.push('考虑实施数据生命周期管理策略');
  }

  if (!metrics.cdn.cdnAvailable) {
    recommendations.push('检查CDN配置和域名解析');
  }

  if (metrics.cdn.cacheHitRate < 0.8) {
    recommendations.push('优化缓存策略以提高CDN命中率');
  }

  return recommendations;
}

/**
 * 工具函数：创建告警事件
 */
export function createAlertEvent(
  type: R2AlertType,
  severity: 'low' | 'medium' | 'high' | 'critical',
  message: string,
  metrics: R2Metrics
): R2AlertEvent {
  return {
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    type,
    severity,
    message,
    timestamp: new Date(),
    metrics,
    resolved: false,
  };
}

/**
 * 工具函数：检查是否需要告警
 */
export function shouldAlert(metrics: R2Metrics, thresholds: R2AlertThresholds): R2AlertEvent[] {
  const alerts: R2AlertEvent[] = [];

  // 连接超时告警
  if (!metrics.connection.isConnected) {
    alerts.push(createAlertEvent(
      'connection_failed',
      'critical',
      `R2连接失败: ${metrics.connection.lastError}`,
      metrics
    ));
  }

  // 响应时间告警
  if (metrics.performance.averageResponseTime > thresholds.responseTime) {
    alerts.push(createAlertEvent(
      'high_response_time',
      'medium',
      `R2响应时间过高: ${metrics.performance.averageResponseTime}ms`,
      metrics
    ));
  }

  // 错误率告警
  if (metrics.performance.errorRate > thresholds.errorRate) {
    alerts.push(createAlertEvent(
      'high_error_rate',
      'high',
      `R2错误率过高: ${(metrics.performance.errorRate * 100).toFixed(2)}%`,
      metrics
    ));
  }

  // CDN不可用告警
  if (!metrics.cdn.cdnAvailable) {
    alerts.push(createAlertEvent(
      'cdn_unavailable',
      'medium',
      'CDN服务不可用',
      metrics
    ));
  }

  // 健康分数告警
  if (metrics.health.score < thresholds.healthScore) {
    alerts.push(createAlertEvent(
      'health_degraded',
      metrics.health.score < 30 ? 'critical' : 'medium',
      `R2健康分数过低: ${metrics.health.score}`,
      metrics
    ));
  }

  return alerts;
}
