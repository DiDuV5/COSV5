/**
 * @fileoverview 统一平台系统类型定义
 * @description 定义平台系统相关的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 平台初始化状态
 */
export interface PlatformInitializationStatus {
  configManager: {
    initialized: boolean;
    healthy: boolean;
    conflicts: number;
    criticalIssues: number;
  };
  monitoringSystem: {
    initialized: boolean;
    metricsEnabled: boolean;
    healthChecksEnabled: boolean;
    activeAlerts: number;
  };
  overall: {
    status: 'initializing' | 'healthy' | 'degraded' | 'failed';
    readyForProduction: boolean;
    startupTime: number;
    version: string;
  };
}

/**
 * 平台健康状态
 */
export interface PlatformHealthStatus {
  timestamp: number;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  
  configuration: {
    status: 'healthy' | 'warning' | 'error';
    conflicts: number;
    criticalIssues: number;
    lastChecked: number;
  };
  
  monitoring: {
    status: 'healthy' | 'warning' | 'error';
    metricsCollected: number;
    alertsActive: number;
    lastMetricTime: number;
  };
  
  performance: {
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  
  dependencies: {
    database: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    cache: 'healthy' | 'warning' | 'error';
    external: 'healthy' | 'warning' | 'error';
  };
  
  recommendations: string[];
}

/**
 * 平台配置摘要
 */
export interface PlatformConfigSummary {
  environment: string;
  version: string;
  features: {
    monitoring: boolean;
    healthChecks: boolean;
    autoRecovery: boolean;
    debugging: boolean;
  };
  performance: {
    maxConcurrentRequests: number;
    requestTimeout: number;
    cacheEnabled: boolean;
    compressionEnabled: boolean;
  };
  security: {
    authenticationEnabled: boolean;
    rateLimitingEnabled: boolean;
    encryptionEnabled: boolean;
    auditLoggingEnabled: boolean;
  };
  integrations: {
    database: boolean;
    storage: boolean;
    cache: boolean;
    monitoring: boolean;
  };
}

/**
 * 系统指标
 */
export interface SystemMetrics {
  timestamp: number;
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
  application: {
    activeUsers: number;
    activeConnections: number;
    queueSize: number;
    cacheHitRate: number;
  };
}

/**
 * 平台事件
 */
export interface PlatformEvent {
  id: string;
  type: 'initialization' | 'configuration' | 'monitoring' | 'health' | 'error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: number;
  source: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * 初始化选项
 */
export interface InitializationOptions {
  skipConfigValidation?: boolean;
  skipMonitoringSetup?: boolean;
  skipHealthChecks?: boolean;
  enableDebugMode?: boolean;
  customConfig?: Record<string, any>;
  timeout?: number;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  valid: boolean;
  conflicts: Array<{
    key: string;
    values: any[];
    severity: 'warning' | 'error';
    recommendation: string;
  }>;
  criticalIssues: Array<{
    key: string;
    issue: string;
    impact: string;
    solution: string;
  }>;
  warnings: string[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    warningCount: number;
    errorCount: number;
  };
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  enabled: boolean;
  metricsCollection: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  alerting: {
    enabled: boolean;
    thresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'remote';
  };
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  responseTime: number;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

/**
 * 系统状态
 */
export interface SystemStatus {
  initialized: boolean;
  healthy: boolean;
  version: string;
  uptime: number;
  environment: string;
  features: string[];
  lastHealthCheck: number;
  metrics: SystemMetrics;
}

/**
 * 平台能力
 */
export interface PlatformCapabilities {
  configuration: {
    dynamicReload: boolean;
    validation: boolean;
    environmentOverrides: boolean;
  };
  monitoring: {
    realTimeMetrics: boolean;
    historicalData: boolean;
    customAlerts: boolean;
    dashboards: boolean;
  };
  health: {
    automaticChecks: boolean;
    selfHealing: boolean;
    dependencyTracking: boolean;
  };
  performance: {
    caching: boolean;
    compression: boolean;
    loadBalancing: boolean;
    scaling: boolean;
  };
}

/**
 * 错误上下文
 */
export interface ErrorContext {
  component: string;
  operation: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  metadata: Record<string, any>;
}

/**
 * 恢复策略
 */
export interface RecoveryStrategy {
  type: 'restart' | 'reset' | 'fallback' | 'manual';
  description: string;
  automated: boolean;
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 平台统计
 */
export interface PlatformStatistics {
  uptime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  peakMemoryUsage: number;
  configurationChanges: number;
  healthCheckFailures: number;
  lastRestart: number;
}

/**
 * 诊断信息
 */
export interface DiagnosticInfo {
  timestamp: number;
  version: string;
  environment: string;
  configuration: Record<string, any>;
  systemInfo: {
    platform: string;
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
  healthStatus: PlatformHealthStatus;
  recentEvents: PlatformEvent[];
  metrics: SystemMetrics;
}
