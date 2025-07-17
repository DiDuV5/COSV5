/**
 * @fileoverview 邮箱配置验证中间件
 * @description 验证邮箱验证系统的配置完整性和有效性
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { emailVerificationConfig } from '@/lib/config/email-verification-config';
import { env } from '@/lib/env';

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  missingOptional: string[];
}

/**
 * 必需的环境变量
 */
const REQUIRED_ENV_VARS = [
  'COSEREEDEN_SMTP_HOST',
  'COSEREEDEN_SMTP_PORT',
  'COSEREEDEN_SMTP_USER',
  'COSEREEDEN_SMTP_PASS',
  'COSEREEDEN_SMTP_FROM',
  'NEXTAUTH_URL',
] as const;

/**
 * 可选的环境变量
 */
const OPTIONAL_ENV_VARS = [
  'NEXT_PUBLIC_APP_URL',
  'EMAIL_FROM_NAME',
  'EMAIL_REPLY_TO',
  'SUPPORT_EMAIL',
  'BRAND_NAME',
  'BRAND_COLOR',
  'WEBSITE_URL',
  'LOGO_URL',
  'EMAIL_TOKEN_EXPIRY_HOURS',
  'PASSWORD_RESET_EXPIRY_HOURS',
  'MAX_RESEND_ATTEMPTS',
  'RESEND_COOLDOWN_MINUTES',
  'EMAIL_VERIFICATION_PATH',
  'PASSWORD_RESET_PATH',
  'REQUIRE_HTTPS',
  'ALLOWED_EMAIL_DOMAINS',
  'ENABLE_EMAIL_VERIFICATION',
  'ENABLE_PASSWORD_RESET',
  'ENABLE_RESEND_COOLDOWN',
  'ENABLE_DOMAIN_WHITELIST',
] as const;

/**
 * 邮箱配置验证器
 */
export class EmailConfigValidator {
  /**
   * 验证所有邮箱配置
   */
  public static async validateAllConfigs(): Promise<ConfigValidationResult> {
    const result: ConfigValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingRequired: [],
      missingOptional: [],
    };

    try {
      // 1. 验证环境变量
      this.validateEnvironmentVariables(result);

      // 2. 验证邮箱验证配置
      await this.validateEmailVerificationConfig(result);

      // 3. 验证SMTP配置
      this.validateSmtpConfig(result);

      // 4. 验证URL配置
      this.validateUrlConfig(result);

      // 5. 验证安全配置
      this.validateSecurityConfig(result);

      // 6. 验证业务逻辑配置
      this.validateBusinessConfig(result);

      // 设置最终验证状态
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.isValid = false;
      result.errors.push(`配置验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 验证环境变量
   */
  private static validateEnvironmentVariables(result: ConfigValidationResult): void {
    // 检查必需的环境变量
    for (const varName of REQUIRED_ENV_VARS) {
      if (!process.env[varName]) {
        result.missingRequired.push(varName);
        result.errors.push(`缺少必需的环境变量: ${varName}`);
      }
    }

    // 检查可选的环境变量
    for (const varName of OPTIONAL_ENV_VARS) {
      if (!process.env[varName]) {
        result.missingOptional.push(varName);
      }
    }

    // 生产环境特殊检查
    if (env.NODE_ENV === 'production') {
      const productionRequired = ['NEXT_PUBLIC_APP_URL', 'SUPPORT_EMAIL', 'BRAND_NAME'];
      for (const varName of productionRequired) {
        if (!process.env[varName]) {
          result.errors.push(`生产环境缺少重要配置: ${varName}`);
        }
      }
    }
  }

  /**
   * 验证邮箱验证配置
   */
  private static async validateEmailVerificationConfig(result: ConfigValidationResult): Promise<void> {
    try {
      await emailVerificationConfig.initialize();
      const config = emailVerificationConfig.getConfig();

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.fromEmail)) {
        result.errors.push(`发件人邮箱格式无效: ${config.fromEmail}`);
      }

      if (!emailRegex.test(config.supportEmail)) {
        result.errors.push(`支持邮箱格式无效: ${config.supportEmail}`);
      }

      // 验证令牌过期时间
      if (config.tokenExpiryHours <= 0 || config.tokenExpiryHours > 168) {
        result.errors.push(`邮箱验证令牌过期时间无效: ${config.tokenExpiryHours}小时 (应在1-168小时之间)`);
      }

      if (config.passwordResetExpiryHours <= 0 || config.passwordResetExpiryHours > 24) {
        result.errors.push(`密码重置令牌过期时间无效: ${config.passwordResetExpiryHours}小时 (应在1-24小时之间)`);
      }

      // 验证重试配置
      if (config.maxResendAttempts <= 0 || config.maxResendAttempts > 10) {
        result.warnings.push(`最大重发次数可能不合理: ${config.maxResendAttempts} (建议1-10次)`);
      }

      if (config.resendCooldownMinutes <= 0 || config.resendCooldownMinutes > 60) {
        result.warnings.push(`重发冷却时间可能不合理: ${config.resendCooldownMinutes}分钟 (建议1-60分钟)`);
      }

    } catch (error) {
      result.errors.push(`邮箱验证配置初始化失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证SMTP配置
   */
  private static validateSmtpConfig(result: ConfigValidationResult): void {
    const host = process.env.COSEREEDEN_SMTP_HOST;
    const port = process.env.COSEREEDEN_SMTP_PORT;
    const user = process.env.COSEREEDEN_SMTP_USER;
    const password = process.env.COSEREEDEN_SMTP_PASS;

    // 验证端口号
    if (port) {
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
        result.errors.push(`SMTP端口号无效: ${port}`);
      }
    }

    // 验证主机名
    if (host && (host.includes(' ') || host.length < 3)) {
      result.errors.push(`SMTP主机名格式可能无效: ${host}`);
    }

    // 验证用户名格式（通常是邮箱）
    if (user && !user.includes('@')) {
      result.warnings.push(`SMTP用户名可能不是邮箱格式: ${user}`);
    }

    // 验证密码强度
    if (password && password.length < 8) {
      result.warnings.push('SMTP密码长度较短，建议使用应用专用密码');
    }
  }

  /**
   * 验证URL配置
   */
  private static validateUrlConfig(result: ConfigValidationResult): void {
    const nextAuthUrl = process.env.COSEREEDEN_NEXTAUTH_URL;
    const appUrl = process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL;
    const websiteUrl = process.env.COSEREEDEN_WEBSITE_URL;

    // 验证URL格式
    const urls = [
      { name: 'NEXTAUTH_URL', value: nextAuthUrl },
      { name: 'NEXT_PUBLIC_APP_URL', value: appUrl },
      { name: 'WEBSITE_URL', value: websiteUrl },
    ];

    for (const { name, value } of urls) {
      if (value) {
        try {
          const url = new URL(value);

          // 生产环境HTTPS检查
          if (env.NODE_ENV === 'production' && url.protocol !== 'https:') {
            result.warnings.push(`生产环境建议${name}使用HTTPS: ${value}`);
          }

          // localhost检查
          if (env.NODE_ENV === 'production' && (url.hostname === 'localhost' || url.hostname.includes('127.0.0.1'))) {
            result.errors.push(`生产环境不能使用localhost域名 (${name}): ${value}`);
          }

        } catch {
          result.errors.push(`${name}格式无效: ${value}`);
        }
      }
    }

    // URL一致性检查
    if (nextAuthUrl && appUrl && nextAuthUrl !== appUrl) {
      result.warnings.push('NEXTAUTH_URL和NEXT_PUBLIC_APP_URL不一致，可能导致认证问题');
    }
  }

  /**
   * 验证安全配置
   */
  private static validateSecurityConfig(result: ConfigValidationResult): void {
    const requireHttps = process.env.COSEREEDEN_REQUIRE_HTTPS;
    const allowedDomains = process.env.COSEREEDEN_ALLOWED_EMAIL_DOMAINS;

    // HTTPS要求检查
    if (env.NODE_ENV === 'production' && requireHttps !== 'true') {
      result.warnings.push('生产环境建议启用REQUIRE_HTTPS');
    }

    // 邮箱域名白名单检查
    if (allowedDomains) {
      const domains = allowedDomains.split(',').map(d => d.trim());
      for (const domain of domains) {
        if (!domain.includes('.') || domain.includes('@')) {
          result.warnings.push(`邮箱域名格式可能无效: ${domain}`);
        }
      }
    }
  }

  /**
   * 验证业务逻辑配置
   */
  private static validateBusinessConfig(result: ConfigValidationResult): void {
    const tokenExpiry = process.env.COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS;
    const resetExpiry = process.env.COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS;
    const maxResend = process.env.COSEREEDEN_MAX_RESEND_ATTEMPTS;
    const cooldown = process.env.COSEREEDEN_RESEND_COOLDOWN_MINUTES;

    // 数值范围检查
    if (tokenExpiry) {
      const hours = parseInt(tokenExpiry);
      if (isNaN(hours) || hours <= 0 || hours > 168) {
        result.errors.push(`邮箱验证令牌过期时间超出合理范围: ${tokenExpiry}小时`);
      }
    }

    if (resetExpiry) {
      const hours = parseInt(resetExpiry);
      if (isNaN(hours) || hours <= 0 || hours > 24) {
        result.errors.push(`密码重置令牌过期时间超出合理范围: ${resetExpiry}小时`);
      }
    }

    if (maxResend) {
      const attempts = parseInt(maxResend);
      if (isNaN(attempts) || attempts <= 0 || attempts > 10) {
        result.warnings.push(`最大重发次数可能不合理: ${maxResend}`);
      }
    }

    if (cooldown) {
      const minutes = parseInt(cooldown);
      if (isNaN(minutes) || minutes <= 0 || minutes > 60) {
        result.warnings.push(`重发冷却时间可能不合理: ${cooldown}分钟`);
      }
    }
  }

  /**
   * 快速验证（仅检查关键配置）
   */
  public static async quickValidate(): Promise<boolean> {
    try {
      // 检查关键环境变量
      const criticalVars = ['COSEREEDEN_SMTP_HOST', 'COSEREEDEN_SMTP_USER', 'COSEREEDEN_SMTP_FROM', 'NEXTAUTH_URL'];
      for (const varName of criticalVars) {
        if (!process.env[varName]) {
          return false;
        }
      }

      // 初始化配置
      await emailVerificationConfig.initialize();
      return true;

    } catch {
      return false;
    }
  }

  /**
   * 生成配置报告
   */
  public static async generateConfigReport(): Promise<string> {
    const result = await this.validateAllConfigs();

    let report = '# 邮箱验证配置报告\n\n';
    report += `**验证状态:** ${result.isValid ? '✅ 通过' : '❌ 失败'}\n\n`;

    if (result.errors.length > 0) {
      report += '## ❌ 错误\n';
      result.errors.forEach(error => report += `- ${error}\n`);
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## ⚠️ 警告\n';
      result.warnings.forEach(warning => report += `- ${warning}\n`);
      report += '\n';
    }

    if (result.missingRequired.length > 0) {
      report += '## 🔴 缺少必需配置\n';
      result.missingRequired.forEach(missing => report += `- ${missing}\n`);
      report += '\n';
    }

    if (result.missingOptional.length > 0) {
      report += '## 🟡 缺少可选配置\n';
      result.missingOptional.forEach(missing => report += `- ${missing}\n`);
      report += '\n';
    }

    report += `**生成时间:** ${new Date().toLocaleString('zh-CN')}\n`;

    return report;
  }
}

export default EmailConfigValidator;
