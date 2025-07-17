/**
 * @fileoverview 数据库连接配置管理
 * @description 遵循12-Factor App原则，所有配置从环境变量读取，移除硬编码默认值
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0
 */

import { DatabaseConnectionConfig } from './types';
import { getEnvWithFallback, getNumberEnv, getBooleanEnv } from '@/lib/config/env-compatibility';

/**
 * 必需的数据库环境变量列表
 */
const REQUIRED_DB_ENV_VARS = [
  'COSEREEDEN_DATABASE_URL',
] as const;

/**
 * 可选的数据库环境变量列表（带默认值）
 */
const OPTIONAL_DB_ENV_VARS = {
  CONNECTION_LIMIT: '20',
  CONNECT_TIMEOUT: '30000',
  QUERY_TIMEOUT: '60000',
  POOL_TIMEOUT: '5000',
  HEALTH_CHECK_INTERVAL: '30000',
  WARNING_THRESHOLD: '0.7',
  CRITICAL_THRESHOLD: '0.9',
} as const;

/**
 * 获取数据库配置值（优先使用COSEREEDEN_前缀）
 */
function getDatabaseEnvValue(key: keyof typeof OPTIONAL_DB_ENV_VARS): string {
  const coseredenKey = `COSEREEDEN_DB_${key}`;
  const standardKey = `DB_${key}`;
  const defaultValue = OPTIONAL_DB_ENV_VARS[key];

  return process.env[coseredenKey] || process.env[standardKey] || defaultValue;
}

/**
 * 验证必需的环境变量
 */
function validateRequiredEnvVars(): void {
  const missing: string[] = [];

  // 检查数据库URL
  if (!getEnvWithFallback('COSEREEDEN_DATABASE_URL')) {
    missing.push('COSEREEDEN_DATABASE_URL (或 DATABASE_URL)');
  }

  if (missing.length > 0) {
    const errorMessage = `
❌ 缺少必需的数据库环境变量:
${missing.map(key => `  - ${key}`).join('\n')}

请在环境变量中设置这些配置项。参考配置:
COSEREEDEN_DATABASE_URL=postgresql://[username]:[password]@[host]:[port]/[database]
    `.trim();

    throw new Error(errorMessage);
  }

  // 生产环境建议检查
  if (getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production') {
    const recommendedVars = ['COSEREEDEN_DB_CONNECTION_LIMIT', 'COSEREEDEN_DB_CONNECT_TIMEOUT'];
    const missingRecommended = recommendedVars.filter(varName => !getEnvWithFallback(varName));

    if (missingRecommended.length > 0) {
      console.warn(`🔧 生产环境建议设置以下数据库环境变量: ${missingRecommended.join(', ')}`);
    }
  }
}

/**
 * 验证数据库配置参数
 */
function validateDatabaseConfig(config: DatabaseConnectionConfig): void {
  if (config.connectionLimit <= 0 || config.connectionLimit > 200) {
    throw new Error(`无效的连接池大小: ${config.connectionLimit}，应在1-200之间`);
  }

  if (config.connectTimeout < 1000 || config.connectTimeout > 120000) {
    throw new Error(`无效的连接超时时间: ${config.connectTimeout}ms，应在1000-120000ms之间`);
  }

  if (config.queryTimeout < 1000 || config.queryTimeout > 300000) {
    throw new Error(`无效的查询超时时间: ${config.queryTimeout}ms，应在1000-300000ms之间`);
  }

  if (config.warningThreshold >= config.criticalThreshold) {
    throw new Error('警告阈值必须小于危险阈值');
  }
}

/**
 * 获取数据库连接配置
 * 所有配置项都从环境变量读取，支持COSEREEDEN_前缀和标准前缀
 */
export function getDatabaseConfig(): DatabaseConnectionConfig {
  validateRequiredEnvVars();

  const config: DatabaseConnectionConfig = {
    connectionLimit: parseInt(getDatabaseEnvValue('CONNECTION_LIMIT'), 10),
    connectTimeout: parseInt(getDatabaseEnvValue('CONNECT_TIMEOUT'), 10),
    queryTimeout: parseInt(getDatabaseEnvValue('QUERY_TIMEOUT'), 10),
    poolTimeout: parseInt(getDatabaseEnvValue('POOL_TIMEOUT'), 10),
    enableLogging: getBooleanEnv('COSEREEDEN_DB_ENABLE_LOGGING', false),
    enableMetrics: getBooleanEnv('COSEREEDEN_DB_ENABLE_METRICS', true),
    healthCheckInterval: parseInt(getDatabaseEnvValue('HEALTH_CHECK_INTERVAL'), 10),
    warningThreshold: parseFloat(getDatabaseEnvValue('WARNING_THRESHOLD')),
    criticalThreshold: parseFloat(getDatabaseEnvValue('CRITICAL_THRESHOLD')),
  };

  // 验证配置参数
  validateDatabaseConfig(config);

  return config;
}

/**
 * 获取当前使用的环境变量配置
 * 用于调试和配置检查
 */
export function getCurrentDatabaseEnvConfig(): Record<string, string | undefined> {
  return {
    // COSEREEDEN_前缀配置
    COSEREEDEN_DB_CONNECTION_LIMIT: process.env.COSEREEDEN_DB_CONNECTION_LIMIT,
    COSEREEDEN_DB_CONNECT_TIMEOUT: process.env.COSEREEDEN_DB_CONNECT_TIMEOUT,
    COSEREEDEN_DB_QUERY_TIMEOUT: process.env.COSEREEDEN_DB_QUERY_TIMEOUT,
    COSEREEDEN_DB_POOL_TIMEOUT: process.env.COSEREEDEN_DB_POOL_TIMEOUT,
    COSEREEDEN_DB_ENABLE_LOGGING: process.env.COSEREEDEN_DB_ENABLE_LOGGING,
    COSEREEDEN_DB_ENABLE_METRICS: process.env.COSEREEDEN_DB_ENABLE_METRICS,

    // 标准前缀配置（向后兼容）
    DB_CONNECTION_LIMIT: process.env.COSEREEDEN_DB_CONNECTION_LIMIT,
    DB_CONNECT_TIMEOUT: process.env.COSEREEDEN_DB_CONNECT_TIMEOUT,
    DB_QUERY_TIMEOUT: process.env.COSEREEDEN_DB_QUERY_TIMEOUT,
    DB_POOL_TIMEOUT: process.env.COSEREEDEN_DB_POOL_TIMEOUT,
    DB_ENABLE_LOGGING: process.env.COSEREEDEN_DB_ENABLE_LOGGING,
    DB_ENABLE_METRICS: process.env.COSEREEDEN_DB_ENABLE_METRICS,

    // 实际使用的值
    EFFECTIVE_CONNECTION_LIMIT: getDatabaseEnvValue('CONNECTION_LIMIT'),
    EFFECTIVE_CONNECT_TIMEOUT: getDatabaseEnvValue('CONNECT_TIMEOUT'),
    EFFECTIVE_QUERY_TIMEOUT: getDatabaseEnvValue('QUERY_TIMEOUT'),
    EFFECTIVE_POOL_TIMEOUT: getDatabaseEnvValue('POOL_TIMEOUT'),
    EFFECTIVE_WARNING_THRESHOLD: getDatabaseEnvValue('WARNING_THRESHOLD'),
    EFFECTIVE_CRITICAL_THRESHOLD: getDatabaseEnvValue('CRITICAL_THRESHOLD'),
  };
}

/**
 * 构建优化的数据库URL
 */
export function buildOptimizedDatabaseUrl(): string {
  const baseUrl = getEnvWithFallback('COSEREEDEN_DATABASE_URL');
  if (!baseUrl) {
    throw new Error('COSEREEDEN_DATABASE_URL environment variable is required (or DATABASE_URL for backward compatibility)');
  }

  const config = getDatabaseConfig();
  const url = new URL(baseUrl);

  // 添加连接池参数
  url.searchParams.set('connection_limit', config.connectionLimit.toString());
  url.searchParams.set('pool_timeout', Math.floor(config.poolTimeout / 1000).toString());
  url.searchParams.set('connect_timeout', Math.floor(config.connectTimeout / 1000).toString());

  // 添加性能优化参数（可通过环境变量控制）
  const enablePgBouncer = getBooleanEnv('COSEREEDEN_DB_ENABLE_PGBOUNCER', true);
  const enablePreparedStatements = getBooleanEnv('COSEREEDEN_DB_ENABLE_PREPARED_STATEMENTS', false);

  if (enablePgBouncer) {
    url.searchParams.set('pgbouncer', 'true');
  }

  url.searchParams.set('prepared_statements', enablePreparedStatements.toString());

  return url.toString();
}

/**
 * 生成环境变量建议
 * 用于配置指导，推荐使用COSEREEDEN_前缀
 */
export function generateDatabaseEnvSuggestions(): Record<string, string> {
  const isProduction = getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production';

  return {
    // 推荐使用COSEREEDEN_前缀的环境变量
    COSEREEDEN_DATABASE_URL: 'postgresql://[username]:[password]@[host]:[port]/[database]',
    COSEREEDEN_DB_CONNECTION_LIMIT: isProduction ? '50' : '20',
    COSEREEDEN_DB_CONNECT_TIMEOUT: isProduction ? '30000' : '15000',
    COSEREEDEN_DB_QUERY_TIMEOUT: isProduction ? '60000' : '30000',
    COSEREEDEN_DB_POOL_TIMEOUT: isProduction ? '5000' : '3000',
    COSEREEDEN_DB_HEALTH_CHECK_INTERVAL: '30000',
    COSEREEDEN_DB_WARNING_THRESHOLD: '0.7',
    COSEREEDEN_DB_CRITICAL_THRESHOLD: '0.9',
    COSEREEDEN_DB_ENABLE_LOGGING: isProduction ? 'false' : 'true',
    COSEREEDEN_DB_ENABLE_METRICS: 'true',
    COSEREEDEN_DB_ENABLE_PGBOUNCER: 'true',
    COSEREEDEN_DB_ENABLE_PREPARED_STATEMENTS: 'false',

    // 向后兼容的标准前缀（可选）
    DATABASE_URL: 'postgresql://[username]:[password]@[host]:[port]/[database]',
    DB_CONNECTION_LIMIT: isProduction ? '50' : '20',
    DB_CONNECT_TIMEOUT: isProduction ? '30000' : '15000',
    DB_QUERY_TIMEOUT: isProduction ? '60000' : '30000',
    DB_POOL_TIMEOUT: isProduction ? '5000' : '3000',
    DB_HEALTH_CHECK_INTERVAL: '30000',
    DB_WARNING_THRESHOLD: '0.7',
    DB_CRITICAL_THRESHOLD: '0.9',
    DB_ENABLE_LOGGING: isProduction ? 'false' : 'true',
    DB_ENABLE_METRICS: 'true',
    DB_ENABLE_PGBOUNCER: 'true',
    DB_ENABLE_PREPARED_STATEMENTS: 'false',
  };
}
