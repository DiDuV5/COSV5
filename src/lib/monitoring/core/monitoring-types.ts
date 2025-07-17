/**
 * @fileoverview 监控系统类型定义 - CoserEden平台
 * @description 监控系统的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

/**
 * 日志级别定义
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

/**
 * 监控指标类型
 */
export interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * 性能指标
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  timestamp: number;
  details?: Record<string, any>;
  error?: string;
}

/**
 * 系统状态
 */
export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
  services: HealthCheckResult[];
  lastUpdated: number;
}

/**
 * 告警规则
 */
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'ne';
  threshold: number;
  duration: number; // 持续时间（毫秒）
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  actions: string[]; // 告警动作
}

/**
 * 告警事件
 */
export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved';
  startTime: number;
  endTime?: number;
  message: string;
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  enableAlerts: boolean;
  logLevel: string;
  healthCheckInterval: number;
  metricsCollectionInterval: number;
  alertCheckInterval: number;
  dataRetentionHours: number;
  maxMetricsPerType: number;
  maxPerformanceMetrics: number;
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  service: string;
}

/**
 * 时间范围
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * 指标查询选项
 */
export interface MetricQueryOptions {
  name?: string;
  timeRange?: TimeRange;
  tags?: Record<string, string>;
  limit?: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

/**
 * 性能查询选项
 */
export interface PerformanceQueryOptions {
  operation?: string;
  timeRange?: TimeRange;
  success?: boolean;
  limit?: number;
}

/**
 * 告警查询选项
 */
export interface AlertQueryOptions {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'firing' | 'resolved';
  timeRange?: TimeRange;
  ruleId?: string;
}

/**
 * 系统资源信息
 */
export interface SystemResources {
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  eventLoopDelay: number;
}

/**
 * 服务健康检查配置
 */
export interface HealthCheckConfig {
  service: string;
  enabled: boolean;
  interval: number;
  timeout: number;
  retries: number;
  endpoint?: string;
  expectedStatus?: number;
  customCheck?: () => Promise<boolean>;
}

/**
 * 告警动作配置
 */
export interface AlertActionConfig {
  type: 'log' | 'email' | 'sms' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

/**
 * 监控事件类型
 */
export type MonitoringEventType = 
  | 'metric'
  | 'performance'
  | 'healthCheck'
  | 'alert'
  | 'alertResolved'
  | 'log'
  | 'systemStatus';

/**
 * 监控事件数据
 */
export interface MonitoringEvent {
  type: MonitoringEventType;
  timestamp: number;
  data: any;
  source: string;
}

/**
 * 指标聚合结果
 */
export interface MetricAggregation {
  name: string;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  value: number;
  timeRange: TimeRange;
  dataPoints: number;
}

/**
 * 性能统计
 */
export interface PerformanceStats {
  operation: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  timeRange: TimeRange;
}

/**
 * 监控器接口
 */
export interface IMonitor {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getStatus(): string;
}

/**
 * 指标收集器接口
 */
export interface IMetricsCollector extends IMonitor {
  collectMetrics(): Promise<void>;
  recordMetric(metric: MetricData): void;
  getMetrics(options?: MetricQueryOptions): MetricData[];
}

/**
 * 健康检查器接口
 */
export interface IHealthChecker extends IMonitor {
  checkHealth(): Promise<void>;
  addHealthCheck(config: HealthCheckConfig): void;
  removeHealthCheck(service: string): void;
  getHealthStatus(service?: string): HealthCheckResult | HealthCheckResult[];
}

/**
 * 告警管理器接口
 */
export interface IAlertManager extends IMonitor {
  addRule(rule: AlertRule): void;
  removeRule(ruleId: string): void;
  evaluateRules(): void;
  getActiveAlerts(): AlertEvent[];
  getAlertHistory(options?: AlertQueryOptions): AlertEvent[];
}
