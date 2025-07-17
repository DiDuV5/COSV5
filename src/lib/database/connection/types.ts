/**
 * @fileoverview 数据库连接类型定义
 * @description 数据库连接管理相关的类型定义和接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

/**
 * 数据库连接配置接口
 */
export interface DatabaseConnectionConfig {
  /** 连接池大小 */
  connectionLimit: number;
  /** 连接超时时间（毫秒） */
  connectTimeout: number;
  /** 查询超时时间（毫秒） */
  queryTimeout: number;
  /** 连接池超时时间（毫秒） */
  poolTimeout: number;
  /** 是否启用日志 */
  enableLogging: boolean;
  /** 是否启用指标收集 */
  enableMetrics: boolean;
  /** 健康检查间隔（毫秒） */
  healthCheckInterval: number;
  /** 连接池使用率警告阈值 */
  warningThreshold: number;
  /** 连接池使用率危险阈值 */
  criticalThreshold: number;
}

/**
 * 数据库连接指标接口
 */
export interface DatabaseConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  queryCount: number;
  errorCount: number;
  lastHealthCheck: Date;
}

/**
 * 健康检查结果接口
 */
export interface DatabaseHealthCheckResult {
  isHealthy: boolean;
  latency: number;
  error?: string;
}

/**
 * 连接池健康状态接口
 */
export interface ConnectionPoolHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  utilizationRate: number;
  errorRate: number;
  recommendations: string[];
  metrics: DatabaseConnectionMetrics;
}

/**
 * 使用率状态检查结果接口
 */
export interface UtilizationStatusResult {
  isCritical: boolean;
  isWarning: boolean;
  message: string;
  recommendations: string[];
}

/**
 * 错误率状态检查结果接口
 */
export interface ErrorRateStatusResult {
  isWarning: boolean;
  message: string;
  recommendations: string[];
}
