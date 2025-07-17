/**
 * @fileoverview 文件验证相关类型定义
 * @description 定义文件安全验证相关的接口和类型
 */

import type { UserLevel } from '@/types/user-level';

/**
 * 文件验证结果接口
 */
export interface FileValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 是否安全 */
  isSafe: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
  /** 安全风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** 检测到的文件类型 */
  detectedType?: string;
  /** 验证详情 */
  details: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    extension: string;
    userLevel: UserLevel;
    validationTimestamp: string;
  };
}

/**
 * 文件验证选项
 */
export interface FileValidationOptions {
  /** 跳过内容扫描 */
  skipContentScan?: boolean;
  /** 严格模式 */
  strictMode?: boolean;
  /** 允许的最大文件大小（字节） */
  maxFileSize?: number;
  /** 允许的文件类型列表 */
  allowedTypes?: string[];
  /** 禁止的文件类型列表 */
  forbiddenTypes?: string[];
}

/**
 * 文件头验证结果
 */
export interface FileHeaderValidationResult {
  /** 是否匹配预期类型 */
  isValid: boolean;
  /** 检测到的文件类型 */
  detectedType?: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 验证消息 */
  message?: string;
}

/**
 * 内容安全扫描结果
 */
export interface ContentSecurityScanResult {
  /** 是否安全 */
  isSafe: boolean;
  /** 检测到的威胁类型 */
  threats: string[];
  /** 可疑内容 */
  suspiciousContent: string[];
  /** 扫描详情 */
  scanDetails: {
    scannedBytes: number;
    scanDuration: number;
    scanMethod: string;
  };
}

/**
 * 安全违规事件
 */
export interface SecurityViolationEvent {
  /** 事件ID */
  eventId: string;
  /** 用户ID */
  userId?: string;
  /** IP地址 */
  ipAddress?: string;
  /** 用户代理 */
  userAgent?: string;
  /** 文件名 */
  fileName: string;
  /** 文件大小 */
  fileSize: number;
  /** MIME类型 */
  mimeType: string;
  /** 违规类型 */
  violationType: 'FORBIDDEN_EXTENSION' | 'DANGEROUS_MIME' | 'MALICIOUS_CONTENT' | 'SIZE_LIMIT' | 'PATH_TRAVERSAL' | 'OTHER';
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** 错误信息 */
  errors: string[];
  /** 警告信息 */
  warnings: string[];
  /** 时间戳 */
  timestamp: string;
  /** 处理状态 */
  status: 'BLOCKED' | 'QUARANTINED' | 'ALLOWED_WITH_WARNING';
}

/**
 * 文件类型检测结果
 */
export interface FileTypeDetectionResult {
  /** 检测到的MIME类型 */
  mimeType: string;
  /** 检测到的扩展名 */
  extension: string;
  /** 置信度 */
  confidence: number;
  /** 检测方法 */
  method: 'HEADER' | 'CONTENT' | 'EXTENSION' | 'HYBRID';
  /** 是否与声明的类型匹配 */
  matchesDeclared: boolean;
}

/**
 * 验证器配置
 */
export interface ValidatorConfig {
  /** 启用文件名验证 */
  enableFileNameValidation: boolean;
  /** 启用扩展名验证 */
  enableExtensionValidation: boolean;
  /** 启用MIME类型验证 */
  enableMimeTypeValidation: boolean;
  /** 启用文件大小验证 */
  enableFileSizeValidation: boolean;
  /** 启用文件头验证 */
  enableFileHeaderValidation: boolean;
  /** 启用内容安全扫描 */
  enableContentSecurityScan: boolean;
  /** 严格模式 */
  strictMode: boolean;
  /** 最大扫描时间（毫秒） */
  maxScanTime: number;
  /** 最大扫描大小（字节） */
  maxScanSize: number;
}
