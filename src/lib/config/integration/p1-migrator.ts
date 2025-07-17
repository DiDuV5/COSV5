/**
 * @fileoverview P1级配置迁移器
 * @description 执行P1级（核心功能）配置迁移
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import { logger } from '@/lib/logging/log-deduplicator';
import type { ConfigMigrationStatus, ConfigItem, MigrationOptions } from './integration-types';

/**
 * P1级配置迁移器
 */
export class P1Migrator {
  /**
   * 执行P1级配置迁移
   */
  async migrateP1Configs(options: MigrationOptions = {}): Promise<ConfigMigrationStatus[]> {
    logger.info('开始P1级配置迁移（核心功能）');

    const results: ConfigMigrationStatus[] = [];

    // 邮件配置迁移
    results.push(await this.migrateEmailConfig(options));

    // 认证配置迁移
    results.push(await this.migrateAuthConfig(options));

    // 业务配置迁移
    results.push(await this.migrateBusinessConfig(options));

    logger.info('P1级配置迁移完成', {
      totalCategories: results.length,
      completedCategories: results.filter(r => r.status === 'completed').length,
      failedCategories: results.filter(r => r.status === 'failed').length
    });

    return results;
  }

  /**
   * 迁移邮件配置
   */
  private async migrateEmailConfig(options: MigrationOptions): Promise<ConfigMigrationStatus> {
    const status: ConfigMigrationStatus = {
      category: 'email',
      priority: 'P1',
      status: 'in_progress',
      migratedCount: 0,
      totalCount: 8,
      errors: [],
      warnings: []
    };

    try {
      logger.info('迁移邮件配置');

      if (options.dryRun) {
        logger.info('DRY RUN: 模拟邮件配置迁移');
        status.status = 'completed';
        status.migratedCount = status.totalCount;
        return status;
      }

      const configs: ConfigItem[] = [
        { key: 'EMAIL_FROM', cosereeden: 'COSEREEDEN_EMAIL_FROM', required: true },
        { key: 'EMAIL_SMTP_HOST', cosereeden: 'COSEREEDEN_EMAIL_SMTP_HOST', required: true },
        { key: 'EMAIL_SMTP_PORT', cosereeden: 'COSEREEDEN_EMAIL_SMTP_PORT', required: true },
        { key: 'EMAIL_SMTP_USER', cosereeden: 'COSEREEDEN_EMAIL_SMTP_USER', required: true },
        { key: 'EMAIL_SMTP_PASS', cosereeden: 'COSEREEDEN_EMAIL_SMTP_PASS', required: true },
        { key: 'EMAIL_TOKEN_EXPIRY_HOURS', cosereeden: 'COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS', required: false },
        { key: 'PASSWORD_RESET_EXPIRY_HOURS', cosereeden: 'COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS', required: false },
        { key: 'MAX_RESEND_ATTEMPTS', cosereeden: 'COSEREEDEN_MAX_RESEND_ATTEMPTS', required: false },
      ];

      for (const config of configs) {
        const value = process.env[config.cosereeden] || process.env[config.key];
        if (value) {
          status.migratedCount++;
        } else if (config.required) {
          status.errors.push(`必需的邮件配置未设置: ${config.key}`);
        } else {
          status.warnings.push(`邮件配置未设置，将使用默认值: ${config.key}`);
        }
      }

      status.status = status.errors.length === 0 ? 'completed' : 'failed';
      logger.info('邮件配置迁移完成', {
        migratedCount: status.migratedCount,
        totalCount: status.totalCount,
        errors: status.errors.length,
        warnings: status.warnings.length
      });

    } catch (error) {
      status.status = 'failed';
      status.errors.push(`邮件配置迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('邮件配置迁移失败', { error });
    }

    return status;
  }

  /**
   * 迁移认证配置
   */
  private async migrateAuthConfig(options: MigrationOptions): Promise<ConfigMigrationStatus> {
    const status: ConfigMigrationStatus = {
      category: 'auth',
      priority: 'P1',
      status: 'in_progress',
      migratedCount: 0,
      totalCount: 4,
      errors: [],
      warnings: []
    };

    try {
      logger.info('迁移认证配置');

      if (options.dryRun) {
        logger.info('DRY RUN: 模拟认证配置迁移');
        status.status = 'completed';
        status.migratedCount = status.totalCount;
        return status;
      }

      // 检查认证配置
      const nextAuthSecret = process.env.COSEREEDEN_NEXTAUTH_SECRET || process.env.COSEREEDEN_NEXTAUTH_SECRET;
      const nextAuthUrl = process.env.COSEREEDEN_NEXTAUTH_URL || process.env.COSEREEDEN_NEXTAUTH_URL;
      const sessionMaxAge = process.env.COSEREEDEN_AUTH_SESSION_MAX_AGE || process.env.COSEREEDEN_AUTH_SESSION_MAX_AGE;
      const cookieDomain = process.env.COSEREEDEN_COOKIE_DOMAIN || process.env.COSEREEDEN_COOKIE_DOMAIN;

      if (!nextAuthSecret) {
        status.errors.push('NextAuth密钥未配置');
      } else {
        status.migratedCount++;
      }

      if (!nextAuthUrl) {
        status.warnings.push('NextAuth URL未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      if (!sessionMaxAge) {
        status.warnings.push('会话最大存活时间未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      if (!cookieDomain && process.env.NODE_ENV === 'production') {
        status.errors.push('生产环境必须配置Cookie域名');
      } else if (cookieDomain) {
        status.migratedCount++;
      }

      status.status = status.errors.length === 0 ? 'completed' : 'failed';
      logger.info('认证配置迁移完成', {
        migratedCount: status.migratedCount,
        totalCount: status.totalCount,
        errors: status.errors.length,
        warnings: status.warnings.length
      });

    } catch (error) {
      status.status = 'failed';
      status.errors.push(`认证配置迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('认证配置迁移失败', { error });
    }

    return status;
  }

  /**
   * 迁移业务配置
   */
  private async migrateBusinessConfig(options: MigrationOptions): Promise<ConfigMigrationStatus> {
    const status: ConfigMigrationStatus = {
      category: 'business',
      priority: 'P1',
      status: 'in_progress',
      migratedCount: 0,
      totalCount: 3,
      errors: [],
      warnings: []
    };

    try {
      logger.info('迁移业务配置');

      if (options.dryRun) {
        logger.info('DRY RUN: 模拟业务配置迁移');
        status.status = 'completed';
        status.migratedCount = status.totalCount;
        return status;
      }

      // 检查品牌配置
      const brandName = process.env.COSEREEDEN_BRAND_NAME || process.env.COSEREEDEN_BRAND_NAME;
      const brandColor = process.env.COSEREEDEN_BRAND_COLOR || process.env.COSEREEDEN_BRAND_COLOR;
      const supportEmail = process.env.COSEREEDEN_SUPPORT_EMAIL || process.env.COSEREEDEN_SUPPORT_EMAIL;

      if (!brandName) {
        status.warnings.push('品牌名称未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      if (!brandColor) {
        status.warnings.push('品牌颜色未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      if (!supportEmail) {
        status.warnings.push('支持邮箱未配置，将使用默认值');
      } else {
        status.migratedCount++;
      }

      status.status = 'completed'; // 业务配置都是可选的，不会导致失败
      logger.info('业务配置迁移完成', {
        migratedCount: status.migratedCount,
        totalCount: status.totalCount,
        errors: status.errors.length,
        warnings: status.warnings.length
      });

    } catch (error) {
      status.status = 'failed';
      status.errors.push(`业务配置迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
      logger.error('业务配置迁移失败', { error });
    }

    return status;
  }

  /**
   * 验证P1级配置完整性
   */
  async validateP1Configs(): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证邮件配置
    const emailFrom = process.env.COSEREEDEN_EMAIL_FROM || process.env.COSEREEDEN_EMAIL_FROM;
    const smtpHost = process.env.COSEREEDEN_EMAIL_SMTP_HOST;
    const smtpUser = process.env.COSEREEDEN_EMAIL_SMTP_USER;
    const smtpPass = process.env.COSEREEDEN_EMAIL_SMTP_PASS;

    if (!emailFrom) errors.push('发件人邮箱地址未配置');
    if (!smtpHost) errors.push('SMTP服务器主机未配置');
    if (!smtpUser) errors.push('SMTP用户名未配置');
    if (!smtpPass) errors.push('SMTP密码未配置');

    // 验证认证配置
    const nextAuthSecret = process.env.COSEREEDEN_NEXTAUTH_SECRET || process.env.COSEREEDEN_NEXTAUTH_SECRET;
    if (!nextAuthSecret) {
      errors.push('NextAuth密钥未配置');
    }

    // 生产环境特殊检查
    if (process.env.NODE_ENV === 'production') {
      const cookieDomain = process.env.COSEREEDEN_COOKIE_DOMAIN || process.env.COSEREEDEN_COOKIE_DOMAIN;
      if (!cookieDomain) {
        errors.push('生产环境必须配置Cookie域名');
      }
    }

    // 业务配置警告
    const brandName = process.env.COSEREEDEN_BRAND_NAME || process.env.COSEREEDEN_BRAND_NAME;
    const supportEmail = process.env.COSEREEDEN_SUPPORT_EMAIL || process.env.COSEREEDEN_SUPPORT_EMAIL;

    if (!brandName) warnings.push('品牌名称未配置，将使用默认值');
    if (!supportEmail) warnings.push('支持邮箱未配置，将使用默认值');

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取邮件配置模板
   */
  getEmailConfigTemplate(): Record<string, string> {
    return {
      'COSEREEDEN_EMAIL_FROM': 'noreply@cosereeden.com',
      'COSEREEDEN_EMAIL_SMTP_HOST': 'smtp.gmail.com',
      'COSEREEDEN_EMAIL_SMTP_PORT': '587',
      'COSEREEDEN_EMAIL_SMTP_USER': 'your-email@gmail.com',
      'COSEREEDEN_EMAIL_SMTP_PASS': 'your-app-password',
      'COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS': '24',
      'COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS': '1',
      'COSEREEDEN_MAX_RESEND_ATTEMPTS': '3',
    };
  }

  /**
   * 获取认证配置模板
   */
  getAuthConfigTemplate(): Record<string, string> {
    return {
      'COSEREEDEN_NEXTAUTH_SECRET': 'your-nextauth-secret-key',
      'COSEREEDEN_NEXTAUTH_URL': 'http://localhost:3000',
      'COSEREEDEN_AUTH_SESSION_MAX_AGE': '2592000', // 30天
      'COSEREEDEN_COOKIE_DOMAIN': '.cosereeden.com',
    };
  }
}
