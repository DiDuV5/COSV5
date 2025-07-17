/**
 * @fileoverview 环境变量验证和类型安全配置
 * @description 使用Zod验证环境变量，确保类型安全和运行时验证
 * @author Augment AI
 * @date 2025-06-20
 * @version 1.0.0
 * @since 1.0.0
 */

import { z } from 'zod';
import {
  getEnvWithFallback as getCompatibleEnv,
  getRequiredEnv,
  getBooleanEnv,
  getNumberEnv
} from '@/lib/config/env-compatibility';

// 环境变量验证模式
const envSchema = z.object({
  // Node.js 环境 (系统级，保持原名)
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // 数据库配置 (迁移到COSEREEDEN_前缀)
  DATABASE_URL: z.string().min(1, '数据库URL不能为空'),
  COSEREEDEN_DATABASE_URL: z.string().min(1, '数据库URL不能为空').optional(),

  // NextAuth.js 配置 (系统级，保持原名)
  NEXTAUTH_SECRET: z.string().min(1, 'NextAuth密钥不能为空'),
  NEXTAUTH_URL: z.string().url('NextAuth URL必须是有效的URL').optional(),

  // 应用URL配置（遵循12-Factor App原则）
  NEXT_PUBLIC_APP_URL: z.string().url('应用URL必须是有效的URL').optional(),
  COSEREEDEN_NEXT_PUBLIC_APP_URL: z.string().url('应用URL必须是有效的URL').optional(),
  COSEREEDEN_APP_DOMAIN: z.string().optional(),

  // 上传专用域名配置（解决HTTP/2协议问题）
  NEXT_PUBLIC_UPLOAD_DOMAIN: z.string().url('上传域名必须是有效的URL').optional(),
  COSEREEDEN_NEXT_PUBLIC_UPLOAD_DOMAIN: z.string().url('上传域名必须是有效的URL').optional(),

  // 端口配置
  PORT: z.string().transform(val => parseInt(val, 10)).default('3000'),
  COSEREEDEN_PORT: z.string().transform(val => parseInt(val, 10)).optional(),

  // Cloudflare R2 基础配置
  COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID: z.string().min(1, 'Cloudflare R2账户ID不能为空'),
  COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1, 'Cloudflare R2访问密钥ID不能为空'),
  COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1, 'Cloudflare R2秘密访问密钥不能为空'),
  COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1, 'Cloudflare R2存储桶名称不能为空'),
  COSEREEDEN_CLOUDFLARE_R2_ENDPOINT: z.string().url('Cloudflare R2端点必须是有效的URL'),
  COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN: z.string().url('Cloudflare R2 CDN域名必须是有效的URL').optional(),

  // Cloudflare R2 高级配置
  COSEREEDEN_CLOUDFLARE_R2_REGION: z.string().default('auto'),
  COSEREEDEN_CLOUDFLARE_R2_FORCE_PATH_STYLE: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_CLOUDFLARE_R2_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('300000'), // 增加到5分钟
  COSEREEDEN_CLOUDFLARE_R2_DEFAULT_ACL: z.enum(['private', 'public-read', 'public-read-write']).default('private'),
  COSEREEDEN_CLOUDFLARE_R2_ENABLE_MULTIPART: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_CLOUDFLARE_R2_MULTIPART_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('20971520'), // 20MB
  COSEREEDEN_CLOUDFLARE_R2_PART_SIZE: z.string().transform(val => parseInt(val, 10)).default('5242880'), // 5MB
  COSEREEDEN_CLOUDFLARE_R2_MAX_CONCURRENCY: z.string().transform(val => parseInt(val, 10)).default('2'), // 降低并发

  // R2 重试和错误处理配置
  COSEREEDEN_CLOUDFLARE_R2_MAX_RETRIES: z.string().transform(val => parseInt(val, 10)).default('3'),
  COSEREEDEN_CLOUDFLARE_R2_RETRY_DELAY: z.string().transform(val => parseInt(val, 10)).default('1000'),
  COSEREEDEN_CLOUDFLARE_R2_RETRY_BACKOFF: z.enum(['linear', 'exponential']).default('exponential'),
  COSEREEDEN_CLOUDFLARE_R2_CIRCUIT_BREAKER_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('5'),
  COSEREEDEN_CLOUDFLARE_R2_CIRCUIT_BREAKER_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('60000'),

  // R2 监控和性能配置
  COSEREEDEN_CLOUDFLARE_R2_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).default('300000'), // 5分钟
  COSEREEDEN_CLOUDFLARE_R2_ENABLE_METRICS: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_CLOUDFLARE_R2_METRICS_INTERVAL: z.string().transform(val => parseInt(val, 10)).default('60000'), // 1分钟
  COSEREEDEN_CLOUDFLARE_R2_ENABLE_CACHE: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_CLOUDFLARE_R2_CACHE_TTL: z.string().transform(val => parseInt(val, 10)).default('300000'), // 5分钟
  COSEREEDEN_CLOUDFLARE_R2_ENABLE_COMPRESSION: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_CLOUDFLARE_R2_COMPRESSION_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('1024'), // 1KB

  // 存储系统配置
  COSEREEDEN_USE_NEW_STORAGE_SYSTEM: z.string().transform(val => val === 'true').default('false'),
  COSEREEDEN_STORAGE_PROVIDER: z.enum(['cloudflare-r2', 'aws-s3', 'local']).default('cloudflare-r2'),

  // CDN配置
  COSEREEDEN_CDN_PRIMARY_DOMAIN: z.string().url().optional(),
  COSEREEDEN_CDN_PRODUCTION_PRIMARY: z.string().url().optional(),
  COSEREEDEN_CDN_BACKUP_DOMAINS: z.string().optional(),
  COSEREEDEN_CDN_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // 邮件配置（可选）
  COSEREEDEN_SMTP_HOST: z.string().optional(),
  COSEREEDEN_SMTP_PORT: z.string().transform(val => val ? parseInt(val, 10) : undefined).optional(),
  COSEREEDEN_SMTP_USER: z.string().optional(),
  COSEREEDEN_SMTP_PASS: z.string().optional(),

  // Telegram配置（可选）
  COSEREEDEN_TELEGRAM_BOT_TOKEN: z.string().optional(),
  COSEREEDEN_TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // 监控和日志配置（可选）
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  COSEREEDEN_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // 文件上传配置
  COSEREEDEN_MAX_UPLOAD_SIZE: z.string().transform(val => parseInt(val, 10)).default('1073741824'), // 1GB
  COSEREEDEN_MAX_CONCURRENT_UPLOADS: z.string().transform(val => parseInt(val, 10)).default('5'),
  COSEREEDEN_MAX_RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).default('3'),
  COSEREEDEN_RETRY_DELAY: z.string().transform(val => parseInt(val, 10)).default('2000'),
  COSEREEDEN_UPLOAD_TIMEOUT: z.string().transform(val => parseInt(val, 10)).default('300000'), // 5分钟

  // 兼容性支持 - 旧的环境变量名
  MAX_CONCURRENT_UPLOADS: z.string().transform(val => parseInt(val, 10)).optional(),
  MAX_RETRY_ATTEMPTS: z.string().transform(val => parseInt(val, 10)).optional(),
  RETRY_DELAY: z.string().transform(val => parseInt(val, 10)).optional(),
  UPLOAD_TIMEOUT: z.string().transform(val => parseInt(val, 10)).optional(),

  // 上传策略配置
  COSEREEDEN_UPLOAD_DIRECT_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('41943040'), // 40MB
  COSEREEDEN_UPLOAD_ASYNC_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('52428800'), // 50MB
  COSEREEDEN_UPLOAD_CHUNKED_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('104857600'), // 100MB

  // 文件处理配置
  COSEREEDEN_IMAGE_QUALITY_DEFAULT: z.string().transform(val => parseInt(val, 10)).default('85'),
  COSEREEDEN_IMAGE_MAX_WIDTH: z.string().transform(val => parseInt(val, 10)).default('2048'),
  COSEREEDEN_IMAGE_MAX_HEIGHT: z.string().transform(val => parseInt(val, 10)).default('2048'),
  COSEREEDEN_VIDEO_TRANSCODE_ENABLED: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_THUMBNAIL_GENERATION_ENABLED: z.string().transform(val => val === 'true').default('true'),

  // 兼容性支持 - 旧的环境变量名
  IMAGE_MAX_HEIGHT: z.string().transform(val => parseInt(val, 10)).optional(),
  VIDEO_TRANSCODE_ENABLED: z.string().transform(val => val === 'true').optional(),
  THUMBNAIL_GENERATION_ENABLED: z.string().transform(val => val === 'true').optional(),

  // 缓存配置
  COSEREEDEN_CACHE_CONTROL_HEADER: z.string().default('public, max-age=31536000, immutable'),
  COSEREEDEN_CDN_CACHE_TTL: z.string().transform(val => parseInt(val, 10)).default('31536000'),

  // 兼容性支持 - 旧的环境变量名
  CACHE_CONTROL_HEADER: z.string().optional(),
  CDN_CACHE_TTL: z.string().transform(val => parseInt(val, 10)).optional(),

  // 监控和日志配置
  COSEREEDEN_UPLOAD_METRICS_ENABLED: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_UPLOAD_AUDIT_LOG_ENABLED: z.string().transform(val => val === 'true').default('true'),
  COSEREEDEN_STORAGE_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).default('60000'), // 1分钟

  // 兼容性支持 - 旧的环境变量名
  UPLOAD_METRICS_ENABLED: z.string().transform(val => val === 'true').optional(),
  UPLOAD_AUDIT_LOG_ENABLED: z.string().transform(val => val === 'true').optional(),
  STORAGE_HEALTH_CHECK_INTERVAL: z.string().transform(val => parseInt(val, 10)).optional(),

  // 安全配置
  COSEREEDEN_RATE_LIMIT_MAX: z.string().transform(val => parseInt(val, 10)).default('100'),
  COSEREEDEN_RATE_LIMIT_WINDOW: z.string().transform(val => parseInt(val, 10)).default('900000'), // 15分钟

  // 兼容性支持 - 旧的环境变量名
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val, 10)).optional(),
  RATE_LIMIT_WINDOW: z.string().transform(val => parseInt(val, 10)).optional(),
});

// 环境变量向后兼容性处理
function getEnvWithFallback(newName: string, oldName: string): string | undefined {
  return process.env[newName] || process.env[oldName];
}

// 处理环境变量的向后兼容性
function createCompatibleEnv() {
  const compatibleEnv = { ...process.env };

  // 数据库配置兼容性
  if (!compatibleEnv.DATABASE_URL && compatibleEnv.COSEREEDEN_DATABASE_URL) {
    compatibleEnv.DATABASE_URL = compatibleEnv.COSEREEDEN_DATABASE_URL;
  }

  // 应用URL配置兼容性
  if (!compatibleEnv.NEXT_PUBLIC_APP_URL && compatibleEnv.COSEREEDEN_NEXT_PUBLIC_APP_URL) {
    compatibleEnv.NEXT_PUBLIC_APP_URL = compatibleEnv.COSEREEDEN_NEXT_PUBLIC_APP_URL;
  }

  // 上传域名配置兼容性
  if (!compatibleEnv.NEXT_PUBLIC_UPLOAD_DOMAIN && compatibleEnv.COSEREEDEN_NEXT_PUBLIC_UPLOAD_DOMAIN) {
    compatibleEnv.NEXT_PUBLIC_UPLOAD_DOMAIN = compatibleEnv.COSEREEDEN_NEXT_PUBLIC_UPLOAD_DOMAIN;
  }

  // 端口配置兼容性
  if (!compatibleEnv.PORT && compatibleEnv.COSEREEDEN_PORT) {
    compatibleEnv.PORT = compatibleEnv.COSEREEDEN_PORT;
  }

  // 文件上传配置兼容性
  compatibleEnv.COSEREEDEN_MAX_CONCURRENT_UPLOADS = getEnvWithFallback('COSEREEDEN_MAX_CONCURRENT_UPLOADS', 'MAX_CONCURRENT_UPLOADS') || '5';
  compatibleEnv.COSEREEDEN_MAX_RETRY_ATTEMPTS = getEnvWithFallback('COSEREEDEN_MAX_RETRY_ATTEMPTS', 'MAX_RETRY_ATTEMPTS') || '3';
  compatibleEnv.COSEREEDEN_RETRY_DELAY = getEnvWithFallback('COSEREEDEN_RETRY_DELAY', 'RETRY_DELAY') || '2000';
  compatibleEnv.COSEREEDEN_UPLOAD_TIMEOUT = getEnvWithFallback('COSEREEDEN_UPLOAD_TIMEOUT', 'UPLOAD_TIMEOUT') || '300000';

  // 文件处理配置兼容性
  compatibleEnv.COSEREEDEN_IMAGE_MAX_HEIGHT = getEnvWithFallback('COSEREEDEN_IMAGE_MAX_HEIGHT', 'IMAGE_MAX_HEIGHT') || '2048';
  compatibleEnv.COSEREEDEN_VIDEO_TRANSCODE_ENABLED = getEnvWithFallback('COSEREEDEN_VIDEO_TRANSCODE_ENABLED', 'VIDEO_TRANSCODE_ENABLED') || 'true';
  compatibleEnv.COSEREEDEN_THUMBNAIL_GENERATION_ENABLED = getEnvWithFallback('COSEREEDEN_THUMBNAIL_GENERATION_ENABLED', 'THUMBNAIL_GENERATION_ENABLED') || 'true';

  // 缓存配置兼容性
  compatibleEnv.COSEREEDEN_CACHE_CONTROL_HEADER = getEnvWithFallback('COSEREEDEN_CACHE_CONTROL_HEADER', 'CACHE_CONTROL_HEADER') || 'public, max-age=31536000, immutable';
  compatibleEnv.COSEREEDEN_CDN_CACHE_TTL = getEnvWithFallback('COSEREEDEN_CDN_CACHE_TTL', 'CDN_CACHE_TTL') || '31536000';

  // 监控配置兼容性
  compatibleEnv.COSEREEDEN_UPLOAD_METRICS_ENABLED = getEnvWithFallback('COSEREEDEN_UPLOAD_METRICS_ENABLED', 'UPLOAD_METRICS_ENABLED') || 'true';
  compatibleEnv.COSEREEDEN_UPLOAD_AUDIT_LOG_ENABLED = getEnvWithFallback('COSEREEDEN_UPLOAD_AUDIT_LOG_ENABLED', 'UPLOAD_AUDIT_LOG_ENABLED') || 'true';
  compatibleEnv.COSEREEDEN_STORAGE_HEALTH_CHECK_INTERVAL = getEnvWithFallback('COSEREEDEN_STORAGE_HEALTH_CHECK_INTERVAL', 'STORAGE_HEALTH_CHECK_INTERVAL') || '60000';

  // 安全配置兼容性
  compatibleEnv.COSEREEDEN_RATE_LIMIT_MAX = getEnvWithFallback('COSEREEDEN_RATE_LIMIT_MAX', 'RATE_LIMIT_MAX') || '100';
  compatibleEnv.COSEREEDEN_RATE_LIMIT_WINDOW = getEnvWithFallback('COSEREEDEN_RATE_LIMIT_WINDOW', 'RATE_LIMIT_WINDOW') || '900000';

  return compatibleEnv;
}

// 验证环境变量
function validateEnv() {
  try {
    const compatibleEnv = createCompatibleEnv();
    const env = envSchema.parse(compatibleEnv);

    // 检查是否使用了旧的环境变量名，给出迁移提示
    checkLegacyVariables(compatibleEnv);

    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');

      console.error('❌ 环境变量验证失败:');
      console.error(errorMessages);

      // 在生产环境中抛出错误，在开发环境中警告
      const nodeEnv = getCompatibleEnv('COSEREEDEN_NODE_ENV', 'development');
      if (nodeEnv === 'production') {
        throw new Error(`环境变量验证失败:\n${errorMessages}`);
      } else {
        console.warn('⚠️ 开发环境中检测到环境变量问题，请检查.env文件');
      }
    }
    throw error;
  }
}

// 检查旧环境变量使用情况并给出迁移提示
function checkLegacyVariables(env: Record<string, string | undefined>) {
  const legacyMappings = {
    'MAX_CONCURRENT_UPLOADS': 'COSEREEDEN_MAX_CONCURRENT_UPLOADS',
    'MAX_RETRY_ATTEMPTS': 'COSEREEDEN_MAX_RETRY_ATTEMPTS',
    'RETRY_DELAY': 'COSEREEDEN_RETRY_DELAY',
    'UPLOAD_TIMEOUT': 'COSEREEDEN_UPLOAD_TIMEOUT',
    'IMAGE_MAX_HEIGHT': 'COSEREEDEN_IMAGE_MAX_HEIGHT',
    'VIDEO_TRANSCODE_ENABLED': 'COSEREEDEN_VIDEO_TRANSCODE_ENABLED',
    'THUMBNAIL_GENERATION_ENABLED': 'COSEREEDEN_THUMBNAIL_GENERATION_ENABLED',
    'CACHE_CONTROL_HEADER': 'COSEREEDEN_CACHE_CONTROL_HEADER',
    'CDN_CACHE_TTL': 'COSEREEDEN_CDN_CACHE_TTL',
    'UPLOAD_METRICS_ENABLED': 'COSEREEDEN_UPLOAD_METRICS_ENABLED',
    'UPLOAD_AUDIT_LOG_ENABLED': 'COSEREEDEN_UPLOAD_AUDIT_LOG_ENABLED',
    'STORAGE_HEALTH_CHECK_INTERVAL': 'COSEREEDEN_STORAGE_HEALTH_CHECK_INTERVAL',
    'RATE_LIMIT_MAX': 'COSEREEDEN_RATE_LIMIT_MAX',
    'RATE_LIMIT_WINDOW': 'COSEREEDEN_RATE_LIMIT_WINDOW',
  };

  const legacyUsed: string[] = [];

  for (const [oldName, newName] of Object.entries(legacyMappings)) {
    if (env[oldName] && !env[newName]) {
      legacyUsed.push(`${oldName} → ${newName}`);
    }
  }

  if (legacyUsed.length > 0) {
    console.warn('⚠️ 检测到使用旧的环境变量名，建议迁移到COSEREEDEN_前缀：');
    legacyUsed.forEach(mapping => console.warn(`  ${mapping}`));
    console.warn('  运行 npm run migrate-env-vars 自动迁移');
  }
}

// 导出验证后的环境变量
export const env = validateEnv();

// 类型定义
export type Env = z.infer<typeof envSchema>;

// 环境检查工具函数（使用兼容性工具）
const nodeEnv = getCompatibleEnv('COSEREEDEN_NODE_ENV', 'development');
export const isDevelopment = nodeEnv === 'development';
export const isProduction = nodeEnv === 'production';
export const isTest = nodeEnv === 'test';

// 存储配置检查
export function validateStorageConfig() {
  const requiredForR2 = [
    'COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID',
    'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID',
    'COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME',
    'COSEREEDEN_CLOUDFLARE_R2_ENDPOINT'
  ];

  const storageProvider = getCompatibleEnv('COSEREEDEN_STORAGE_PROVIDER', 'cloudflare-r2');
  if (storageProvider === 'cloudflare-r2') {
    const missing = requiredForR2.filter(key => !getCompatibleEnv(key));
    if (missing.length > 0) {
      throw new Error(`Cloudflare R2配置缺失: ${missing.join(', ')}`);
    }
  }

  return true;
}

// 数据库配置检查
export function validateDatabaseConfig() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL环境变量未设置');
  }

  // 检查数据库URL格式
  try {
    new URL(env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL格式无效');
  }

  return true;
}

// 认证配置检查
export function validateAuthConfig() {
  if (!env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET环境变量未设置');
  }

  if (env.NEXTAUTH_SECRET.length < 32) {
    console.warn('⚠️ NEXTAUTH_SECRET长度建议至少32个字符');
  }

  return true;
}

// 完整配置验证
export function validateAllConfigs() {
  try {
    validateStorageConfig();
    validateDatabaseConfig();
    validateAuthConfig();

    console.log('✅ 所有环境变量配置验证通过');
    return true;
  } catch (error) {
    console.error('❌ 配置验证失败:', error);
    if (isProduction) {
      throw error;
    }
    return false;
  }
}

// 导出兼容性工具函数供其他模块使用
export { getEnvWithFallback };
