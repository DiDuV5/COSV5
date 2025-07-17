/**
 * @fileoverview 统一的Redis配置管理器
 * @description 遵循12-Factor App原则，所有Redis配置从环境变量读取，移除硬编码默认值
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0
 */

/**
 * Redis连接配置接口
 */
export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  connectTimeout: number;
  commandTimeout: number;
  lazyConnect: boolean;
  enableOfflineQueue: boolean;
  family: number;
}

/**
 * Redis URL配置接口
 */
export interface RedisUrlConfig {
  url: string;
  keyPrefix: string;
  defaultTTL: number;
  enabled: boolean;
  compression: boolean;
}

/**
 * 必需的Redis环境变量列表
 */
const REQUIRED_REDIS_ENV_VARS = [
  'COSEREEDEN_REDIS_HOST',
] as const;

/**
 * 可选的Redis环境变量列表（带默认值）
 */
const OPTIONAL_REDIS_ENV_VARS = {
  PORT: '6379',
  DB: '0',
  KEY_PREFIX: 'cosereeden:',
  DEFAULT_TTL: '3600',
  MAX_RETRIES: '3',
  RETRY_DELAY: '100',
  CONNECT_TIMEOUT: '10000',
  COMMAND_TIMEOUT: '5000',
  FAMILY: '4',
} as const;

/**
 * 获取Redis配置值（优先使用COSEREEDEN_前缀）
 */
function getRedisEnvValue(key: keyof typeof OPTIONAL_REDIS_ENV_VARS): string {
  const coseredenKey = `COSEREEDEN_REDIS_${key}`;
  const standardKey = `REDIS_${key}`;
  const defaultValue = OPTIONAL_REDIS_ENV_VARS[key];

  return process.env[coseredenKey] || process.env[standardKey] || defaultValue;
}

/**
 * 获取Redis主机配置（必需）
 */
function getRedisHost(): string {
  const host = process.env.COSEREEDEN_REDIS_HOST || process.env.COSEREEDEN_REDIS_HOST;
  if (!host) {
    throw new Error('Redis主机配置缺失，请设置 COSEREEDEN_REDIS_HOST 环境变量');
  }
  return host;
}

/**
 * 统一的Redis配置管理器
 * 遵循12-Factor App原则，所有配置从环境变量读取
 */
export class RedisConfigManager {
  /**
   * 验证必需的环境变量
   */
  private static validateRequiredEnvVars(): void {
    const missing: string[] = [];

    // 检查Redis主机配置
    if (!process.env.COSEREEDEN_REDIS_HOST && !process.env.COSEREEDEN_REDIS_HOST) {
      missing.push('COSEREEDEN_REDIS_HOST (或 REDIS_HOST)');
    }

    if (missing.length > 0) {
      const errorMessage = `
❌ 缺少必需的Redis环境变量:
${missing.map(key => `  - ${key}`).join('\n')}

请在环境变量中设置这些配置项。参考配置:
COSEREEDEN_REDIS_HOST=localhost
COSEREEDEN_REDIS_PORT=6379
      `.trim();

      throw new Error(errorMessage);
    }

    // 验证数字类型的配置
    this.validateNumericConfigs();
  }

  /**
   * 验证数字类型的配置
   */
  private static validateNumericConfigs(): void {
    const numericConfigs = [
      { key: 'PORT', name: 'Redis端口' },
      { key: 'DB', name: 'Redis数据库编号' },
      { key: 'DEFAULT_TTL', name: 'Redis默认TTL' },
      { key: 'MAX_RETRIES', name: 'Redis最大重试次数' },
      { key: 'RETRY_DELAY', name: 'Redis重试延迟' },
      { key: 'CONNECT_TIMEOUT', name: 'Redis连接超时' },
      { key: 'COMMAND_TIMEOUT', name: 'Redis命令超时' },
      { key: 'FAMILY', name: 'Redis IP版本' },
    ];

    for (const config of numericConfigs) {
      const value = getRedisEnvValue(config.key as keyof typeof OPTIONAL_REDIS_ENV_VARS);
      if (isNaN(parseInt(value))) {
        throw new Error(`${config.name}必须是有效的数字，当前值: ${value}`);
      }
    }
  }

  /**
   * 获取Redis连接配置
   * 所有配置项都从环境变量读取，支持COSEREEDEN_前缀和标准前缀
   */
  static getConnectionConfig(): RedisConnectionConfig {
    this.validateRequiredEnvVars();

    return {
      host: getRedisHost(),
      port: parseInt(getRedisEnvValue('PORT')),
      password: process.env.COSEREEDEN_REDIS_PASSWORD || process.env.REDIS_PASSWORD || undefined,
      db: parseInt(getRedisEnvValue('DB')),
      keyPrefix: getRedisEnvValue('KEY_PREFIX'),
      defaultTTL: parseInt(getRedisEnvValue('DEFAULT_TTL')),
      maxRetries: parseInt(getRedisEnvValue('MAX_RETRIES')),
      retryDelayOnFailover: parseInt(getRedisEnvValue('RETRY_DELAY')),
      connectTimeout: parseInt(getRedisEnvValue('CONNECT_TIMEOUT')),
      commandTimeout: parseInt(getRedisEnvValue('COMMAND_TIMEOUT')),
      lazyConnect: (process.env.COSEREEDEN_REDIS_LAZY_CONNECT || process.env.REDIS_LAZY_CONNECT) !== 'false',
      enableOfflineQueue: (process.env.COSEREEDEN_REDIS_OFFLINE_QUEUE || process.env.COSEREEDEN_REDIS_OFFLINE_QUEUE) !== 'false',
      family: parseInt(getRedisEnvValue('FAMILY')),
    };
  }

  /**
   * 获取Redis URL配置
   * 用于基于URL的Redis连接
   */
  static getUrlConfig(): RedisUrlConfig {
    const config = this.getConnectionConfig();

    // 构建Redis URL
    let url = 'redis://';
    if (config.password) {
      url += `:${config.password}@`;
    }
    url += `${config.host}:${config.port}`;
    if (config.db > 0) {
      url += `/${config.db}`;
    }

    return {
      url: process.env.COSEREEDEN_REDIS_URL || process.env.COSEREEDEN_REDIS_URL || url,
      keyPrefix: config.keyPrefix,
      defaultTTL: config.defaultTTL,
      enabled: (process.env.COSEREEDEN_REDIS_ENABLED || process.env.COSEREEDEN_REDIS_ENABLED) !== 'false',
      compression: (process.env.COSEREEDEN_REDIS_COMPRESSION || process.env.COSEREEDEN_REDIS_COMPRESSION) !== 'false',
    };
  }

  /**
   * 获取IoRedis连接选项
   * 用于创建IoRedis实例
   */
  static getIoRedisOptions(): any {
    const config = this.getConnectionConfig();

    const options: any = {
      host: config.host,
      port: config.port,
      db: config.db,
      keyPrefix: config.keyPrefix,
      maxRetriesPerRequest: config.maxRetries,
      retryDelayOnFailover: config.retryDelayOnFailover,
      connectTimeout: config.connectTimeout,
      commandTimeout: config.commandTimeout,
      lazyConnect: config.lazyConnect,
      enableOfflineQueue: config.enableOfflineQueue,
      family: config.family,
      keepAlive: 30000,
    };

    // 只有在明确设置密码时才添加
    if (config.password && config.password.trim() !== '') {
      options.password = config.password;
    }

    return options;
  }

  /**
   * 验证Redis配置
   * 检查必要的环境变量是否设置
   */
  static validateConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 获取配置值（支持COSEREEDEN_前缀）
    const portStr = getRedisEnvValue('PORT');
    const dbStr = getRedisEnvValue('DB');
    const ttlStr = getRedisEnvValue('DEFAULT_TTL');
    const maxRetriesStr = getRedisEnvValue('MAX_RETRIES');
    const connectTimeoutStr = getRedisEnvValue('CONNECT_TIMEOUT');

    const port = parseInt(portStr);
    const db = parseInt(dbStr);
    const ttl = parseInt(ttlStr);
    const maxRetries = parseInt(maxRetriesStr);
    const connectTimeout = parseInt(connectTimeoutStr);
    const host = getRedisHost();
    const password = process.env.COSEREEDEN_REDIS_PASSWORD || process.env.COSEREEDEN_REDIS_PASSWORD;

    // 检查端口配置
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push(`无效的Redis端口: ${portStr}`);
    }

    // 检查数据库配置
    if (isNaN(db) || db < 0 || db > 15) {
      errors.push(`无效的Redis数据库: ${dbStr}`);
    }

    // 检查TTL配置
    if (isNaN(ttl) || ttl < 1) {
      errors.push(`无效的Redis默认TTL: ${ttlStr}`);
    }

    // 检查重试配置
    if (isNaN(maxRetries) || maxRetries < 0) {
      warnings.push(`Redis最大重试次数可能过低: ${maxRetriesStr}`);
    }

    // 检查超时配置
    if (isNaN(connectTimeout) || connectTimeout < 1000) {
      warnings.push(`Redis连接超时可能过短: ${connectTimeoutStr}`);
    }

    // 生产环境特殊检查
    if (process.env.NODE_ENV === 'production') {
      if (!password) {
        warnings.push('生产环境建议设置Redis密码 (COSEREEDEN_REDIS_PASSWORD 或 REDIS_PASSWORD)');
      }

      if (host === 'localhost') {
        warnings.push('生产环境不建议使用localhost作为Redis主机');
      }

      // 检查是否使用了推荐的COSEREEDEN_前缀
      const hasCoserEdenPrefix = Object.keys(process.env).some(key => key.startsWith('COSEREEDEN_REDIS_'));
      if (!hasCoserEdenPrefix) {
        warnings.push('建议使用COSEREEDEN_REDIS_前缀的环境变量以避免冲突');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取配置摘要
   * 用于日志记录和调试
   */
  static getConfigSummary(): {
    host: string;
    port: number;
    db: number;
    keyPrefix: string;
    enabled: boolean;
    hasPassword: boolean;
    environment: string;
  } {
    const config = this.getConnectionConfig();
    const urlConfig = this.getUrlConfig();

    return {
      host: config.host,
      port: config.port,
      db: config.db,
      keyPrefix: config.keyPrefix,
      enabled: urlConfig.enabled,
      hasPassword: !!config.password,
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * 生成环境变量建议
   * 用于配置指导，推荐使用COSEREEDEN_前缀
   */
  static generateEnvSuggestions(): Record<string, string> {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      // 推荐使用COSEREEDEN_前缀的环境变量
      COSEREEDEN_REDIS_HOST: isProduction ? 'your-redis-host' : 'localhost',
      COSEREEDEN_REDIS_PORT: '6379',
      COSEREEDEN_REDIS_PASSWORD: isProduction ? 'your-secure-password' : '',
      COSEREEDEN_REDIS_DB: '0',
      COSEREEDEN_REDIS_KEY_PREFIX: 'cosereeden:',
      COSEREEDEN_REDIS_DEFAULT_TTL: '3600',
      COSEREEDEN_REDIS_MAX_RETRIES: '3',
      COSEREEDEN_REDIS_RETRY_DELAY: '100',
      COSEREEDEN_REDIS_CONNECT_TIMEOUT: '10000',
      COSEREEDEN_REDIS_COMMAND_TIMEOUT: '5000',
      COSEREEDEN_REDIS_ENABLED: 'true',
      COSEREEDEN_REDIS_COMPRESSION: 'true',
      COSEREEDEN_REDIS_LAZY_CONNECT: 'true',
      COSEREEDEN_REDIS_OFFLINE_QUEUE: 'true',
      COSEREEDEN_REDIS_FAMILY: '4',

      // 向后兼容的标准前缀（可选）
      REDIS_HOST: isProduction ? 'your-redis-host' : 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: isProduction ? 'your-secure-password' : '',
      REDIS_DB: '0',
      REDIS_KEY_PREFIX: 'cosereeden:',
      REDIS_DEFAULT_TTL: '3600',
      REDIS_MAX_RETRIES: '3',
      REDIS_RETRY_DELAY: '100',
      REDIS_CONNECT_TIMEOUT: '10000',
      REDIS_COMMAND_TIMEOUT: '5000',
      REDIS_ENABLED: 'true',
      REDIS_COMPRESSION: 'true',
      REDIS_LAZY_CONNECT: 'true',
      REDIS_OFFLINE_QUEUE: 'true',
      REDIS_FAMILY: '4',
    };
  }

  /**
   * 获取当前使用的环境变量配置
   * 用于调试和配置检查
   */
  static getCurrentEnvConfig(): Record<string, string | undefined> {
    return {
      // COSEREEDEN_前缀配置
      COSEREEDEN_REDIS_HOST: process.env.COSEREEDEN_REDIS_HOST,
      COSEREEDEN_REDIS_PORT: process.env.COSEREEDEN_REDIS_PORT,
      COSEREEDEN_REDIS_PASSWORD: process.env.COSEREEDEN_REDIS_PASSWORD ? '***' : undefined,
      COSEREEDEN_REDIS_DB: process.env.COSEREEDEN_REDIS_DB,
      COSEREEDEN_REDIS_KEY_PREFIX: process.env.COSEREEDEN_REDIS_KEY_PREFIX,
      COSEREEDEN_REDIS_DEFAULT_TTL: process.env.COSEREEDEN_REDIS_DEFAULT_TTL,

      // 标准前缀配置（向后兼容）
      REDIS_HOST: process.env.COSEREEDEN_REDIS_HOST,
      REDIS_PORT: process.env.COSEREEDEN_REDIS_PORT,
      REDIS_PASSWORD: process.env.COSEREEDEN_REDIS_PASSWORD ? '***' : undefined,
      REDIS_DB: process.env.COSEREEDEN_REDIS_DB,
      REDIS_KEY_PREFIX: process.env.COSEREEDEN_REDIS_KEY_PREFIX,
      REDIS_DEFAULT_TTL: process.env.COSEREEDEN_REDIS_DEFAULT_TTL,

      // 实际使用的值
      EFFECTIVE_HOST: getRedisHost(),
      EFFECTIVE_PORT: getRedisEnvValue('PORT'),
      EFFECTIVE_DB: getRedisEnvValue('DB'),
      EFFECTIVE_KEY_PREFIX: getRedisEnvValue('KEY_PREFIX'),
      EFFECTIVE_DEFAULT_TTL: getRedisEnvValue('DEFAULT_TTL'),
    };
  }
}

/**
 * 导出默认配置实例
 */
export const redisConfig = {
  connection: RedisConfigManager.getConnectionConfig(),
  url: RedisConfigManager.getUrlConfig(),
  ioredis: RedisConfigManager.getIoRedisOptions(),
  summary: RedisConfigManager.getConfigSummary(),
};

/**
 * 导出配置验证结果
 */
export const redisConfigValidation = RedisConfigManager.validateConfig();
