/**
 * @fileoverview 上传系统常量定义 - CoserEden平台
 * @description 定义上传系统中使用的所有常量，避免硬编码
 * @author Augment AI
 * @date 2025-06-21
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { FILE_SIZE, CHUNK_CONFIG, PERMISSION_LIMITS } from '@/lib/upload/upload-constants';
 * 
 * const maxSize = FILE_SIZE.LARGE_FILE_THRESHOLD;
 * const chunkSize = CHUNK_CONFIG.DEFAULT_CHUNK_SIZE;
 * const userLimits = PERMISSION_LIMITS.CREATOR;
 *
 * @dependencies
 * - 无外部依赖，纯常量定义
 *
 * @changelog
 * - 2025-06-21: 基于重构参考创建，适配CoserEden项目
 */

/**
 * 文件大小常量 (字节)
 */
export const FILE_SIZE = {
  /** 1KB */
  KB: 1024,
  /** 1MB */
  MB: 1024 * 1024,
  /** 1GB */
  GB: 1024 * 1024 * 1024,
  /** 最大文件大小 (1GB) */
  MAX_FILE_SIZE: 1000 * 1024 * 1024,
  /** 小文件阈值 (50MB) - 混合上传策略分界线 */
  SMALL_FILE_THRESHOLD: 50 * 1024 * 1024,
  /** 大文件阈值 (500MB) */
  LARGE_FILE_THRESHOLD: 500 * 1024 * 1024,
  /** 流式传输阈值 (100MB) */
  STREAMING_THRESHOLD: 100 * 1024 * 1024,
} as const;

/**
 * 分片上传配置
 */
export const CHUNK_CONFIG = {
  /** 默认分片大小 (5MB) */
  DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024,
  /** 最小分片大小 (1MB) */
  MIN_CHUNK_SIZE: 1024 * 1024,
  /** 最大分片大小 (10MB) */
  MAX_CHUNK_SIZE: 10 * 1024 * 1024,
  /** 最大并发上传数 */
  MAX_CONCURRENT_UPLOADS: 3,
  /** 重试次数 */
  MAX_RETRY_ATTEMPTS: 3,
  /** 重试延迟 (毫秒) */
  RETRY_DELAY: 1000,
} as const;

/**
 * 支持的文件类型 - CoserEden专业cosplay平台
 */
export const SUPPORTED_FILE_TYPES = {
  /** 图像文件 */
  IMAGES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/avif',
    'image/heic',
  ],
  /** 视频文件 - 强制H.264编码验证 */
  VIDEOS: [
    'video/mp4',    // 主要支持，H.264编码
    'video/webm',   // 次要支持
    'video/avi',    // 需要转码
    'video/mov',    // 需要转码
    'video/mkv',    // 需要转码
    'video/flv',    // 需要转码
    'video/wmv',    // 需要转码
    'video/m4v',    // 需要转码
  ],
  /** 音频文件 */
  AUDIO: [
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/m4a',
  ],
} as const;

/**
 * 用户权限级别常量 - CoserEden 6级权限体系
 */
export const USER_LEVELS = {
  /** 访客 */
  GUEST: 'GUEST',
  /** 普通用户 */
  USER: 'USER',
  /** VIP用户 */
  VIP: 'VIP',
  /** 创作者 */
  CREATOR: 'CREATOR',
  /** 管理员 */
  ADMIN: 'ADMIN',
  /** 超级管理员 */
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

/**
 * 权限配置常量 - 基于CoserEden 4600+专业cosplay创作者需求
 */
export const PERMISSION_LIMITS = {
  [USER_LEVELS.GUEST]: {
    maxFileSize: 0,
    maxFilesPerUpload: 0,
    maxDailyUploads: 0,
    allowedTypes: [],
    enableChunkedUpload: false,
    enableResumableUpload: false,
    enableHybridStrategy: false,
  },
  [USER_LEVELS.USER]: {
    maxFileSize: 10 * FILE_SIZE.MB,
    maxFilesPerUpload: 5,
    maxDailyUploads: 10,
    allowedTypes: [...SUPPORTED_FILE_TYPES.IMAGES],
    enableChunkedUpload: false,
    enableResumableUpload: false,
    enableHybridStrategy: false,
  },
  [USER_LEVELS.VIP]: {
    maxFileSize: 50 * FILE_SIZE.MB,
    maxFilesPerUpload: 20,
    maxDailyUploads: 50,
    allowedTypes: [...SUPPORTED_FILE_TYPES.IMAGES, ...SUPPORTED_FILE_TYPES.VIDEOS],
    enableChunkedUpload: true,
    enableResumableUpload: false,
    enableHybridStrategy: true,
  },
  [USER_LEVELS.CREATOR]: {
    maxFileSize: 500 * FILE_SIZE.MB,
    maxFilesPerUpload: 100,
    maxDailyUploads: 200,
    allowedTypes: [
      ...SUPPORTED_FILE_TYPES.IMAGES,
      ...SUPPORTED_FILE_TYPES.VIDEOS,
      ...SUPPORTED_FILE_TYPES.AUDIO,
    ],
    enableChunkedUpload: true,
    enableResumableUpload: true,
    enableHybridStrategy: true,
  },
  [USER_LEVELS.ADMIN]: {
    maxFileSize: FILE_SIZE.GB,
    maxFilesPerUpload: 500,
    maxDailyUploads: 500,
    allowedTypes: [
      ...SUPPORTED_FILE_TYPES.IMAGES,
      ...SUPPORTED_FILE_TYPES.VIDEOS,
      ...SUPPORTED_FILE_TYPES.AUDIO,
    ],
    enableChunkedUpload: true,
    enableResumableUpload: true,
    enableHybridStrategy: true,
  },
  [USER_LEVELS.SUPER_ADMIN]: {
    maxFileSize: -1, // 无限制
    maxFilesPerUpload: -1, // 无限制
    maxDailyUploads: -1, // 无限制
    allowedTypes: [
      ...SUPPORTED_FILE_TYPES.IMAGES,
      ...SUPPORTED_FILE_TYPES.VIDEOS,
      ...SUPPORTED_FILE_TYPES.AUDIO,
    ],
    enableChunkedUpload: true,
    enableResumableUpload: true,
    enableHybridStrategy: true,
  },
} as const;

/**
 * 上传状态常量
 */
export const UPLOAD_STATUS = {
  /** 等待中 */
  PENDING: 'pending',
  /** 上传中 */
  UPLOADING: 'uploading',
  /** 处理中 */
  PROCESSING: 'processing',
  /** 完成 */
  COMPLETED: 'completed',
  /** 失败 */
  FAILED: 'failed',
  /** 已取消 */
  CANCELLED: 'cancelled',
} as const;

/**
 * 错误代码常量
 */
export const ERROR_CODES = {
  /** 文件过大 */
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  /** 文件类型不支持 */
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  /** 权限不足 */
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  /** 存储空间不足 */
  STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
  /** 网络错误 */
  NETWORK_ERROR: 'NETWORK_ERROR',
  /** 服务器错误 */
  SERVER_ERROR: 'SERVER_ERROR',
  /** 文件损坏 */
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  /** 上传超时 */
  UPLOAD_TIMEOUT: 'UPLOAD_TIMEOUT',
  /** 视频编码无效 */
  VIDEO_ENCODING_INVALID: 'VIDEO_ENCODING_INVALID',
} as const;

/**
 * 存储路径常量
 */
export const STORAGE_PATHS = {
  /** 临时文件路径 */
  TEMP: 'temp',
  /** 上传文件路径 */
  UPLOADS: 'uploads',
  /** 图像文件路径 */
  IMAGES: 'uploads/images',
  /** 视频文件路径 */
  VIDEOS: 'uploads/videos',
  /** 音频文件路径 */
  AUDIO: 'uploads/audio',
  /** 缩略图路径 */
  THUMBNAILS: 'uploads/thumbnails',
  /** 头像路径 */
  AVATARS: 'uploads/avatars',
} as const;

/**
 * 视频处理常量 - 强制H.264编码
 */
export const VIDEO_PROCESSING = {
  /** 强制编码器 - H.264 */
  REQUIRED_CODEC: 'h264',
  /** 默认质量 */
  DEFAULT_QUALITY: 23,
  /** 最大分辨率 */
  MAX_RESOLUTION: '1920x1080',
  /** 默认帧率 */
  DEFAULT_FRAMERATE: 30,
  /** 支持的输出格式 */
  OUTPUT_FORMATS: ['mp4'],
  /** 浏览器兼容编码 */
  BROWSER_COMPATIBLE_CODECS: ['h264', 'avc1'],
} as const;

/**
 * API限制常量
 */
export const API_LIMITS = {
  /** 每分钟最大请求数 */
  REQUESTS_PER_MINUTE: 60,
  /** 每小时最大上传数 */
  UPLOADS_PER_HOUR: 100,
  /** 每天最大上传数 */
  UPLOADS_PER_DAY: 500,
  /** 并发上传限制 */
  CONCURRENT_UPLOADS: 5,
} as const;
