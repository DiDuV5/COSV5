/**
 * @fileoverview 配置验证器 - CoserEden平台
 * @description 负责配置验证和冲突检测
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { ZodError } from 'zod';
import { TRPCErrorHandler, BusinessErrorType } from '../../errors/trpc-error-handler';
import { ConfigSchema } from './config-types';
import type {
  UnifiedConfig,
  ConfigConflict,
  ConfigHealthStatus,
  IConfigValidator,
} from './config-types';

/**
 * 配置验证器类
 * 负责配置验证和冲突检测
 */
export class ConfigValidator extends EventEmitter implements IConfigValidator {
  private conflicts: ConfigConflict[] = [];

  /**
   * 验证配置
   */
  public validateConfig(rawConfig: any): UnifiedConfig {
    try {
      console.log('🔍 开始验证配置...');

      // 使用Zod进行配置验证
      const validatedConfig = ConfigSchema.parse(rawConfig);

      console.log('✅ 配置验证通过');
      this.emit('configValidated', validatedConfig);

      return validatedConfig;

    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: 'received' in err ? err.received : undefined
        }));

        console.error('❌ 配置验证失败:', validationErrors);

        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          '配置验证失败',
          { context: { errors: validationErrors } }
        );
      }

      console.error('❌ 配置验证异常:', error);
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '配置验证异常',
        { context: { error: error instanceof Error ? error.message : '未知错误' } }
      );
    }
  }

  /**
   * 检测配置冲突
   */
  public async detectConfigConflicts(config: UnifiedConfig): Promise<void> {
    console.log('🔍 开始检测配置冲突...');
    this.conflicts = [];

    try {
      // 检查必需配置
      this.checkRequiredConfigs(config);

      // 检查配置一致性
      this.checkConfigConsistency(config);

      // 检查环境特定配置
      this.checkEnvironmentSpecificConfigs(config);

      // 检查安全配置
      this.checkSecurityConfigs(config);

      // 检查存储配置
      this.checkStorageConfigs(config);

      // 检查CDN配置
      this.checkCdnConfigs(config);

      console.log(`🔍 配置冲突检测完成，发现 ${this.conflicts.length} 个问题`);

      if (this.conflicts.length > 0) {
        this.emit('conflictDetected', this.conflicts);
      }

    } catch (error) {
      console.error('❌ 配置冲突检测失败:', error);
      throw error;
    }
  }

  /**
   * 获取配置冲突
   */
  public getConfigConflicts(): ConfigConflict[] {
    return [...this.conflicts];
  }

  /**
   * 获取健康状态
   */
  public getHealthStatus(): ConfigHealthStatus {
    const criticalIssues = this.conflicts.filter(c => c.severity === 'CRITICAL').length;
    const highIssues = this.conflicts.filter(c => c.severity === 'HIGH').length;
    const mediumIssues = this.conflicts.filter(c => c.severity === 'MEDIUM').length;
    const lowIssues = this.conflicts.filter(c => c.severity === 'LOW').length;

    const isHealthy = criticalIssues === 0 && highIssues === 0;

    let summary = '健康';
    if (criticalIssues > 0) {
      summary = '严重问题';
    } else if (highIssues > 0) {
      summary = '需要注意';
    } else if (mediumIssues > 0) {
      summary = '轻微问题';
    }

    return {
      isHealthy,
      conflicts: this.conflicts.length,
      criticalIssues,
      warnings: mediumIssues + lowIssues,
      summary
    };
  }

  // 私有方法 - 各种配置检查

  private checkRequiredConfigs(config: UnifiedConfig): void {
    const requiredConfigs = [
      { path: 'database.url', value: config.database.url },
      { path: 'auth.secret', value: config.auth.secret },
      { path: 'app.url', value: config.app.url },
      { path: 'app.domain', value: config.app.domain }
    ];

    for (const { path, value } of requiredConfigs) {
      if (!value || value.length === 0) {
        this.conflicts.push({
          path,
          type: 'MISSING',
          severity: 'CRITICAL',
          message: `必需的配置项缺失: ${path}`,
          suggestion: `请在环境变量中设置 ${path.toUpperCase().replace('.', '_')}`
        });
      }
    }
  }

  private checkConfigConsistency(config: UnifiedConfig): void {
    // 检查存储配置一致性
    if (config.storage.provider === 'cloudflare-r2' && !config.storage.cloudflareR2) {
      this.conflicts.push({
        path: 'storage.cloudflareR2',
        type: 'MISSING',
        severity: 'CRITICAL',
        message: '选择了 Cloudflare R2 存储但缺少相关配置',
        suggestion: '请配置 Cloudflare R2 相关环境变量'
      });
    }

    // 检查CDN配置一致性
    if (config.cdn.environment !== config.environment) {
      this.conflicts.push({
        path: 'cdn.environment',
        type: 'CONFLICT',
        severity: 'MEDIUM',
        message: 'CDN环境与应用环境不一致',
        suggestion: '建议保持CDN环境与应用环境一致',
        currentValue: config.cdn.environment,
        expectedValue: config.environment
      });
    }

    // 检查认证URL一致性
    if (config.auth.url !== config.app.url) {
      this.conflicts.push({
        path: 'auth.url',
        type: 'CONFLICT',
        severity: 'MEDIUM',
        message: '认证URL与应用URL不一致',
        suggestion: '建议保持认证URL与应用URL一致',
        currentValue: config.auth.url,
        expectedValue: config.app.url
      });
    }
  }

  private checkEnvironmentSpecificConfigs(config: UnifiedConfig): void {
    if (config.environment === 'production') {
      // 生产环境特定检查
      if (!config.auth.cookieSecure) {
        this.conflicts.push({
          path: 'auth.cookieSecure',
          type: 'INVALID',
          severity: 'HIGH',
          message: '生产环境应启用安全Cookie',
          suggestion: '在生产环境中设置 cookieSecure 为 true'
        });
      }

      if (config.monitoring.logLevel === 'debug') {
        this.conflicts.push({
          path: 'monitoring.logLevel',
          type: 'INVALID',
          severity: 'MEDIUM',
          message: '生产环境不建议使用debug日志级别',
          suggestion: '建议在生产环境使用 info 或 warn 日志级别'
        });
      }

      if (config.database.enableLogging) {
        this.conflicts.push({
          path: 'database.enableLogging',
          type: 'INVALID',
          severity: 'MEDIUM',
          message: '生产环境不建议启用数据库日志',
          suggestion: '在生产环境中禁用数据库日志以提高性能'
        });
      }
    }

    if (config.environment === 'development') {
      if (config.auth.cookieSecure) {
        this.conflicts.push({
          path: 'auth.cookieSecure',
          type: 'INVALID',
          severity: 'LOW',
          message: '开发环境启用安全Cookie可能导致本地访问问题',
          suggestion: '在开发环境中可以禁用 cookieSecure'
        });
      }
    }
  }

  private checkSecurityConfigs(config: UnifiedConfig): void {
    if (config.auth.secret.length < 32) {
      this.conflicts.push({
        path: 'auth.secret',
        type: 'INVALID',
        severity: 'CRITICAL',
        message: '认证密钥长度不足',
        suggestion: '认证密钥应至少32个字符'
      });
    }

    if (config.environment === 'production' && !config.security.encryptionKey) {
      this.conflicts.push({
        path: 'security.encryptionKey',
        type: 'MISSING',
        severity: 'HIGH',
        message: '生产环境缺少加密密钥',
        suggestion: '请设置 ENCRYPTION_KEY 环境变量'
      });
    }

    if (config.security.enableCors && config.security.corsOrigins.length === 0) {
      this.conflicts.push({
        path: 'security.corsOrigins',
        type: 'MISSING',
        severity: 'MEDIUM',
        message: '启用了CORS但未配置允许的源',
        suggestion: '请配置 CORS_ORIGINS 环境变量'
      });
    }
  }

  private checkStorageConfigs(config: UnifiedConfig): void {
    if (config.storage.provider === 'cloudflare-r2' && config.storage.cloudflareR2) {
      const r2Config = config.storage.cloudflareR2;

      if (!r2Config.accountId || !r2Config.accessKeyId || !r2Config.secretAccessKey) {
        this.conflicts.push({
          path: 'storage.cloudflareR2',
          type: 'MISSING',
          severity: 'CRITICAL',
          message: 'Cloudflare R2 配置不完整',
          suggestion: '请配置完整的 Cloudflare R2 认证信息'
        });
      }

      if (!r2Config.bucketName) {
        this.conflicts.push({
          path: 'storage.cloudflareR2.bucketName',
          type: 'MISSING',
          severity: 'CRITICAL',
          message: '缺少 Cloudflare R2 存储桶名称',
          suggestion: '请设置 CLOUDFLARE_R2_BUCKET_NAME 环境变量'
        });
      }
    }
  }

  private checkCdnConfigs(config: UnifiedConfig): void {
    if (config.cdn.enableHotlinkProtection && config.cdn.allowedDomains.length === 0) {
      this.conflicts.push({
        path: 'cdn.allowedDomains',
        type: 'MISSING',
        severity: 'MEDIUM',
        message: '启用了防盗链保护但未配置允许的域名',
        suggestion: '请配置 ALLOWED_IMAGE_DOMAINS 环境变量'
      });
    }

    if (config.cdn.rateLimitPerMinute < 10) {
      this.conflicts.push({
        path: 'cdn.rateLimitPerMinute',
        type: 'INVALID',
        severity: 'LOW',
        message: 'CDN速率限制过低可能影响用户体验',
        suggestion: '建议设置合理的速率限制值'
      });
    }
  }
}
