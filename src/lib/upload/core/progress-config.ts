/**
 * @fileoverview 上传系统进度和配置类型定义
 * @description CoserEden上传系统的进度监控和配置相关类型
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

/**
 * 上传进度接口
 */
export interface UploadProgress {
  // 基本进度
  progress: number; // 0-100
  stage: string;
  message?: string;
  timestamp?: number; // 时间戳

  // 详细信息
  bytesUploaded?: number;
  totalBytes?: number;
  speed?: number; // bytes/second
  estimatedTimeRemaining?: number; // seconds

  // 分片信息
  chunksUploaded?: number;
  totalChunks?: number;
  currentChunk?: number;

  // 处理信息
  isProcessing?: boolean;
  processingStage?: string;
  processingProgress?: number;
}

/**
 * 上传配置接口
 */
export interface UploadConfig {
  // 文件限制
  maxFileSize: number;
  maxConcurrentUploads: number;
  allowedMimeTypes: string[];

  // 分片配置
  chunkSize: number;
  maxConcurrentChunks: number;
  enableChunkedUpload: boolean;

  // 策略配置
  directUploadThreshold: number;
  streamUploadThreshold: number;
  memorySafeThreshold: number;

  // 处理配置
  enableImageProcessing: boolean;
  enableVideoTranscoding: boolean;
  enableThumbnailGeneration: boolean;

  // 存储配置
  defaultStorageProvider: string;
  enableDeduplication: boolean;
  retentionDays: number;

  // 性能配置
  memoryLimit: number;
  timeoutSeconds: number;
  retryAttempts: number;
}

/**
 * 重试配置接口
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxAttempts: number;
  /** 基础延迟时间（毫秒） */
  baseDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay: number;
  /** 退避因子 */
  backoffFactor: number;
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * 默认上传配置
 */
export const DEFAULT_UPLOAD_CONFIG = {
  maxFileSize: 1000 * 1024 * 1024, // 1GB
  maxConcurrentUploads: 3,
  chunkSize: 64 * 1024, // 64KB
  retryConfig: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  } as RetryConfig,
  enableDeduplication: true,
  generateThumbnails: true,
  autoTranscode: true,
  generateMultipleSizes: true,
  imageQuality: 0.8,
  networkCheckTimeout: 5000, // 5秒网络检查超时
  progressPollInterval: 1000, // 1秒进度轮询间隔
};
