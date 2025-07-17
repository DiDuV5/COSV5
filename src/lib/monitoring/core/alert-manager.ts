/**
 * @fileoverview 告警管理器 - CoserEden平台
 * @description 告警规则管理和告警事件处理
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type {
  AlertRule,
  AlertEvent,
  AlertQueryOptions,
  MetricData,
  IAlertManager,
  MonitoringConfig,
} from './monitoring-types';

/**
 * 告警管理器类
 * 负责告警规则管理和告警事件处理
 */
export class AlertManager extends EventEmitter implements IAlertManager {
  private alertRules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, AlertEvent>();
  private alertHistory: AlertEvent[] = [];
  private _isRunning = false;
  private evaluationInterval?: NodeJS.Timeout;
  private config: MonitoringConfig;
  private metricsProvider?: (name: string, timeRange?: { start: number; end: number }) => MetricData[];

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.setupDefaultAlertRules();
  }

  /**
   * 初始化告警管理器
   */
  public async initialize(): Promise<void> {
    this.log('INFO', '初始化告警管理器...');

    if (!this.config.enableAlerts) {
      this.log('INFO', '告警功能已禁用');
      return;
    }

    this.log('INFO', '✅ 告警管理器初始化完成');
  }

  /**
   * 启动告警检查
   */
  public start(): void {
    if (this._isRunning) {
      this.log('WARN', '告警管理器已在运行');
      return;
    }

    if (!this.config.enableAlerts) {
      this.log('INFO', '告警功能已禁用，跳过启动');
      return;
    }

    this._isRunning = true;
    this.startAlertEvaluation();
    this.log('INFO', '✅ 告警管理器已启动');
  }

  /**
   * 停止告警检查
   */
  public stop(): void {
    if (!this._isRunning) {
      this.log('WARN', '告警管理器未在运行');
      return;
    }

    this._isRunning = false;

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = undefined;
    }

    this.log('INFO', '✅ 告警管理器已停止');
  }

  /**
   * 检查是否正在运行
   */
  public isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * 获取状态
   */
  public getStatus(): string {
    return this._isRunning ? 'running' : 'stopped';
  }

  /**
   * 设置指标提供者
   */
  public setMetricsProvider(provider: (name: string, timeRange?: { start: number; end: number }) => MetricData[]): void {
    this.metricsProvider = provider;
  }

  /**
   * 添加告警规则
   */
  public addRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.log('INFO', `添加告警规则: ${rule.name}`, { rule });
  }

  /**
   * 移除告警规则
   */
  public removeRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.delete(ruleId);

      // 移除相关的活跃告警
      const activeAlert = this.activeAlerts.get(ruleId);
      if (activeAlert) {
        this.resolveAlert(activeAlert);
      }

      this.log('INFO', `移除告警规则: ${rule.name}`);
    }
  }

  /**
   * 获取告警规则
   */
  public getRule(ruleId: string): AlertRule | undefined {
    return this.alertRules.get(ruleId);
  }

  /**
   * 获取所有告警规则
   */
  public getAllRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * 启用/禁用告警规则
   */
  public toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.log('INFO', `${enabled ? '启用' : '禁用'}告警规则: ${rule.name}`);
    }
  }

  /**
   * 评估告警规则
   */
  public evaluateRules(): void {
    if (!this.metricsProvider) {
      this.log('WARN', '未设置指标提供者，跳过告警评估');
      return;
    }

    for (const rule of Array.from(this.alertRules.values())) {
      if (!rule.enabled) continue;

      try {
        this.evaluateRule(rule);
      } catch (error) {
        this.log('ERROR', `告警规则评估失败: ${rule.name}`, { error });
      }
    }
  }

  /**
   * 获取活跃告警
   */
  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   */
  public getAlertHistory(options?: AlertQueryOptions): AlertEvent[] {
    let alerts = this.alertHistory;

    if (options?.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }

    if (options?.status) {
      alerts = alerts.filter(a => a.status === options.status);
    }

    if (options?.ruleId) {
      alerts = alerts.filter(a => a.ruleId === options.ruleId);
    }

    if (options?.timeRange) {
      alerts = alerts.filter(a =>
        a.startTime >= options.timeRange!.start &&
        a.startTime <= options.timeRange!.end
      );
    }

    return alerts.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * 手动触发告警
   */
  public triggerAlert(ruleId: string, currentValue: number, message?: string): void {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`告警规则不存在: ${ruleId}`);
    }

    const alert: AlertEvent = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      severity: rule.severity,
      status: 'firing',
      startTime: Date.now(),
      message: message || `手动触发: ${rule.name}`,
    };

    this.fireAlert(alert);
  }

  /**
   * 手动解决告警
   */
  public resolveAlert(alert: AlertEvent): void {
    if (alert.status === 'resolved') {
      this.log('WARN', `告警已解决: ${alert.id}`);
      return;
    }

    alert.status = 'resolved';
    alert.endTime = Date.now();

    this.activeAlerts.delete(alert.ruleId);
    this.alertHistory.push(alert);

    this.emit('alertResolved', alert);
    this.log('INFO', `告警解决: ${alert.message}`, { alert });
  }

  /**
   * 获取告警统计
   */
  public getAlertStats(): {
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
  } {
    const totalRules = this.alertRules.size;
    const enabledRules = Array.from(this.alertRules.values()).filter(r => r.enabled).length;
    const activeAlerts = this.activeAlerts.size;
    const totalAlerts = this.alertHistory.length + activeAlerts;

    const alertsBySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    // 统计活跃告警
    for (const alert of Array.from(this.activeAlerts.values())) {
      alertsBySeverity[alert.severity]++;
    }

    // 统计历史告警
    for (const alert of this.alertHistory) {
      alertsBySeverity[alert.severity]++;
    }

    return {
      totalRules,
      enabledRules,
      activeAlerts,
      totalAlerts,
      alertsBySeverity,
    };
  }

  // 私有方法

  private startAlertEvaluation(): void {
    const interval = this.config.alertCheckInterval || 30000;

    this.evaluationInterval = setInterval(() => {
      this.evaluateRules();
    }, interval);

    this.log('INFO', `启动告警评估，间隔: ${interval}ms`);
  }

  private evaluateRule(rule: AlertRule): void {
    if (!this.metricsProvider) return;

    const metrics = this.metricsProvider(rule.metric, {
      start: Date.now() - rule.duration,
      end: Date.now(),
    });

    if (metrics.length === 0) return;

    const latestMetric = metrics[metrics.length - 1];
    const isTriggered = this.evaluateCondition(latestMetric.value, rule.condition, rule.threshold);

    const existingAlert = this.activeAlerts.get(rule.id);

    if (isTriggered && !existingAlert) {
      // 触发新告警
      const alert: AlertEvent = {
        id: this.generateAlertId(),
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        currentValue: latestMetric.value,
        threshold: rule.threshold,
        severity: rule.severity,
        status: 'firing',
        startTime: Date.now(),
        message: `${rule.name}: ${rule.metric} ${rule.condition} ${rule.threshold} (当前值: ${latestMetric.value})`,
      };

      this.fireAlert(alert);

    } else if (!isTriggered && existingAlert && existingAlert.status === 'firing') {
      // 解决告警
      this.resolveAlert(existingAlert);
    }
  }

  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  }

  private fireAlert(alert: AlertEvent): void {
    this.activeAlerts.set(alert.ruleId, alert);
    this.emit('alert', alert);
    this.log('WARN', `告警触发: ${alert.message}`, { alert });

    // 执行告警动作
    this.executeAlertActions(alert);
  }

  private executeAlertActions(alert: AlertEvent): void {
    const rule = this.alertRules.get(alert.ruleId);
    if (!rule) return;

    for (const action of rule.actions) {
      try {
        this.executeAction(action, alert);
      } catch (error) {
        this.log('ERROR', `告警动作执行失败: ${action}`, { error, alert });
      }
    }
  }

  private executeAction(action: string, alert: AlertEvent): void {
    switch (action) {
      case 'log':
        this.log('WARN', `[告警] ${alert.message}`, { alert });
        break;
      case 'email':
        // 这里应该实现邮件发送逻辑
        this.log('INFO', `发送告警邮件: ${alert.message}`);
        break;
      case 'sms':
        // 这里应该实现短信发送逻辑
        this.log('INFO', `发送告警短信: ${alert.message}`);
        break;
      case 'webhook':
        // 这里应该实现Webhook调用逻辑
        this.log('INFO', `调用告警Webhook: ${alert.message}`);
        break;
      default:
        this.log('WARN', `未知的告警动作: ${action}`);
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_memory_usage',
        name: '内存使用率过高',
        metric: 'system.memory.heap_used',
        condition: 'gt',
        threshold: 1024 * 1024 * 1024, // 1GB
        duration: 300000, // 5分钟
        severity: 'high',
        enabled: true,
        actions: ['log', 'email'],
      },
      {
        id: 'high_event_loop_delay',
        name: '事件循环延迟过高',
        metric: 'system.event_loop_delay',
        condition: 'gt',
        threshold: 100, // 100ms
        duration: 60000, // 1分钟
        severity: 'medium',
        enabled: true,
        actions: ['log'],
      },
      {
        id: 'database_unhealthy',
        name: '数据库服务不健康',
        metric: 'health.database.status',
        condition: 'eq',
        threshold: 0,
        duration: 30000, // 30秒
        severity: 'critical',
        enabled: true,
        actions: ['log', 'email', 'sms'],
      },
    ];

    defaultRules.forEach(rule => this.addRule(rule));
    this.log('INFO', '设置默认告警规则');
  }

  private log(level: string, message: string, metadata?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    switch (level) {
      case 'ERROR':
        console.error(logMessage, metadata);
        break;
      case 'WARN':
        console.warn(logMessage, metadata);
        break;
      case 'INFO':
        console.info(logMessage, metadata);
        break;
      case 'DEBUG':
        console.debug(logMessage, metadata);
        break;
    }

    this.emit('log', { timestamp, level, message, metadata, service: 'alert-manager' });
  }
}
