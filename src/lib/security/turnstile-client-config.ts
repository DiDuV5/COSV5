/**
 * @fileoverview Turnstile客户端配置
 * @description 客户端专用的Turnstile配置和工具函数，遵循12-Factor App原则
 * @author Augment AI
 * @date 2025-07-10
 * @version 2.0.0
 */

import type {
  TurnstileConfig,
  TurnstileTheme,
  TurnstileSize,
  TurnstileLanguage,
  TurnstileFeatureId
} from '@/types/turnstile';
import { getClientSafeConfig } from './turnstile-env-config';

/**
 * 检查当前域名是否支持测试密钥
 */
function isTestKeyCompatibleDomain(): boolean {
  if (typeof window === 'undefined') return true; // SSR环境

  const hostname = window.location.hostname;
  const testCompatibleDomains = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    // 添加其他测试域名
  ];

  return testCompatibleDomains.includes(hostname);
}

/**
 * 获取客户端Turnstile配置
 */
export function getClientTurnstileConfig(): TurnstileConfig {
  const envConfig = getClientSafeConfig();

  // 验证必需的配置
  if (!envConfig.siteKey) {
    throw new Error('Turnstile站点密钥未配置，请检查COSEREEDEN_TURNSTILE_SITE_KEY环境变量');
  }

  // 检查测试密钥在生产域名的使用
  // Cloudflare官方测试密钥（仅适用于localhost）
  const isTestKey = envConfig.siteKey === '1x00000000000000000000AA' || envConfig.siteKey === '2x00000000000000000000AB' || envConfig.siteKey === '3x00000000000000000000FF';
  const isCompatibleDomain = isTestKeyCompatibleDomain();

  if (isTestKey && !isCompatibleDomain) {
    console.warn('⚠️ 检测到在生产域名使用测试密钥，这将导致验证失败');
    console.warn('💡 请申请正式的Cloudflare Turnstile密钥：https://dash.cloudflare.com/profile/api-tokens');
  }

  // 验证生产密钥格式
  if (envConfig.siteKey.startsWith('0x4AAAAAABkbXE00TFb5Z_gB')) {
    console.log('✅ 使用正式生产环境Turnstile密钥');
  }

  return {
    sitekey: envConfig.siteKey,
    theme: 'light',
    size: 'normal',
    language: 'zh-cn',
    'retry-interval': envConfig.retryInterval,
    'refresh-expired': 'auto'
  };
}

/**
 * 检测设备类型
 */
export function detectDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const userAgent = window.navigator.userAgent;
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  return mobileRegex.test(userAgent) ? 'mobile' : 'desktop';
}

/**
 * 获取适合设备的Turnstile大小
 */
export function getDeviceAppropriateSize(): TurnstileSize {
  const deviceType = detectDeviceType();
  return deviceType === 'mobile' ? 'compact' : 'normal';
}

/**
 * 验证Turnstile配置（客户端版本）
 */
export function validateTurnstileConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  try {
    const config = getClientSafeConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需的配置
    if (!config.siteKey) {
      errors.push('缺少NEXT_PUBLIC_TURNSTILE_SITE_KEY环境变量');
    }

    // 检查站点密钥格式
    if (config.siteKey && !config.siteKey.startsWith('0x') && !config.siteKey.startsWith('x')) {
      warnings.push('站点密钥格式可能不正确');
    }

    // 检查是否使用测试密钥
    if (config.siteKey === '0x4AAAAAABkbXEOOIFb5Z_gB' && process.env.NODE_ENV === 'production') {
      errors.push('生产环境不能使用测试站点密钥');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : '配置加载失败'],
      warnings: []
    };
  }
}

/**
 * 获取Turnstile脚本URL
 */
export function getTurnstileScriptUrl(): string {
  return 'https://challenges.cloudflare.com/turnstile/v0/api.js';
}

/**
 * 检查Turnstile脚本是否已加载
 */
export function isTurnstileScriptLoaded(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return typeof (window as any).turnstile !== 'undefined';
}

/**
 * 加载Turnstile脚本
 */
export function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isTurnstileScriptLoaded()) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = getTurnstileScriptUrl();
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'));
    };

    document.head.appendChild(script);
  });
}

/**
 * 获取Turnstile主题配置
 */
export function getTurnstileTheme(): TurnstileTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  // 检查系统主题偏好
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * 获取Turnstile语言配置
 */
export function getTurnstileLanguage(): TurnstileLanguage {
  if (typeof window === 'undefined') {
    return 'zh-cn';
  }

  const language = window.navigator.language;

  // 支持的语言映射 - 使用Cloudflare Turnstile支持的语言代码
  const languageMap: Record<string, TurnstileLanguage> = {
    'zh': 'zh-cn',
    'zh-CN': 'zh-cn',
    'zh-cn': 'zh-cn',
    'zh-TW': 'zh-tw',
    'zh-tw': 'zh-tw',
    'en': 'en',
    'en-US': 'en',
    'ja': 'ja',
    'ko': 'ko',
    'fr': 'fr',
    'de': 'de',
    'es': 'es',
    'pt': 'pt',
    'ru': 'ru'
  };

  return languageMap[language] || languageMap[language.split('-')[0]] || 'zh-cn';
}

/**
 * 创建Turnstile配置对象
 */
export function createTurnstileConfig(overrides?: Partial<TurnstileConfig>): TurnstileConfig {
  const baseConfig = getClientTurnstileConfig();
  const deviceSize = getDeviceAppropriateSize();
  const theme = getTurnstileTheme();
  const language = getTurnstileLanguage();

  return {
    ...baseConfig,
    size: deviceSize,
    theme,
    language,
    ...overrides
  };
}

/**
 * Turnstile错误消息映射
 */
export const TURNSTILE_ERROR_MESSAGES: Record<string, string> = {
  'missing-input-secret': '缺少服务端密钥',
  'invalid-input-secret': '无效的服务端密钥',
  'missing-input-response': '缺少验证响应',
  'invalid-input-response': '无效的验证响应',
  'bad-request': '请求格式错误',
  'timeout-or-duplicate': '验证超时或重复提交',
  'internal-error': '内部服务器错误',
  'network-error': '网络连接错误',
  'script-load-error': 'Turnstile脚本加载失败',
  'widget-render-error': 'Turnstile组件渲染失败',
  'validation-failed': '人机验证失败',
  'feature-disabled': '验证功能已禁用',
  'unknown-error': '未知错误'
};

/**
 * 获取用户友好的错误消息
 */
export function getTurnstileErrorMessage(errorCode: string): string {
  return TURNSTILE_ERROR_MESSAGES[errorCode] || TURNSTILE_ERROR_MESSAGES['unknown-error'];
}

/**
 * 检查是否为开发环境
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 获取调试信息
 */
export function getTurnstileDebugInfo(): {
  environment: string;
  config: TurnstileConfig;
  validation: ReturnType<typeof validateTurnstileConfig>;
  scriptLoaded: boolean;
  deviceType: string;
  envConfig: ReturnType<typeof getClientSafeConfig>;
} {
  return {
    environment: process.env.NODE_ENV || 'unknown',
    config: getClientTurnstileConfig(),
    validation: validateTurnstileConfig(),
    scriptLoaded: isTurnstileScriptLoaded(),
    deviceType: detectDeviceType(),
    envConfig: getClientSafeConfig()
  };
}
