/**
 * @fileoverview 上传系统基础类型定义
 * @description CoserEden上传系统的基础枚举和常量定义
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

/**
 * 上传类型枚举
 */
export enum UploadType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  AVATAR = 'avatar',
}

/**
 * 处理状态枚举
 */
export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * 上传策略枚举
 */
export enum UploadStrategy {
  DIRECT = 'direct',
  STREAM = 'stream',
  MEMORY_SAFE = 'memory-safe',
}

/**
 * 优先级枚举
 */
export enum UploadPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

/**
 * 上传错误类型
 */
export enum UploadErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  TRANSCODING_ERROR = 'TRANSCODING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 转码状态文本映射
 */
export const TRANSCODING_STATUS_TEXT: Record<string, string> = {
  'preparing': '准备转码',
  'analyzing': '分析文件',
  'transcoding': '转码中',
  'finalizing': '完成处理',
  'completed': '转码完成',
  'error': '转码失败'
};
