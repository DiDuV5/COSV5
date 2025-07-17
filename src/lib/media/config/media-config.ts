/**
 * @fileoverview 媒体系统配置管理
 * @description 统一管理媒体上传、存储、处理的配置参数
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { getMediaConfig, updateMediaConfig } from './media-config'
 * const config = getMediaConfig()
 * console.log(config.upload.maxFileSize)
 *
 * @dependencies
 * - 无外部依赖，纯配置模块
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，支持上传、存储、处理配置
 */

import { getEnvWithFallback, getNumberEnv, getBooleanEnv } from '@/lib/config/env-compatibility';

/**
 * 上传配置接口
 */
export interface UploadConfig {
  /** 最大文件大小 (字节) */
  maxFileSize: number;
  /** 最大并发上传数 */
  maxConcurrentUploads: number;
  /** 允许的MIME类型 */
  allowedMimeTypes: string[];
  /** 分片大小 (字节) */
  chunkSize: number;
  /** 上传超时时间 (毫秒) */
  uploadTimeout: number;
  /** 重试次数 */
  retryAttempts: number;
  /** 重试延迟 (毫秒) */
  retryDelay: number;
}

/**
 * 存储配置接口
 */
export interface StorageConfig {
  /** 主存储提供商 */
  primary: string;
  /** 备用存储提供商列表 */
  fallback: string[];
  /** 健康检查间隔 (毫秒) */
  healthCheckInterval: number;
  /** 故障转移阈值 */
  failoverThreshold: number;
  /** 自动清理间隔 (毫秒) */
  cleanupInterval: number;
}

/**
 * 处理配置接口
 */
export interface ProcessingConfig {
  /** 最大并发处理任务数 */
  maxConcurrentJobs: number;
  /** 临时目录路径 */
  tempDirectory: string;
  /** 清理间隔 (毫秒) */
  cleanupInterval: number;
  /** 处理超时时间 (毫秒) */
  processingTimeout: number;
  /** 队列最大长度 */
  maxQueueLength: number;
}

/**
 * 视频转码配置接口
 */
export interface VideoConfig {
  /** 默认编码器 */
  defaultCodec: string;
  /** 质量参数 (CRF) */
  qualityCrf: number;
  /** 预设 */
  preset: string;
  /** 最大分辨率 */
  maxResolution: {
    width: number;
    height: number;
  };
  /** 音频比特率 */
  audioBitrate: string;
  /** 是否强制转码 */
  forceTranscode: boolean;
}

/**
 * 图片处理配置接口
 */
export interface ImageConfig {
  /** 支持的尺寸 */
  sizes: Array<{
    name: string;
    width: number;
    height?: number;
    quality: number;
  }>;
  /** 默认格式 */
  defaultFormat: 'webp' | 'jpeg' | 'png';
  /** 是否保留原图 */
  keepOriginal: boolean;
  /** 压缩质量 */
  compressionQuality: number;
}

/**
 * 监控配置接口
 */
export interface MonitoringConfig {
  /** 是否启用监控 */
  enabled: boolean;
  /** 指标收集间隔 (毫秒) */
  metricsInterval: number;
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 是否启用性能追踪 */
  enablePerformanceTracking: boolean;
}

/**
 * 完整媒体配置接口
 */
export interface MediaConfig {
  upload: UploadConfig;
  storage: StorageConfig;
  processing: ProcessingConfig;
  video: VideoConfig;
  image: ImageConfig;
  monitoring: MonitoringConfig;
}

/**
 * 默认媒体配置
 */
export const defaultMediaConfig: MediaConfig = {
  upload: {
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB - 与管理后台一致
    maxConcurrentUploads: 5,
    allowedMimeTypes: [
      // 图片格式
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      // 视频格式
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo', // AVI
      'video/x-ms-wmv',  // WMV
      'video/3gpp',      // 3GP
      'video/x-flv',     // FLV
      'video/x-matroska' // MKV
    ],
    chunkSize: 5 * 1024 * 1024, // 5MB
    uploadTimeout: 300000, // 5分钟
    retryAttempts: 3,
    retryDelay: 1000 // 1秒
  },

  storage: {
    primary: 'cloudflare-r2',
    fallback: ['local'],
    healthCheckInterval: 300000, // 5分钟
    failoverThreshold: 3, // 连续3次失败后切换
    cleanupInterval: 3600000 // 1小时
  },

  processing: {
    maxConcurrentJobs: getNumberEnv('COSEREEDEN_MEDIA_MAX_CONCURRENT_JOBS', 2),
    tempDirectory: getEnvWithFallback('COSEREEDEN_TEMP_DIR', '/tmp/media-processing'),
    cleanupInterval: getNumberEnv('COSEREEDEN_MEDIA_CLEANUP_INTERVAL', 3600000), // 1小时
    processingTimeout: getNumberEnv('COSEREEDEN_MEDIA_PROCESSING_TIMEOUT', 1800000), // 30分钟
    maxQueueLength: getNumberEnv('COSEREEDEN_MEDIA_MAX_QUEUE_LENGTH', 100)
  },

  video: {
    defaultCodec: getEnvWithFallback('COSEREEDEN_VIDEO_DEFAULT_CODEC', 'libx264'),
    qualityCrf: getNumberEnv('COSEREEDEN_VIDEO_QUALITY_CRF', 23),
    preset: getEnvWithFallback('COSEREEDEN_VIDEO_PRESET', 'medium'),
    maxResolution: {
      width: getNumberEnv('COSEREEDEN_VIDEO_MAX_WIDTH', 1920),
      height: getNumberEnv('COSEREEDEN_VIDEO_MAX_HEIGHT', 1080)
    },
    audioBitrate: getEnvWithFallback('COSEREEDEN_VIDEO_AUDIO_BITRATE', '128k'),
    forceTranscode: getBooleanEnv('COSEREEDEN_VIDEO_FORCE_TRANSCODE', true) // 强制转码以确保Web兼容性
  },

  image: {
    sizes: [
      { name: 'thumbnail', width: getNumberEnv('COSEREEDEN_IMAGE_THUMBNAIL_WIDTH', 150), height: getNumberEnv('COSEREEDEN_IMAGE_THUMBNAIL_HEIGHT', 150), quality: getNumberEnv('COSEREEDEN_IMAGE_THUMBNAIL_QUALITY', 80) },
      { name: 'small', width: getNumberEnv('COSEREEDEN_IMAGE_SMALL_WIDTH', 400), quality: getNumberEnv('COSEREEDEN_IMAGE_SMALL_QUALITY', 85) },
      { name: 'medium', width: getNumberEnv('COSEREEDEN_IMAGE_MEDIUM_WIDTH', 800), quality: getNumberEnv('COSEREEDEN_IMAGE_MEDIUM_QUALITY', 90) },
      { name: 'large', width: getNumberEnv('COSEREEDEN_IMAGE_LARGE_WIDTH', 1920), quality: getNumberEnv('COSEREEDEN_IMAGE_LARGE_QUALITY', 95) }
    ],
    defaultFormat: getEnvWithFallback('COSEREEDEN_IMAGE_DEFAULT_FORMAT', 'webp') as 'webp' | 'jpeg' | 'png',
    keepOriginal: getBooleanEnv('COSEREEDEN_IMAGE_KEEP_ORIGINAL', true),
    compressionQuality: getNumberEnv('COSEREEDEN_IMAGE_COMPRESSION_QUALITY', 85)
  },

  monitoring: {
    enabled: getBooleanEnv('COSEREEDEN_MEDIA_MONITORING_ENABLED', true),
    metricsInterval: getNumberEnv('COSEREEDEN_MEDIA_METRICS_INTERVAL', 60000), // 1分钟
    logLevel: getEnvWithFallback('COSEREEDEN_MEDIA_LOG_LEVEL', getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development') === 'production' ? 'info' : 'debug') as 'debug' | 'info' | 'warn' | 'error',
    enablePerformanceTracking: getBooleanEnv('COSEREEDEN_MEDIA_ENABLE_PERFORMANCE_TRACKING', true)
  }
};

/**
 * 当前媒体配置 (可在运行时修改)
 */
let currentMediaConfig: MediaConfig = { ...defaultMediaConfig };

/**
 * 获取当前媒体配置
 */
export function getMediaConfig(): MediaConfig {
  return currentMediaConfig;
}

/**
 * 更新媒体配置
 */
export function updateMediaConfig(updates: Partial<MediaConfig>): void {
  currentMediaConfig = {
    ...currentMediaConfig,
    ...updates,
    // 深度合并嵌套对象
    upload: { ...currentMediaConfig.upload, ...updates.upload },
    storage: { ...currentMediaConfig.storage, ...updates.storage },
    processing: { ...currentMediaConfig.processing, ...updates.processing },
    video: { ...currentMediaConfig.video, ...updates.video },
    image: { ...currentMediaConfig.image, ...updates.image },
    monitoring: { ...currentMediaConfig.monitoring, ...updates.monitoring }
  };
}

/**
 * 重置为默认配置
 */
export function resetMediaConfig(): void {
  currentMediaConfig = { ...defaultMediaConfig };
}

/**
 * 从环境变量加载配置
 */
export function loadConfigFromEnv(): void {
  const envConfig: Partial<MediaConfig> = {};

  // 上传配置
  if (process.env.COSEREEDEN_MEDIA_MAX_FILE_SIZE) {
    envConfig.upload = {
      ...currentMediaConfig.upload,
      maxFileSize: parseInt(process.env.COSEREEDEN_MEDIA_MAX_FILE_SIZE)
    };
  }

  if (process.env.COSEREEDEN_MEDIA_MAX_CONCURRENT_UPLOADS) {
    envConfig.upload = {
      ...envConfig.upload,
      ...currentMediaConfig.upload,
      maxConcurrentUploads: parseInt(process.env.COSEREEDEN_MEDIA_MAX_CONCURRENT_UPLOADS)
    };
  }

  // 存储配置
  if (process.env.COSEREEDEN_MEDIA_PRIMARY_STORAGE) {
    envConfig.storage = {
      ...currentMediaConfig.storage,
      primary: process.env.COSEREEDEN_MEDIA_PRIMARY_STORAGE
    };
  }

  // 处理配置
  if (process.env.COSEREEDEN_MEDIA_MAX_CONCURRENT_JOBS) {
    envConfig.processing = {
      ...currentMediaConfig.processing,
      maxConcurrentJobs: parseInt(process.env.COSEREEDEN_MEDIA_MAX_CONCURRENT_JOBS)
    };
  }

  // 视频配置
  if (process.env.COSEREEDEN_MEDIA_VIDEO_CRF) {
    envConfig.video = {
      ...currentMediaConfig.video,
      qualityCrf: parseInt(process.env.COSEREEDEN_MEDIA_VIDEO_CRF)
    };
  }

  // 应用环境变量配置
  if (Object.keys(envConfig).length > 0) {
    updateMediaConfig(envConfig);
  }
}

/**
 * 验证配置有效性
 */
export function validateMediaConfig(config: MediaConfig): string[] {
  const errors: string[] = [];

  // 验证上传配置
  if (config.upload.maxFileSize <= 0) {
    errors.push('upload.maxFileSize must be greater than 0');
  }

  if (config.upload.maxConcurrentUploads <= 0) {
    errors.push('upload.maxConcurrentUploads must be greater than 0');
  }

  if (config.upload.chunkSize <= 0) {
    errors.push('upload.chunkSize must be greater than 0');
  }

  // 验证存储配置
  if (!config.storage.primary) {
    errors.push('storage.primary is required');
  }

  if (config.storage.healthCheckInterval <= 0) {
    errors.push('storage.healthCheckInterval must be greater than 0');
  }

  // 验证处理配置
  if (config.processing.maxConcurrentJobs <= 0) {
    errors.push('processing.maxConcurrentJobs must be greater than 0');
  }

  // 验证视频配置
  if (config.video.qualityCrf < 0 || config.video.qualityCrf > 51) {
    errors.push('video.qualityCrf must be between 0 and 51');
  }

  return errors;
}

// 启动时加载环境变量配置
loadConfigFromEnv();
