/**
 * @fileoverview CDN URL修复器类型定义
 * @description CDN URL修复相关的类型和接口定义
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

/**
 * CDN配置接口
 */
export interface CDNConfig {
  /** 主CDN域名 */
  cdnDomain: string;
  /** 备用CDN域名（按优先级排序） */
  fallbackDomains: string[];
  /** 需要替换的错误域名 */
  errorDomains: string[];
  /** 本地开发域名 */
  localDomains: string[];
}

/**
 * 媒体对象接口
 */
export interface MediaObject {
  /** CDN URL */
  cdnUrl?: string | null;
  /** 原始URL */
  url?: string | null;
  /** 缩略图URL */
  thumbnailUrl?: string | null;
  /** 媒体类型 */
  mediaType?: string;
}

/**
 * URL验证结果
 */
export interface URLValidationResult {
  /** 是否可访问 */
  accessible: boolean;
  /** HTTP状态码 */
  status?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * CDN连通性检查结果
 */
export interface CDNConnectivityResult {
  /** 是否成功 */
  success: boolean;
  /** 延迟时间（毫秒） */
  latency?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * URL诊断结果
 */
export interface URLDiagnosisResult {
  /** 原始URL */
  original: string;
  /** 修复后的URL */
  fixed: string;
  /** 是否需要修复 */
  needsFix: boolean;
  /** 是否可访问 */
  accessible: boolean;
  /** 建议列表 */
  recommendations: string[];
}

/**
 * URL转换选项
 */
export interface URLTransformOptions {
  /** 是否强制使用HTTPS */
  forceHttps?: boolean;
  /** 是否保留查询参数 */
  preserveQuery?: boolean;
  /** 是否保留片段标识符 */
  preserveFragment?: boolean;
  /** 自定义域名映射 */
  domainMapping?: Record<string, string>;
}

/**
 * 安全验证选项
 */
export interface SecurityValidationOptions {
  /** 是否允许JavaScript协议 */
  allowJavaScript?: boolean;
  /** 是否允许Data URL */
  allowDataUrl?: boolean;
  /** 自定义恶意模式 */
  customMaliciousPatterns?: RegExp[];
}

/**
 * URL处理上下文
 */
export interface URLProcessingContext {
  /** 当前环境 */
  environment: 'development' | 'production' | 'test';
  /** 是否启用调试日志 */
  enableDebugLog?: boolean;
  /** 请求来源 */
  source?: string;
  /** 用户代理 */
  userAgent?: string;
}
