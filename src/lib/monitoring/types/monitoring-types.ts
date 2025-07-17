/**
 * @fileoverview 监控系统类型定义
 * @description 定义监控系统的所有类型和接口
 */

/**
 * 监控指标主接口
 */
export interface MonitoringMetrics {
  timestamp: Date;
  storage: StorageMetrics;
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
  business: BusinessMetrics;
  system: SystemMetrics;
}

/**
 * 存储相关指标
 */
export interface StorageMetrics {
  r2Connection: boolean;
  r2ResponseTime: number;
  cdnResponseTime: number;
  uploadSuccessRate: number;
  storageUsage: number;
  fileCount: number;
}

/**
 * 性能相关指标
 */
export interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  databaseQueryTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

/**
 * 错误相关指标
 */
export interface ErrorMetrics {
  uploadErrors: number;
  transcodeErrors: number;
  authErrors: number;
  databaseErrors: number;
  totalErrors: number;
}

/**
 * 业务相关指标
 */
export interface BusinessMetrics {
  activeUsers: number;
  dailyUploads: number;
  storageGrowth: number;
  userEngagement: number;
}

/**
 * 系统相关指标
 */
export interface SystemMetrics {
  uptime: number;
  diskUsage: number;
  networkLatency: number;
  serviceHealth: 'healthy' | 'warning' | 'critical';
}

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

/**
 * 告警配置接口
 */
export interface AlertConfig {
  level: AlertLevel;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  enabled: boolean;
  cooldown: number; // 冷却时间（毫秒）
}

/**
 * 监控配置接口
 */
export interface MonitoringConfig {
  interval: number; // 监控间隔（毫秒）
  retentionDays: number; // 数据保留天数
  alertConfigs: AlertConfig[];
  enabledModules: {
    storage: boolean;
    performance: boolean;
    errors: boolean;
    business: boolean;
    system: boolean;
  };
}

/**
 * 告警事件接口
 */
export interface AlertEvent {
  id: string;
  level: AlertLevel;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * 监控状态接口
 */
export interface MonitoringStatus {
  isRunning: boolean;
  startTime?: Date;
  lastMetricsCollection?: Date;
  totalMetricsCollected: number;
  totalAlertsTriggered: number;
  currentHealth: 'healthy' | 'warning' | 'critical';
}

/**
 * 指标历史数据接口
 */
export interface MetricsHistory {
  metric: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
  aggregation: 'avg' | 'min' | 'max' | 'sum';
}

/**
 * 监控报告接口
 */
export interface MonitoringReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalUptime: number;
    averageResponseTime: number;
    totalErrors: number;
    alertsTriggered: number;
  };
  trends: {
    storageGrowth: number;
    userGrowth: number;
    performanceChange: number;
  };
  recommendations: string[];
}

/**
 * 默认监控配置
 */
export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  interval: 60000, // 1分钟
  retentionDays: 30,
  enabledModules: {
    storage: true,
    performance: true,
    errors: true,
    business: true,
    system: true,
  },
  alertConfigs: [
    {
      level: AlertLevel.WARNING,
      metric: 'storage.diskUsage',
      threshold: 80,
      operator: 'gt',
      enabled: true,
      cooldown: 300000, // 5分钟
    },
    {
      level: AlertLevel.CRITICAL,
      metric: 'storage.diskUsage',
      threshold: 90,
      operator: 'gt',
      enabled: true,
      cooldown: 300000,
    },
    {
      level: AlertLevel.WARNING,
      metric: 'performance.apiResponseTime',
      threshold: 2000,
      operator: 'gt',
      enabled: true,
      cooldown: 600000, // 10分钟
    },
    {
      level: AlertLevel.CRITICAL,
      metric: 'errors.totalErrors',
      threshold: 100,
      operator: 'gt',
      enabled: true,
      cooldown: 300000,
    },
  ],
};

/**
 * 监控事件类型
 */
export enum MonitoringEventType {
  METRICS_COLLECTED = 'metrics_collected',
  ALERT_TRIGGERED = 'alert_triggered',
  ALERT_RESOLVED = 'alert_resolved',
  MONITORING_STARTED = 'monitoring_started',
  MONITORING_STOPPED = 'monitoring_stopped',
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * 监控事件数据接口
 */
export interface MonitoringEventData {
  type: MonitoringEventType;
  timestamp: Date;
  data: any;
  source: string;
}

/**
 * 指标收集器接口
 */
export interface MetricsCollector {
  name: string;
  enabled: boolean;
  collect(): Promise<any>;
  validate(data: any): boolean;
}

/**
 * 告警处理器接口
 */
export interface AlertHandler {
  name: string;
  enabled: boolean;
  handle(alert: AlertEvent): Promise<void>;
  canHandle(alert: AlertEvent): boolean;
}

/**
 * 监控插件接口
 */
export interface MonitoringPlugin {
  name: string;
  version: string;
  enabled: boolean;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  getMetrics?(): Promise<any>;
  handleAlert?(alert: AlertEvent): Promise<void>;
}

/**
 * 工具函数：获取指标值
 */
export function getMetricValue(metrics: MonitoringMetrics, metricPath: string): number {
  const parts = metricPath.split('.');
  let value: any = metrics;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return 0;
    }
  }
  
  return typeof value === 'number' ? value : 0;
}

/**
 * 工具函数：评估告警条件
 */
export function evaluateAlertCondition(value: number, config: AlertConfig): boolean {
  switch (config.operator) {
    case 'gt':
      return value > config.threshold;
    case 'lt':
      return value < config.threshold;
    case 'eq':
      return value === config.threshold;
    default:
      return false;
  }
}

/**
 * 工具函数：格式化指标值
 */
export function formatMetricValue(value: number, metric: string): string {
  if (metric.includes('Time') || metric.includes('Latency')) {
    return `${value}ms`;
  } else if (metric.includes('Usage') || metric.includes('Rate')) {
    return `${value.toFixed(1)}%`;
  } else if (metric.includes('Size') || metric.includes('Storage')) {
    return formatBytes(value);
  } else {
    return value.toString();
  }
}

/**
 * 工具函数：格式化字节数
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 工具函数：计算百分比变化
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * 工具函数：生成告警ID
 */
export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 工具函数：检查指标是否健康
 */
export function isMetricHealthy(value: number, metric: string): boolean {
  const healthyThresholds: Record<string, number> = {
    'storage.diskUsage': 80,
    'performance.apiResponseTime': 2000,
    'performance.databaseQueryTime': 1000,
    'errors.totalErrors': 50,
    'system.memoryUsage': 85,
    'system.cpuUsage': 80,
  };
  
  const threshold = healthyThresholds[metric];
  if (threshold === undefined) return true;
  
  return value <= threshold;
}
