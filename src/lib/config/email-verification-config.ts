/**
 * @fileoverview 邮箱验证配置管理器
 * @description 遵循12-Factor App原则的邮箱验证配置管理，移除硬编码配置，支持双前缀环境变量
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0
 */

import { env } from '@/lib/env';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';

/**
 * 邮箱验证配置接口
 */
export interface EmailVerificationConfig {
  // URL配置
  baseUrl: string;
  verificationPath: string;
  passwordResetPath: string;

  // 品牌配置
  brandName: string;
  supportEmail: string;
  websiteUrl: string;
  brandColor: string;
  logoUrl?: string;

  // 令牌配置
  tokenExpiryHours: number;
  passwordResetExpiryHours: number;
  maxResendAttempts: number;
  resendCooldownMinutes: number;

  // 邮件配置
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;

  // 安全配置
  requireHttps: boolean;
  allowedDomains?: string[];

  // 功能开关
  enableEmailVerification: boolean;
  enablePasswordReset: boolean;
  enableResendCooldown: boolean;
  enableDomainWhitelist: boolean;
}

/**
 * 邮件配置默认值常量
 * 遵循12-Factor App原则，从环境变量获取，支持双前缀
 */
const EMAIL_DEFAULTS = {
  // URL配置
  VERIFICATION_PATH: process.env.COSEREEDEN_EMAIL_VERIFICATION_PATH || process.env.COSEREEDEN_EMAIL_VERIFICATION_PATH || '/auth/verify-email',
  PASSWORD_RESET_PATH: process.env.COSEREEDEN_PASSWORD_RESET_PATH || process.env.COSEREEDEN_PASSWORD_RESET_PATH || '/auth/reset-password',

  // 品牌配置
  BRAND_NAME: process.env.COSEREEDEN_BRAND_NAME || process.env.COSEREEDEN_BRAND_NAME || 'CoserEden',
  SUPPORT_EMAIL: process.env.COSEREEDEN_SUPPORT_EMAIL || process.env.COSEREEDEN_SUPPORT_EMAIL || 'support@cosereeden.com',
  BRAND_COLOR: process.env.COSEREEDEN_BRAND_COLOR || process.env.COSEREEDEN_BRAND_COLOR || '#3b82f6',

  // 令牌配置
  TOKEN_EXPIRY_HOURS: process.env.COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS || process.env.COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS || '24',
  PASSWORD_RESET_EXPIRY_HOURS: process.env.COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS || process.env.COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS || '1',
  MAX_RESEND_ATTEMPTS: process.env.COSEREEDEN_MAX_RESEND_ATTEMPTS || process.env.COSEREEDEN_MAX_RESEND_ATTEMPTS || '3',
  RESEND_COOLDOWN_MINUTES: process.env.COSEREEDEN_RESEND_COOLDOWN_MINUTES || process.env.COSEREEDEN_RESEND_COOLDOWN_MINUTES || '5',

  // 邮件配置
  FROM_EMAIL: process.env.COSEREEDEN_EMAIL_FROM || process.env.COSEREEDEN_EMAIL_FROM || 'noreply@cosereeden.com',
  FROM_NAME: process.env.COSEREEDEN_EMAIL_FROM_NAME || process.env.COSEREEDEN_EMAIL_FROM_NAME || 'CoserEden',
  REPLY_TO: process.env.COSEREEDEN_EMAIL_REPLY_TO || process.env.COSEREEDEN_EMAIL_REPLY_TO,

  // 安全配置
  REQUIRE_HTTPS: process.env.COSEREEDEN_REQUIRE_HTTPS || process.env.COSEREEDEN_REQUIRE_HTTPS,
  ALLOWED_EMAIL_DOMAINS: process.env.COSEREEDEN_ALLOWED_EMAIL_DOMAINS || process.env.COSEREEDEN_ALLOWED_EMAIL_DOMAINS,

  // 功能开关
  ENABLE_EMAIL_VERIFICATION: process.env.COSEREEDEN_ENABLE_EMAIL_VERIFICATION || process.env.COSEREEDEN_ENABLE_EMAIL_VERIFICATION,
  ENABLE_PASSWORD_RESET: process.env.COSEREEDEN_ENABLE_PASSWORD_RESET || process.env.COSEREEDEN_ENABLE_PASSWORD_RESET,
  ENABLE_RESEND_COOLDOWN: process.env.COSEREEDEN_ENABLE_RESEND_COOLDOWN || process.env.COSEREEDEN_ENABLE_RESEND_COOLDOWN,
  ENABLE_DOMAIN_WHITELIST: process.env.COSEREEDEN_ENABLE_DOMAIN_WHITELIST || process.env.COSEREEDEN_ENABLE_DOMAIN_WHITELIST,
} as const;

/**
 * 邮箱验证配置管理器
 */
export class EmailVerificationConfigManager {
  private static instance: EmailVerificationConfigManager;
  private config: EmailVerificationConfig;
  private initialized = false;

  private constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): EmailVerificationConfigManager {
    if (!EmailVerificationConfigManager.instance) {
      EmailVerificationConfigManager.instance = new EmailVerificationConfigManager();
    }
    return EmailVerificationConfigManager.instance;
  }

  /**
   * 验证必需的环境变量
   */
  private validateRequiredEnvVars(): void {
    const requiredVars = ['NEXTAUTH_URL', 'NEXT_PUBLIC_APP_URL'];
    const hasAnyRequired = requiredVars.some(varName =>
      process.env[varName] || process.env[`COSEREEDEN_${varName}`]
    );

    if (!hasAnyRequired && process.env.NODE_ENV === 'production') {
      throw new Error('生产环境必须设置 NEXTAUTH_URL 或 NEXT_PUBLIC_APP_URL 环境变量');
    }
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfig(): EmailVerificationConfig {
    this.validateRequiredEnvVars();

    // 获取基础URL
    const baseUrl = this.getBaseUrl();

    return {
      // URL配置
      baseUrl,
      verificationPath: EMAIL_DEFAULTS.VERIFICATION_PATH,
      passwordResetPath: EMAIL_DEFAULTS.PASSWORD_RESET_PATH,

      // 品牌配置
      brandName: EMAIL_DEFAULTS.BRAND_NAME,
      supportEmail: process.env.COSEREEDEN_SUPPORT_EMAIL || process.env.COSEREEDEN_SUPPORT_EMAIL || EMAIL_DEFAULTS.FROM_EMAIL || EMAIL_DEFAULTS.SUPPORT_EMAIL,
      websiteUrl: process.env.COSEREEDEN_WEBSITE_URL || process.env.COSEREEDEN_WEBSITE_URL || baseUrl,
      brandColor: EMAIL_DEFAULTS.BRAND_COLOR,
      logoUrl: process.env.COSEREEDEN_LOGO_URL || process.env.COSEREEDEN_LOGO_URL,

      // 令牌配置
      tokenExpiryHours: parseInt(EMAIL_DEFAULTS.TOKEN_EXPIRY_HOURS),
      passwordResetExpiryHours: parseInt(EMAIL_DEFAULTS.PASSWORD_RESET_EXPIRY_HOURS),
      maxResendAttempts: parseInt(EMAIL_DEFAULTS.MAX_RESEND_ATTEMPTS),
      resendCooldownMinutes: parseInt(EMAIL_DEFAULTS.RESEND_COOLDOWN_MINUTES),

      // 邮件配置
      fromEmail: EMAIL_DEFAULTS.FROM_EMAIL,
      fromName: EMAIL_DEFAULTS.FROM_NAME,
      replyToEmail: EMAIL_DEFAULTS.REPLY_TO,

      // 安全配置
      requireHttps: this.parseBoolean(EMAIL_DEFAULTS.REQUIRE_HTTPS, env.NODE_ENV === 'production'),
      allowedDomains: EMAIL_DEFAULTS.ALLOWED_EMAIL_DOMAINS?.split(',').map((d: string) => d.trim()),

      // 功能开关
      enableEmailVerification: this.parseBoolean(EMAIL_DEFAULTS.ENABLE_EMAIL_VERIFICATION, true),
      enablePasswordReset: this.parseBoolean(EMAIL_DEFAULTS.ENABLE_PASSWORD_RESET, true),
      enableResendCooldown: this.parseBoolean(EMAIL_DEFAULTS.ENABLE_RESEND_COOLDOWN, true),
      enableDomainWhitelist: this.parseBoolean(EMAIL_DEFAULTS.ENABLE_DOMAIN_WHITELIST, false),
    };
  }

  /**
   * 获取基础URL
   */
  private getBaseUrl(): string {
    // 优先级：COSEREEDEN_NEXTAUTH_URL > NEXTAUTH_URL > COSEREEDEN_NEXT_PUBLIC_APP_URL > NEXT_PUBLIC_APP_URL > 构建默认值
    const nextAuthUrl = process.env.COSEREEDEN_NEXTAUTH_URL || process.env.COSEREEDEN_NEXTAUTH_URL;
    const appUrl = process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL;

    if (nextAuthUrl) {
      return nextAuthUrl.replace(/\/$/, '');
    }

    if (appUrl) {
      return appUrl.replace(/\/$/, '');
    }

    // 根据环境构建默认URL
    return this.buildDefaultUrl();
  }

  /**
   * 构建默认URL
   */
  private buildDefaultUrl(): string {
    const nodeEnv = env.NODE_ENV;
    const port = process.env.COSEREEDEN_PORT ?? '3000';

    switch (nodeEnv) {
      case 'production':
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.CONFIGURATION_ERROR,
          '生产环境必须配置NEXTAUTH_URL或NEXT_PUBLIC_APP_URL环境变量'
        );

      case 'test':
        return 'http://localhost:3000';

      case 'development':
      default:
        return `http://localhost:${port}`;
    }
  }

  /**
   * 解析布尔值环境变量
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  /**
   * 初始化配置
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.validateConfig();
      this.initialized = true;

      console.log(`📧 邮箱验证配置初始化完成: ${this.config.brandName}`);
    } catch (error) {
      console.error('❌ 邮箱验证配置初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    const { baseUrl, fromEmail, supportEmail, tokenExpiryHours } = this.config;

    // 验证URL格式
    try {
      new URL(baseUrl);
    } catch {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.CONFIGURATION_ERROR,
        `无效的基础URL配置: ${baseUrl}`
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.CONFIGURATION_ERROR,
        `无效的发件人邮箱格式: ${fromEmail}`
      );
    }

    if (!emailRegex.test(supportEmail)) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.CONFIGURATION_ERROR,
        `无效的支持邮箱格式: ${supportEmail}`
      );
    }

    // 验证令牌过期时间
    if (tokenExpiryHours <= 0 || tokenExpiryHours > 168) { // 最大7天
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.CONFIGURATION_ERROR,
        `令牌过期时间必须在1-168小时之间: ${tokenExpiryHours}`
      );
    }

    // 生产环境安全检查
    if (env.NODE_ENV === 'production') {
      const url = new URL(baseUrl);

      if (this.config.requireHttps && url.protocol !== 'https:') {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.CONFIGURATION_ERROR,
          '生产环境要求使用HTTPS协议'
        );
      }

      if (url.hostname === 'localhost' || url.hostname.includes('127.0.0.1')) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.CONFIGURATION_ERROR,
          '生产环境不能使用localhost域名'
        );
      }
    }
  }

  /**
   * 获取配置
   */
  public getConfig(): EmailVerificationConfig {
    return { ...this.config };
  }

  /**
   * 生成验证URL
   * @deprecated 请使用 @/lib/config/url-config 中的 generateVerificationUrl 函数
   */
  public generateVerificationUrl(token: string): string {
    console.warn('⚠️ EmailVerificationConfigManager.generateVerificationUrl 已弃用，请使用 @/lib/config/url-config 中的 generateVerificationUrl');
    // 临时重定向到统一的URL生成器
    const { generateVerificationUrl } = require('@/lib/config/url-config');
    return generateVerificationUrl(token);
  }

  /**
   * 生成密码重置URL
   * @deprecated 请使用 @/lib/config/url-config 中的 generatePasswordResetUrl 函数
   */
  public generatePasswordResetUrl(token: string): string {
    console.warn('⚠️ EmailVerificationConfigManager.generatePasswordResetUrl 已弃用，请使用 @/lib/config/url-config 中的 generatePasswordResetUrl');
    // 临时重定向到统一的URL生成器
    const { generatePasswordResetUrl } = require('@/lib/config/url-config');
    return generatePasswordResetUrl(token);
  }

  /**
   * 获取令牌过期时间
   */
  public getTokenExpiryDate(): Date {
    const { tokenExpiryHours } = this.config;
    return new Date(Date.now() + tokenExpiryHours * 60 * 60 * 1000);
  }

  /**
   * 获取密码重置过期时间
   */
  public getPasswordResetExpiryDate(): Date {
    const { passwordResetExpiryHours } = this.config;
    return new Date(Date.now() + passwordResetExpiryHours * 60 * 60 * 1000);
  }

  /**
   * 检查邮箱域名是否允许
   */
  public isEmailDomainAllowed(email: string): boolean {
    if (!this.config.enableDomainWhitelist || !this.config.allowedDomains) {
      return true;
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    return this.config.allowedDomains.some(allowedDomain =>
      domain === allowedDomain.toLowerCase()
    );
  }

  /**
   * 获取配置摘要（用于调试）
   */
  public getConfigSummary(): Record<string, any> {
    const config = this.getConfig();
    return {
      baseUrl: config.baseUrl,
      brandName: config.brandName,
      tokenExpiryHours: config.tokenExpiryHours,
      enableEmailVerification: config.enableEmailVerification,
      enablePasswordReset: config.enablePasswordReset,
      requireHttps: config.requireHttps,
      environment: env.NODE_ENV,
      initialized: this.initialized,
    };
  }

  /**
   * 重新加载配置
   */
  public reload(): void {
    this.config = this.loadConfig();
    this.initialized = false;
  }

  /**
   * 生成环境变量建议
   * 用于配置指导，推荐使用COSEREEDEN_前缀
   */
  static generateEnvSuggestions(): Record<string, string> {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      // 推荐使用COSEREEDEN_前缀的环境变量
      COSEREEDEN_NEXTAUTH_URL: isProduction ? 'https://[your-domain.com]' : 'http://localhost:3000',
      COSEREEDEN_NEXT_PUBLIC_APP_URL: isProduction ? 'https://[your-domain.com]' : 'http://localhost:3000',
      COSEREEDEN_EMAIL_VERIFICATION_PATH: '/auth/verify-email',
      COSEREEDEN_PASSWORD_RESET_PATH: '/auth/reset-password',
      COSEREEDEN_BRAND_NAME: '[Your Brand Name]',
      COSEREEDEN_SUPPORT_EMAIL: 'support@[your-domain.com]',
      COSEREEDEN_BRAND_COLOR: '#3b82f6',
      COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS: '24',
      COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS: '1',
      COSEREEDEN_MAX_RESEND_ATTEMPTS: '3',
      COSEREEDEN_RESEND_COOLDOWN_MINUTES: '5',
      COSEREEDEN_EMAIL_FROM: 'noreply@[your-domain.com]',
      COSEREEDEN_EMAIL_FROM_NAME: '[Your Brand Name]',
      COSEREEDEN_ENABLE_EMAIL_VERIFICATION: 'true',
      COSEREEDEN_ENABLE_PASSWORD_RESET: 'true',
    };
  }

  /**
   * 获取当前使用的环境变量配置
   * 用于调试和配置检查
   */
  static getCurrentEnvConfig(): Record<string, string | undefined> {
    return {
      // COSEREEDEN_前缀配置
      COSEREEDEN_NEXTAUTH_URL: process.env.COSEREEDEN_NEXTAUTH_URL,
      COSEREEDEN_NEXT_PUBLIC_APP_URL: process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL,
      COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS: process.env.COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS,
      COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS: process.env.COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS,
      COSEREEDEN_MAX_RESEND_ATTEMPTS: process.env.COSEREEDEN_MAX_RESEND_ATTEMPTS,
      COSEREEDEN_RESEND_COOLDOWN_MINUTES: process.env.COSEREEDEN_RESEND_COOLDOWN_MINUTES,
      COSEREEDEN_EMAIL_FROM: process.env.COSEREEDEN_EMAIL_FROM,
      COSEREEDEN_EMAIL_FROM_NAME: process.env.COSEREEDEN_EMAIL_FROM_NAME,

      // 标准前缀配置（向后兼容）
      NEXTAUTH_URL: process.env.COSEREEDEN_NEXTAUTH_URL,
      NEXT_PUBLIC_APP_URL: process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
      EMAIL_TOKEN_EXPIRY_HOURS: process.env.COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS,
      PASSWORD_RESET_EXPIRY_HOURS: process.env.COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS,
      MAX_RESEND_ATTEMPTS: process.env.COSEREEDEN_MAX_RESEND_ATTEMPTS,
      RESEND_COOLDOWN_MINUTES: process.env.COSEREEDEN_RESEND_COOLDOWN_MINUTES,
      EMAIL_FROM: process.env.COSEREEDEN_EMAIL_FROM,
      EMAIL_FROM_NAME: process.env.COSEREEDEN_EMAIL_FROM_NAME,

      // 实际使用的值
      EFFECTIVE_TOKEN_EXPIRY_HOURS: EMAIL_DEFAULTS.TOKEN_EXPIRY_HOURS,
      EFFECTIVE_PASSWORD_RESET_EXPIRY_HOURS: EMAIL_DEFAULTS.PASSWORD_RESET_EXPIRY_HOURS,
      EFFECTIVE_MAX_RESEND_ATTEMPTS: EMAIL_DEFAULTS.MAX_RESEND_ATTEMPTS,
      EFFECTIVE_RESEND_COOLDOWN_MINUTES: EMAIL_DEFAULTS.RESEND_COOLDOWN_MINUTES,
      EFFECTIVE_FROM_EMAIL: EMAIL_DEFAULTS.FROM_EMAIL,
      EFFECTIVE_FROM_NAME: EMAIL_DEFAULTS.FROM_NAME,
    };
  }
}

/**
 * 导出单例实例
 */
export const emailVerificationConfig = EmailVerificationConfigManager.getInstance();

/**
 * 便捷函数：获取配置
 */
export function getEmailVerificationConfig(): EmailVerificationConfig {
  return emailVerificationConfig.getConfig();
}

/**
 * 便捷函数：生成验证URL
 * @deprecated 请直接使用 @/lib/config/url-config 中的 generateVerificationUrl 函数
 */
export function generateVerificationUrl(token: string): string {
  console.warn('⚠️ 从 email-verification-config 导入的 generateVerificationUrl 已弃用，请使用 @/lib/config/url-config');
  // 重定向到统一的URL生成器
  const { generateVerificationUrl: urlConfigGenerateVerificationUrl } = require('@/lib/config/url-config');
  return urlConfigGenerateVerificationUrl(token);
}

/**
 * 便捷函数：生成密码重置URL
 * @deprecated 请直接使用 @/lib/config/url-config 中的 generatePasswordResetUrl 函数
 */
export function generatePasswordResetUrl(token: string): string {
  console.warn('⚠️ 从 email-verification-config 导入的 generatePasswordResetUrl 已弃用，请使用 @/lib/config/url-config');
  // 重定向到统一的URL生成器
  const { generatePasswordResetUrl: urlConfigGeneratePasswordResetUrl } = require('@/lib/config/url-config');
  return urlConfigGeneratePasswordResetUrl(token);
}

/**
 * 便捷函数：获取令牌过期时间
 */
export function getTokenExpiryDate(): Date {
  return emailVerificationConfig.getTokenExpiryDate();
}

export default EmailVerificationConfigManager;
