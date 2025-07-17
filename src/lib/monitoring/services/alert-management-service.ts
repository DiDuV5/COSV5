/**
 * @fileoverview 告警管理服务
 * @description 负责处理监控告警的触发、通知和管理
 */

import { EventEmitter } from 'events';
import {
  AlertConfig,
  AlertEvent,
  AlertLevel,
  MonitoringMetrics,
  getMetricValue,
  evaluateAlertCondition,
  generateAlertId,
} from '../types/monitoring-types';

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
 * 控制台告警处理器
 */
export class ConsoleAlertHandler implements AlertHandler {
  name = 'console';
  enabled = true;

  canHandle(alert: AlertEvent): boolean {
    return true; // 控制台处理器可以处理所有告警
  }

  async handle(alert: AlertEvent): Promise<void> {
    const emoji = this.getAlertEmoji(alert.level);
    const timestamp = alert.timestamp.toISOString();

    console.log(`${emoji} [${alert.level.toUpperCase()}] ${timestamp}`);
    console.log(`   指标: ${alert.metric}`);
    console.log(`   当前值: ${alert.value}`);
    console.log(`   阈值: ${alert.threshold}`);
    console.log(`   消息: ${alert.message}`);
    console.log('---');
  }

  private getAlertEmoji(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO:
        return 'ℹ️';
      case AlertLevel.WARNING:
        return '⚠️';
      case AlertLevel.CRITICAL:
        return '🚨';
      case AlertLevel.EMERGENCY:
        return '🆘';
      default:
        return '📢';
    }
  }
}

/**
 * 邮件告警处理器
 */
export class EmailAlertHandler implements AlertHandler {
  name = 'email';
  enabled = false; // 默认禁用，需要配置邮件服务

  canHandle(alert: AlertEvent): boolean {
    // 只处理WARNING级别以上的告警
    return alert.level === AlertLevel.WARNING ||
           alert.level === AlertLevel.CRITICAL ||
           alert.level === AlertLevel.EMERGENCY;
  }

  async handle(alert: AlertEvent): Promise<void> {
    try {
      // 这里应该集成实际的邮件服务
      console.log(`📧 发送邮件告警: ${alert.message}`);

      // 模拟邮件发送
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`✅ 邮件告警发送成功: ${alert.id}`);
    } catch (error) {
      console.error(`❌ 邮件告警发送失败: ${alert.id}`, error);
    }
  }
}

/**
 * Webhook告警处理器
 */
export class WebhookAlertHandler implements AlertHandler {
  name = 'webhook';
  enabled = false;
  private webhookUrl: string;

  constructor(webhookUrl: string = '') {
    this.webhookUrl = webhookUrl;
    this.enabled = !!webhookUrl;
  }

  canHandle(alert: AlertEvent): boolean {
    return this.enabled && !!this.webhookUrl;
  }

  async handle(alert: AlertEvent): Promise<void> {
    try {
      const payload = {
        id: alert.id,
        level: alert.level,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        console.log(`🔗 Webhook告警发送成功: ${alert.id}`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ Webhook告警发送失败: ${alert.id}`, error);
    }
  }
}

/**
 * 告警管理服务
 */
export class AlertManagementService extends EventEmitter {
  private alertConfigs: AlertConfig[] = [];
  private alertHandlers: AlertHandler[] = [];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private lastAlerts: Map<string, number> = new Map();
  private alertHistory: AlertEvent[] = [];

  constructor() {
    super();
    this.initializeDefaultHandlers();
  }

  /**
   * 初始化默认告警处理器
   */
  private initializeDefaultHandlers(): void {
    this.alertHandlers = [
      new ConsoleAlertHandler(),
      new EmailAlertHandler(),
      new WebhookAlertHandler(process.env.COSEREEDEN_ALERT_WEBHOOK_URL),
    ];
  }

  /**
   * 设置告警配置
   */
  public setAlertConfigs(configs: AlertConfig[]): void {
    this.alertConfigs = configs;
    console.log(`📋 已设置 ${configs.length} 个告警配置`);
  }

  /**
   * 添加告警处理器
   */
  public addAlertHandler(handler: AlertHandler): void {
    this.alertHandlers.push(handler);
    console.log(`➕ 已添加告警处理器: ${handler.name}`);
  }

  /**
   * 移除告警处理器
   */
  public removeAlertHandler(handlerName: string): void {
    const index = this.alertHandlers.findIndex(h => h.name === handlerName);
    if (index !== -1) {
      this.alertHandlers.splice(index, 1);
      console.log(`➖ 已移除告警处理器: ${handlerName}`);
    }
  }

  /**
   * 检查告警条件
   */
  public async checkAlerts(metrics: MonitoringMetrics): Promise<void> {
    for (const alertConfig of this.alertConfigs) {
      if (!alertConfig.enabled) continue;

      try {
        await this.evaluateAlert(alertConfig, metrics);
      } catch (error) {
        console.error(`❌ 告警评估失败: ${alertConfig.metric}`, error);
      }
    }
  }

  /**
   * 评估单个告警
   */
  private async evaluateAlert(config: AlertConfig, metrics: MonitoringMetrics): Promise<void> {
    const value = getMetricValue(metrics, config.metric);
    const shouldAlert = evaluateAlertCondition(value, config);

    if (shouldAlert) {
      await this.triggerAlert(config, value, metrics);
    } else {
      // 检查是否需要解决现有告警
      await this.resolveAlert(config, value);
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(
    config: AlertConfig,
    value: number,
    metrics: MonitoringMetrics
  ): Promise<void> {
    const alertKey = `${config.metric}_${config.level}`;
    const lastAlert = this.lastAlerts.get(alertKey) || 0;
    const now = Date.now();

    // 检查冷却时间
    if (now - lastAlert < config.cooldown) {
      return;
    }

    const alert: AlertEvent = {
      id: generateAlertId(),
      level: config.level,
      metric: config.metric,
      value,
      threshold: config.threshold,
      message: this.generateAlertMessage(config, value),
      timestamp: new Date(),
      resolved: false,
    };

    // 记录告警
    this.activeAlerts.set(alertKey, alert);
    this.alertHistory.push(alert);
    this.lastAlerts.set(alertKey, now);

    // 限制历史记录数量
    if (this.alertHistory.length > 1000) {
      this.alertHistory.splice(0, 100);
    }

    console.log(`🚨 触发告警: ${alert.message}`);

    // 发送告警通知
    await this.sendAlert(alert);

    // 触发事件
    this.emit('alert', alert);
  }

  /**
   * 解决告警
   */
  private async resolveAlert(config: AlertConfig, value: number): Promise<void> {
    const alertKey = `${config.metric}_${config.level}`;
    const activeAlert = this.activeAlerts.get(alertKey);

    if (activeAlert && !activeAlert.resolved) {
      activeAlert.resolved = true;
      activeAlert.resolvedAt = new Date();

      this.activeAlerts.delete(alertKey);

      console.log(`✅ 告警已解决: ${activeAlert.message} (当前值: ${value})`);

      // 触发事件
      this.emit('alertResolved', activeAlert);
    }
  }

  /**
   * 发送告警通知
   */
  private async sendAlert(alert: AlertEvent): Promise<void> {
    const enabledHandlers = this.alertHandlers.filter(h => h.enabled && h.canHandle(alert));

    if (enabledHandlers.length === 0) {
      console.warn('⚠️ 没有可用的告警处理器');
      return;
    }

    const promises = enabledHandlers.map(async handler => {
      try {
        await handler.handle(alert);
      } catch (error) {
        console.error(`❌ 告警处理器 ${handler.name} 处理失败:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * 生成告警消息
   */
  private generateAlertMessage(config: AlertConfig, value: number): string {
    const operatorText = {
      gt: '超过',
      lt: '低于',
      eq: '等于',
    }[config.operator];

    return `${config.metric} ${operatorText}阈值: 当前值 ${value}, 阈值 ${config.threshold}`;
  }

  /**
   * 获取活动告警
   */
  public getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   */
  public getAlertHistory(limit: number = 100): AlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * 获取告警统计
   */
  public getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    byLevel: Record<AlertLevel, number>;
  } {
    const total = this.alertHistory.length;
    const active = this.activeAlerts.size;
    const resolved = total - active;

    const byLevel: Record<AlertLevel, number> = {
      [AlertLevel.INFO]: 0,
      [AlertLevel.WARNING]: 0,
      [AlertLevel.CRITICAL]: 0,
      [AlertLevel.EMERGENCY]: 0,
    };

    this.alertHistory.forEach(alert => {
      byLevel[alert.level]++;
    });

    return { total, active, resolved, byLevel };
  }

  /**
   * 清理告警历史
   */
  public cleanupAlertHistory(olderThanDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = this.alertHistory.length;

    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoffDate);

    const cleaned = initialLength - this.alertHistory.length;
    if (cleaned > 0) {
      console.log(`🧹 清理了 ${cleaned} 个过期告警记录`);
    }

    return cleaned;
  }

  /**
   * 手动解决告警
   */
  public async manuallyResolveAlert(alertId: string): Promise<boolean> {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        this.activeAlerts.delete(key);

        console.log(`✅ 手动解决告警: ${alert.message}`);
        this.emit('alertResolved', alert);
        return true;
      }
    }

    return false;
  }

  /**
   * 测试告警系统
   */
  public async testAlert(level: AlertLevel = AlertLevel.INFO): Promise<void> {
    const testAlert: AlertEvent = {
      id: generateAlertId(),
      level,
      metric: 'test.metric',
      value: 100,
      threshold: 50,
      message: '这是一个测试告警',
      timestamp: new Date(),
      resolved: false,
    };

    console.log('🧪 发送测试告警...');
    await this.sendAlert(testAlert);
  }
}
