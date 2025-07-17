/**
 * @fileoverview 统一上传Hook类型定义
 * @description 定义上传Hook相关的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

// 定义用户友好错误类型
export interface UserFriendlyError {
  userMessage: string;
  technicalDetails: string;
  canRetry: boolean;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  errorCode: string;
}

// 定义进度阶段类型
export type ProgressStage =
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

// 定义详细进度类型
export interface DetailedProgress {
  bytesUploaded: number;
  totalBytes: number;
  uploadSpeed: number;
  estimatedTimeRemaining: number;
  stage: ProgressStage;
  stageProgress: number;
}

/**
 * 上传文件接口
 */
export interface UploadFile {
  file: File;
  sessionId: string;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  };
  options?: {
    generateThumbnails?: boolean;
    autoTranscode?: boolean;
    imageQuality?: number;
    maxWidth?: number;
    maxHeight?: number;
    priority?: 'low' | 'normal' | 'high';
  };
}

/**
 * 上传状态接口
 */
export interface UploadState {
  // 基础状态
  isUploading: boolean;
  isCompleted: boolean;
  hasError: boolean;

  // 进度信息
  progress: number;
  stage: ProgressStage;
  statusMessage: string;
  detailMessage: string;

  // 详细进度
  detailedProgress?: DetailedProgress;

  // 错误信息
  error?: UserFriendlyError;

  // 结果信息
  result?: {
    fileId: string;
    url: string;
    thumbnailUrl?: string;
    metadata: Record<string, any>;
  };

  // 时间信息
  startTime?: number;
  endTime?: number;

  // 重试信息
  retryCount: number;
  canRetry: boolean;

  // 文件信息
  fileName: string;
  fileSize: number;
  fileType: string;
}

/**
 * 统一上传Hook返回值
 */
export interface UseUnifiedUploadReturn {
  // 上传方法
  uploadFile: (file: UploadFile) => Promise<void>;
  uploadFiles: (files: UploadFile[]) => Promise<void>;

  // 控制方法
  cancelUpload: (sessionId: string) => Promise<void>;
  cancelAllUploads: () => Promise<void>;
  retryUpload: (sessionId: string) => Promise<void>;

  // 状态获取
  getUploadState: (sessionId: string) => UploadState | undefined;
  getAllUploadStates: () => Record<string, UploadState>;

  // 全局状态
  globalState: {
    isAnyUploading: boolean;
    totalUploads: number;
    completedUploads: number;
    failedUploads: number;
    overallProgress: number;
    health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  };
}

/**
 * 统一上传Hook配置
 */
export interface UseUnifiedUploadConfig {
  // 自动重试配置
  enableAutoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;

  // 进度更新配置
  progressUpdateInterval?: number;
  enableDetailedProgress?: boolean;

  // 错误处理配置
  enableUserFriendlyErrors?: boolean;
  showErrorNotifications?: boolean;

  // 性能配置
  maxConcurrentUploads?: number;
  enableProgressOptimization?: boolean;
}

/**
 * 上传进度更新事件
 */
export interface UploadProgressEvent {
  sessionId: string;
  progress: number;
  stage: ProgressStage;
  message: string;
  detailedProgress?: DetailedProgress;
}

/**
 * 上传完成事件
 */
export interface UploadCompleteEvent {
  sessionId: string;
  success: boolean;
  result?: {
    fileId: string;
    url: string;
    thumbnailUrl?: string;
    metadata: Record<string, any>;
  };
  error?: UserFriendlyError;
  duration: number;
}

/**
 * 上传错误事件
 */
export interface UploadErrorEvent {
  sessionId: string;
  error: UserFriendlyError;
  canRetry: boolean;
  retryCount: number;
}

/**
 * 批量上传状态
 */
export interface BatchUploadState {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  overallProgress: number;
  isCompleted: boolean;
  hasErrors: boolean;
  startTime: number;
  endTime?: number;
}

/**
 * 上传统计信息
 */
export interface UploadStatistics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalBytesUploaded: number;
  averageUploadTime: number;
  successRate: number;
}

/**
 * 上传健康状态
 */
export interface UploadHealthStatus {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  activeUploads: number;
  queuedUploads: number;
  failureRate: number;
  averageResponseTime: number;
  lastFailureTime?: number;
  issues: string[];
}

/**
 * 上传会话信息
 */
export interface UploadSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  startTime: number;
  endTime?: number;
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: UserFriendlyError;
  result?: any;
}

/**
 * 上传队列项
 */
export interface UploadQueueItem {
  uploadFile: UploadFile;
  priority: number;
  addedAt: number;
  attempts: number;
}

/**
 * 上传性能指标
 */
export interface UploadPerformanceMetrics {
  uploadSpeed: number; // bytes per second
  estimatedTimeRemaining: number; // milliseconds
  networkLatency: number; // milliseconds
  serverProcessingTime: number; // milliseconds
  clientProcessingTime: number; // milliseconds
}

/**
 * 上传配置验证结果
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 上传事件类型
 */
export type UploadEventType =
  | 'upload_started'
  | 'upload_progress'
  | 'upload_completed'
  | 'upload_failed'
  | 'upload_cancelled'
  | 'upload_retried'
  | 'batch_started'
  | 'batch_completed'
  | 'health_changed';

/**
 * 上传事件
 */
export interface UploadEvent {
  type: UploadEventType;
  sessionId?: string;
  timestamp: number;
  data: any;
}

/**
 * 上传回调函数类型
 */
export interface UploadCallbacks {
  onProgress?: (event: UploadProgressEvent) => void;
  onComplete?: (event: UploadCompleteEvent) => void;
  onError?: (event: UploadErrorEvent) => void;
  onCancel?: (sessionId: string) => void;
  onRetry?: (sessionId: string) => void;
  onHealthChange?: (health: UploadHealthStatus) => void;
}

/**
 * 上传选项
 */
export interface UploadOptions {
  // 文件处理选项
  generateThumbnails?: boolean;
  autoTranscode?: boolean;
  imageQuality?: number;
  maxWidth?: number;
  maxHeight?: number;

  // 上传选项
  priority?: 'low' | 'normal' | 'high';
  enableStreaming?: boolean;
  chunkSize?: number;

  // 回调选项
  callbacks?: UploadCallbacks;

  // 元数据选项
  metadata?: Record<string, any>;
  tags?: string[];

  // 安全选项
  enableVirusScan?: boolean;
  enableContentValidation?: boolean;
}

/**
 * 上传结果
 */
export interface UploadResult {
  success: boolean;
  fileId?: string;
  url?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  error?: UserFriendlyError;
  duration: number;
  fileSize: number;
  uploadSpeed: number;
}

/**
 * 批量上传结果
 */
export interface BatchUploadResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: UploadResult[];
  duration: number;
  overallSuccess: boolean;
}
