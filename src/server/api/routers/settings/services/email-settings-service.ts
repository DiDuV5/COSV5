/**
 * @fileoverview 邮箱设置服务
 * @description 处理邮箱相关的系统设置管理
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { SettingsBaseService, SETTING_CATEGORIES, SETTING_KEYS } from './settings-base-service';
import { testEmailConnection } from '@/lib/email';
import { EmailConfigService } from '@/lib/email/services/email-config-service';
import { EmailTransportService } from '@/lib/email/services/email-transport-service';

/**
 * 邮箱设置接口
 */
export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
}

/**
 * 邮箱设置更新参数
 */
export interface EmailSettingsUpdateParams {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
}

/**
 * 邮箱连接测试结果
 */
export interface EmailTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * 邮箱设置服务类
 */
export class EmailSettingsService extends SettingsBaseService {
  constructor(db: PrismaClient) {
    super(db);
  }

  /**
   * 获取邮箱设置
   */
  async getEmailSettings(): Promise<EmailSettings> {
    const dbSettings = await this.getCategorySettings(SETTING_CATEGORIES.EMAIL);

    return {
      smtpHost: dbSettings[SETTING_KEYS.SMTP_HOST] ?? "",
      smtpPort: dbSettings[SETTING_KEYS.SMTP_PORT] ?? 587,
      smtpUser: dbSettings[SETTING_KEYS.SMTP_USER] ?? "",
      smtpPassword: dbSettings[SETTING_KEYS.SMTP_PASSWORD] ?? "",
      smtpFromName: dbSettings[SETTING_KEYS.SMTP_FROM_NAME] ?? "Cosplay Platform",
      smtpFromEmail: dbSettings[SETTING_KEYS.SMTP_FROM_EMAIL] ?? "",
    };
  }

  /**
   * 更新邮箱设置
   */
  async updateEmailSettings(params: EmailSettingsUpdateParams): Promise<EmailSettings> {
    const updates: any[] = [];

    if (params.smtpHost !== undefined) {
      this.validateSmtpHost(params.smtpHost);
      updates.push({
        key: SETTING_KEYS.SMTP_HOST,
        value: params.smtpHost,
        category: SETTING_CATEGORIES.EMAIL,
        description: 'SMTP服务器地址',
      });
    }

    if (params.smtpPort !== undefined) {
      this.validateSmtpPort(params.smtpPort);
      updates.push({
        key: SETTING_KEYS.SMTP_PORT,
        value: params.smtpPort,
        category: SETTING_CATEGORIES.EMAIL,
        description: 'SMTP服务器端口',
      });
    }

    if (params.smtpUser !== undefined) {
      updates.push({
        key: SETTING_KEYS.SMTP_USER,
        value: params.smtpUser,
        category: SETTING_CATEGORIES.EMAIL,
        description: 'SMTP用户名',
      });
    }

    if (params.smtpPassword !== undefined) {
      updates.push({
        key: SETTING_KEYS.SMTP_PASSWORD,
        value: params.smtpPassword,
        category: SETTING_CATEGORIES.EMAIL,
        description: 'SMTP密码',
      });
    }

    if (params.smtpFromName !== undefined) {
      updates.push({
        key: SETTING_KEYS.SMTP_FROM_NAME,
        value: params.smtpFromName,
        category: SETTING_CATEGORIES.EMAIL,
        description: '发件人名称',
      });
    }

    if (params.smtpFromEmail !== undefined) {
      this.validateEmail(params.smtpFromEmail);
      updates.push({
        key: SETTING_KEYS.SMTP_FROM_EMAIL,
        value: params.smtpFromEmail,
        category: SETTING_CATEGORIES.EMAIL,
        description: '发件人邮箱',
      });
    }

    if (updates.length > 0) {
      await this.updateSettings(updates);

      // 清除邮件配置缓存，确保新配置立即生效
      EmailConfigService.clearCache();
      EmailTransportService.clearCache();
      console.log('🔄 邮件配置已更新，缓存已清除');
    }

    return await this.getEmailSettings();
  }

  /**
   * 测试邮箱连接
   */
  async testEmailConnection(settings?: EmailSettings): Promise<EmailTestResult> {
    try {
      const emailSettings = settings || await this.getEmailSettings();

      // 验证必要的设置是否完整
      if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailSettings.smtpPassword) {
        return {
          success: false,
          message: '邮箱配置不完整，请检查SMTP服务器、用户名和密码设置',
        };
      }

      const result = await testEmailConnection();

      return {
        success: result.success,
        message: result.success ? '邮箱连接测试成功' : result.message || '邮箱连接测试失败',
        details: result,
      };
    } catch (error) {
      console.error('邮箱连接测试失败:', error);
      return {
        success: false,
        message: '邮箱连接测试失败: ' + (error instanceof Error ? error.message : '未知错误'),
        details: error,
      };
    }
  }

  /**
   * 发送测试邮件（使用自定义模板服务）
   */
  async sendTestEmail(params: {
    to: string;
    subject?: string;
    content?: string;
    settings?: EmailSettings;
  }): Promise<EmailTestResult> {
    try {
      const { to, subject, content, settings } = params;

      const emailSettings = settings || await this.getEmailSettings();

      // 验证必要的设置是否完整
      if (!emailSettings.smtpHost || !emailSettings.smtpUser || !emailSettings.smtpPassword) {
        return {
          success: false,
          message: '邮箱配置不完整，无法发送测试邮件',
        };
      }

      try {
        // 使用自定义模板服务获取测试邮件模板
        const { CustomEmailTemplateService } = await import('../../../../../lib/email/services/custom-template-service');
        const { EmailTemplateType } = await import('../../../../../lib/email/services/email-template-service');

        const emailContent = await CustomEmailTemplateService.getEmailTemplate(
          EmailTemplateType.TEST_EMAIL,
          {
            testTime: new Date().toLocaleString('zh-CN'),
            serverInfo: `${emailSettings.smtpHost}:${emailSettings.smtpPort}`,
            configStatus: '邮箱配置验证成功',
            recipientEmail: to,
          }
        );

        console.log(`📧 发送测试邮件到: ${to} (使用${emailContent.isCustom ? '自定义' : '默认'}模板)`);

        // 使用 EmailTransportService 发送实际邮件
        const sendResult = await EmailTransportService.sendEmail({
          to,
          subject: subject || emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        }, 'notification');

        if (sendResult.success) {
          return {
            success: true,
            message: `测试邮件已成功发送到 ${to} (使用${emailContent.isCustom ? '自定义' : '默认'}模板)`,
            details: {
              messageId: sendResult.messageId,
              attempts: sendResult.attempts,
              totalTime: sendResult.totalTime,
              templateType: emailContent.isCustom ? 'custom' : 'default',
            },
          };
        } else {
          return {
            success: false,
            message: `测试邮件发送失败: ${sendResult.error}`,
            details: sendResult.detailedError,
          };
        }
      } catch (templateError) {
        console.warn('⚠️ 自定义模板服务失败，使用回退模板:', templateError);

        // 回退到硬编码模板
        const fallbackSubject = subject || 'CoserEden 邮箱配置测试';
        const fallbackContent = content || '这是一封测试邮件，用于验证邮箱配置是否正确。';

        const sendResult = await EmailTransportService.sendEmail({
          to,
          subject: fallbackSubject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #3b82f6;">CoserEden 邮箱配置测试</h2>
              <p>${fallbackContent}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                发送时间: ${new Date().toLocaleString('zh-CN')}<br>
                发送服务器: ${emailSettings.smtpHost}:${emailSettings.smtpPort}<br>
                发件人: ${emailSettings.smtpFromName} &lt;${emailSettings.smtpFromEmail}&gt;
              </p>
            </div>
          `,
          text: fallbackContent,
        }, 'notification');

        if (sendResult.success) {
          return {
            success: true,
            message: `测试邮件已成功发送到 ${to} (使用回退模板)`,
            details: {
              messageId: sendResult.messageId,
              attempts: sendResult.attempts,
              totalTime: sendResult.totalTime,
              templateType: 'fallback',
            },
          };
        } else {
          return {
            success: false,
            message: `测试邮件发送失败: ${sendResult.error}`,
            details: sendResult.detailedError,
          };
        }
      }
    } catch (error) {
      console.error('发送测试邮件失败:', error);
      return {
        success: false,
        message: '发送测试邮件失败: ' + (error instanceof Error ? error.message : '未知错误'),
        details: error,
      };
    }
  }

  /**
   * 重置邮箱设置为默认值
   */
  async resetEmailSettings(): Promise<EmailSettings> {
    const defaultSettings: EmailSettingsUpdateParams = {
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      smtpFromName: "Cosplay Platform",
      smtpFromEmail: "",
    };

    return await this.updateEmailSettings(defaultSettings);
  }

  /**
   * 获取邮箱设置状态
   */
  async getEmailSettingsStatus(): Promise<{
    isConfigured: boolean;
    missingFields: string[];
    canSendEmail: boolean;
  }> {
    const settings = await this.getEmailSettings();
    const missingFields: string[] = [];

    if (!settings.smtpHost) missingFields.push('SMTP服务器');
    if (!settings.smtpUser) missingFields.push('SMTP用户名');
    if (!settings.smtpPassword) missingFields.push('SMTP密码');
    if (!settings.smtpFromEmail) missingFields.push('发件人邮箱');

    return {
      isConfigured: missingFields.length === 0,
      missingFields,
      canSendEmail: missingFields.length === 0,
    };
  }

  /**
   * 验证SMTP主机
   */
  private validateSmtpHost(host: string): void {
    if (!host || typeof host !== 'string') {
      throw new Error('SMTP服务器地址不能为空');
    }

    // 简单的主机名验证
    const hostRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!hostRegex.test(host)) {
      throw new Error('SMTP服务器地址格式不正确');
    }
  }

  /**
   * 验证SMTP端口
   */
  private validateSmtpPort(port: number): void {
    if (typeof port !== 'number' || port < 1 || port > 65535) {
      throw new Error('SMTP端口必须在1-65535之间');
    }
  }

  /**
   * 验证邮箱地址
   */
  private validateEmail(email: string): void {
    if (!email || typeof email !== 'string') {
      throw new Error('邮箱地址不能为空');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('邮箱地址格式不正确');
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createEmailSettingsService = (db: PrismaClient) => new EmailSettingsService(db);
