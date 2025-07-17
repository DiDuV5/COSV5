/**
 * @fileoverview 邮件配置服务
 * @description 专门处理邮件配置获取、验证和管理，遵循12-Factor App原则，移除硬编码配置
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';

/**
 * 邮件配置接口
 */
export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName: string;
  smtpFromEmail: string;
}

/**
 * 邮件提供商类型
 */
export enum EmailProvider {
  MAILGUN = 'mailgun',
  HOSTINGER = 'hostinger',
  GMAIL = 'gmail',
  OUTLOOK = 'outlook',
  GENERIC = 'generic',
}

/**
 * 邮件配置默认值常量
 * 遵循12-Factor App原则，从环境变量获取，支持双前缀
 */
const EMAIL_SMTP_DEFAULTS = {
  // SMTP连接配置
  PORT: process.env.COSEREEDEN_EMAIL_SERVER_PORT || process.env.COSEREEDEN_EMAIL_SERVER_PORT || process.env.COSEREEDEN_SMTP_PORT || '587',
  MAX_CONNECTIONS: process.env.COSEREEDEN_EMAIL_MAX_CONNECTIONS || process.env.COSEREEDEN_EMAIL_MAX_CONNECTIONS || '5',
  CONNECTION_TIMEOUT: process.env.COSEREEDEN_EMAIL_CONNECTION_TIMEOUT || process.env.COSEREEDEN_EMAIL_CONNECTION_TIMEOUT || '30000',
  POOL_TIMEOUT: process.env.COSEREEDEN_EMAIL_POOL_TIMEOUT || process.env.COSEREEDEN_EMAIL_POOL_TIMEOUT || '60000',

  // 安全配置
  SECURE: process.env.COSEREEDEN_EMAIL_SECURE || process.env.COSEREEDEN_EMAIL_SECURE,
  REQUIRE_TLS: process.env.COSEREEDEN_EMAIL_REQUIRE_TLS || process.env.COSEREEDEN_EMAIL_REQUIRE_TLS,
  REJECT_UNAUTHORIZED: process.env.COSEREEDEN_EMAIL_REJECT_UNAUTHORIZED || process.env.COSEREEDEN_EMAIL_REJECT_UNAUTHORIZED,

  // 重试配置
  MAX_RETRIES: process.env.COSEREEDEN_EMAIL_MAX_RETRIES || process.env.COSEREEDEN_EMAIL_MAX_RETRIES || '3',
  RETRY_DELAY: process.env.COSEREEDEN_EMAIL_RETRY_DELAY || process.env.COSEREEDEN_EMAIL_RETRY_DELAY || '1000',

  // 缓存配置
  CACHE_DURATION: process.env.COSEREEDEN_EMAIL_CACHE_DURATION || process.env.COSEREEDEN_EMAIL_CACHE_DURATION || '300000', // 5分钟
} as const;

/**
 * 邮件配置服务类
 */
export class EmailConfigService {
  private static configCache: EmailConfig | null = null;
  private static cacheExpiry: number = 0;
  private static readonly CACHE_DURATION = parseInt(EMAIL_SMTP_DEFAULTS.CACHE_DURATION); // 从环境变量获取缓存时间

  /**
   * 获取邮件配置
   */
  static async getEmailConfig(): Promise<EmailConfig | null> {
    try {
      // 检查缓存
      if (this.configCache && Date.now() < this.cacheExpiry) {
        return this.configCache;
      }

      // 优先使用数据库配置
      const dbConfig = await this.getDatabaseConfig();
      if (dbConfig && this.isConfigComplete(dbConfig)) {
        console.log('📧 使用数据库邮件配置');
        this.updateCache(dbConfig);
        return dbConfig;
      }

      // 回退到环境变量配置
      const envConfig = this.getEnvironmentConfig();
      if (this.isConfigComplete(envConfig)) {
        console.log('📧 使用环境变量邮件配置');
        this.updateCache(envConfig);
        return envConfig;
      }

      console.warn('⚠️ 邮件配置不完整或未设置');
      return null;

    } catch (error) {
      console.error('❌ 获取邮箱配置失败:', error);
      return null;
    }
  }

  /**
   * 获取环境变量配置
   */
  private static getEnvironmentConfig(): Partial<EmailConfig> {
    return {
      smtpHost: process.env.COSEREEDEN_EMAIL_SERVER_HOST || process.env.COSEREEDEN_SMTP_HOST,
      smtpPort: parseInt(process.env.COSEREEDEN_EMAIL_SERVER_PORT || process.env.COSEREEDEN_SMTP_PORT || '587'),
      smtpUser: process.env.COSEREEDEN_EMAIL_SERVER_USER || process.env.COSEREEDEN_SMTP_USER,
      smtpPassword: process.env.COSEREEDEN_EMAIL_SERVER_PASSWORD || process.env.COSEREEDEN_SMTP_PASS,
      smtpFromName: process.env.COSEREEDEN_EMAIL_FROM_NAME || process.env.COSEREEDEN_BRAND_NAME || 'CoserEden',
      smtpFromEmail: process.env.COSEREEDEN_EMAIL_FROM || process.env.COSEREEDEN_EMAIL_SERVER_USER || process.env.COSEREEDEN_SMTP_USER,
    };
  }

  /**
   * 从数据库获取配置
   */
  private static async getDatabaseConfig(): Promise<Partial<EmailConfig> | null> {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'email.smtp_host',
              'email.smtp_port',
              'email.smtp_user',
              'email.smtp_password',
              'email.smtp_from_name',
              'email.smtp_from_email',
            ],
          },
        },
      });

      if (settings.length === 0) {
        return null;
      }

      const config: Record<string, any> = {};
      settings.forEach((setting: any) => {
        config[setting.key] = setting.value;
      });

      // 检查必需的配置项
      const requiredKeys = [
        'email.smtp_host',
        'email.smtp_port',
        'email.smtp_user',
        'email.smtp_password',
        'email.smtp_from_name',
        'email.smtp_from_email',
      ];

      if (!requiredKeys.every(key => config[key])) {
        console.warn('⚠️ 数据库邮箱配置不完整');
        return null;
      }

      return {
        smtpHost: config['email.smtp_host'],
        smtpPort: parseInt(config['email.smtp_port']),
        smtpUser: config['email.smtp_user'],
        smtpPassword: config['email.smtp_password'],
        smtpFromName: config['email.smtp_from_name'],
        smtpFromEmail: config['email.smtp_from_email'],
      };

    } catch (error) {
      console.error('❌ 从数据库获取邮件配置失败:', error);
      return null;
    }
  }

  /**
   * 检查配置是否完整
   */
  private static isConfigComplete(config: Partial<EmailConfig>): config is EmailConfig {
    return !!(
      config.smtpHost &&
      config.smtpPort &&
      config.smtpUser &&
      config.smtpPassword &&
      config.smtpFromName &&
      config.smtpFromEmail
    );
  }

  /**
   * 更新缓存
   */
  private static updateCache(config: EmailConfig): void {
    this.configCache = config;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }



  /**
   * 检测邮件提供商
   */
  static detectProvider(config: EmailConfig): EmailProvider {
    const host = config.smtpHost.toLowerCase();

    if (host.includes('mailgun.org')) {
      return EmailProvider.MAILGUN;
    }
    if (host.includes('hostinger.com')) {
      return EmailProvider.HOSTINGER;
    }
    if (host.includes('gmail.com') || host.includes('smtp.gmail.com')) {
      return EmailProvider.GMAIL;
    }
    if (host.includes('outlook.com') || host.includes('smtp-mail.outlook.com')) {
      return EmailProvider.OUTLOOK;
    }

    return EmailProvider.GENERIC;
  }

  /**
   * 获取提供商特定的配置
   */
  static getProviderConfig(config: EmailConfig): {
    secure: boolean;
    requireTLS: boolean;
    tls?: any;
    pool?: boolean;
    maxConnections?: number;
    connectionTimeout?: number;
  } {
    const provider = this.detectProvider(config);
    const port = config.smtpPort;

    // 基础配置
    let secure = false;
    let requireTLS = false;
    const tls: any = undefined;

    // 根据端口确定安全设置
    if (port === 465) {
      secure = true; // SSL
    } else if (port === 587 || port === 2525) {
      requireTLS = true; // STARTTLS
    } else if (port === 443) {
      // 443端口不是SMTP端口，可能是配置错误
      console.warn('⚠️ 检测到端口443，这不是标准SMTP端口');
      requireTLS = true;
    }

    // 提供商特定配置
    switch (provider) {
      case EmailProvider.HOSTINGER:
        return this.getHostingerConfig(config, secure, requireTLS);

      case EmailProvider.MAILGUN:
        return this.getMailgunConfig(config, secure, requireTLS);

      case EmailProvider.GMAIL:
        return this.getGmailConfig(config, secure, requireTLS);

      case EmailProvider.OUTLOOK:
        return this.getOutlookConfig(config, secure, requireTLS);

      default:
        return this.getGenericConfig(secure, requireTLS);
    }
  }

  /**
   * Hostinger配置
   */
  private static getHostingerConfig(config: EmailConfig, secure: boolean, requireTLS: boolean) {
    return {
      secure,
      requireTLS,
      tls: {
        rejectUnauthorized: false,
        servername: config.smtpHost,
      },
      pool: false,
      maxConnections: 1,
      connectionTimeout: 60000,
    };
  }

  /**
   * Mailgun配置
   */
  private static getMailgunConfig(_config: EmailConfig, secure: boolean, requireTLS: boolean) {
    return {
      secure,
      requireTLS,
      tls: {
        rejectUnauthorized: EMAIL_SMTP_DEFAULTS.REJECT_UNAUTHORIZED !== 'false',
      },
      pool: true,
      maxConnections: parseInt(EMAIL_SMTP_DEFAULTS.MAX_CONNECTIONS),
      connectionTimeout: parseInt(EMAIL_SMTP_DEFAULTS.CONNECTION_TIMEOUT),
    };
  }

  /**
   * Gmail配置
   */
  private static getGmailConfig(_config: EmailConfig, secure: boolean, requireTLS: boolean) {
    return {
      secure,
      requireTLS,
      tls: {
        rejectUnauthorized: EMAIL_SMTP_DEFAULTS.REJECT_UNAUTHORIZED !== 'false',
      },
      pool: true,
      maxConnections: parseInt(EMAIL_SMTP_DEFAULTS.MAX_CONNECTIONS),
      connectionTimeout: parseInt(EMAIL_SMTP_DEFAULTS.CONNECTION_TIMEOUT),
    };
  }

  /**
   * Outlook配置
   */
  private static getOutlookConfig(_config: EmailConfig, secure: boolean, requireTLS: boolean) {
    return {
      secure,
      requireTLS,
      tls: {
        rejectUnauthorized: EMAIL_SMTP_DEFAULTS.REJECT_UNAUTHORIZED !== 'false',
        ciphers: process.env.COSEREEDEN_EMAIL_OUTLOOK_CIPHERS || process.env.COSEREEDEN_EMAIL_OUTLOOK_CIPHERS || 'SSLv3',
      },
      pool: true,
      maxConnections: parseInt(EMAIL_SMTP_DEFAULTS.MAX_CONNECTIONS),
      connectionTimeout: parseInt(EMAIL_SMTP_DEFAULTS.CONNECTION_TIMEOUT),
    };
  }

  /**
   * 通用配置
   */
  private static getGenericConfig(secure: boolean, requireTLS: boolean) {
    return {
      secure,
      requireTLS,
      tls: {
        rejectUnauthorized: EMAIL_SMTP_DEFAULTS.REJECT_UNAUTHORIZED !== 'false',
      },
      pool: (process.env.COSEREEDEN_EMAIL_ENABLE_POOL || process.env.COSEREEDEN_EMAIL_ENABLE_POOL) !== 'false',
      maxConnections: parseInt(EMAIL_SMTP_DEFAULTS.MAX_CONNECTIONS),
      connectionTimeout: parseInt(EMAIL_SMTP_DEFAULTS.CONNECTION_TIMEOUT),
      poolTimeout: parseInt(EMAIL_SMTP_DEFAULTS.POOL_TIMEOUT),
    };
  }

  /**
   * 验证配置有效性
   */
  static async validateConfig(config: EmailConfig): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // 检查必需字段
    if (!config.smtpHost) errors.push('SMTP主机不能为空');
    if (!config.smtpPort || config.smtpPort <= 0) errors.push('SMTP端口无效');
    if (!config.smtpUser) errors.push('SMTP用户名不能为空');
    if (!config.smtpPassword) errors.push('SMTP密码不能为空');
    if (!config.smtpFromEmail) errors.push('发件人邮箱不能为空');

    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (config.smtpFromEmail && !emailRegex.test(config.smtpFromEmail)) {
      errors.push('发件人邮箱格式无效');
    }

    // 检查端口范围
    if (config.smtpPort && (config.smtpPort < 1 || config.smtpPort > 65535)) {
      errors.push('SMTP端口超出有效范围 (1-65535)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取配置摘要（隐藏敏感信息）
   */
  static getConfigSummary(config: EmailConfig): any {
    return {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      smtpPassword: `[长度: ${config.smtpPassword?.length || 0}]`,
      smtpFromName: config.smtpFromName,
      smtpFromEmail: config.smtpFromEmail,
      provider: this.detectProvider(config),
    };
  }

  /**
   * 清除配置缓存
   * 用于管理后台更新配置后立即生效
   */
  static clearCache(): void {
    this.configCache = null;
    this.cacheExpiry = 0;
    console.log('🔄 邮件配置缓存已清除');
  }
}

/**
 * 导出服务创建函数
 */
export const createEmailConfigService = () => EmailConfigService;
