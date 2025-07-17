/**
 * @fileoverview 配置验证规则定义
 * @description 定义所有配置验证规则，包括Redis、数据库、存储、邮件、安全、认证等
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { ConfigValidationRule } from './config-validation-types';

/**
 * 获取Redis验证规则
 */
export function getRedisValidationRules(): ConfigValidationRule[] {
  return [
    {
      field: 'REDIS_HOST',
      required: true,
      type: 'string',
      defaultValue: 'localhost',
      environmentSpecific: {
        production: { required: true },
      },
    },
    {
      field: 'REDIS_PORT',
      required: true,
      type: 'number',
      min: 1,
      max: 65535,
      defaultValue: '6379',
    },
    {
      field: 'REDIS_PASSWORD',
      required: false,
      type: 'string',
      securitySensitive: true,
      environmentSpecific: {
        production: { required: true },
      },
    },
    {
      field: 'REDIS_DB',
      required: false,
      type: 'number',
      min: 0,
      max: 15,
      defaultValue: '0',
    },
    {
      field: 'REDIS_DEFAULT_TTL',
      required: false,
      type: 'number',
      min: 1,
      defaultValue: '3600',
    },
    {
      field: 'REDIS_MAX_RETRIES',
      required: false,
      type: 'number',
      min: 0,
      max: 10,
      defaultValue: '3',
    },
    {
      field: 'REDIS_CONNECT_TIMEOUT',
      required: false,
      type: 'number',
      min: 1000,
      defaultValue: '10000',
    },
    {
      field: 'REDIS_COMMAND_TIMEOUT',
      required: false,
      type: 'number',
      min: 1000,
      defaultValue: '5000',
    },
  ];
}

/**
 * 获取数据库验证规则
 */
export function getDatabaseValidationRules(): ConfigValidationRule[] {
  return [
    {
      field: 'DATABASE_URL',
      required: true,
      type: 'url',
      securitySensitive: true,
    },
    {
      field: 'DB_CONNECTION_LIMIT',
      required: false,
      type: 'number',
      min: 1,
      max: 100,
      defaultValue: '20',
      environmentSpecific: {
        production: { defaultValue: '50' },
        test: { defaultValue: '5' },
      },
    },
    {
      field: 'DB_CONNECT_TIMEOUT',
      required: false,
      type: 'number',
      min: 1000,
      defaultValue: '30000',
    },
    {
      field: 'DB_QUERY_TIMEOUT',
      required: false,
      type: 'number',
      min: 1000,
      defaultValue: '60000',
    },
    {
      field: 'DB_POOL_TIMEOUT',
      required: false,
      type: 'number',
      min: 1000,
      defaultValue: '5000',
    },
  ];
}

/**
 * 获取存储验证规则
 */
export function getStorageValidationRules(): ConfigValidationRule[] {
  return [
    {
      field: 'CLOUDFLARE_R2_ACCESS_KEY_ID',
      required: true,
      type: 'string',
      securitySensitive: true,
    },
    {
      field: 'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      required: true,
      type: 'string',
      securitySensitive: true,
    },
    {
      field: 'CLOUDFLARE_R2_BUCKET_NAME',
      required: false,
      type: 'string',
      defaultValue: 'cosereeden-storage',
    },
    {
      field: 'CLOUDFLARE_R2_ENDPOINT',
      required: false,
      type: 'url',
    },
    {
      field: 'CLOUDFLARE_R2_CDN_DOMAIN',
      required: false,
      type: 'url',
    },
    {
      field: 'CLOUDFLARE_ACCOUNT_ID',
      required: false,
      type: 'string',
    },
  ];
}

/**
 * 获取邮件验证规则
 */
export function getEmailValidationRules(): ConfigValidationRule[] {
  return [
    {
      field: 'EMAIL_TOKEN_EXPIRY_HOURS',
      required: false,
      type: 'number',
      min: 1,
      max: 168, // 7天
      defaultValue: '24',
    },
    {
      field: 'PASSWORD_RESET_EXPIRY_HOURS',
      required: false,
      type: 'number',
      min: 1,
      max: 24,
      defaultValue: '1',
    },
    {
      field: 'MAX_RESEND_ATTEMPTS',
      required: false,
      type: 'number',
      min: 1,
      max: 10,
      defaultValue: '3',
    },
    {
      field: 'RESEND_COOLDOWN_MINUTES',
      required: false,
      type: 'number',
      min: 1,
      max: 60,
      defaultValue: '5',
    },
    {
      field: 'EMAIL_FROM',
      required: false,
      type: 'email',
      defaultValue: 'noreply@cosereeden.com',
    },
    {
      field: 'EMAIL_FROM_NAME',
      required: false,
      type: 'string',
      defaultValue: 'CoserEden',
    },
    {
      field: 'EMAIL_MAX_CONNECTIONS',
      required: false,
      type: 'number',
      min: 1,
      max: 20,
      defaultValue: '5',
    },
    {
      field: 'EMAIL_CONNECTION_TIMEOUT',
      required: false,
      type: 'number',
      min: 1000,
      defaultValue: '30000',
    },
  ];
}

/**
 * 获取安全验证规则
 */
export function getSecurityValidationRules(): ConfigValidationRule[] {
  return [
    {
      field: 'SECURITY_KEY_LENGTH',
      required: false,
      type: 'number',
      min: 16,
      max: 64,
      defaultValue: '32',
    },
    {
      field: 'SECURITY_IV_LENGTH',
      required: false,
      type: 'number',
      min: 8,
      max: 32,
      defaultValue: '16',
    },
    {
      field: 'SECURITY_PBKDF2_ITERATIONS',
      required: false,
      type: 'number',
      min: 10000,
      max: 1000000,
      defaultValue: '100000',
    },
    {
      field: 'SECURITY_RSA_KEY_LENGTH',
      required: false,
      type: 'number',
      allowedValues: ['1024', '2048', '4096'],
      defaultValue: '2048',
    },
    {
      field: 'REDIS_TLS_ENABLED',
      required: false,
      type: 'boolean',
      defaultValue: 'false',
    },
    {
      field: 'REDIS_ENABLE_AUTH',
      required: false,
      type: 'boolean',
      defaultValue: 'true',
      environmentSpecific: {
        production: { defaultValue: 'true' },
      },
    },
  ];
}

/**
 * 获取认证验证规则
 */
export function getAuthValidationRules(): ConfigValidationRule[] {
  return [
    {
      field: 'NEXTAUTH_SECRET',
      required: true,
      type: 'string',
      securitySensitive: true,
      environmentSpecific: {
        production: { required: true },
      },
    },
    {
      field: 'NEXTAUTH_URL',
      required: false,
      type: 'url',
      environmentSpecific: {
        production: { required: true },
      },
    },
    {
      field: 'AUTH_SESSION_MAX_AGE',
      required: false,
      type: 'number',
      min: 300, // 5分钟
      max: 86400, // 24小时
      defaultValue: '7200', // 2小时
    },
    {
      field: 'AUTH_SESSION_UPDATE_AGE',
      required: false,
      type: 'number',
      min: 60, // 1分钟
      max: 3600, // 1小时
      defaultValue: '1800', // 30分钟
    },
    {
      field: 'AUTH_COOKIE_SECURE',
      required: false,
      type: 'boolean',
      defaultValue: 'true',
      environmentSpecific: {
        production: { defaultValue: 'true' },
        development: { defaultValue: 'false' },
      },
    },
    {
      field: 'AUTH_COOKIE_SAME_SITE',
      required: false,
      type: 'string',
      allowedValues: ['strict', 'lax', 'none'],
      defaultValue: 'lax',
    },
    {
      field: 'COOKIE_DOMAIN',
      required: false,
      type: 'string',
      environmentSpecific: {
        production: { required: true },
      },
    },
  ];
}
