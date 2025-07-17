/**
 * @fileoverview 统一上传类型定义
 * @description 项目中所有上传相关的统一类型定义，避免重复和冲突
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

import { UserLevel } from './user-level';

/**
 * 上传策略类型
 */
export type UploadStrategy = 'DIRECT' | 'ASYNC' | 'CHUNKED' | 'STREAMING' | 'HYBRID';

/**
 * 上传状态类型
 */
export type UploadStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * 媒体类型
 */
export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'OTHER';

/**
 * 统一上传请求接口
 */
export interface UploadRequest {
  // 文件数据 (三选一)
  buffer?: Buffer;
  fileData?: string; // base64编码
  file?: File; // FormData文件

  // 文件信息 (必需)
  filename: string;
  mimeType: string;
  fileSize?: number;

  // 用户信息 (必需)
  userId: string;
  userLevel: UserLevel;

  // 可选参数
  postId?: string;
  metadata?: Record<string, unknown>;

  // 处理选项
  enableDeduplication?: boolean;
  generateThumbnails?: boolean;
  autoTranscodeVideo?: boolean;
  imageQuality?: number;
  maxWidth?: number;
  maxHeight?: number;
  replaceExisting?: boolean;
  customMetadata?: Record<string, unknown>;

  // 分片上传选项
  isChunked?: boolean;
  sessionId?: string;
  chunkIndex?: number;
  totalChunks?: number;

  // 强制策略
  forceStrategy?: UploadStrategy;
}

/**
 * 统一上传结果接口
 */
export interface UploadResult {
  success: boolean;
  error?: string;

  // 文件信息
  file?: {
    id: string;
    filename: string;
    originalName: string;
    url: string;
    cdnUrl?: string;
    thumbnailUrl?: string;
    mediaType: string;
    fileSize: number;
    width?: number;
    height?: number;
    duration?: number;
    isDuplicate?: boolean;
    fileHash?: string;
  };

  // 分片上传信息
  sessionInfo?: {
    sessionId: string;
    chunkIndex: number;
    totalChunks: number;
    uploadedChunks: number;
    progress: number;
  };

  // 安全验证信息
  securityInfo?: {
    isValid: boolean;
    isSafe: boolean;
    confidence: number;
    warnings: string[];
  };

  // 完整性验证信息
  integrityInfo?: {
    fileHash: string;
    verified: boolean;
    algorithm: string;
  };
}

/**
 * tRPC上传参数接口
 */
export interface TRPCUploadParams {
  fileData: string; // base64编码的文件数据
  filename: string;
  userId: string;
  postId?: string;
  enableDeduplication?: boolean;
  generateThumbnails?: boolean;
  autoTranscodeVideo?: boolean;
  imageQuality?: number;
  maxWidth?: number;
  maxHeight?: number;
  replaceExisting?: boolean;
  customMetadata?: Record<string, unknown>;
}

/**
 * REST API上传参数接口
 */
export interface RESTUploadParams {
  files: File[];
  userId: string;
  userLevel: UserLevel;
  postId?: string;
  enableDeduplication?: boolean;
  generateThumbnails?: boolean;
  imageQuality?: number;
}

/**
 * 混合上传选项接口
 */
export interface HybridUploadOptions {
  /** 用户ID */
  userId?: string;
  /** 用户等级 */
  userLevel?: UserLevel;
  /** 帖子ID */
  postId?: string;
  /** 自定义元数据 */
  metadata?: Record<string, unknown>;
  /** 是否生成缩略图 */
  generateThumbnails?: boolean;
  /** 图片质量 */
  imageQuality?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** 强制策略 */
  forceStrategy?: UploadStrategy;
}

/**
 * 混合上传结果接口
 */
export interface HybridUploadResult {
  /** 是否成功 */
  success: boolean;
  /** 文件ID */
  fileId: string;
  /** 使用的策略 */
  strategy: UploadStrategy;
  /** 当前状态 */
  status: UploadStatus;
  /** 文件URL */
  url?: string;
  /** CDN URL */
  cdnUrl?: string;
  /** 文件信息 */
  fileInfo: {
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    mediaType: MediaType;
    isTranscoded?: boolean;
    videoCodec?: string;
    fileHash?: string;
  };
  /** 错误信息 */
  error?: string;
  /** 处理时间 */
  processingTime?: number;
}

/**
 * 批量上传结果接口
 */
export interface BatchUploadResult {
  results: UploadResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * 上传进度信息
 */
export interface UploadProgress {
  sessionId: string;
  filename: string;
  progress: number; // 0-100
  status: UploadStatus;
  uploadedBytes: number;
  totalBytes: number;
  speed?: number; // bytes per second
  eta?: number; // estimated time remaining in seconds
  error?: string;
}

/**
 * 上传会话信息
 */
export interface UploadSession {
  sessionId: string;
  userId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  strategy: UploadStrategy;
  status: UploadStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  chunks?: {
    total: number;
    uploaded: number;
    failed: number;
  };
}

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  isValid: boolean;
  isSafe: boolean;
  errors: string[];
  warnings: string[];
  confidence: number;
  fileType: string;
  actualMimeType: string;
}

/**
 * 用户上传统计
 */
export interface UserUploadStats {
  userId: string;
  totalUploads: number;
  totalSize: number;
  successfulUploads: number;
  failedUploads: number;
  averageFileSize: number;
  lastUploadAt?: Date;
  quotaUsed: number;
  quotaLimit: number;
}
