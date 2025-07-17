/**
 * @fileoverview 综合监控系统 - CoserEden平台（重构版）
 * @description 提供全面的系统监控、日志记录和性能追踪
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const monitoring = ComprehensiveMonitoringSystem.getInstance();
 * await monitoring.initialize();
 *
 * // 记录指标
 * monitoring.recordMetric('api.response_time', 150, 'ms');
 *
 * // 获取系统状态
 * const status = await monitoring.getSystemStatus();
 * ```
 *
 * @dependencies
 * - ./core/monitoring-types: 类型定义
 * - ./core/metrics-collector: 指标收集
 * - ./core/health-checker: 健康检查
 * - ./core/alert-manager: 告警管理
 * - ./core/system-monitor: 系统监控
 *
 * @changelog
 * - 3.0.0: 重构为模块化架构，拆分为专用处理器
 * - 2.0.0: 添加告警和健康检查功能
 * - 1.0.0: 初始版本
 */

import { EventEmitter } from 'events';
import { configManager } from '../config/unified-config-manager';

// 导入模块化组件
import { MetricsCollector } from './core/metrics-collector';
import { HealthChecker } from './core/health-checker';
import { AlertManager } from './core/alert-manager';
import { SystemMonitor } from './core/system-monitor';

// 导入类型定义
import {
  LogLevel,
  type MetricData,
  type PerformanceMetric,
  type HealthCheckResult,
  type SystemStatus,
  type AlertRule,
  type AlertEvent,
  type MonitoringConfig,
  type MetricQueryOptions,
  type PerformanceQueryOptions,
  type AlertQueryOptions,
  type HealthCheckConfig,
} from './core/monitoring-types';

// 重新导出类型以保持向后兼容
export type {
  MetricData,
  PerformanceMetric,
  HealthCheckResult,
  SystemStatus,
  AlertRule,
  AlertEvent,
  MonitoringConfig,
  MetricQueryOptions,
  PerformanceQueryOptions,
  AlertQueryOptions,
  HealthCheckConfig,
};

export { LogLevel } from './core/monitoring-types';

/**
 * 综合监控系统主类
 * 整合所有监控功能的统一入口
 */
export class ComprehensiveMonitoringSystem extends EventEmitter {
  private static instance: ComprehensiveMonitoringSystem;
  private initialized = false;

  // 模块化组件
  private metricsCollector: MetricsCollector;
  private healthChecker: HealthChecker;
  private alertManager: AlertManager;
  private systemMonitor: SystemMonitor;

  // 配置和状态
  private config: MonitoringConfig;
  private isEnabled = false;
  private logLevel = LogLevel.INFO;

  // 定时器
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    super();

    // 获取配置
    this.config = this.getMonitoringConfig();

    // 初始化模块化组件
    this.metricsCollector = new MetricsCollector(this.config);
    this.healthChecker = new HealthChecker(this.config);
    this.alertManager = new AlertManager(this.config);
    this.systemMonitor = new SystemMonitor(this.config);

    // 设置组件间的依赖关系
    this.setupComponentDependencies();

    // 转发事件
    this.setupEventForwarding();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ComprehensiveMonitoringSystem {
    if (!ComprehensiveMonitoringSystem.instance) {
      ComprehensiveMonitoringSystem.instance = new ComprehensiveMonitoringSystem();
    }
    return ComprehensiveMonitoringSystem.instance;
  }

  /**
   * 初始化监控系统
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.log(LogLevel.INFO, '初始化综合监控系统...');

      // 更新配置
      this.config = this.getMonitoringConfig();
      this.isEnabled = this.config.enableMetrics;
      this.logLevel = this.parseLogLevel(this.config.logLevel);

      if (!this.isEnabled) {
        this.log(LogLevel.INFO, '监控系统已禁用');
        return;
      }

      // 初始化各个组件
      await Promise.all([
        this.metricsCollector.initialize(),
        this.healthChecker.initialize(),
        this.alertManager.initialize(),
      ]);

      // 启动组件
      this.metricsCollector.start();
      this.healthChecker.start();
      this.alertManager.start();

      // 启动数据清理
      this.startDataCleanup();

      this.initialized = true;
      this.log(LogLevel.INFO, '✅ 综合监控系统初始化完成');

    } catch (error) {
      this.log(LogLevel.ERROR, '监控系统初始化失败', { error });
      throw error;
    }
  }

  /**
   * 记录指标
   */
  public recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    if (!this.isEnabled) return;

    const metric: MetricData = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    };

    this.metricsCollector.recordMetric(metric);
  }

  /**
   * 记录性能指标
   */
  public recordPerformance(operation: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    this.metricsCollector.recordPerformance(operation, duration, success, metadata);
  }

  /**
   * 创建性能计时器
   */
  public createTimer(operation: string): (success?: boolean, metadata?: Record<string, any>) => void {
    return this.metricsCollector.createTimer(operation);
  }

  /**
   * 记录健康检查结果
   */
  public recordHealthCheck(result: HealthCheckResult): void {
    this.healthChecker.recordHealthCheck(result);
  }

  /**
   * 添加健康检查配置
   */
  public addHealthCheck(config: HealthCheckConfig): void {
    this.healthChecker.addHealthCheck(config);
  }

  /**
   * 添加告警规则
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertManager.addRule(rule);
  }

  /**
   * 获取系统状态
   */
  public async getSystemStatus(): Promise<SystemStatus> {
    return this.systemMonitor.getSystemStatus();
  }

  /**
   * 获取指标数据
   */
  public getMetrics(options?: MetricQueryOptions): MetricData[] {
    return this.metricsCollector.getMetrics(options);
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(options?: PerformanceQueryOptions): PerformanceMetric[] {
    return this.metricsCollector.getPerformanceMetrics(options);
  }

  /**
   * 获取健康检查结果
   */
  public getHealthStatus(service?: string): HealthCheckResult | HealthCheckResult[] {
    return this.healthChecker.getHealthStatus(service);
  }

  /**
   * 获取活跃告警
   */
  public getActiveAlerts(): AlertEvent[] {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * 获取告警历史
   */
  public getAlertHistory(options?: AlertQueryOptions): AlertEvent[] {
    return this.alertManager.getAlertHistory(options);
  }

  /**
   * 日志记录
   */
  public log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (level > this.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    const logEntry = {
      timestamp,
      level: levelName,
      message,
      metadata,
      service: 'monitoring-system',
    };

    // 输出到控制台
    const logMessage = `[${timestamp}] ${levelName}: ${message}`;
    switch (level) {
      case LogLevel.ERROR:
        console.error(logMessage, metadata);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, metadata);
        break;
      case LogLevel.INFO:
        console.info(logMessage, metadata);
        break;
      case LogLevel.DEBUG:
        console.debug(logMessage, metadata);
        break;
    }

    // 发出日志事件
    this.emit('log', logEntry);

    // 记录日志指标
    this.recordMetric(`logs.${levelName.toLowerCase()}.count`, 1, 'count');
  }

  /**
   * 停止监控系统
   */
  public stop(): void {
    this.log(LogLevel.INFO, '停止监控系统...');

    // 停止各个组件
    this.metricsCollector.stop();
    this.healthChecker.stop();
    this.alertManager.stop();

    // 清理定时器
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.isEnabled = false;
    this.initialized = false;
    this.log(LogLevel.INFO, '✅ 监控系统已停止');
  }

  /**
   * 获取监控统计
   */
  public getMonitoringStats(): {
    metrics: ReturnType<MetricsCollector['getMetricStats']>;
    alerts: ReturnType<AlertManager['getAlertStats']>;
    health: { services: number; healthy: number };
    system: { status: string; uptime: number };
  } {
    const healthResults = this.healthChecker.getHealthStatus() as HealthCheckResult[];

    return {
      metrics: this.metricsCollector.getMetricStats(),
      alerts: this.alertManager.getAlertStats(),
      health: {
        services: healthResults.length,
        healthy: healthResults.filter(h => h.status === 'healthy').length,
      },
      system: {
        status: this.isEnabled ? 'running' : 'stopped',
        uptime: process.uptime(),
      },
    };
  }

  // 私有方法

  private getMonitoringConfig(): MonitoringConfig {
    try {
      const config = configManager.getConfig('monitoring') as any;
      return {
        enableMetrics: config?.enableMetrics ?? true,
        enableHealthChecks: config?.enableHealthChecks ?? true,
        enableAlerts: config?.enableAlerts ?? true,
        logLevel: config?.logLevel ?? 'info',
        healthCheckInterval: config?.healthCheckInterval ?? 60000,
        metricsCollectionInterval: config?.metricsCollectionInterval ?? 10000,
        alertCheckInterval: config?.alertCheckInterval ?? 30000,
        dataRetentionHours: config?.dataRetentionHours ?? 24,
        maxMetricsPerType: config?.maxMetricsPerType ?? 1000,
        maxPerformanceMetrics: config?.maxPerformanceMetrics ?? 10000,
      };
    } catch (error) {
      // 使用默认配置
      return {
        enableMetrics: true,
        enableHealthChecks: true,
        enableAlerts: true,
        logLevel: 'info',
        healthCheckInterval: 60000,
        metricsCollectionInterval: 10000,
        alertCheckInterval: 30000,
        dataRetentionHours: 24,
        maxMetricsPerType: 1000,
        maxPerformanceMetrics: 10000,
      };
    }
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private setupComponentDependencies(): void {
    // 设置告警管理器的指标提供者
    this.alertManager.setMetricsProvider((name, timeRange) =>
      this.metricsCollector.getMetrics({ name, timeRange })
    );

    // 设置系统监控器的健康检查提供者
    this.systemMonitor.setHealthCheckProvider(() =>
      this.healthChecker.getHealthStatus() as HealthCheckResult[]
    );
  }

  private setupEventForwarding(): void {
    // 转发各组件的事件
    this.metricsCollector.on('metric', (metric) => this.emit('metric', metric));
    this.metricsCollector.on('performance', (perf) => this.emit('performance', perf));
    this.healthChecker.on('healthCheck', (health) => this.emit('healthCheck', health));
    this.alertManager.on('alert', (alert) => this.emit('alert', alert));
    this.alertManager.on('alertResolved', (alert) => this.emit('alertResolved', alert));
    this.systemMonitor.on('systemStatus', (status) => this.emit('systemStatus', status));
  }

  private startDataCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.metricsCollector.cleanupOldData();
    }, 3600000); // 每小时清理一次

    this.log(LogLevel.INFO, '启动数据清理');
  }
}

/**
 * 导出默认实例
 */
export const comprehensiveMonitoringSystem = ComprehensiveMonitoringSystem.getInstance();
