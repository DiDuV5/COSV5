/**
 * @fileoverview CDN配置类型定义
 * @description CDN配置管理相关的类型定义和接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * CDN环境类型
 */
export type CDNEnvironment = 'development' | 'production' | 'staging';

/**
 * CDN配置接口
 */
export interface CDNConfig {
  environment: CDNEnvironment;
  primaryDomain: string;
  backupDomains: string[];
  whitelistDomains: string[];
  enableHotlinkProtection: boolean;
  rateLimitPerMinute: number;
  maxFileSizeMB: number;
  allowedOrigins: string[];
  enableAccessLog: boolean;
  enableAnomalyDetection: boolean;
}

/**
 * CDN安全配置接口
 */
export interface CDNSecurityConfig {
  whitelistDomains: string[];
  allowedOrigins: string[];
  enableHotlinkProtection: boolean;
  rateLimitPerMinute: number;
  maxFileSizeMB: number;
  enableAccessLog: boolean;
  enableAnomalyDetection: boolean;
}

/**
 * CDN域名状态
 */
export type CDNDomainStatus = 'healthy' | 'degraded' | 'failed';

/**
 * CDN域名信息接口
 */
export interface CDNDomainInfo {
  url: string;
  status: CDNDomainStatus;
  responseTime: number | null;
  lastChecked: Date | null;
  isActive: boolean;
  priority: number;
  errorCount?: number;
}

/**
 * CDN健康检查配置接口
 */
export interface CDNHealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  retryAttempts: number;
  failureThreshold: number;
}

/**
 * CDN故障转移配置接口
 */
export interface CDNFailoverConfig {
  enabled: boolean;
  strategy: 'immediate' | 'gradual' | 'manual';
  autoRecovery: boolean;
  recoveryDelay: number;
}

/**
 * 增强CDN配置接口
 */
export interface EnhancedCDNConfig extends CDNConfig {
  domains: CDNDomainInfo[];
  activeDomainIndex: number;
  healthCheck: CDNHealthCheckConfig;
  failover: CDNFailoverConfig;
}

/**
 * CDN配置监听器类型
 */
export type CDNConfigListener = (config: CDNConfig) => void;

/**
 * 环境变量验证Schema
 */
export const CDNConfigSchema = z.object({
  environment: z.enum(['development', 'production', 'staging']).default('development'),
  primaryDomain: z.string().url(),
  backupDomains: z.array(z.string().url()),
  whitelistDomains: z.array(z.string()),
  enableHotlinkProtection: z.boolean().default(true),
  rateLimitPerMinute: z.number().min(1).max(1000).default(100),
  maxFileSizeMB: z.number().min(1).max(1000).default(100),
  allowedOrigins: z.array(z.string()),
  enableAccessLog: z.boolean().default(true),
  enableAnomalyDetection: z.boolean().default(true),
});

/**
 * 默认CDN配置常量
 */
export const DEFAULT_CDN_CONFIG = {
  RATE_LIMIT_PER_MINUTE: 100,
  MAX_FILE_SIZE_MB: 100,
  HEALTH_CHECK_INTERVAL: 300000, // 5分钟
  HEALTH_CHECK_TIMEOUT: 10000, // 10秒
  RETRY_ATTEMPTS: 3,
  FAILURE_THRESHOLD: 3,
  RECOVERY_DELAY: 300000, // 5分钟
} as const;

/**
 * CDN环境变量键名常量
 */
export const CDN_ENV_KEYS = {
  ENVIRONMENT: 'CDN_ENVIRONMENT',
  PRIMARY_DOMAIN: 'CDN_PRIMARY_DOMAIN',
  BACKUP_DOMAINS: 'CDN_BACKUP_DOMAINS',
  WHITELIST_DOMAINS: 'COSEREEDEN_CDN_WHITELIST_DOMAINS',
  ENABLE_HOTLINK_PROTECTION: 'CDN_ENABLE_HOTLINK_PROTECTION',
  RATE_LIMIT_REQUESTS_PER_MINUTE: 'CDN_RATE_LIMIT_REQUESTS_PER_MINUTE',
  MAX_FILE_SIZE_MB: 'CDN_MAX_FILE_SIZE_MB',
  ALLOWED_ORIGINS: 'COSEREEDEN_CDN_ALLOWED_ORIGINS',
  ENABLE_ACCESS_LOG: 'CDN_ENABLE_ACCESS_LOG',
  ENABLE_ANOMALY_DETECTION: 'CDN_ENABLE_ANOMALY_DETECTION',

  // 生产环境专用
  PRODUCTION_PRIMARY: 'CDN_PRODUCTION_PRIMARY',
  PRODUCTION_BACKUP: 'CDN_PRODUCTION_BACKUP',
  DEVELOPMENT_PRIMARY: 'CDN_DEVELOPMENT_PRIMARY',

  // Cloudflare R2 相关
  CLOUDFLARE_R2_CDN_DOMAIN: 'COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN',
  CLOUDFLARE_R2_ENDPOINT: 'COSEREEDEN_CLOUDFLARE_R2_ENDPOINT',
} as const;

/**
 * 默认域名配置
 * 注意：遵循12-Factor App原则，所有配置必须通过环境变量提供
 * 客户端代码使用NEXT_PUBLIC_前缀的环境变量
 */
export const DEFAULT_DOMAINS = {
  PRODUCTION: process.env.NEXT_PUBLIC_CDN_DOMAIN ||
              process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN ||
              'https://cdn.cosv5.com',
  DEVELOPMENT: process.env.COSEREEDEN_NEXT_PUBLIC_CDN_DOMAIN ||
               process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL ||
               'http://localhost:3000',
  R2_DEV: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN ||
          'cdn.cosv5.com',
} as const;

/**
 * 默认白名单域名
 */
/**
 * 获取白名单域名（从环境变量动态生成）
 */
function getWhitelistDomains(): string[] {
  const envDomains = process.env.COSEREEDEN_CDN_WHITELIST_DOMAINS;

  if (envDomains) {
    return envDomains.split(',').map(domain => domain.trim());
  }

  // 默认域名（仅在没有环境变量时使用）
  const defaultDomains = [
    // CoserEden CDN 域名
    'cdn.cosv5.com',
    'upload.cosv5.com',
    '94c950f250492f9e4b9b79c1276ccfb0.r2.cloudflarestorage.com',

    // CoserEden 主域名
    'cosv5.com',
    '*.cosv5.com',
    'cosv5.cc',
    '*.cosv5.cc',
    'cosv5.vip',
    '*.cosv5.vip',

    // 备用域名
    'tutu365.cc',
    '*.tutu365.cc',
    'tutu365.com',
    '*.tutu365.com',

    // 本地开发域名
    'localhost',
    '*.localhost',
    '127.0.0.1',

    // Cloudflare R2 域名
    '*.r2.dev',
    'r2.dev',

    // 通用CDN模式
    'cdn.example.com',
    '*.example.com',
  ];

  console.warn('⚠️ 使用默认CDN白名单域名，建议设置 COSEREEDEN_CDN_WHITELIST_DOMAINS 环境变量');
  return defaultDomains;
}

export const DEFAULT_WHITELIST_DOMAINS = getWhitelistDomains();

/**
 * 获取允许的来源（从环境变量动态生成）
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.COSEREEDEN_CDN_ALLOWED_ORIGINS;

  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // 默认来源（仅在没有环境变量时使用）
  const defaultOrigins = [
    // 本地开发环境
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001',

    // 通用开发模式
    'https://example.com',
    'https://www.example.com',
  ];

  console.warn('⚠️ 使用默认CDN允许来源，建议设置 COSEREEDEN_CDN_ALLOWED_ORIGINS 环境变量');
  return defaultOrigins;
}

/**
 * 默认允许的来源
 */
export const DEFAULT_ALLOWED_ORIGINS = getAllowedOrigins();
