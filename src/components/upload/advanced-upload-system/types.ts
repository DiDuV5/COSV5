/**
 * @fileoverview 高级上传系统类型定义
 * @description 定义高级上传系统相关的类型和接口
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 上传策略类型
 */
export type UploadStrategy = 'direct' | 'chunked' | 'streaming' | 'hybrid';

/**
 * 上传文件项
 */
export interface AdvancedUploadFile {
  id: string;
  file: File;
  strategy: UploadStrategy;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed: number; // 字节/秒
  eta: number; // 预计剩余时间(秒)
  retryCount: number;
  chunks?: {
    total: number;
    completed: number;
    failed: number;
  };
  error?: string;
  result?: any;
  mediaId?: string; // 上传成功后的媒体ID，用于发布时关联
  uploadResult?: any; // 完整的上传结果
}

/**
 * 高级上传配置
 */
export interface AdvancedUploadConfig {
  /** 最大文件数量 */
  maxFiles: number;
  /** 最大文件大小 */
  maxFileSize: number;
  /** 允许的文件类型 */
  allowedTypes: string[];
  /** 最大并发上传数 */
  maxConcurrent: number;
  /** 分片大小 */
  chunkSize: number;
  /** 自动选择策略 */
  autoStrategy: boolean;
  /** 启用断点续传 */
  enableResume: boolean;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 组件属性
 */
export interface AdvancedUploadSystemProps {
  onUploadComplete?: (files: any[]) => void;
  onUploadError?: (errors: Array<{ filename: string; error: string }>) => void;
  config?: Partial<AdvancedUploadConfig>;
  className?: string;
  initialFiles?: File[];
}

/**
 * 上传统计信息
 */
export interface UploadStats {
  completed: number;
  uploading: number;
  pending: number;
  failed: number;
  total: number;
}

/**
 * 文件进度项属性
 */
export interface FileProgressItemProps {
  file: AdvancedUploadFile;
  onRemove: () => void;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  getStrategyName: (strategy: UploadStrategy) => string;
  getStrategyColor: (strategy: UploadStrategy) => string;
  formatFileSize: (bytes: number) => string;
  formatSpeed: (bytesPerSecond: number) => string;
  formatTime: (seconds: number) => string;
}

/**
 * 高级设置面板属性
 */
export interface AdvancedSettingsPanelProps {
  config: AdvancedUploadConfig;
  onConfigChange: (config: Partial<AdvancedUploadConfig>) => void;
}
