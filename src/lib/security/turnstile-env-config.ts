/**
 * @fileoverview Turnstile环境变量配置系统
 * @description 严格遵循12-Factor App原则的统一配置管理
 * @author Augment AI
 * @date 2025-07-10
 * @version 2.0.0
 */

/**
 * Turnstile环境变量接口
 */
export interface TurnstileEnvConfig {
  /** 是否启用Turnstile功能 */
  enabled: boolean;
  /** 客户端站点密钥 */
  siteKey: string;
  /** 服务端密钥 */
  secretKey: string;
  /** 验证端点URL */
  verifyEndpoint: string;
  /** 请求超时时间（毫秒） */
  timeout: number;
  /** 重试次数 */
  retryAttempts: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 是否启用调试模式 */
  debug: boolean;
}

/**
 * 环境变量验证错误
 */
export class TurnstileConfigError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value?: string
  ) {
    super(message);
    this.name = 'TurnstileConfigError';
  }
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: TurnstileConfigError[];
  warnings: string[];
}

/**
 * 环境变量名称常量 - 统一使用COSEREEDEN_前缀
 */
export const TURNSTILE_ENV_VARS = {
  ENABLED: 'COSEREEDEN_TURNSTILE_ENABLED',
  SITE_KEY: 'COSEREEDEN_TURNSTILE_SITE_KEY',
  SECRET_KEY: 'COSEREEDEN_TURNSTILE_SECRET_KEY',
  VERIFY_ENDPOINT: 'COSEREEDEN_TURNSTILE_VERIFY_ENDPOINT',
  TIMEOUT: 'COSEREEDEN_TURNSTILE_TIMEOUT',
  RETRY_ATTEMPTS: 'COSEREEDEN_TURNSTILE_RETRY_ATTEMPTS',
  RETRY_INTERVAL: 'COSEREEDEN_TURNSTILE_RETRY_INTERVAL',
  DEBUG: 'COSEREEDEN_TURNSTILE_DEBUG',
  // 降级机制配置
  ENABLE_FALLBACK: 'COSEREEDEN_TURNSTILE_ENABLE_FALLBACK',
  FALLBACK_MODE: 'COSEREEDEN_TURNSTILE_FALLBACK_MODE',
  FALLBACK_TIMEOUT: 'COSEREEDEN_TURNSTILE_FALLBACK_TIMEOUT',
  FALLBACK_MAX_FAILURES: 'COSEREEDEN_TURNSTILE_FALLBACK_MAX_FAILURES',
  FALLBACK_RECOVERY_INTERVAL: 'COSEREEDEN_TURNSTILE_FALLBACK_RECOVERY_INTERVAL',
  FALLBACK_HEALTH_CHECK_INTERVAL: 'COSEREEDEN_TURNSTILE_FALLBACK_HEALTH_CHECK_INTERVAL',
  FALLBACK_TELEGRAM_ALERTS: 'COSEREEDEN_TURNSTILE_FALLBACK_TELEGRAM_ALERTS'
} as const;

/**
 * 默认配置值（仅用于非生产环境）
 */
const DEFAULT_CONFIG = {
  enabled: false, // 默认禁用，必须显式启用
  verifyEndpoint: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  timeout: 10000, // 10秒
  retryAttempts: 3,
  retryInterval: 1000, // 1秒
  debug: false
} as const;

/**
 * 验证站点密钥格式
 */
function validateSiteKey(siteKey: string): boolean {
  // Cloudflare Turnstile站点密钥格式：支持0x或x开头的十六进制字符串
  // 支持测试密钥和正式密钥的不同长度
  const siteKeyRegex = /^(0x|x)[a-fA-F0-9_]{16,38}$/;
  return siteKeyRegex.test(siteKey);
}

/**
 * 验证密钥格式
 */
function validateSecretKey(secretKey: string): boolean {
  // Cloudflare Turnstile密钥格式：支持0x或x开头的十六进制字符串
  // 支持测试密钥和正式密钥的不同长度
  const secretKeyRegex = /^(0x|x)[a-fA-F0-9_]{16,38}$/;
  return secretKeyRegex.test(secretKey);
}

/**
 * 验证URL格式
 */
function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:' && urlObj.hostname.includes('cloudflare.com');
  } catch {
    return false;
  }
}

/**
 * 解析布尔值环境变量
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 解析数字环境变量
 */
function parseNumber(value: string | undefined, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;

  if (min !== undefined && parsed < min) return defaultValue;
  if (max !== undefined && parsed > max) return defaultValue;

  return parsed;
}

/**
 * 检查是否为生产环境
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 获取环境变量值
 */
function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

/**
 * 验证必需的环境变量
 */
function validateRequiredEnvVars(): ValidationResult {
  const errors: TurnstileConfigError[] = [];
  const warnings: string[] = [];

  // 在生产环境中，所有关键配置都是必需的
  if (isProduction()) {
    const siteKey = getEnvVar(TURNSTILE_ENV_VARS.SITE_KEY);
    const secretKey = getEnvVar(TURNSTILE_ENV_VARS.SECRET_KEY);

    if (!siteKey) {
      errors.push(new TurnstileConfigError(
        `生产环境必须设置 ${TURNSTILE_ENV_VARS.SITE_KEY}`,
        TURNSTILE_ENV_VARS.SITE_KEY
      ));
    } else if (!validateSiteKey(siteKey)) {
      errors.push(new TurnstileConfigError(
        `${TURNSTILE_ENV_VARS.SITE_KEY} 格式无效，应为0x开头的40字符十六进制字符串`,
        TURNSTILE_ENV_VARS.SITE_KEY,
        siteKey
      ));
    }

    if (!secretKey) {
      errors.push(new TurnstileConfigError(
        `生产环境必须设置 ${TURNSTILE_ENV_VARS.SECRET_KEY}`,
        TURNSTILE_ENV_VARS.SECRET_KEY
      ));
    } else if (!validateSecretKey(secretKey)) {
      errors.push(new TurnstileConfigError(
        `${TURNSTILE_ENV_VARS.SECRET_KEY} 格式无效，应为0x开头的40字符十六进制字符串`,
        TURNSTILE_ENV_VARS.SECRET_KEY,
        '***'
      ));
    }

    // 检查是否使用了测试密钥（演示环境允许使用测试密钥）
    const allowTestKeys = process.env.COSEREEDEN_TURNSTILE_ALLOW_TEST_KEYS === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (siteKey === '0x4AAAAAABkbXEOOIFb5Z_gB') {
      if (!allowTestKeys && !isDevelopment) {
        warnings.push('生产环境使用测试站点密钥，建议更换为正式密钥');
      } else {
        console.log('ℹ️ 使用Cloudflare官方测试密钥（仅适用于localhost）');
      }
    }

    if (secretKey === '0x4AAAAAABkbXC_NcaMH-RvbqXYJASS_6q8') {
      if (!allowTestKeys && !isDevelopment) {
        warnings.push('生产环境使用测试密钥，建议更换为正式密钥');
      } else {
        console.log('ℹ️ 使用Cloudflare官方测试密钥（仅适用于localhost）');
      }
    }
  } else {
    // 非生产环境的警告
    const siteKey = getEnvVar(TURNSTILE_ENV_VARS.SITE_KEY);
    const secretKey = getEnvVar(TURNSTILE_ENV_VARS.SECRET_KEY);

    if (!siteKey) {
      warnings.push(`开发环境建议设置 ${TURNSTILE_ENV_VARS.SITE_KEY}`);
    }

    if (!secretKey) {
      warnings.push(`开发环境建议设置 ${TURNSTILE_ENV_VARS.SECRET_KEY}`);
    }
  }

  // 验证验证端点
  const verifyEndpoint = getEnvVar(TURNSTILE_ENV_VARS.VERIFY_ENDPOINT);
  if (verifyEndpoint && !validateUrl(verifyEndpoint)) {
    errors.push(new TurnstileConfigError(
      `${TURNSTILE_ENV_VARS.VERIFY_ENDPOINT} 必须是有效的HTTPS URL`,
      TURNSTILE_ENV_VARS.VERIFY_ENDPOINT,
      verifyEndpoint
    ));
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 加载和验证Turnstile环境配置
 */
export function loadTurnstileEnvConfig(): TurnstileEnvConfig {
  // 首先验证环境变量
  const validation = validateRequiredEnvVars();

  if (!validation.isValid) {
    const errorMessages = validation.errors.map(err => `${err.field}: ${err.message}`);
    throw new TurnstileConfigError(
      `Turnstile配置验证失败:\n${errorMessages.join('\n')}`,
      'validation'
    );
  }

  // 输出警告
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Turnstile配置警告:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  // 构建配置对象
  const config: TurnstileEnvConfig = {
    enabled: parseBoolean(getEnvVar(TURNSTILE_ENV_VARS.ENABLED), DEFAULT_CONFIG.enabled),
    siteKey: getEnvVar(TURNSTILE_ENV_VARS.SITE_KEY) || '',
    secretKey: getEnvVar(TURNSTILE_ENV_VARS.SECRET_KEY) || '',
    verifyEndpoint: getEnvVar(TURNSTILE_ENV_VARS.VERIFY_ENDPOINT) || DEFAULT_CONFIG.verifyEndpoint,
    timeout: parseNumber(getEnvVar(TURNSTILE_ENV_VARS.TIMEOUT), DEFAULT_CONFIG.timeout, 1000, 30000),
    retryAttempts: parseNumber(getEnvVar(TURNSTILE_ENV_VARS.RETRY_ATTEMPTS), DEFAULT_CONFIG.retryAttempts, 0, 10),
    retryInterval: parseNumber(getEnvVar(TURNSTILE_ENV_VARS.RETRY_INTERVAL), DEFAULT_CONFIG.retryInterval, 100, 10000),
    debug: parseBoolean(getEnvVar(TURNSTILE_ENV_VARS.DEBUG), DEFAULT_CONFIG.debug)
  };

  // 在调试模式下输出配置信息（隐藏敏感信息）
  if (config.debug) {
    console.log('🔧 Turnstile配置加载完成:', {
      enabled: config.enabled,
      siteKey: config.siteKey ? `${config.siteKey.substring(0, 10)}...` : '未设置',
      secretKey: config.secretKey ? '***已设置***' : '未设置',
      verifyEndpoint: config.verifyEndpoint,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      retryInterval: config.retryInterval,
      environment: process.env.NODE_ENV
    });
  }

  return config;
}

/**
 * 验证Turnstile配置
 */
export function validateTurnstileConfig(config?: TurnstileEnvConfig): ValidationResult {
  if (!config) {
    try {
      config = loadTurnstileEnvConfig();
    } catch (error) {
      return {
        isValid: false,
        errors: [error as TurnstileConfigError],
        warnings: []
      };
    }
  }

  return validateRequiredEnvVars();
}

/**
 * 获取客户端安全配置（不包含敏感信息）
 * 专门为客户端设计，避免服务端验证逻辑
 */
export function getClientSafeConfig(): Pick<TurnstileEnvConfig, 'enabled' | 'siteKey' | 'timeout' | 'retryAttempts' | 'retryInterval' | 'debug'> {
  // 检查是否在客户端环境
  const isClient = typeof window !== 'undefined';

  if (isClient) {
    // 客户端只能访问NEXT_PUBLIC_前缀的环境变量
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
    const enabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== 'false';

    return {
      enabled,
      siteKey,
      timeout: DEFAULT_CONFIG.timeout,
      retryAttempts: DEFAULT_CONFIG.retryAttempts,
      retryInterval: DEFAULT_CONFIG.retryInterval,
      debug: DEFAULT_CONFIG.debug
    };
  } else {
    // 服务端可以使用完整的配置加载
    const config = loadTurnstileEnvConfig();

    return {
      enabled: config.enabled,
      siteKey: config.siteKey,
      timeout: config.timeout,
      retryAttempts: config.retryAttempts,
      retryInterval: config.retryInterval,
      debug: config.debug
    };
  }
}

/**
 * 获取服务端完整配置
 */
export function getServerConfig(): TurnstileEnvConfig {
  return loadTurnstileEnvConfig();
}

/**
 * 检查配置是否就绪
 */
export function isConfigReady(): boolean {
  try {
    const validation = validateTurnstileConfig();
    return validation.isValid;
  } catch {
    return false;
  }
}

/**
 * 获取配置状态信息
 */
export function getConfigStatus(): {
  ready: boolean;
  environment: string;
  validation: ValidationResult;
} {
  const validation = validateTurnstileConfig();

  return {
    ready: validation.isValid,
    environment: process.env.NODE_ENV || 'unknown',
    validation
  };
}
