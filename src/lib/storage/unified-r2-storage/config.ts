/**
 * @fileoverview R2存储配置管理
 * @description 管理R2存储的配置和环境变量
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { Environment, EnvironmentConfig, R2Config } from './types';

/**
 * 验证环境变量是否存在
 */
export function validateR2EnvironmentVariables(): void {
  const requiredVars = [
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET_NAME',
    'CLOUDFLARE_R2_ENDPOINT'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`缺少必需的R2环境变量: ${missingVars.join(', ')}`);
  }
}

/**
 * 获取Cloudflare R2配置（从环境变量）
 */
export function getR2Config(): R2Config {
  validateR2EnvironmentVariables();

  return {
    accountId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID!,
    accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME!,
    endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT!,
    region: 'auto'
  };
}

/**
 * 检测当前环境
 */
export function detectEnvironment(): Environment {
  // 1. 检查显式环境变量
  const explicitEnv = process.env.COSEREEDEN_CDN_ENVIRONMENT as Environment;
  if (explicitEnv && ['development', 'staging', 'production'].includes(explicitEnv)) {
    return explicitEnv;
  }

  // 2. 检查NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';

  // 3. 默认开发环境
  return 'development';
}

/**
 * 获取环境配置映射（从环境变量）
 */
export function getEnvironmentConfigs(): Record<Environment, EnvironmentConfig> {
  const r2Config = getR2Config();
  const cdnDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || `${r2Config.endpoint}/${r2Config.bucket}`;

  return {
    development: {
      environment: 'development',
      primaryDomain: {
        url: `${r2Config.endpoint}/${r2Config.bucket}`,
        name: 'R2 Direct Access',
        priority: 100,
        requiresSSL: true,
        healthStatus: 'unknown'
      },
      fallbackDomains: [
        {
          url: cdnDomain,
          name: 'R2 CDN Access',
          priority: 90,
          requiresSSL: true,
          healthStatus: 'unknown'
        }
      ],
      enableFailover: true,
      healthCheckInterval: 300000 // 5分钟
    },
    staging: {
      environment: 'staging',
      primaryDomain: {
        url: process.env.COSEREEDEN_CDN_STAGING_DOMAIN || cdnDomain,
        name: 'Staging CDN',
        priority: 100,
        requiresSSL: true,
        healthStatus: 'unknown'
      },
      fallbackDomains: [
        {
          url: `${r2Config.endpoint}/${r2Config.bucket}`,
          name: 'R2 Direct Access',
          priority: 90,
          requiresSSL: true,
          healthStatus: 'unknown'
        }
      ],
      enableFailover: true,
      healthCheckInterval: 300000
    },
    production: {
      environment: 'production',
      primaryDomain: {
        url: process.env.COSEREEDEN_CDN_PRODUCTION_DOMAIN || cdnDomain,
        name: 'Production CDN',
        priority: 100,
        requiresSSL: true,
        healthStatus: 'unknown'
      },
      fallbackDomains: [
        {
          url: process.env.COSEREEDEN_CDN_BACKUP_DOMAIN || `${r2Config.endpoint}/${r2Config.bucket}`,
          name: 'Backup CDN',
          priority: 90,
          requiresSSL: true,
          healthStatus: 'unknown'
        },
        {
          url: cdnDomain,
          name: 'R2 CDN Access',
          priority: 80,
          requiresSSL: true,
          healthStatus: 'unknown'
        }
      ],
      enableFailover: true,
      healthCheckInterval: 180000 // 3分钟
    }
  };
}
