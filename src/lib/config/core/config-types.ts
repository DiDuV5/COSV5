/**
 * @fileoverview 配置类型定义 - CoserEden平台
 * @description 统一配置管理系统的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { z } from 'zod';

/**
 * 环境类型
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * 配置模式定义
 */
export const ConfigSchema = z.object({
  // 基础配置
  environment: z.enum(['development', 'staging', 'production', 'test']),
  nodeEnv: z.string().default('development'),
  port: z.number().min(1).max(65535).default(3000),

  // 应用配置
  app: z.object({
    name: z.string().default('CoserEden'),
    version: z.string().default('1.0.0'),
    url: z.string().url(),
    domain: z.string(),
    cookieDomain: z.string().optional(),
    allowedOrigins: z.array(z.string()).default([]),
    timezone: z.string().default('Asia/Shanghai')
  }),

  // 数据库配置
  database: z.object({
    url: z.string().min(1),
    maxConnections: z.number().min(1).max(100).default(20),
    connectionTimeout: z.number().min(1000).default(30000),
    queryTimeout: z.number().min(1000).default(60000),
    enableLogging: z.boolean().default(false),
    enableMetrics: z.boolean().default(true)
  }),

  // 认证配置
  auth: z.object({
    secret: z.string().min(32),
    url: z.string().url(),
    sessionMaxAge: z.number().min(300).default(86400),
    cookieSecure: z.boolean().default(false),
    cookieSameSite: z.enum(['strict', 'lax', 'none']).default('lax'),
    enableCsrf: z.boolean().default(true)
  }),

  // 存储配置
  storage: z.object({
    provider: z.enum(['cloudflare-r2', 'local']).default('cloudflare-r2'),
    cloudflareR2: z.object({
      accountId: z.string(),
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
      bucketName: z.string(),
      region: z.string().default('auto'),
      endpoint: z.string(),
      cdnDomain: z.string().optional(),
      maxRetries: z.number().min(0).max(10).default(3),
      retryDelay: z.number().min(100).default(1000),
      timeout: z.number().min(1000).default(60000)
    }).optional(),
    local: z.object({
      uploadDir: z.string().default('./uploads'),
      tempDir: z.string().default('./temp'),
      maxFileSize: z.number().min(1024).default(104857600),
      allowedTypes: z.array(z.string()).default(['image/*', 'video/*'])
    }).optional()
  }),

  // CDN配置
  cdn: z.object({
    environment: z.enum(['development', 'staging', 'production', 'test']),
    primaryDomain: z.string().optional(),
    backupDomains: z.array(z.string()).default([]),
    allowedDomains: z.array(z.string()).default([]),
    enableHotlinkProtection: z.boolean().default(true),
    rateLimitPerMinute: z.number().min(1).default(100),
    maxFileSize: z.number().min(1024).default(104857600),
    cacheControl: z.string().default('public, max-age=31536000, immutable'),
    enableCompression: z.boolean().default(true)
  }),

  // 上传配置
  upload: z.object({
    maxFileSize: z.number().min(1024).default(104857600),
    maxConcurrentUploads: z.number().min(1).max(20).default(5),
    maxRetryAttempts: z.number().min(0).max(10).default(3),
    retryDelay: z.number().min(100).default(2000),
    timeout: z.number().min(1000).default(300000),
    enableDeduplication: z.boolean().default(true),
    enableThumbnails: z.boolean().default(true),
    enableTranscoding: z.boolean().default(true)
  }),

  // 监控配置
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true),
    healthCheckInterval: z.number().min(10000).default(60000),
    enableErrorTracking: z.boolean().default(true),
    enablePerformanceTracking: z.boolean().default(true),
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    sentryDsn: z.string().optional(),
    enableAuditLogs: z.boolean().default(true)
  }),

  // 安全配置
  security: z.object({
    enableRateLimit: z.boolean().default(true),
    rateLimitWindowMs: z.number().min(1000).default(60000),
    rateLimitMaxRequests: z.number().min(1).default(100),
    enableCors: z.boolean().default(true),
    corsOrigins: z.array(z.string()).default([]),
    enableHelmet: z.boolean().default(true),
    enableCsp: z.boolean().default(true),
    encryptionKey: z.string().min(32).optional()
  }),

  // 邮件配置
  email: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['smtp', 'sendgrid', 'mailgun']).default('smtp'),
    smtp: z.object({
      host: z.string(),
      port: z.number().min(1).max(65535),
      secure: z.boolean().default(true),
      user: z.string(),
      password: z.string()
    }).optional(),
    from: z.string().email().optional(),
    replyTo: z.string().email().optional()
  }).optional(),

  // 第三方服务配置
  services: z.object({
    telegram: z.object({
      enabled: z.boolean().default(false),
      botToken: z.string().optional(),
      webhookSecret: z.string().optional()
    }).optional(),
    analytics: z.object({
      enabled: z.boolean().default(false),
      googleAnalyticsId: z.string().optional(),
      enableUserTracking: z.boolean().default(false)
    }).optional()
  }).optional()
});

/**
 * 配置类型定义
 */
export type UnifiedConfig = z.infer<typeof ConfigSchema>;

/**
 * 配置冲突检测结果
 */
export interface ConfigConflict {
  path: string;
  type: 'MISSING' | 'INVALID' | 'CONFLICT' | 'DEPRECATED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  suggestion: string;
  currentValue?: any;
  expectedValue?: any;
}

/**
 * 配置健康状态
 */
export interface ConfigHealthStatus {
  isHealthy: boolean;
  conflicts: number;
  criticalIssues: number;
  warnings: number;
  summary: string;
}

/**
 * 配置加载器接口
 */
export interface IConfigLoader {
  loadEnvironmentVariables(): any;
  detectEnvironment(): Environment;
}

/**
 * 配置验证器接口
 */
export interface IConfigValidator {
  validateConfig(_rawConfig: any): UnifiedConfig;
  detectConfigConflicts(_config: UnifiedConfig): Promise<void>;
  getConfigConflicts(): ConfigConflict[];
  getHealthStatus(): ConfigHealthStatus;
}

/**
 * 配置处理器接口
 */
export interface IConfigProcessor {
  applyEnvironmentSpecificConfig(config: UnifiedConfig): UnifiedConfig;
  checkRequiredConfigs(config: UnifiedConfig): void;
  checkConfigConsistency(config: UnifiedConfig): void;
  checkEnvironmentSpecificConfigs(config: UnifiedConfig): void;
  checkSecurityConfigs(config: UnifiedConfig): void;
}

/**
 * 配置管理器接口
 */
export interface IConfigManager {
  initialize(): Promise<void>;
  getConfig(): UnifiedConfig;
  get<T = any>(path: string): T;
  has(path: string): boolean;
  getEnvironment(): Environment;
  getConfigConflicts(): ConfigConflict[];
  getHealthStatus(): ConfigHealthStatus;
}

/**
 * 配置事件类型
 */
export type ConfigEventType =
  | 'configLoaded'
  | 'configValidated'
  | 'conflictDetected'
  | 'configApplied'
  | 'healthCheckCompleted';

/**
 * 配置事件数据
 */
export interface ConfigEvent {
  type: ConfigEventType;
  timestamp: number;
  data: any;
  source: string;
}

/**
 * 配置上下文
 */
export interface ConfigContext {
  environment: Environment;
  nodeEnv: string;
  loader: IConfigLoader;
  validator: IConfigValidator;
  processor: IConfigProcessor;
}
