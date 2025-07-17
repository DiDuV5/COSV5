/**
 * @fileoverview 通知处理器
 * @description 负责发送存储预警通知
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { 
  StorageAlert, 
  MonitorConfig,
  EmailNotificationData,
  WebhookNotificationData 
} from './types';
import { formatFileSize } from './utils';

/**
 * 通知处理器
 */
export class NotificationHandler {
  /**
   * 发送预警通知
   */
  public async sendAlert(alert: StorageAlert, config: MonitorConfig): Promise<void> {
    const promises: Promise<void>[] = [];

    // 发送邮件通知
    if (config.enableEmailNotification && config.adminEmails.length > 0) {
      promises.push(this.sendEmailNotification(alert, config));
    }

    // 发送Webhook通知
    if (config.enableWebhookNotification && config.webhookUrl) {
      promises.push(this.sendWebhookNotification(alert, config));
    }

    // 并行发送所有通知
    await Promise.allSettled(promises);
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(
    alert: StorageAlert,
    config: MonitorConfig
  ): Promise<void> {
    try {
      const emailData = this.createEmailNotificationData(alert, config);
      
      // 这里应该集成实际的邮件发送服务
      // 例如：await emailService.send(emailData);
      console.log('发送邮件通知:', emailData);
      
      // 模拟邮件发送
      await this.simulateEmailSend(emailData);
    } catch (error) {
      console.error('发送邮件通知失败:', error);
      throw error;
    }
  }

  /**
   * 发送Webhook通知
   */
  private async sendWebhookNotification(
    alert: StorageAlert,
    config: MonitorConfig
  ): Promise<void> {
    try {
      const webhookData = this.createWebhookNotificationData(alert);
      
      const response = await fetch(config.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`Webhook请求失败: ${response.status} ${response.statusText}`);
      }

      console.log('Webhook通知发送成功');
    } catch (error) {
      console.error('发送Webhook通知失败:', error);
      throw error;
    }
  }

  /**
   * 创建邮件通知数据
   */
  private createEmailNotificationData(
    alert: StorageAlert,
    config: MonitorConfig
  ): EmailNotificationData {
    const subject = `存储空间${alert.level}预警 - ${alert.diskInfo.path}`;
    
    const message = this.createEmailMessage(alert);

    return {
      to: config.adminEmails,
      subject,
      message,
    };
  }

  /**
   * 创建邮件消息内容
   */
  private createEmailMessage(alert: StorageAlert): string {
    const { diskInfo, directoryInfo } = alert;
    
    let message = `存储空间预警通知\n\n`;
    message += `预警级别: ${alert.level}\n`;
    message += `预警时间: ${alert.timestamp.toLocaleString()}\n`;
    message += `预警消息: ${alert.message}\n\n`;
    
    message += `磁盘信息:\n`;
    message += `- 路径: ${diskInfo.path}\n`;
    message += `- 总容量: ${formatFileSize(Number(diskInfo.total))}\n`;
    message += `- 已使用: ${formatFileSize(Number(diskInfo.used))} (${diskInfo.usage.toFixed(1)}%)\n`;
    message += `- 剩余空间: ${formatFileSize(Number(diskInfo.free))}\n\n`;
    
    if (directoryInfo.length > 0) {
      message += `目录使用情况:\n`;
      directoryInfo
        .sort((a, b) => b.size - a.size)
        .slice(0, 5) // 只显示前5个最大的目录
        .forEach(dir => {
          message += `- ${dir.path}: ${formatFileSize(dir.size)} (${dir.fileCount} 个文件)\n`;
        });
    }
    
    message += `\n请及时清理磁盘空间以确保系统正常运行。`;
    
    return message;
  }

  /**
   * 创建Webhook通知数据
   */
  private createWebhookNotificationData(alert: StorageAlert): WebhookNotificationData {
    return {
      type: 'storage_alert',
      level: alert.level,
      message: alert.message,
      data: {
        diskInfo: alert.diskInfo,
        directoryInfo: alert.directoryInfo,
      },
      timestamp: alert.timestamp.toISOString(),
    };
  }

  /**
   * 模拟邮件发送（用于测试）
   */
  private async simulateEmailSend(emailData: EmailNotificationData): Promise<void> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`模拟邮件发送到: ${emailData.to.join(', ')}`);
    console.log(`主题: ${emailData.subject}`);
    console.log(`内容: ${emailData.message.substring(0, 100)}...`);
  }

  /**
   * 测试通知配置
   */
  public async testNotificationConfig(config: MonitorConfig): Promise<{
    email: { success: boolean; error?: string };
    webhook: { success: boolean; error?: string };
  }> {
    const results = {
      email: { success: false, error: undefined as string | undefined },
      webhook: { success: false, error: undefined as string | undefined },
    };

    // 测试邮件通知
    if (config.enableEmailNotification && config.adminEmails.length > 0) {
      try {
        const testEmailData: EmailNotificationData = {
          to: config.adminEmails,
          subject: '存储监控系统 - 测试通知',
          message: '这是一条测试通知，用于验证邮件通知配置是否正常工作。',
        };
        
        await this.simulateEmailSend(testEmailData);
        results.email.success = true;
      } catch (error) {
        results.email.error = error instanceof Error ? error.message : '未知错误';
      }
    }

    // 测试Webhook通知
    if (config.enableWebhookNotification && config.webhookUrl) {
      try {
        const testWebhookData: WebhookNotificationData = {
          type: 'test_notification',
          level: 'WARNING' as any,
          message: '这是一条测试通知',
          data: {
            diskInfo: {
              path: '/test',
              total: 1000000000,
              used: 500000000,
              free: 500000000,
              usage: 50,
              timestamp: new Date(),
            },
            directoryInfo: [],
          },
          timestamp: new Date().toISOString(),
        };

        const response = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testWebhookData),
        });

        if (response.ok) {
          results.webhook.success = true;
        } else {
          results.webhook.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        results.webhook.error = error instanceof Error ? error.message : '未知错误';
      }
    }

    return results;
  }

  /**
   * 批量发送通知
   */
  public async sendBatchAlerts(
    alerts: StorageAlert[],
    config: MonitorConfig
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const alert of alerts) {
      try {
        await this.sendAlert(alert, config);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `发送预警通知失败 (${alert.level}): ${error instanceof Error ? error.message : '未知错误'}`
        );
      }
    }

    return results;
  }

  /**
   * 创建通知摘要
   */
  public createNotificationSummary(alerts: StorageAlert[]): string {
    if (alerts.length === 0) {
      return '没有新的存储预警';
    }

    const summary = alerts.reduce((acc, alert) => {
      acc[alert.level] = (acc[alert.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts: string[] = [];
    
    if (summary.EMERGENCY) {
      parts.push(`${summary.EMERGENCY}个紧急预警`);
    }
    if (summary.CRITICAL) {
      parts.push(`${summary.CRITICAL}个严重预警`);
    }
    if (summary.WARNING) {
      parts.push(`${summary.WARNING}个警告预警`);
    }

    return `存储监控摘要: ${parts.join(', ')}`;
  }
}
