/**
 * @fileoverview 邮件发送服务（重构版）
 * @description 统一管理邮件发送功能，采用模块化架构
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

// 导入重构后的服务
import { EmailTemplateBase } from './email/services/template';
import {
  emailConfigService,
  emailTransportService,
  emailTemplateService,
  type EmailConfig,
  type SendEmailOptions,
  type SendResult,
} from './email/services';

// 直接从模板服务导入类型和枚举
import {
  EmailTemplateType,
  type TemplateVariables,
  type EmailContent,
} from './email/services/email-template-service';

// 导入错误处理相关类型
import {
  EmailError,
  EmailSendResult,
  EmailErrorType,
} from './email/types/email-error-types';

// 导入自定义模板服务
import { CustomEmailTemplateService } from './email/services/custom-template-service';

/**
 * 详细的邮件发送结果接口
 */
export interface DetailedEmailResult {
  success: boolean;
  messageId?: string;
  error?: EmailError;
  userMessage: string;
  shouldRetry: boolean;
  attempts: number;
  totalTime: number;
}

/**
 * 邮件服务管理器（重构版）
 */
export class EmailService {
  private static configService = emailConfigService();
  private static transportService = emailTransportService();
  private static templateService = emailTemplateService();

  /**
   * 发送邮件（重构版 - 使用传输服务）
   */
  static async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const result = await this.transportService.sendEmail(options);
      return result.success;
    } catch (error) {
      console.error('❌ 邮件发送失败:', error);
      return false;
    }
  }

  /**
   * 发送邮件（详细结果）
   */
  static async sendEmailWithResult(options: SendEmailOptions): Promise<SendResult> {
    return await this.transportService.sendEmail(options);
  }

  /**
   * 发送验证邮件（重构版 - 使用模板服务）
   */
  static async sendVerificationEmail(
    email: string,
    username: string,
    verificationUrl: string
  ): Promise<boolean> {
    const result = await this.sendVerificationEmailDetailed(email, username, verificationUrl);
    return result.success;
  }

  /**
   * 发送验证邮件（详细版本 - 返回完整错误信息）
   */
  static async sendVerificationEmailDetailed(
    email: string,
    username: string,
    verificationUrl: string
  ): Promise<DetailedEmailResult> {
    try {
      // 使用自定义模板服务（优先自定义模板）
      const emailContent = await CustomEmailTemplateService.getEmailTemplate(
        EmailTemplateType.VERIFICATION,
        { username, verificationUrl }
      );

      const result = await this.transportService.sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }, 'verification');

      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
          userMessage: '验证邮件已发送到您的邮箱，请注意检查垃圾邮件',
          shouldRetry: false,
          attempts: result.attempts,
          totalTime: result.totalTime,
        };
      } else {
        const detailedError = result.detailedError;
        return {
          success: false,
          error: detailedError,
          userMessage: detailedError?.userMessage || '验证邮件发送失败',
          shouldRetry: detailedError?.retryable || false,
          attempts: result.attempts,
          totalTime: result.totalTime,
        };
      }
    } catch (error) {
      console.error('❌ 发送验证邮件失败:', error);
      return {
        success: false,
        error: {
          type: EmailErrorType.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : '未知错误',
          originalError: error instanceof Error ? error : new Error(String(error)),
          userMessage: '验证邮件发送遇到未知错误',
          recoveryActions: [
            '请稍后重试',
            '联系运营 (https://t.me/CoserYYbot)',
          ],
          retryable: true,
        },
        userMessage: '验证邮件发送遇到未知错误',
        shouldRetry: true,
        attempts: 0,
        totalTime: 0,
      };
    }
  }

  /**
   * 发送密码重置邮件
   */
  static async sendPasswordResetEmail(
    email: string,
    username: string,
    resetUrl: string
  ): Promise<boolean> {
    try {
      // 使用自定义模板服务（优先自定义模板）
      const emailContent = await CustomEmailTemplateService.getEmailTemplate(
        EmailTemplateType.PASSWORD_RESET,
        { username, resetUrl }
      );

      const result = await this.transportService.sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return result.success;
    } catch (error) {
      console.error('❌ 发送密码重置邮件失败:', error);
      return false;
    }
  }

  /**
   * 发送欢迎邮件
   */
  static async sendWelcomeEmail(
    email: string,
    username: string,
    platformUrl: string = 'https://cosereeden.com'
  ): Promise<boolean> {
    try {
      const emailContent = this.templateService.generateEmailByType(
        EmailTemplateType.WELCOME,
        { username, platformUrl }
      );

      const result = await this.transportService.sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return result.success;
    } catch (error) {
      console.error('❌ 发送欢迎邮件失败:', error);
      return false;
    }
  }

  /**
   * 发送通知邮件
   */
  static async sendNotificationEmail(
    email: string,
    username: string,
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string
  ): Promise<boolean> {
    try {
      const emailContent = this.templateService.generateEmailByType(
        EmailTemplateType.NOTIFICATION,
        {
          username,
          title,
          message,
          actionUrl: actionUrl || '',
          actionText: actionText || ''
        }
      );

      const result = await this.transportService.sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return result.success;
    } catch (error) {
      console.error('❌ 发送通知邮件失败:', error);
      return false;
    }
  }

  /**
   * 发送系统告警邮件
   */
  static async sendSystemAlertEmail(
    email: string,
    alertType: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> {
    try {
      const emailContent = this.templateService.generateEmailByType(
        EmailTemplateType.SYSTEM_ALERT,
        {
          alertType,
          message,
          timestamp: new Date().toLocaleString('zh-CN'),
          severity,
        }
      );

      const result = await this.transportService.sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return result.success;
    } catch (error) {
      console.error('❌ 发送系统告警邮件失败:', error);
      return false;
    }
  }

  /**
   * 批量发送邮件（重构版 - 使用传输服务）
   */
  static async sendBulkEmails(
    emails: SendEmailOptions[],
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
    }
  ): Promise<{
    successful: number;
    failed: number;
    results: SendResult[];
  }> {
    return await this.transportService.sendBulkEmails(emails, options);
  }

  /**
   * 测试邮件连接（重构版 - 使用配置和传输服务）
   */
  static async testEmailConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.configService.getEmailConfig();
      if (!config) {
        return {
          success: false,
          message: '邮箱配置未设置或不完整',
        };
      }

      // 验证配置
      const validation = await this.configService.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `配置验证失败: ${validation.errors.join(', ')}`,
        };
      }

      // 创建传输器并验证连接
      const transporter = await this.transportService.createTransporter();
      const isValid = await this.transportService.verifyTransporter(transporter);

      if (isValid) {
        return {
          success: true,
          message: 'SMTP连接验证成功',
        };
      } else {
        return {
          success: false,
          message: 'SMTP连接验证失败',
        };
      }

    } catch (error) {
      console.error('❌ 邮箱连接测试失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '邮箱连接测试失败',
      };
    }
  }

  /**
   * 发送测试邮件（重构版 - 使用传输服务）
   */
  static async sendTestEmail(testEmail: string): Promise<SendResult> {
    return await this.transportService.testEmailSending(testEmail);
  }

  /**
   * 获取邮件配置（重构版 - 使用配置服务）
   */
  static async getEmailConfig(): Promise<EmailConfig | null> {
    return await this.configService.getEmailConfig();
  }

  /**
   * 获取配置摘要（重构版 - 使用配置服务）
   */
  static async getConfigSummary(): Promise<any> {
    const config = await this.configService.getEmailConfig();
    if (!config) {
      return null;
    }
    return this.configService.getConfigSummary(config);
  }

  /**
   * 清除缓存（重构版 - 使用配置和传输服务）
   */
  static clearCache(): void {
    this.configService.clearCache();
    this.transportService.clearCache();
  }

  /**
   * 强制重置 nodemailer（重构版 - 使用传输服务）
   */
  static forceResetNodemailer(): void {
    this.transportService.forceResetNodemailer();
  }

  /**
   * 渲染自定义模板（重构版 - 使用模板基础服务）
   */
  static renderTemplate(template: string, variables: TemplateVariables): string {
    // 使用 EmailTemplateBase 的 replaceVariables 方法
    return EmailTemplateBase.replaceVariables(template, variables);
  }

  /**
   * 获取模板内容（重构版 - 使用模板服务）
   */
  static getTemplate(type: EmailTemplateType, variables: TemplateVariables): EmailContent {
    return this.templateService.generateEmailByType(type, variables);
  }
}

// 导出兼容的函数接口
export const sendEmail = (options: SendEmailOptions) => EmailService.sendEmail(options);
export const sendVerificationEmail = (email: string, username: string, verificationUrl: string) =>
  EmailService.sendVerificationEmail(email, username, verificationUrl);
export const testEmailConnection = () => EmailService.testEmailConnection();
export const getEmailConfig = () => EmailService.getEmailConfig();

// 导出类型
export type {
  EmailConfig,
  SendEmailOptions,
  SendResult,
  // EmailTemplateType, // 暂时注释掉，避免导入错误
  // TemplateVariables, // 暂时注释掉，避免导入错误
  // EmailContent, // 暂时注释掉，避免导入错误
} from './email/services';

// EmailService已在类定义时导出，无需重复导出

/**
 * 导出服务创建函数
 */
export const createEmailService = () => EmailService;
