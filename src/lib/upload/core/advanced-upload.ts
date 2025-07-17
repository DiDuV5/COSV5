/**
 * @fileoverview 上传系统高级功能类型定义
 * @description CoserEden上传系统的高级上传功能相关类型
 * @author Augment AI
 * @date 2025-01-05
 * @version 1.0.0
 */

/**
 * 处理后的图片信息
 */
export interface ProcessedImage {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * 视频缩略图信息
 */
export interface VideoThumbnail {
  url: string;
  timestamp: number;
  width: number;
  height: number;
}

/**
 * 高级上传进度信息
 */
export interface AdvancedUploadProgress {
  fileId: string;
  fileName: string;
  filename: string; // 兼容性别名
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'transcoding';
  error?: string;
  statusText?: string;
  speed?: number;
  remainingTime?: number;
}

/**
 * 高级上传选项
 */
export interface AdvancedUploadOptions {
  maxFileSize?: number;
  allowedTypes?: string[];
  generateThumbnails?: boolean;
  processImages?: boolean;
  postId?: string;
  metadata?: Record<string, any>;
  onProgress?: (progress: AdvancedUploadProgress) => void;
  onFileProgress?: (fileName: string, progress: number) => void;
  onFileComplete?: (fileName: string, result: AdvancedUploadResult) => void;
  onFileError?: (fileName: string, error: string) => void;
  onError?: (error: string, fileName?: string) => void;
}

/**
 * 高级上传结果
 */
export interface AdvancedUploadResult {
  success: boolean;
  fileId?: string;
  url?: string;
  thumbnails?: VideoThumbnail[];
  processedImages?: ProcessedImage[];
  error?: string;
}

/**
 * 上传状态
 */
export interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  uploadResults: AdvancedUploadResult[];
  uploadErrors: string[];
  fileProgresses: AdvancedUploadProgress[];
  transcodingSessions: Set<string>;
}

/**
 * 上传状态操作
 */
export interface UploadStateActions {
  setIsUploading: (isUploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setUploadResults: (results: AdvancedUploadResult[]) => void;
  setUploadErrors: (errors: string[]) => void;
  setFileProgresses: (progresses: AdvancedUploadProgress[]) => void;
  setTranscodingSessions: (sessions: Set<string>) => void;
  updateFileProgress: (filename: string, update: Partial<AdvancedUploadProgress>) => void;
  addUploadResult: (result: AdvancedUploadResult) => void;
  addUploadError: (error: string) => void;
  resetUploadState: () => void;
}

/**
 * 转码会话信息
 */
export interface TranscodingSession {
  sessionId: string;
  filename: string;
  stage: string;
  progress: number;
  startTime: Date;
  lastUpdate: Date;
  originalSize: number;
  totalDuration: number;
  isCompleted?: boolean;
  error?: string;
}
