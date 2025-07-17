/**
 * @fileoverview Turnstile Telegram告警集成
 * @description 集成Telegram Bot发送Turnstile降级和监控告警
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { turnstileMonitor, AlertEvent, AlertLevel } from './turnstile-monitoring';
import type { TurnstileFeatureId } from '@/types/turnstile';

/**
 * Telegram Bot配置接口
 */
interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

/**
 * Telegram消息格式化器
 */
class TelegramMessageFormatter {
  /**
   * 格式化告警消息
   */
  public static formatAlert(event: AlertEvent): string {
    const emoji = this.getAlertEmoji(event.level);
    const timestamp = event.timestamp.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai'
    });

    let message = `${emoji} *CoserEden Turnstile告警*\n\n`;
    message += `🔸 *级别*: ${event.level.toUpperCase()}\n`;
    message += `🔸 *标题*: ${event.title}\n`;
    message += `🔸 *详情*: ${event.message}\n`;
    message += `🔸 *时间*: ${timestamp}\n`;

    if (event.featureId) {
      message += `🔸 *功能*: ${event.featureId}\n`;
    }

    if (event.reason) {
      message += `🔸 *原因*: ${this.formatReason(event.reason)}\n`;
    }

    if (event.metadata) {
      message += `\n📊 *详细信息*:\n`;
      for (const [key, value] of Object.entries(event.metadata)) {
        message += `• ${key}: ${this.formatValue(value)}\n`;
      }
    }

    return message;
  }

  /**
   * 格式化健康状态报告
   */
  public static formatHealthReport(report: ReturnType<typeof turnstileMonitor.generateReport>): string {
    const { summary, health, fallbackStates } = report;
    const emoji = health.status === 'healthy' ? '✅' :
                  health.status === 'degraded' ? '⚠️' : '❌';

    let message = `${emoji} *CoserEden Turnstile健康报告*\n\n`;

    // 总体状态
    message += `🔸 *状态*: ${this.formatHealthStatus(health.status)}\n`;
    message += `🔸 *运行时间*: ${Math.round(health.uptime / 1000)}秒\n`;
    message += `🔸 *最后检查*: ${health.lastCheck.toLocaleString()}\n`;

    // 问题列表
    if (health.issues.length > 0) {
      message += `🔸 *问题*:\n`;
      health.issues.forEach(issue => {
        message += `  • ${issue}\n`;
      });
    }
    message += '\n';

    // 总体统计
    message += `📊 *总体统计*:\n`;
    message += `• 总验证次数: ${summary.totalValidations}\n`;
    message += `• 成功验证: ${summary.successfulValidations}\n`;
    message += `• 失败验证: ${summary.failedValidations}\n`;
    message += `• 降级使用: ${summary.fallbackUsages}\n`;

    // 活跃降级状态
    if (fallbackStates.length > 0) {
      message += `\n🔄 *活跃降级状态*:\n`;
      for (const state of fallbackStates) {
        message += `• ${state.featureId}: ${this.formatReason(state.reason)} (失败${state.failureCount}次)\n`;
      }
    }

    return message;
  }

  /**
   * 获取告警级别对应的emoji
   */
  private static getAlertEmoji(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO:
        return 'ℹ️';
      case AlertLevel.WARNING:
        return '⚠️';
      case AlertLevel.ERROR:
        return '❌';
      case AlertLevel.CRITICAL:
        return '🚨';
      default:
        return '📢';
    }
  }

  /**
   * 格式化健康状态
   */
  private static formatHealthStatus(status: string): string {
    switch (status) {
      case 'healthy':
        return '健康 ✅';
      case 'degraded':
        return '降级 ⚠️';
      case 'unhealthy':
        return '不健康 ❌';
      default:
        return status;
    }
  }

  /**
   * 格式化降级原因
   */
  private static formatReason(reason: string): string {
    const reasonMap: Record<string, string> = {
      'api_timeout': 'API超时',
      'api_error': 'API错误',
      'network_error': '网络错误',
      'database_error': '数据库错误',
      'service_unavailable': '服务不可用',
      'rate_limit_exceeded': '速率限制',
      'configuration_error': '配置错误'
    };
    return reasonMap[reason] || reason;
  }

  /**
   * 格式化值
   */
  private static formatValue(value: any): string {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    return String(value);
  }
}

/**
 * Telegram告警发送器
 */
export class TurnstileTelegramAlerts {
  private config: TelegramConfig;
  private lastHealthReportTime: Date = new Date(0);
  private healthReportInterval: number = 3600000; // 1小时

  constructor() {
    this.config = this.loadConfig();
    this.setupAlertHandlers();
  }

  /**
   * 加载配置
   */
  private loadConfig(): TelegramConfig {
    return {
      botToken: process.env.COSEREEDEN_TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.COSEREEDEN_TELEGRAM_CHAT_ID || '',
      enabled: process.env.COSEREEDEN_TURNSTILE_FALLBACK_TELEGRAM_ALERTS === 'true'
    };
  }

  /**
   * 设置告警处理器
   */
  private setupAlertHandlers(): void {
    if (!this.config.enabled) {
      return;
    }

    // 注册告警处理器
    turnstileMonitor.addAlertHandler(async (event: AlertEvent) => {
      await this.sendAlert(event);
    });

    // 设置定期健康报告
    setInterval(() => {
      this.sendHealthReportIfNeeded();
    }, 300000); // 每5分钟检查一次
  }

  /**
   * 发送告警消息
   */
  public async sendAlert(event: AlertEvent): Promise<void> {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      console.warn('Telegram告警未配置或已禁用');
      return;
    }

    try {
      const message = TelegramMessageFormatter.formatAlert(event);
      await this.sendTelegramMessage(message);

      console.log(`📱 Telegram告警已发送: ${event.title}`);
    } catch (error) {
      console.error('发送Telegram告警失败:', error);
    }
  }

  /**
   * 发送健康报告（如果需要）
   */
  private async sendHealthReportIfNeeded(): Promise<void> {
    const now = new Date();
    const timeSinceLastReport = now.getTime() - this.lastHealthReportTime.getTime();

    // 检查是否需要发送定期报告
    if (timeSinceLastReport >= this.healthReportInterval) {
      await this.sendHealthReport();
      this.lastHealthReportTime = now;
      return;
    }

    // 检查是否有紧急情况需要立即报告
    const health = turnstileMonitor.getHealthStatus();
    if (health.status === 'unhealthy') {
      const timeSinceLastUrgentReport = now.getTime() - this.lastHealthReportTime.getTime();
      if (timeSinceLastUrgentReport >= 600000) { // 10分钟内最多发送一次紧急报告
        await this.sendHealthReport();
        this.lastHealthReportTime = now;
      }
    }
  }

  /**
   * 发送健康报告
   */
  public async sendHealthReport(): Promise<void> {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      return;
    }

    try {
      const report = turnstileMonitor.generateReport();
      const message = TelegramMessageFormatter.formatHealthReport(report);
      await this.sendTelegramMessage(message);

      console.log('📱 Telegram健康报告已发送');
    } catch (error) {
      console.error('发送Telegram健康报告失败:', error);
    }
  }

  /**
   * 发送Telegram消息
   */
  private async sendTelegramMessage(message: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: this.config.chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API错误: ${response.status} ${errorText}`);
    }
  }

  /**
   * 测试Telegram连接
   */
  public async testConnection(): Promise<boolean> {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      return false;
    }

    try {
      await this.sendTelegramMessage('🧪 CoserEden Turnstile告警系统测试消息');
      return true;
    } catch (error) {
      console.error('Telegram连接测试失败:', error);
      return false;
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<TelegramConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * 全局Telegram告警实例
 */
export const turnstileTelegramAlerts = new TurnstileTelegramAlerts();
