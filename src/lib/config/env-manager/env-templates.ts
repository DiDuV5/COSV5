/**
 * @fileoverview 环境变量模板定义
 * @description 定义P0/P1级环境变量模板
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { EnvTemplate } from './env-types';

/**
 * 获取P0级环境变量模板
 */
export function getP0Templates(): Map<string, EnvTemplate> {
  const templates = new Map<string, EnvTemplate>();

  // Redis配置模板
  templates.set('redis', {
    category: 'Redis配置',
    priority: 'P0',
    variables: [
      {
        name: 'COSEREEDEN_REDIS_HOST',
        description: 'Redis服务器地址',
        type: 'string',
        required: true,
        defaultValue: 'localhost',
        exampleValue: 'redis.example.com',
      },
      {
        name: 'COSEREEDEN_REDIS_PORT',
        description: 'Redis服务器端口',
        type: 'number',
        required: true,
        defaultValue: '6379',
        exampleValue: '6379',
      },
      {
        name: 'COSEREEDEN_REDIS_PASSWORD',
        description: 'Redis密码',
        type: 'string',
        required: false,
        securitySensitive: true,
        environmentSpecific: {
          production: 'your-secure-redis-password',
          development: '',
          test: '',
        },
      },
      {
        name: 'COSEREEDEN_REDIS_DB',
        description: 'Redis数据库索引',
        type: 'number',
        required: false,
        defaultValue: '0',
        exampleValue: '0',
      },
      {
        name: 'COSEREEDEN_REDIS_DEFAULT_TTL',
        description: 'Redis默认TTL（秒）',
        type: 'number',
        required: false,
        defaultValue: '3600',
        exampleValue: '3600',
      },
    ],
  });

  // 数据库配置模板
  templates.set('database', {
    category: '数据库配置',
    priority: 'P0',
    variables: [
      {
        name: 'COSEREEDEN_DATABASE_URL',
        description: '数据库连接URL',
        type: 'url',
        required: true,
        securitySensitive: true,
        environmentSpecific: {
          production: 'postgresql://user:password@host:${COSEREEDEN_DB_PORT:-5432}/cosereeden_prod',
          development: 'postgresql://user:password@${COSEREEDEN_DB_HOST:-localhost}:${COSEREEDEN_DB_PORT:-5432}/cosereeden_dev',
          test: 'postgresql://user:password@${COSEREEDEN_DB_HOST:-localhost}:${COSEREEDEN_DB_PORT:-5432}/cosereeden_test',
        },
      },
      {
        name: 'COSEREEDEN_DB_CONNECTION_LIMIT',
        description: '数据库连接池大小',
        type: 'number',
        required: false,
        defaultValue: '20',
        environmentSpecific: {
          production: '50',
          development: '20',
          test: '5',
        },
      },
      {
        name: 'COSEREEDEN_DB_CONNECT_TIMEOUT',
        description: '数据库连接超时（毫秒）',
        type: 'number',
        required: false,
        defaultValue: '30000',
        exampleValue: '30000',
      },
    ],
  });

  // 存储配置模板
  templates.set('storage', {
    category: '存储配置',
    priority: 'P0',
    variables: [
      {
        name: 'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID',
        description: 'Cloudflare R2访问密钥ID',
        type: 'string',
        required: true,
        securitySensitive: true,
        exampleValue: 'your-access-key-id',
      },
      {
        name: 'COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        description: 'Cloudflare R2秘密访问密钥',
        type: 'string',
        required: true,
        securitySensitive: true,
        exampleValue: 'your-secret-access-key',
      },
      {
        name: 'COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME',
        description: 'Cloudflare R2存储桶名称',
        type: 'string',
        required: false,
        defaultValue: 'cosereeden-storage',
        exampleValue: 'cosereeden-storage',
      },
      {
        name: 'COSEREEDEN_CLOUDFLARE_R2_ENDPOINT',
        description: 'Cloudflare R2端点URL',
        type: 'url',
        required: false,
        exampleValue: 'https://your-account-id.r2.cloudflarestorage.com',
      },
      {
        name: 'COSEREEDEN_CLOUDFLARE_ACCOUNT_ID',
        description: 'Cloudflare账户ID',
        type: 'string',
        required: false,
        exampleValue: 'your-cloudflare-account-id',
      },
    ],
  });

  return templates;
}

/**
 * 获取P1级环境变量模板
 */
export function getP1Templates(): Map<string, EnvTemplate> {
  const templates = new Map<string, EnvTemplate>();

  // 邮件配置模板
  templates.set('email', {
    category: '邮件配置',
    priority: 'P1',
    variables: [
      {
        name: 'COSEREEDEN_EMAIL_TOKEN_EXPIRY_HOURS',
        description: '邮件验证令牌过期时间（小时）',
        type: 'number',
        required: false,
        defaultValue: '24',
        exampleValue: '24',
      },
      {
        name: 'COSEREEDEN_PASSWORD_RESET_EXPIRY_HOURS',
        description: '密码重置令牌过期时间（小时）',
        type: 'number',
        required: false,
        defaultValue: '1',
        exampleValue: '1',
      },
      {
        name: 'COSEREEDEN_EMAIL_FROM',
        description: '发件人邮箱地址',
        type: 'email',
        required: false,
        defaultValue: 'noreply@cosereeden.com',
        exampleValue: 'noreply@cosereeden.com',
      },
      {
        name: 'COSEREEDEN_EMAIL_FROM_NAME',
        description: '发件人名称',
        type: 'string',
        required: false,
        defaultValue: 'CoserEden',
        exampleValue: 'CoserEden',
      },
    ],
  });

  // 认证配置模板
  templates.set('auth', {
    category: '认证配置',
    priority: 'P1',
    variables: [
      {
        name: 'COSEREEDEN_NEXTAUTH_SECRET',
        description: 'NextAuth密钥',
        type: 'string',
        required: true,
        securitySensitive: true,
        environmentSpecific: {
          production: 'your-secure-nextauth-secret',
          development: 'dev-nextauth-secret',
          test: 'test-nextauth-secret',
        },
      },
      {
        name: 'COSEREEDEN_NEXTAUTH_URL',
        description: 'NextAuth URL',
        type: 'url',
        required: false,
        environmentSpecific: {
          production: 'https://cosereeden.com',
          development: 'http://localhost:3000',
          test: 'http://localhost:3000',
        },
      },
      {
        name: 'COSEREEDEN_AUTH_SESSION_MAX_AGE',
        description: '会话最大存活时间（秒）',
        type: 'number',
        required: false,
        defaultValue: '7200',
        exampleValue: '7200',
      },
      {
        name: 'COSEREEDEN_COOKIE_DOMAIN',
        description: 'Cookie域名',
        type: 'string',
        required: false,
        environmentSpecific: {
          production: '.cosereeden.com',
          development: 'localhost',
          test: 'localhost',
        },
      },
    ],
  });

  // 安全配置模板
  templates.set('security', {
    category: '安全配置',
    priority: 'P1',
    variables: [
      {
        name: 'COSEREEDEN_SECURITY_KEY_LENGTH',
        description: '安全密钥长度',
        type: 'number',
        required: false,
        defaultValue: '32',
        exampleValue: '32',
      },
      {
        name: 'COSEREEDEN_SECURITY_PBKDF2_ITERATIONS',
        description: 'PBKDF2迭代次数',
        type: 'number',
        required: false,
        defaultValue: '100000',
        exampleValue: '100000',
      },
      {
        name: 'COSEREEDEN_REDIS_TLS_ENABLED',
        description: 'Redis TLS启用状态',
        type: 'boolean',
        required: false,
        defaultValue: 'false',
        environmentSpecific: {
          production: 'true',
          development: 'false',
          test: 'false',
        },
      },
    ],
  });

  return templates;
}

/**
 * 获取所有环境变量模板
 */
export function getAllTemplates(): Map<string, EnvTemplate> {
  const allTemplates = new Map<string, EnvTemplate>();

  // 合并P0和P1模板
  const p0Templates = getP0Templates();
  const p1Templates = getP1Templates();

  for (const [key, template] of p0Templates) {
    allTemplates.set(key, template);
  }

  for (const [key, template] of p1Templates) {
    allTemplates.set(key, template);
  }

  return allTemplates;
}
