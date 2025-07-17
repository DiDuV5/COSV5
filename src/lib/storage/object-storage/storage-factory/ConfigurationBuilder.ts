/**
 * @fileoverview 配置构建器
 * @description 专门负责存储配置的构建和管理
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import type { StorageConfig } from '../base-storage-provider';
import type { StorageManagerConfig } from '../storage-manager';
import { EnvironmentValidator } from './EnvironmentValidator';

/**
 * 配置构建器类
 */
export class ConfigurationBuilder {
  private readonly environmentValidator: EnvironmentValidator;

  constructor() {
    this.environmentValidator = new EnvironmentValidator();
  }

  /**
   * 获取Cloudflare R2配置 (完全从环境变量)
   */
  public getR2Config(): StorageConfig {
    // 验证必需的环境变量
    this.environmentValidator.validateRequiredEnvVars();

    // 获取环境变量值
    const accountId = process.env.COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID!;
    const accessKeyId = process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
    const bucketName = process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME!;
    const endpoint = process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT!;

    // 可选配置项
    const cdnDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN;
    const customDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN;
    const apiToken = process.env.COSEREEDEN_CLOUDFLARE_R2_API_TOKEN;
    const region = process.env.COSEREEDEN_CLOUDFLARE_R2_REGION || 'auto';

    // 构建配置对象
    const config: StorageConfig = {
      provider: 'cloudflare-r2' as const,
      bucket: bucketName,
      region,
      accessKeyId,
      secretAccessKey,
      endpoint,
      accountId,
      forcePathStyle: true,
      signatureVersion: 'v4',
      publicAccess: true,
    };

    // 设置CDN域名（优先使用自定义域名）
    if (customDomain) {
      config.cdnDomain = customDomain;
      config.customDomain = customDomain.replace(/https?:\/\//, '');
      config.publicUrl = customDomain;
    } else if (cdnDomain) {
      config.cdnDomain = cdnDomain;
      config.customDomain = cdnDomain.replace(/https?:\/\//, '');
      config.publicUrl = cdnDomain;
    } else {
      // 如果没有CDN域名，使用endpoint作为回退
      config.cdnDomain = endpoint;
      config.customDomain = '';
      config.publicUrl = endpoint;
    }

    // 设置API Token（可选）
    if (apiToken) {
      config.apiToken = apiToken;
    }

    return config;
  }

  /**
   * 创建本地存储配置
   */
  public createLocalStorageConfig(): StorageConfig {
    const basePath = process.env.COSEREEDEN_LOCAL_STORAGE_PATH || `${process.cwd()}/public/uploads`;
    const cdnDomain = process.env.COSEREEDEN_LOCAL_CDN_DOMAIN || 'http://localhost:3000';
    const timeout = parseInt(process.env.COSEREEDEN_LOCAL_STORAGE_TIMEOUT || '30000', 10);
    const retryCount = parseInt(process.env.COSEREEDEN_LOCAL_STORAGE_RETRY_COUNT || '3', 10);

    return {
      provider: 'local',
      basePath,
      cdnDomain,
      defaultAcl: 'public-read',
      timeout,
      retryCount,
    };
  }

  /**
   * 创建主要存储配置 (环境变量驱动)
   */
  public createPrimaryStorageConfig(): StorageConfig {
    console.log('🔧 使用环境变量驱动的Cloudflare R2配置');
    return this.getR2Config();
  }

  /**
   * 创建备用存储配置
   * 可选择启用本地存储作为备用方案
   */
  public createFallbackStorageConfig(): StorageConfig | undefined {
    const enableLocalFallback = process.env.COSEREEDEN_ENABLE_LOCAL_FALLBACK === 'true';

    if (enableLocalFallback) {
      console.log('🔄 启用本地存储作为备用方案');
      return this.createLocalStorageConfig();
    }

    console.log('🚫 本地存储备用方案已禁用');
    return undefined;
  }

  /**
   * 创建Cloudflare R2配置 (从环境变量)
   */
  public createCloudflareR2Config(): StorageConfig {
    console.log('🔧 使用环境变量的Cloudflare R2配置');
    return this.getR2Config();
  }

  /**
   * 创建默认配置
   */
  public createDefaultConfig(): StorageManagerConfig {
    return {
      primary: this.createPrimaryStorageConfig(),
      fallback: this.createFallbackStorageConfig(),
      enableFailover: false, // 禁用故障转移到本地存储
      failoverTimeout: 120000, // 2分钟超时，适应大文件上传
      enableCache: true,
      cacheTtl: 5 * 60 * 1000, // 5分钟
      maxRetries: 3,
      retryDelay: 1000,
    };
  }

  /**
   * 创建测试配置
   */
  public createTestConfig(): StorageManagerConfig {
    // 测试环境使用简化的配置
    const testConfig = this.getR2Config();

    return {
      primary: testConfig,
      enableFailover: false,
      enableCache: false,
      maxRetries: 1,
      retryDelay: 500,
    };
  }

  /**
   * 获取配置摘要
   */
  public getConfigSummary(config: StorageConfig): any {
    return {
      provider: config.provider,
      bucket: config.bucket || config.basePath,
      endpoint: config.endpoint,
      cdnDomain: config.cdnDomain,
      region: config.region,
      hasCredentials: !!(config.accessKeyId && config.secretAccessKey),
    };
  }

  /**
   * 创建开发环境配置
   */
  public createDevelopmentConfig(): StorageManagerConfig {
    const config = this.createDefaultConfig();
    
    // 开发环境特殊设置
    config.enableCache = false; // 禁用缓存以便调试
    config.maxRetries = 1; // 减少重试次数
    config.retryDelay = 500; // 减少重试延迟
    
    return config;
  }

  /**
   * 创建生产环境配置
   */
  public createProductionConfig(): StorageManagerConfig {
    const config = this.createDefaultConfig();
    
    // 生产环境特殊设置
    config.enableCache = true; // 启用缓存
    config.cacheTtl = 10 * 60 * 1000; // 10分钟缓存
    config.maxRetries = 5; // 增加重试次数
    config.retryDelay = 2000; // 增加重试延迟
    config.failoverTimeout = 180000; // 3分钟超时
    
    return config;
  }

  /**
   * 根据环境创建配置
   */
  public createConfigForEnvironment(environment?: string): StorageManagerConfig {
    const env = environment || process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'production':
        return this.createProductionConfig();
      case 'test':
        return this.createTestConfig();
      case 'development':
      default:
        return this.createDevelopmentConfig();
    }
  }

  /**
   * 验证配置完整性
   */
  public validateConfiguration(config: StorageConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      this.environmentValidator.validateStorageConfig(config);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : '配置验证失败');
    }

    // 检查可选配置
    if (!config.cdnDomain) {
      warnings.push('未设置CDN域名，可能影响访问性能');
    }

    if (config.provider === 'cloudflare-r2' && !config.apiToken) {
      warnings.push('未设置API Token，某些功能可能受限');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 合并配置
   */
  public mergeConfigs(base: StorageConfig, override: Partial<StorageConfig>): StorageConfig {
    return {
      ...base,
      ...override,
    };
  }

  /**
   * 克隆配置
   */
  public cloneConfig(config: StorageConfig): StorageConfig {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * 比较配置
   */
  public compareConfigs(config1: StorageConfig, config2: StorageConfig): {
    isEqual: boolean;
    differences: string[];
  } {
    const differences: string[] = [];
    
    // 比较关键字段
    const keyFields = ['provider', 'bucket', 'endpoint', 'accessKeyId', 'cdnDomain'];
    
    for (const field of keyFields) {
      if (config1[field as keyof StorageConfig] !== config2[field as keyof StorageConfig]) {
        differences.push(`${field}: "${config1[field as keyof StorageConfig]}" vs "${config2[field as keyof StorageConfig]}"`);
      }
    }
    
    return {
      isEqual: differences.length === 0,
      differences,
    };
  }
}
