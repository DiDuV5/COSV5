/**
 * @fileoverview R2告警系统
 * @description 处理R2监控的告警生成、管理和通知
 */

import { EventEmitter } from 'events';
import {
  type R2AlertEvent,
  type R2AlertType,
  type R2AlertThresholds,
  type R2Metrics,
  type R2MonitorEventType,
  type R2MonitorEventData,
  createAlertEvent,
  shouldAlert,
} from '../types/r2-monitor-types';

/**
 * 告警规则
 */
interface AlertRule {
  id: string;
  name: string;
  type: R2AlertType;
  condition: (metrics: R2Metrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // 冷却时间（毫秒）
  enabled: boolean;
}

/**
 * 告警通知配置
 */
interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpConfig?: any;
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channel?: string;
  };
}

/**
 * R2告警系统
 */
export class AlertSystem extends EventEmitter {
  private activeAlerts = new Map<string, R2AlertEvent>();
  private alertHistory: R2AlertEvent[] = [];
  private alertRules: AlertRule[] = [];
  private lastAlertTime = new Map<string, number>();
  private thresholds: R2AlertThresholds;
  private notificationConfig: NotificationConfig;

  constructor(
    thresholds: R2AlertThresholds,
    notificationConfig: NotificationConfig = {}
  ) {
    super();
    this.thresholds = thresholds;
    this.notificationConfig = notificationConfig;
    this.initializeDefaultRules();
  }

  /**
   * 检查指标并生成告警
   */
  async checkMetrics(metrics: R2Metrics): Promise<R2AlertEvent[]> {
    const newAlerts: R2AlertEvent[] = [];

    // 使用内置规则检查
    const builtinAlerts = shouldAlert(metrics, this.thresholds);
    newAlerts.push(...builtinAlerts);

    // 使用自定义规则检查
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(metrics)) {
          const alert = this.createCustomAlert(rule, metrics);
          if (this.shouldTriggerAlert(alert)) {
            newAlerts.push(alert);
          }
        }
      } catch (error) {
        console.error(`告警规则 ${rule.name} 执行失败:`, error);
      }
    }

    // 处理新告警
    for (const alert of newAlerts) {
      await this.processAlert(alert);
    }

    // 检查已解决的告警
    await this.checkResolvedAlerts(metrics);

    return newAlerts;
  }

  /**
   * 处理告警
   */
  private async processAlert(alert: R2AlertEvent): Promise<void> {
    // 添加到活跃告警
    this.activeAlerts.set(alert.id, alert);

    // 添加到历史记录
    this.alertHistory.push(alert);

    // 限制历史记录数量
    if (this.alertHistory.length > 1000) {
      this.alertHistory.splice(0, this.alertHistory.length - 1000);
    }

    // 更新最后告警时间
    this.lastAlertTime.set(alert.type, Date.now());

    // 发送通知
    await this.sendNotification(alert);

    // 发出事件
    this.emit('alert', { alert } as R2MonitorEventData['alert']);

    console.warn('🚨 R2告警:', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });
  }

  /**
   * 检查已解决的告警
   */
  private async checkResolvedAlerts(metrics: R2Metrics): Promise<void> {
    const resolvedAlerts: R2AlertEvent[] = [];

    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (this.isAlertResolved(alert, metrics)) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        resolvedAlerts.push(alert);
        this.activeAlerts.delete(alertId);
      }
    }

    // 通知已解决的告警
    for (const alert of resolvedAlerts) {
      await this.sendResolutionNotification(alert);
      this.emit('alertResolved', { alert });
    }
  }

  /**
   * 判断告警是否已解决
   */
  private isAlertResolved(alert: R2AlertEvent, metrics: R2Metrics): boolean {
    switch (alert.type) {
      case 'connection_failed':
        return metrics.connection.isConnected;

      case 'high_response_time':
        return metrics.performance.averageResponseTime <= this.thresholds.responseTime;

      case 'high_error_rate':
        return metrics.performance.errorRate <= this.thresholds.errorRate;

      case 'cdn_unavailable':
        return metrics.cdn.cdnAvailable;

      case 'health_degraded':
        return metrics.health.score >= this.thresholds.healthScore;

      default:
        return false;
    }
  }

  /**
   * 创建自定义告警
   */
  private createCustomAlert(rule: AlertRule, metrics: R2Metrics): R2AlertEvent {
    return createAlertEvent(
      rule.type,
      rule.severity,
      `自定义规则触发: ${rule.name}`,
      metrics
    );
  }

  /**
   * 判断是否应该触发告警
   */
  private shouldTriggerAlert(alert: R2AlertEvent): boolean {
    const lastTime = this.lastAlertTime.get(alert.type);
    if (!lastTime) return true;

    // 检查冷却时间
    const rule = this.alertRules.find(r => r.type === alert.type);
    const cooldown = rule?.cooldown || 300000; // 默认5分钟冷却

    return Date.now() - lastTime > cooldown;
  }

  /**
   * 发送告警通知
   */
  private async sendNotification(alert: R2AlertEvent): Promise<void> {
    try {
      // 邮件通知
      if (this.notificationConfig.email?.enabled) {
        await this.sendEmailNotification(alert);
      }

      // Webhook通知
      if (this.notificationConfig.webhook?.enabled) {
        await this.sendWebhookNotification(alert);
      }

      // Slack通知
      if (this.notificationConfig.slack?.enabled) {
        await this.sendSlackNotification(alert);
      }
    } catch (error) {
      console.error('发送告警通知失败:', error);
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(alert: R2AlertEvent): Promise<void> {
    // 简化实现，实际需要集成邮件服务
    console.log('📧 邮件告警通知:', {
      to: this.notificationConfig.email?.recipients,
      subject: `R2监控告警: ${alert.type}`,
      body: alert.message,
    });
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(alert: R2AlertEvent): Promise<void> {
    if (!this.notificationConfig.webhook?.url) return;

    try {
      const response = await fetch(this.notificationConfig.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.notificationConfig.webhook.headers,
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook响应错误: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook通知失败:', error);
    }
  }

  /**
   * 发送Slack通知
   */
  private async sendSlackNotification(alert: R2AlertEvent): Promise<void> {
    if (!this.notificationConfig.slack?.webhookUrl) return;

    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000',
      critical: '#8b0000',
    }[alert.severity];

    const payload = {
      channel: this.notificationConfig.slack.channel,
      attachments: [{
        color,
        title: `R2监控告警: ${alert.type}`,
        text: alert.message,
        fields: [
          {
            title: '严重程度',
            value: alert.severity,
            short: true,
          },
          {
            title: '时间',
            value: alert.timestamp.toISOString(),
            short: true,
          },
        ],
      }],
    };

    try {
      const response = await fetch(this.notificationConfig.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack响应错误: ${response.status}`);
      }
    } catch (error) {
      console.error('Slack通知失败:', error);
    }
  }

  /**
   * 发送解决通知
   */
  private async sendResolutionNotification(alert: R2AlertEvent): Promise<void> {
    console.log('✅ 告警已解决:', {
      type: alert.type,
      resolvedAt: alert.resolvedAt,
    });
  }

  /**
   * 添加自定义告警规则
   */
  addRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    this.alertRules.push({
      id,
      ...rule,
    });

    return id;
  }

  /**
   * 移除告警规则
   */
  removeRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): R2AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit: number = 100): R2AlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * 获取告警统计
   */
  getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  } {
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const alert of this.alertHistory) {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    }

    return {
      total: this.alertHistory.length,
      active: this.activeAlerts.size,
      resolved: this.alertHistory.filter(a => a.resolved).length,
      bySeverity,
      byType,
    };
  }

  /**
   * 手动解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(alertId);
      this.emit('alertResolved', { alert });
      return true;
    }
    return false;
  }

  /**
   * 清理历史告警
   */
  clearHistory(olderThanDays: number = 30): number {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = this.alertHistory.length;

    this.alertHistory = this.alertHistory.filter(
      alert => alert.timestamp.getTime() > cutoffTime
    );

    return initialLength - this.alertHistory.length;
  }

  /**
   * 初始化默认规则
   */
  private initializeDefaultRules(): void {
    // 连接失败规则
    this.addRule({
      name: '连接失败检测',
      type: 'connection_failed',
      condition: (metrics) => !metrics.connection.isConnected,
      severity: 'critical',
      cooldown: 60000, // 1分钟
      enabled: true,
    });

    // 高响应时间规则
    this.addRule({
      name: '响应时间过高',
      type: 'high_response_time',
      condition: (metrics) => metrics.performance.averageResponseTime > this.thresholds.responseTime,
      severity: 'medium',
      cooldown: 300000, // 5分钟
      enabled: true,
    });

    // 高错误率规则
    this.addRule({
      name: '错误率过高',
      type: 'high_error_rate',
      condition: (metrics) => metrics.performance.errorRate > this.thresholds.errorRate,
      severity: 'high',
      cooldown: 300000, // 5分钟
      enabled: true,
    });
  }
}
