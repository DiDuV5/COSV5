/**
 * @fileoverview 配置加载器 - CoserEden平台
 * @description 负责从环境变量加载配置数据
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { getEnvWithFallback } from '@/lib/config/env-compatibility';
import type {
  Environment,
  IConfigLoader,
} from './config-types';

/**
 * 配置加载器类
 * 负责从环境变量和其他来源加载配置数据
 */
export class ConfigLoader extends EventEmitter implements IConfigLoader {
  /**
   * 检测当前环境
   */
  public detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV;
    const customEnv = process.env.COSEREEDEN_APP_ENV;

    if (customEnv && ['development', 'staging', 'production', 'test'].includes(customEnv)) {
      return customEnv as Environment;
    }

    switch (nodeEnv) {
      case 'production':
        return 'production';
      case 'test':
        return 'test';
      case 'development':
      default:
        return 'development';
    }
  }

  /**
   * 加载环境变量配置
   */
  public loadEnvironmentVariables(): any {
    const environment = this.detectEnvironment();

    return {
      environment,
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),

      app: this.loadAppConfig(),
      database: this.loadDatabaseConfig(),
      auth: this.loadAuthConfig(),
      storage: this.loadStorageConfig(),
      cdn: this.loadCdnConfig(environment),
      upload: this.loadUploadConfig(),
      monitoring: this.loadMonitoringConfig(),
      security: this.loadSecurityConfig(),
      email: this.loadEmailConfig(),
      services: this.loadServicesConfig(),
    };
  }

  // 私有方法 - 各模块配置加载

  private loadAppConfig(): any {
    return {
      name: process.env.COSEREEDEN_APP_NAME || 'CoserEden',
      version: process.env.COSEREEDEN_APP_VERSION || '1.0.0',
      url: process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      domain: process.env.COSEREEDEN_APP_DOMAIN || 'localhost',
      cookieDomain: process.env.COSEREEDEN_COOKIE_DOMAIN,
      allowedOrigins: this.parseStringArray(process.env.COSEREEDEN_ALLOWED_ORIGINS),
      timezone: process.env.COSEREEDEN_TZ || 'Asia/Shanghai'
    };
  }

  private loadDatabaseConfig(): any {
    return {
      url: getEnvWithFallback('COSEREEDEN_DATABASE_URL') || '',
      maxConnections: parseInt(process.env.COSEREEDEN_DB_MAX_CONNECTIONS || '20', 10),
      connectionTimeout: parseInt(process.env.COSEREEDEN_DB_CONNECTION_TIMEOUT || '30000', 10),
      queryTimeout: parseInt(process.env.COSEREEDEN_DB_QUERY_TIMEOUT || '60000', 10),
      enableLogging: process.env.COSEREEDEN_DB_ENABLE_LOGGING === 'true',
      enableMetrics: process.env.COSEREEDEN_DB_ENABLE_METRICS !== 'false'
    };
  }

  private loadAuthConfig(): any {
    // 验证必需的认证环境变量
    if (process.env.NODE_ENV === 'production') {
      const requiredVars = ['NEXTAUTH_SECRET'];
      const missingVars = requiredVars.filter(varName =>
        !process.env[varName] && !process.env[`COSEREEDEN_${varName}`]
      );

      if (missingVars.length > 0) {
        throw new Error(`生产环境缺少必需的认证环境变量: ${missingVars.join(', ')}`);
      }
    }

    return {
      secret: process.env.COSEREEDEN_NEXTAUTH_SECRET || '',
      url: process.env.COSEREEDEN_NEXTAUTH_URL || process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      sessionMaxAge: parseInt(process.env.COSEREEDEN_AUTH_SESSION_MAX_AGE || '86400', 10),
      cookieSecure: process.env.COSEREEDEN_AUTH_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production',
      cookieSameSite: process.env.COSEREEDEN_AUTH_COOKIE_SAME_SITE || 'lax',
      enableCsrf: process.env.COSEREEDEN_AUTH_ENABLE_CSRF !== 'false'
    };
  }

  private loadStorageConfig(): any {
    const provider = process.env.COSEREEDEN_STORAGE_PROVIDER || 'cloudflare-r2';

    return {
      provider,
      cloudflareR2: provider === 'cloudflare-r2' ? {
        accountId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID || '',
        accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
        bucketName: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME || '',
        region: process.env.COSEREEDEN_CLOUDFLARE_R2_REGION || 'auto',
        endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT || '',
        cdnDomain: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
        maxRetries: parseInt(process.env.COSEREEDEN_CLOUDFLARE_R2_MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.COSEREEDEN_CLOUDFLARE_R2_RETRY_DELAY || '1000', 10),
        timeout: parseInt(process.env.COSEREEDEN_CLOUDFLARE_R2_TIMEOUT || '60000', 10)
      } : undefined,
      local: provider === 'local' ? {
        uploadDir: process.env.COSEREEDEN_UPLOAD_DIR || './uploads',
        tempDir: process.env.COSEREEDEN_TEMP_DIR || './temp',
        maxFileSize: parseInt(process.env.COSEREEDEN_MAX_FILE_SIZE || '104857600', 10),
        allowedTypes: this.parseStringArray(process.env.COSEREEDEN_ALLOWED_FILE_TYPES, ['image/*', 'video/*'])
      } : undefined
    };
  }

  private loadCdnConfig(environment: Environment): any {
    // 根据环境选择合适的CDN域名
    const primaryDomain = this.getCdnDomainForEnvironment(environment);

    // 验证CDN配置
    this.validateCdnConfig(primaryDomain, environment);

    return {
      environment: process.env.COSEREEDEN_CDN_ENVIRONMENT || environment,
      primaryDomain,
      backupDomains: this.parseStringArray(process.env.COSEREEDEN_CDN_BACKUP_DOMAINS),
      allowedDomains: this.parseStringArray(process.env.COSEREEDEN_ALLOWED_IMAGE_DOMAINS),
      enableHotlinkProtection: process.env.COSEREEDEN_CDN_ENABLE_HOTLINK_PROTECTION !== 'false',
      rateLimitPerMinute: parseInt(process.env.COSEREEDEN_CDN_RATE_LIMIT_REQUESTS_PER_MINUTE || '100', 10),
      maxFileSize: parseInt(process.env.COSEREEDEN_CDN_MAX_FILE_SIZE_MB || '100', 10) * 1024 * 1024,
      cacheControl: process.env.COSEREEDEN_CACHE_CONTROL_HEADER || 'public, max-age=31536000, immutable',
      enableCompression: process.env.COSEREEDEN_CDN_ENABLE_COMPRESSION !== 'false'
    };
  }

  private loadUploadConfig(): any {
    return {
      maxFileSize: parseInt(process.env.COSEREEDEN_MAX_FILE_SIZE || '104857600', 10),
      maxConcurrentUploads: parseInt(process.env.COSEREEDEN_MAX_CONCURRENT_UPLOADS || '5', 10),
      maxRetryAttempts: parseInt(process.env.COSEREEDEN_MAX_RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.COSEREEDEN_RETRY_DELAY || '2000', 10),
      timeout: parseInt(process.env.COSEREEDEN_UPLOAD_TIMEOUT || '300000', 10),
      enableDeduplication: process.env.COSEREEDEN_ENABLE_DEDUPLICATION !== 'false',
      enableThumbnails: process.env.COSEREEDEN_ENABLE_THUMBNAILS !== 'false',
      enableTranscoding: process.env.COSEREEDEN_ENABLE_TRANSCODING !== 'false'
    };
  }

  private loadMonitoringConfig(): any {
    return {
      enableMetrics: process.env.COSEREEDEN_ENABLE_METRICS !== 'false',
      enableHealthChecks: process.env.COSEREEDEN_ENABLE_HEALTH_CHECKS !== 'false',
      healthCheckInterval: parseInt(process.env.COSEREEDEN_HEALTH_CHECK_INTERVAL || '60000', 10),
      enableErrorTracking: process.env.COSEREEDEN_ENABLE_ERROR_TRACKING !== 'false',
      enablePerformanceTracking: process.env.COSEREEDEN_ENABLE_PERFORMANCE_TRACKING !== 'false',
      logLevel: process.env.COSEREEDEN_LOG_LEVEL || 'info',
      sentryDsn: process.env.COSEREEDEN_SENTRY_DSN,
      enableAuditLogs: process.env.COSEREEDEN_ENABLE_AUDIT_LOGS !== 'false'
    };
  }

  private loadSecurityConfig(): any {
    return {
      enableRateLimit: process.env.COSEREEDEN_ENABLE_RATE_LIMIT !== 'false',
      rateLimitWindowMs: parseInt(process.env.COSEREEDEN_RATE_LIMIT_WINDOW_MS || '60000', 10),
      rateLimitMaxRequests: parseInt(process.env.COSEREEDEN_RATE_LIMIT_MAX_REQUESTS || '100', 10),
      enableCors: process.env.COSEREEDEN_ENABLE_CORS !== 'false',
      corsOrigins: this.parseStringArray(process.env.COSEREEDEN_CORS_ORIGINS),
      enableHelmet: process.env.COSEREEDEN_ENABLE_HELMET !== 'false',
      enableCsp: process.env.COSEREEDEN_ENABLE_CSP !== 'false',
      encryptionKey: process.env.COSEREEDEN_ENCRYPTION_KEY
    };
  }

  private loadEmailConfig(): any {
    const enabled = process.env.COSEREEDEN_ENABLE_EMAIL === 'true';

    if (!enabled) {
      return { enabled: false };
    }

    return {
      enabled: true,
      provider: process.env.COSEREEDEN_EMAIL_PROVIDER || 'smtp',
      smtp: {
        host: process.env.COSEREEDEN_SMTP_HOST || '',
        port: parseInt(process.env.COSEREEDEN_SMTP_PORT || '587', 10),
        secure: process.env.COSEREEDEN_SMTP_SECURE === 'true',
        user: process.env.COSEREEDEN_SMTP_USER || '',
        password: process.env.COSEREEDEN_SMTP_PASS || ''
      },
      from: process.env.COSEREEDEN_EMAIL_FROM,
      replyTo: process.env.COSEREEDEN_EMAIL_REPLY_TO
    };
  }

  private loadServicesConfig(): any {
    return {
      telegram: {
        enabled: process.env.COSEREEDEN_ENABLE_TELEGRAM === 'true',
        botToken: process.env.COSEREEDEN_TELEGRAM_BOT_TOKEN,
        webhookSecret: process.env.COSEREEDEN_TELEGRAM_WEBHOOK_SECRET
      },
      analytics: {
        enabled: process.env.COSEREEDEN_ENABLE_ANALYTICS === 'true',
        googleAnalyticsId: process.env.COSEREEDEN_GOOGLE_ANALYTICS_ID,
        enableUserTracking: process.env.COSEREEDEN_ENABLE_USER_TRACKING === 'true'
      }
    };
  }

  // 工具方法

  private parseStringArray(value?: string, defaultValue: string[] = []): string[] {
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  private parseInt(value: string, defaultValue: number): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private parseBoolean(value?: string, defaultValue: boolean = false): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  /**
   * 根据环境获取合适的CDN域名
   */
  private getCdnDomainForEnvironment(environment: Environment): string {
    switch (environment) {
      case 'production':
        return process.env.COSEREEDEN_CDN_PRODUCTION_PRIMARY ||
               process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN ||
               process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || '';

      case 'staging':
        return process.env.COSEREEDEN_CDN_STAGING_PRIMARY ||
               process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN ||
               process.env.COSEREEDEN_CDN_DEVELOPMENT_PRIMARY ||
               'http://localhost:3000';

      case 'development':
      default:
        return process.env.COSEREEDEN_CDN_DEVELOPMENT_PRIMARY ||
               process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL ||
               'http://localhost:3000';
    }
  }

  /**
   * 验证CDN配置的有效性
   */
  private validateCdnConfig(primaryDomain: string, environment: Environment): void {
    // 生产环境必须配置CDN域名
    if (environment === 'production' && !primaryDomain) {
      throw new Error(
        '生产环境必须配置CDN域名。请设置以下环境变量之一：\n' +
        '- COSEREEDEN_CDN_PRODUCTION_PRIMARY\n' +
        '- COSEREEDEN_CDN_PRIMARY_DOMAIN\n' +
        '- COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN'
      );
    }

    // 验证域名格式
    if (primaryDomain && !this.isValidUrl(primaryDomain)) {
      throw new Error(`CDN域名格式无效: ${primaryDomain}`);
    }

    // 生产环境不应使用localhost
    if (environment === 'production' && primaryDomain.includes('localhost')) {
      throw new Error('生产环境不能使用localhost作为CDN域名');
    }
  }

  /**
   * 验证URL格式是否有效
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
