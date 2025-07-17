/**
 * @fileoverview 存储工厂类型定义
 * @description 存储工厂相关的类型和接口定义
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

/**
 * 环境变量验证结果
 */
export interface EnvironmentValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 必需变量是否存在 */
  requiredVarsPresent: boolean;
  /** 存在的可选变量 */
  optionalVarsPresent: string[];
  /** 缺失的必需变量 */
  missingRequired: string[];
  /** 摘要信息 */
  summary: {
    provider: string;
    configSource: string;
    requiredVars: number;
    optionalVars: number;
    presentOptional: number;
  };
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 摘要信息 */
  summary: any;
}

/**
 * 配置状态
 */
export interface ConfigStatus {
  /** 是否有效 */
  isValid: boolean;
  /** 错误列表 */
  errors: string[];
  /** 警告列表 */
  warnings: string[];
  /** 摘要信息 */
  summary: {
    provider: string;
    configSource: string;
    requiredVarsPresent?: boolean;
    optionalVarsCount?: number;
    message: string;
  };
}

/**
 * URL生成选项
 */
export interface URLGenerationOptions {
  /** 是否强制使用HTTPS */
  forceHttps?: boolean;
  /** 是否编码文件名 */
  encodeFilename?: boolean;
  /** 自定义域名 */
  customDomain?: string;
}

/**
 * 必需的环境变量
 */
export const REQUIRED_ENV_VARS = [
  'COSEREEDEN_CLOUDFLARE_R2_ACCOUNT_ID',
  'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID',
  'COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME',
  'COSEREEDEN_CLOUDFLARE_R2_ENDPOINT',
] as const;

/**
 * 可选的环境变量
 */
export const OPTIONAL_ENV_VARS = [
  'COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN',
  'COSEREEDEN_CLOUDFLARE_R2_CUSTOM_DOMAIN',
  'COSEREEDEN_CLOUDFLARE_R2_API_TOKEN',
  'COSEREEDEN_CLOUDFLARE_R2_REGION',
] as const;

/**
 * 必需环境变量类型
 */
export type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];

/**
 * 可选环境变量类型
 */
export type OptionalEnvVar = typeof OPTIONAL_ENV_VARS[number];
