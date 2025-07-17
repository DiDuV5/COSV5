/**
 * @fileoverview 邮件传输服务
 * @description 专门处理邮件传输器创建、连接管理和发送逻辑
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import * as nodemailer from 'nodemailer';
import { EmailConfigService, type EmailConfig } from './email-config-service';
import { emailErrorAnalyzer } from './email-error-analyzer';
import { emailLogger } from './email-logger';
import {
  EmailSendResult,
  EmailError,
  EmailSendContext,
  EmailErrorType,
} from '../types/email-error-types';

/**
 * 发送邮件选项接口
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * 发送结果接口（保持向后兼容）
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
  totalTime: number;
  // 新增详细错误信息
  detailedError?: EmailError;
}

/**
 * 邮件传输服务类
 */
export class EmailTransportService {
  private static transporterCache: any = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存

  /**
   * 创建邮件传输器
   */
  static async createTransporter(): Promise<any> {
    try {
      // 检查缓存
      if (this.transporterCache && Date.now() < this.cacheExpiry) {
        return this.transporterCache;
      }

      const config = await EmailConfigService.getEmailConfig();
      if (!config) {
        throw new Error('邮箱配置未设置或不完整');
      }

      // 获取提供商特定配置
      const providerConfig = EmailConfigService.getProviderConfig(config);

      // 创建传输器配置
      const transportConfig: any = {
        host: String(config.smtpHost),
        port: Number(config.smtpPort),
        secure: providerConfig.secure,
        auth: {
          user: String(config.smtpUser),
          pass: String(config.smtpPassword),
          type: 'login',
        },
        connectionTimeout: providerConfig.connectionTimeout || 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        pool: providerConfig.pool || false,
        maxConnections: providerConfig.maxConnections || 1,
        maxMessages: 1,
        reuseConnection: false,
      };

      // 添加TLS配置
      if (providerConfig.requireTLS || providerConfig.tls) {
        transportConfig.requireTLS = providerConfig.requireTLS;
        if (providerConfig.tls) {
          transportConfig.tls = providerConfig.tls;
        }
      }

      console.log('📧 创建邮件传输器:', {
        host: config.smtpHost,
        port: config.smtpPort,
        secure: transportConfig.secure,
        provider: EmailConfigService.detectProvider(config),
      });

      const transporter = nodemailer.createTransport(transportConfig);

      // 更新缓存
      this.transporterCache = transporter;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return transporter;

    } catch (error) {
      console.error('❌ 创建邮件传输器失败:', error);
      throw error;
    }
  }

  /**
   * 验证传输器连接
   */
  static async verifyTransporter(transporter: any): Promise<boolean> {
    try {
      await transporter.verify();
      console.log('✅ SMTP连接验证成功');
      return true;
    } catch (error) {
      console.error('❌ SMTP连接验证失败:', error);
      return false;
    }
  }

  /**
   * 发送邮件（带重试机制和智能错误分析）
   */
  static async sendEmail(
    options: SendEmailOptions,
    emailType: EmailSendContext['emailType'] = 'notification'
  ): Promise<SendResult> {
    const maxRetries = 3;
    const startTime = Date.now();
    let lastError: Error | null = null;
    let lastDetailedError: EmailError | null = null;

    // 创建发送上下文
    const context: EmailSendContext = {
      emailType,
      recipientEmail: options.to,
      recipientName: undefined, // 可以从options中提取
      attemptNumber: 0,
      maxAttempts: maxRetries,
      timestamp: new Date(),
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let transporter: any = null;
      context.attemptNumber = attempt;

      try {
        const config = await EmailConfigService.getEmailConfig();
        if (!config) {
          throw new Error('邮箱配置未设置，无法发送邮件');
        }

        transporter = await this.createTransporter();

        // 只对第一次尝试进行连接验证
        if (attempt === 1) {
          const isValid = await this.verifyTransporter(transporter);
          if (!isValid && attempt >= maxRetries) {
            throw new Error('SMTP连接验证失败');
          } else if (!isValid) {
            continue; // 跳到下一次重试
          }
        }

        // 构建邮件选项
        const mailOptions = this.buildMailOptions(config, options);

        console.log(`📧 发送邮件 (尝试 ${attempt}/${maxRetries}):`, {
          to: options.to,
          subject: options.subject,
          from: mailOptions.from,
        });

        const result = await transporter.sendMail(mailOptions);
        const totalTime = Date.now() - startTime;

        console.log(`✅ 邮件发送成功 (尝试 ${attempt}/${maxRetries}):`, result.messageId);

        // 开发环境调试模式
        if (process.env.COSEREEDEN_EMAIL_DEBUG_MODE === 'true' && process.env.NODE_ENV === 'development') {
          console.log('\n' + '='.repeat(80));
          console.log('🔍 开发环境邮件调试信息');
          console.log('='.repeat(80));
          console.log(`📧 收件人: ${mailOptions.to}`);
          console.log(`📋 主题: ${mailOptions.subject}`);

          // 提取验证链接
          const htmlContent = mailOptions.html || '';
          const textContent = mailOptions.text || '';

          const linkMatch = htmlContent.match(/href="([^"]*verify-email[^"]*)"/i) ||
                           textContent.match(/(https?:\/\/[^\s]*verify-email[^\s]*)/i);

          if (linkMatch) {
            console.log(`🔗 验证链接: ${linkMatch[1]}`);
            console.log('\n💡 请复制上面的验证链接到浏览器中完成验证');
          }

          console.log('='.repeat(80) + '\n');
        }

        const sendResult = {
          success: true,
          messageId: result.messageId,
          attempts: attempt,
          totalTime,
        };

        // 记录成功日志
        emailLogger.logEmailSend(context, {
          success: true,
          messageId: result.messageId,
          attempts: attempt,
          totalTime,
        });

        return sendResult;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 使用错误分析器分析错误
        lastDetailedError = emailErrorAnalyzer.analyzeError(lastError, context);

        console.error(`❌ 邮件发送失败 (尝试 ${attempt}/${maxRetries}):`, {
          error: lastError.message,
          type: lastDetailedError.type,
          userMessage: lastDetailedError.userMessage,
          retryable: lastDetailedError.retryable,
        });

        // 判断是否应该重试
        const shouldRetry = emailErrorAnalyzer.shouldRetry(lastDetailedError, attempt);

        if (shouldRetry && attempt < maxRetries) {
          const delay = emailErrorAnalyzer.getRetryDelay(lastDetailedError, attempt);
          console.log(`⏳ 等待 ${delay}ms 后重试... (错误类型: ${lastDetailedError.type})`);
          await this.sleep(delay);
        } else if (!shouldRetry) {
          console.log(`🚫 错误不可重试，停止尝试 (错误类型: ${lastDetailedError.type})`);
          break; // 不可重试的错误，直接退出循环
        }

      } finally {
        // 确保连接被关闭
        if (transporter && typeof transporter.close === 'function') {
          try {
            transporter.close();
          } catch (closeError) {
            console.warn('关闭传输器连接时出错:', closeError);
          }
        }
      }
    }

    const totalTime = Date.now() - startTime;

    // 记录最终失败的详细信息
    console.error('📧 邮件发送最终失败:', {
      recipient: options.to,
      subject: options.subject,
      emailType: context.emailType,
      totalAttempts: context.attemptNumber,
      totalTime,
      finalError: lastDetailedError?.type || 'UNKNOWN_ERROR',
      userMessage: lastDetailedError?.userMessage || '邮件发送失败',
    });

    const finalResult = {
      success: false,
      error: lastError?.message || '未知错误',
      attempts: context.attemptNumber,
      totalTime,
      detailedError: lastDetailedError || undefined,
    };

    // 记录失败日志
    emailLogger.logEmailSend(context, {
      success: false,
      error: lastDetailedError || undefined,
      attempts: context.attemptNumber,
      totalTime,
    });

    return finalResult;
  }

  /**
   * 构建邮件选项
   */
  private static buildMailOptions(config: EmailConfig, options: SendEmailOptions): any {
    const mailOptions: any = {
      from: config.smtpFromEmail, // 使用简单格式，不带显示名称
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    // 添加纯文本版本
    if (options.text) {
      mailOptions.text = options.text;
    }

    // 添加附件
    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments;
    }

    return mailOptions;
  }

  /**
   * 计算重试延迟
   */
  private static calculateRetryDelay(attempt: number): number {
    // 指数退避：1.5秒、3秒、6秒
    return attempt * 1500;
  }

  /**
   * 睡眠函数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量发送邮件
   */
  static async sendBulkEmails(
    emails: SendEmailOptions[],
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
    } = {}
  ): Promise<{
    successful: number;
    failed: number;
    results: SendResult[];
  }> {
    const { batchSize = 10, delayBetweenBatches = 1000 } = options;
    const results: SendResult[] = [];
    let successful = 0;
    let failed = 0;

    console.log(`📧 开始批量发送 ${emails.length} 封邮件，批次大小: ${batchSize}`);

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      console.log(`📧 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(emails.length / batchSize)}`);

      // 并行发送当前批次
      const batchPromises = batch.map(email => this.sendEmail(email));
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      // 统计结果
      batchResults.forEach(result => {
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      });

      // 批次间延迟
      if (i + batchSize < emails.length && delayBetweenBatches > 0) {
        console.log(`⏳ 批次间等待 ${delayBetweenBatches}ms...`);
        await this.sleep(delayBetweenBatches);
      }
    }

    console.log(`📧 批量发送完成: 成功 ${successful}，失败 ${failed}`);

    return { successful, failed, results };
  }

  /**
   * 测试邮件发送（使用自定义模板服务）
   */
  static async testEmailSending(testEmail: string): Promise<SendResult> {
    try {
      // 使用自定义模板服务获取测试邮件模板
      const { CustomEmailTemplateService } = await import('./custom-template-service');
      const { EmailTemplateType } = await import('./email-template-service');

      const emailContent = await CustomEmailTemplateService.getEmailTemplate(
        EmailTemplateType.TEST_EMAIL,
        {
          testTime: new Date().toLocaleString('zh-CN'),
          serverInfo: 'SMTP服务器连接正常',
          configStatus: '邮箱配置验证成功',
          recipientEmail: testEmail,
        }
      );

      console.log(`📧 发送测试邮件到: ${testEmail} (使用${emailContent.isCustom ? '自定义' : '默认'}模板)`);

      return await this.sendEmail({
        to: testEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }, 'notification');
    } catch (error) {
      console.error('❌ 测试邮件发送失败:', error);
      // 如果自定义模板服务失败，回退到硬编码内容
      const fallbackOptions: SendEmailOptions = {
        to: testEmail,
        subject: 'CoserEden 邮件服务测试',
        html: `
          <h2>邮件服务测试</h2>
          <p>这是一封测试邮件，用于验证邮件服务配置是否正确。</p>
          <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
          <p>如果您收到这封邮件，说明邮件服务配置成功！</p>
        `,
        text: '这是一封测试邮件，用于验证邮件服务配置是否正确。',
      };

      console.log(`📧 发送测试邮件到: ${testEmail} (使用回退模板)`);
      return await this.sendEmail(fallbackOptions, 'notification');
    }
  }

  /**
   * 清除传输器缓存
   * 用于配置更新后强制重新创建传输器
   */
  static clearCache(): void {
    if (this.transporterCache && typeof this.transporterCache.close === 'function') {
      try {
        this.transporterCache.close();
      } catch (error) {
        console.warn('关闭缓存的传输器时出错:', error);
      }
    }
    this.transporterCache = null;
    this.cacheExpiry = 0;
    console.log('🔄 邮件传输器缓存已清除');
  }

  /**
   * 强制重置 nodemailer 缓存
   */
  static forceResetNodemailer(): void {
    try {
      // 清除可能的模块缓存
      const nodemailerPath = require.resolve('nodemailer');
      if (require.cache[nodemailerPath]) {
        delete require.cache[nodemailerPath];
      }

      // 清除相关的缓存
      Object.keys(require.cache).forEach(key => {
        if (key.includes('nodemailer')) {
          delete require.cache[key];
        }
      });

      // 清除本地缓存
      this.clearCache();

      console.log('🔄 已重置 nodemailer 缓存');
    } catch (error) {
      console.warn('重置 nodemailer 缓存时出错:', error);
    }
  }


}

/**
 * 导出服务创建函数
 */
export const createEmailTransportService = () => EmailTransportService;
