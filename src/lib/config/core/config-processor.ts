/**
 * @fileoverview 配置处理器 - CoserEden平台
 * @description 负责配置后处理和环境特定调整
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { TRPCErrorHandler, BusinessErrorType } from '../../errors/trpc-error-handler';
import type {
  UnifiedConfig,
  Environment,
  IConfigProcessor,
} from './config-types';

/**
 * 配置处理器类
 * 负责配置后处理和环境特定调整
 */
export class ConfigProcessor extends EventEmitter implements IConfigProcessor {
  /**
   * 应用环境特定配置
   */
  public applyEnvironmentSpecificConfig(config: UnifiedConfig): UnifiedConfig {
    console.log(`🔧 应用 ${config.environment} 环境特定配置...`);
    
    const processedConfig = { ...config };
    
    switch (config.environment) {
      case 'development':
        this.applyDevelopmentConfig(processedConfig);
        break;
      case 'staging':
        this.applyStagingConfig(processedConfig);
        break;
      case 'production':
        this.applyProductionConfig(processedConfig);
        break;
      case 'test':
        this.applyTestConfig(processedConfig);
        break;
    }
    
    console.log('✅ 环境特定配置应用完成');
    return processedConfig;
  }

  /**
   * 检查必需配置
   */
  public checkRequiredConfigs(config: UnifiedConfig): void {
    const requiredConfigs = this.getRequiredConfigsByEnvironment(config.environment);
    
    for (const configPath of requiredConfigs) {
      const value = this.getConfigValue(config, configPath);
      
      if (value === undefined || value === null || value === '') {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          `必需的配置项缺失: ${configPath}`,
          { context: { configPath, environment: config.environment } }
        );
      }
    }
  }

  /**
   * 检查配置一致性
   */
  public checkConfigConsistency(config: UnifiedConfig): void {
    // 检查存储配置一致性
    if (config.storage.provider === 'cloudflare-r2' && !config.storage.cloudflareR2) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '存储配置不一致：选择了 Cloudflare R2 但缺少相关配置'
      );
    }

    if (config.storage.provider === 'local' && !config.storage.local) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '存储配置不一致：选择了本地存储但缺少相关配置'
      );
    }

    // 检查上传配置一致性
    if (config.storage.cloudflareR2 && config.upload.maxFileSize > 100 * 1024 * 1024) {
      console.warn('⚠️ 上传文件大小限制可能超过存储服务限制');
    }

    // 检查CDN配置一致性
    if (config.cdn.maxFileSize !== config.upload.maxFileSize) {
      console.warn('⚠️ CDN文件大小限制与上传限制不一致');
    }
  }

  /**
   * 检查环境特定配置
   */
  public checkEnvironmentSpecificConfigs(config: UnifiedConfig): void {
    switch (config.environment) {
      case 'production':
        this.checkProductionConfigs(config);
        break;
      case 'development':
        this.checkDevelopmentConfigs(config);
        break;
      case 'staging':
        this.checkStagingConfigs(config);
        break;
      case 'test':
        this.checkTestConfigs(config);
        break;
    }
  }

  /**
   * 检查安全配置
   */
  public checkSecurityConfigs(config: UnifiedConfig): void {
    // 检查认证密钥强度
    if (config.auth.secret.length < 32) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '认证密钥长度不足，至少需要32个字符'
      );
    }

    // 生产环境安全检查
    if (config.environment === 'production') {
      if (!config.auth.cookieSecure) {
        console.warn('⚠️ 生产环境建议启用安全Cookie');
      }

      if (!config.security.enableCsp) {
        console.warn('⚠️ 生产环境建议启用内容安全策略');
      }

      if (!config.security.encryptionKey) {
        console.warn('⚠️ 生产环境建议设置加密密钥');
      }
    }

    // 检查CORS配置
    if (config.security.enableCors && config.security.corsOrigins.length === 0) {
      console.warn('⚠️ 启用了CORS但未配置允许的源，可能导致跨域问题');
    }
  }

  // 私有方法 - 环境特定配置应用

  private applyDevelopmentConfig(config: UnifiedConfig): void {
    // 开发环境优化
    config.auth.cookieSecure = false;
    config.monitoring.logLevel = 'debug';
    config.database.enableLogging = true;
    config.security.enableCsp = false;
    
    // 开发环境允许所有源
    if (config.security.corsOrigins.length === 0) {
      config.security.corsOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    }
    
    // 降低速率限制
    config.security.rateLimitMaxRequests = 1000;
    
    console.log('🔧 应用开发环境配置');
  }

  private applyStagingConfig(config: UnifiedConfig): void {
    // 预发布环境配置
    config.auth.cookieSecure = true;
    config.monitoring.logLevel = 'info';
    config.database.enableLogging = false;
    config.security.enableCsp = true;
    
    console.log('🔧 应用预发布环境配置');
  }

  private applyProductionConfig(config: UnifiedConfig): void {
    // 生产环境安全配置
    config.auth.cookieSecure = true;
    config.monitoring.logLevel = 'warn';
    config.database.enableLogging = false;
    config.security.enableCsp = true;
    
    // 生产环境严格的速率限制
    if (config.security.rateLimitMaxRequests > 200) {
      config.security.rateLimitMaxRequests = 200;
    }
    
    console.log('🔧 应用生产环境配置');
  }

  private applyTestConfig(config: UnifiedConfig): void {
    // 测试环境配置
    config.auth.cookieSecure = false;
    config.monitoring.logLevel = 'error';
    config.database.enableLogging = false;
    config.security.enableRateLimit = false;
    config.monitoring.enableMetrics = false;
    
    // 测试环境使用内存存储
    config.storage.provider = 'local';
    
    console.log('🔧 应用测试环境配置');
  }

  // 私有方法 - 环境特定检查

  private checkProductionConfigs(config: UnifiedConfig): void {
    const requiredForProduction = [
      'auth.secret',
      'database.url',
      'storage.cloudflareR2.accountId',
      'storage.cloudflareR2.accessKeyId',
      'storage.cloudflareR2.secretAccessKey'
    ];

    for (const configPath of requiredForProduction) {
      const value = this.getConfigValue(config, configPath);
      if (!value) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.VALIDATION_FAILED,
          `生产环境必需配置缺失: ${configPath}`
        );
      }
    }
  }

  private checkDevelopmentConfigs(config: UnifiedConfig): void {
    // 开发环境检查相对宽松
    if (!config.database.url) {
      console.warn('⚠️ 开发环境未配置数据库URL');
    }
  }

  private checkStagingConfigs(config: UnifiedConfig): void {
    // 预发布环境检查
    if (!config.monitoring.sentryDsn) {
      console.warn('⚠️ 预发布环境建议配置错误追踪');
    }
  }

  private checkTestConfigs(config: UnifiedConfig): void {
    // 测试环境检查
    if (config.database.url.includes('production')) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        '测试环境不能使用生产数据库'
      );
    }
  }

  // 工具方法

  private getRequiredConfigsByEnvironment(environment: Environment): string[] {
    const baseRequired = ['database.url', 'auth.secret', 'app.url'];
    
    switch (environment) {
      case 'production':
        return [
          ...baseRequired,
          'storage.cloudflareR2.accountId',
          'storage.cloudflareR2.accessKeyId',
          'storage.cloudflareR2.secretAccessKey',
          'storage.cloudflareR2.bucketName'
        ];
      case 'staging':
        return [
          ...baseRequired,
          'storage.cloudflareR2.accountId',
          'storage.cloudflareR2.accessKeyId'
        ];
      case 'development':
        return baseRequired;
      case 'test':
        return ['auth.secret'];
      default:
        return baseRequired;
    }
  }

  private getConfigValue(config: any, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], config);
  }
}
