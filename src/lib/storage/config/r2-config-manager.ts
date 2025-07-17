/**
 * @fileoverview Cloudflare R2 配置管理器
 * @description 统一管理R2存储的所有配置项，支持环境变量和动态配置
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

import { env } from '@/lib/env';
import type { R2Config } from '../providers/r2-types';

/**
 * R2配置管理器
 */
export class R2ConfigManager {
  private static instance: R2ConfigManager;
  private config: R2Config | null = null;
  private configCache = new Map<string, any>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): R2ConfigManager {
    if (!R2ConfigManager.instance) {
      R2ConfigManager.instance = new R2ConfigManager();
    }
    return R2ConfigManager.instance;
  }

  /**
   * 获取完整的R2配置
   */
  getR2Config(): R2Config {
    if (!this.config) {
      this.config = this.buildR2Config();
    }
    return this.config;
  }

  /**
   * 构建R2配置
   */
  private buildR2Config(): R2Config {
    return {
      provider: 'cloudflare-r2',
      accountId: env.COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID,
      accessKeyId: env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      bucket: env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME,
      endpoint: env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT,
      region: env.COSEREEDEN_CLOUDFLARE_R2_REGION,
      customDomain: env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
      
      // 高级配置
      forcePathStyle: env.COSEREEDEN_CLOUDFLARE_R2_FORCE_PATH_STYLE,
      timeout: env.COSEREEDEN_CLOUDFLARE_R2_TIMEOUT,
      defaultAcl: env.COSEREEDEN_CLOUDFLARE_R2_DEFAULT_ACL,
      
      // 多部分上传配置
      enableMultipartUpload: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_MULTIPART,
      multipartThreshold: env.COSEREEDEN_CLOUDFLARE_R2_MULTIPART_THRESHOLD,
      partSize: env.COSEREEDEN_CLOUDFLARE_R2_PART_SIZE,
      maxConcurrency: env.COSEREEDEN_CLOUDFLARE_R2_MAX_CONCURRENCY,
      
      // 重试配置
      maxRetries: env.COSEREEDEN_CLOUDFLARE_R2_MAX_RETRIES,
      retryDelay: env.COSEREEDEN_CLOUDFLARE_R2_RETRY_DELAY,
      retryBackoff: env.COSEREEDEN_CLOUDFLARE_R2_RETRY_BACKOFF,
      
      // 熔断器配置
      circuitBreakerThreshold: env.COSEREEDEN_CLOUDFLARE_R2_CIRCUIT_BREAKER_THRESHOLD,
      circuitBreakerTimeout: env.COSEREEDEN_CLOUDFLARE_R2_CIRCUIT_BREAKER_TIMEOUT,
      
      // 监控配置
      healthCheckInterval: env.COSEREEDEN_CLOUDFLARE_R2_HEALTH_CHECK_INTERVAL,
      enableMetrics: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_METRICS,
      metricsInterval: env.COSEREEDEN_CLOUDFLARE_R2_METRICS_INTERVAL,
      
      // 缓存配置
      enableCache: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_CACHE,
      cacheTtl: env.COSEREEDEN_CLOUDFLARE_R2_CACHE_TTL,
      
      // 压缩配置
      enableCompression: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_COMPRESSION,
      compressionThreshold: env.COSEREEDEN_CLOUDFLARE_R2_COMPRESSION_THRESHOLD,
    };
  }

  /**
   * 获取重试配置
   */
  getRetryConfig() {
    return this.getCachedConfig('retry', () => ({
      maxRetries: env.COSEREEDEN_CLOUDFLARE_R2_MAX_RETRIES,
      retryDelay: env.COSEREEDEN_CLOUDFLARE_R2_RETRY_DELAY,
      retryBackoff: env.COSEREEDEN_CLOUDFLARE_R2_RETRY_BACKOFF,
      circuitBreakerThreshold: env.COSEREEDEN_CLOUDFLARE_R2_CIRCUIT_BREAKER_THRESHOLD,
      circuitBreakerTimeout: env.COSEREEDEN_CLOUDFLARE_R2_CIRCUIT_BREAKER_TIMEOUT,
    }));
  }

  /**
   * 获取监控配置
   */
  getMonitoringConfig() {
    return this.getCachedConfig('monitoring', () => ({
      healthCheckInterval: env.COSEREEDEN_CLOUDFLARE_R2_HEALTH_CHECK_INTERVAL,
      enableMetrics: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_METRICS,
      metricsInterval: env.COSEREEDEN_CLOUDFLARE_R2_METRICS_INTERVAL,
    }));
  }

  /**
   * 获取性能配置
   */
  getPerformanceConfig() {
    return this.getCachedConfig('performance', () => ({
      enableCache: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_CACHE,
      cacheTtl: env.COSEREEDEN_CLOUDFLARE_R2_CACHE_TTL,
      enableCompression: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_COMPRESSION,
      compressionThreshold: env.COSEREEDEN_CLOUDFLARE_R2_COMPRESSION_THRESHOLD,
      enableMultipartUpload: env.COSEREEDEN_CLOUDFLARE_R2_ENABLE_MULTIPART,
      multipartThreshold: env.COSEREEDEN_CLOUDFLARE_R2_MULTIPART_THRESHOLD,
      partSize: env.COSEREEDEN_CLOUDFLARE_R2_PART_SIZE,
      maxConcurrency: env.COSEREEDEN_CLOUDFLARE_R2_MAX_CONCURRENCY,
    }));
  }

  /**
   * 获取缓存配置
   */
  private getCachedConfig<T>(key: string, factory: () => T): T {
    const cacheKey = `config_${key}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    const value = factory();
    this.configCache.set(cacheKey, {
      value,
      timestamp: Date.now(),
    });

    return value;
  }

  /**
   * 验证R2配置
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getR2Config();

    // 验证必需配置
    if (!config.accountId) errors.push('缺少账户ID');
    if (!config.accessKeyId) errors.push('缺少访问密钥ID');
    if (!config.secretAccessKey) errors.push('缺少秘密访问密钥');
    if (!config.bucket) errors.push('缺少存储桶名称');
    if (!config.endpoint) errors.push('缺少端点URL');

    // 验证数值配置
    if (config.timeout && config.timeout < 1000) {
      errors.push('超时时间不能少于1秒');
    }
    if (config.maxRetries && config.maxRetries < 0) {
      errors.push('重试次数不能为负数');
    }
    if (config.partSize && config.partSize < 5 * 1024 * 1024) {
      errors.push('分片大小不能小于5MB');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary() {
    const config = this.getR2Config();
    return {
      provider: config.provider,
      bucket: config.bucket,
      region: config.region,
      enableMultipart: config.enableMultipartUpload,
      multipartThreshold: `${Math.round((config.multipartThreshold || 0) / 1024 / 1024)}MB`,
      maxRetries: config.maxRetries,
      enableMetrics: config.enableMetrics,
      enableCache: config.enableCache,
      enableCompression: config.enableCompression,
    };
  }

  /**
   * 重新加载配置
   */
  reloadConfig(): void {
    this.config = null;
    this.configCache.clear();
    console.log('✅ R2配置已重新加载');
  }

  /**
   * 获取环境特定配置
   */
  getEnvironmentConfig() {
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';
    
    return {
      environment: process.env.NODE_ENV,
      isDevelopment: isDev,
      isProduction: isProd,
      
      // 开发环境配置调整
      ...(isDev && {
        timeout: Math.max(env.COSEREEDEN_CLOUDFLARE_R2_TIMEOUT, 60000), // 开发环境更长超时
        maxRetries: Math.max(env.COSEREEDEN_CLOUDFLARE_R2_MAX_RETRIES, 5), // 更多重试
        enableMetrics: false, // 开发环境关闭指标
      }),
      
      // 生产环境配置调整
      ...(isProd && {
        enableMetrics: true, // 生产环境启用指标
        enableCache: true, // 启用缓存
        enableCompression: true, // 启用压缩
      }),
    };
  }

  /**
   * 导出配置用于调试
   */
  exportConfigForDebug() {
    const config = this.getR2Config();
    return {
      ...config,
      // 隐藏敏感信息
      accessKeyId: config.accessKeyId ? `${config.accessKeyId.substring(0, 8)}...` : '',
      secretAccessKey: config.secretAccessKey ? '***' : '',
    };
  }
}

// 导出单例实例
export const r2ConfigManager = R2ConfigManager.getInstance();
