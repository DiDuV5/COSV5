/**
 * @fileoverview 上传系统核心接口定义
 * @description CoserEden上传系统的核心接口和类型定义
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import { UploadType, ProcessingStatus, UploadStrategy, UploadPriority } from './base-types';

/**
 * 统一上传请求接口
 */
export interface UnifiedUploadRequest {
  // 基本文件信息
  filename: string;
  buffer: Buffer;
  mimeType: string;
  uploadType?: UploadType;

  // 用户信息
  userId: string;
  userLevel: UserLevel;
  postId?: string;

  // 处理选项
  enableDeduplication?: boolean;
  generateThumbnails?: boolean;
  autoTranscodeVideo?: boolean;

  // 图片处理选项
  imageQuality?: number;
  maxWidth?: number;
  maxHeight?: number;
  generateMultipleSizes?: boolean;

  // 视频处理选项
  targetCodec?: string;
  targetQuality?: string;
  maxDuration?: number;

  // 高级选项
  customMetadata?: Record<string, any>;
  priority?: UploadPriority;
  sessionId?: string;
  replaceExisting?: boolean;
  enableStreaming?: boolean;

  // 存储选项
  storageProvider?: string;
  pathPrefix?: string;
  publicAccess?: boolean;
}

/**
 * 统一上传结果接口
 */
export interface UnifiedUploadResult {
  // 基本结果
  success: boolean;
  fileId: string;
  url: string;
  cdnUrl?: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  originalSize?: number; // 原始文件大小
  processedSize?: number; // 处理后文件大小

  // 处理状态
  isProcessed: boolean;
  processingStatus: ProcessingStatus;
  processingMessage?: string;

  // 媒体信息
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  codec?: string;

  // 存储信息
  storageKey: string;
  storageProvider: string;
  storagePath: string;

  // 缩略图信息
  thumbnailUrl?: string;
  thumbnailSizes?: Array<{
    size: string;
    url: string;
    width: number;
    height: number;
  }>;

  // 元数据
  metadata?: Record<string, any>;
  fileHash?: string;
  uploadStrategy?: UploadStrategy;

  // 压缩相关信息
  compressionApplied?: boolean;
  compressionRatio?: number;

  // 时间信息
  createdAt: Date;
  updatedAt?: Date;
  processedAt?: Date;
}

/**
 * 文件分析结果接口
 */
export interface FileAnalysis {
  // 基本信息
  filename: string;
  mimeType: string;
  size: number;
  uploadType: UploadType;

  // 安全检查
  isSafe: boolean;
  securityIssues: string[];

  // 处理需求
  needsProcessing: boolean;
  processingRequirements: string[];

  // 推荐策略
  recommendedStrategy: UploadStrategy;
  strategyReason: string;

  // 估算信息
  estimatedProcessingTime: number;
  estimatedStorageSize: number;
}

/**
 * 系统状态接口
 */
export interface SystemStatus {
  // 内存状态
  memoryUsage: number; // 0-1
  availableMemory: number; // bytes

  // 存储状态
  storageUsage: number; // 0-1
  availableStorage: number; // bytes

  // 网络状态
  networkLatency: number; // ms
  bandwidth: number; // bytes/second

  // 队列状态
  activeUploads: number;
  queuedUploads: number;

  // 服务状态
  isHealthy: boolean;
  lastHealthCheck: Date;
}

/**
 * 文件验证结果接口
 */
export interface FileValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 检测到的上传类型 */
  uploadType: UploadType;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
}

/**
 * 安全验证结果接口
 */
export interface SecurityValidationResult {
  /** 是否安全 */
  isSecure: boolean;
  /** 威胁列表 */
  threats: string[];
  /** 警告列表 */
  warnings: string[];
}

/**
 * 网络状态接口
 */
export interface NetworkStatus {
  isOnline: boolean;
  latency?: number;
  timestamp: number;
}
