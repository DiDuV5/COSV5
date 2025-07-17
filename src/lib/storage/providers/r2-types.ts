/**
 * @fileoverview Cloudflare R2 类型定义
 * @description R2存储相关的类型定义和配置
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import type { StorageConfig } from '../object-storage/base-storage-provider';

/**
 * R2特定配置
 */
export interface R2Config extends StorageConfig {
  /** 账户ID */
  accountId?: string;
  /** 自定义域名 */
  customDomain?: string;
  /** 是否使用路径样式 */
  forcePathStyle?: boolean;
  /** 请求超时时间 */
  timeout?: number;
  /** 默认ACL */
  defaultAcl?: 'private' | 'public-read' | 'public-read-write';
  /** 是否启用多部分上传 */
  enableMultipartUpload?: boolean;
  /** 多部分上传阈值（字节） */
  multipartThreshold?: number;
  /** 分片大小（字节） */
  partSize?: number;
  /** 最大并发上传数 */
  maxConcurrency?: number;

  // 重试和错误处理配置
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 重试退避策略 */
  retryBackoff?: 'linear' | 'exponential';
  /** 熔断器阈值 */
  circuitBreakerThreshold?: number;
  /** 熔断器超时时间（毫秒） */
  circuitBreakerTimeout?: number;

  // 监控和性能配置
  /** 健康检查间隔（毫秒） */
  healthCheckInterval?: number;
  /** 是否启用指标收集 */
  enableMetrics?: boolean;
  /** 指标收集间隔（毫秒） */
  metricsInterval?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存TTL（毫秒） */
  cacheTtl?: number;
  /** 是否启用压缩 */
  enableCompression?: boolean;
  /** 压缩阈值（字节） */
  compressionThreshold?: number;
}

/**
 * 多部分上传参数
 */
export interface MultipartUploadParams {
  /** 文件键 */
  key: string;
  /** 文件缓冲区 */
  buffer: Buffer;
  /** 内容类型 */
  contentType?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
  /** ACL权限 */
  acl?: string;
  /** 缓存控制 */
  cacheControl?: string;
  /** 内容编码 */
  contentEncoding?: string;
  /** 进度回调 */
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * 上传进度
 */
export interface UploadProgress {
  /** 已上传字节数 */
  loaded: number;
  /** 总字节数 */
  total: number;
  /** 上传百分比 */
  percentage: number;
  /** 当前分片 */
  part?: number;
  /** 总分片数 */
  totalParts?: number;
  /** 上传速度（字节/秒） */
  speed?: number;
  /** 剩余时间（秒） */
  timeRemaining?: number;
}

/**
 * 多部分上传状态
 */
export interface MultipartUploadState {
  /** 上传ID */
  uploadId: string;
  /** 文件键 */
  key: string;
  /** 已完成的分片 */
  completedParts: CompletedPart[];
  /** 总分片数 */
  totalParts: number;
  /** 开始时间 */
  startTime: Date;
  /** 最后更新时间 */
  lastUpdate: Date;
  /** 上传状态 */
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'aborted';
}

/**
 * 已完成的分片
 */
export interface CompletedPart {
  /** 分片号 */
  PartNumber: number;
  /** ETag */
  ETag: string;
}

/**
 * R2客户端配置
 */
export interface R2ClientConfig {
  /** 区域 */
  region: string;
  /** 端点URL */
  endpoint?: string;
  /** 是否强制路径样式 */
  forcePathStyle?: boolean;
  /** 凭证 */
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  /** 请求处理器配置 */
  requestHandler?: {
    requestTimeout?: number;
    connectionTimeout?: number;
  };
}

/**
 * 预签名URL选项
 */
export interface PresignedUrlOptions {
  /** 过期时间（秒） */
  expiresIn?: number;
  /** HTTP方法 */
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
  /** 响应内容类型 */
  responseContentType?: string;
  /** 响应内容处置 */
  responseContentDisposition?: string;
  /** 版本ID */
  versionId?: string;
}

/**
 * R2错误类型
 */
export enum R2ErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  LIST_FAILED = 'LIST_FAILED',
  COPY_FAILED = 'COPY_FAILED',
  MULTIPART_UPLOAD_FAILED = 'MULTIPART_UPLOAD_FAILED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
}

/**
 * R2操作结果
 */
export interface R2OperationResult<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误类型 */
  errorType?: R2ErrorType;
  /** 操作耗时（毫秒） */
  duration?: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  /** 总数 */
  total: number;
  /** 成功数 */
  successful: number;
  /** 失败数 */
  failed: number;
  /** 成功的键 */
  successfulKeys: string[];
  /** 失败的键和错误 */
  failedKeys: Array<{ key: string; error: string }>;
  /** 操作耗时 */
  duration: number;
}

/**
 * 默认R2配置（从环境变量获取）
 */
export function getDefaultR2Config(): Partial<R2Config> {
  return {
    provider: 'cloudflare-r2',
    bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME || 'default-bucket',
    region: 'auto',
    accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT || '',
    forcePathStyle: true,
    timeout: 30000,
    defaultAcl: 'private',
    enableMultipartUpload: true,
    multipartThreshold: 100 * 1024 * 1024, // 100MB
    partSize: 10 * 1024 * 1024, // 10MB
    maxConcurrency: 3,
  };
}

/**
 * R2默认配置
 */
export const R2_DEFAULTS = {
  REGION: 'auto',
  TIMEOUT: 300000, // 增加到5分钟，解决大文件上传超时问题
  FORCE_PATH_STYLE: true,
  DEFAULT_ACL: 'private',
  MULTIPART_THRESHOLD: 20 * 1024 * 1024, // 降低到20MB，提高大文件上传成功率
  PART_SIZE: 5 * 1024 * 1024, // 降低到5MB，减少单个分片超时风险
  MAX_CONCURRENCY: 2, // 降低并发数，提高稳定性
  PRESIGNED_URL_EXPIRES: 3600, // 1小时
  MAX_KEYS_PER_LIST: 1000,
  MAX_DELETE_BATCH_SIZE: 1000,
} as const;

/**
 * R2支持的内容类型
 */
export const R2_SUPPORTED_CONTENT_TYPES = {
  // 图片
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],

  // 视频
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],

  // 音频
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],

  // 文档
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/json': ['.json'],
  'text/html': ['.html', '.htm'],
  'text/css': ['.css'],
  'application/javascript': ['.js'],

  // 压缩文件
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],

  // 默认
  'application/octet-stream': [],
} as const;

/**
 * R2错误代码映射
 */
export const R2_ERROR_CODES = {
  NoSuchBucket: 'BUCKET_NOT_FOUND',
  NoSuchKey: 'FILE_NOT_FOUND',
  AccessDenied: 'PERMISSION_DENIED',
  InvalidAccessKeyId: 'INVALID_CREDENTIALS',
  SignatureDoesNotMatch: 'INVALID_CREDENTIALS',
  RequestTimeout: 'CONNECTION_TIMEOUT',
  ServiceUnavailable: 'SERVICE_UNAVAILABLE',
  InternalError: 'INTERNAL_ERROR',
} as const;

/**
 * 获取文件扩展名对应的内容类型
 */
export function getContentTypeByExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  if (!ext) return 'application/octet-stream';

  for (const [contentType, extensions] of Object.entries(R2_SUPPORTED_CONTENT_TYPES) as [
    string,
    readonly string[],
  ][]) {
    if (extensions.includes(`.${ext}`)) {
      return contentType;
    }
  }

  return 'application/octet-stream';
}

/**
 * 验证R2配置
 */
export function validateR2Config(config: Partial<R2Config>): string[] {
  const errors: string[] = [];

  if (!config.bucket) {
    errors.push('存储桶名称不能为空');
  }

  if (!config.accessKeyId) {
    errors.push('访问密钥ID不能为空');
  }

  if (!config.secretAccessKey) {
    errors.push('秘密访问密钥不能为空');
  }

  if (!config.endpoint) {
    errors.push('端点URL不能为空');
  }

  if (config.multipartThreshold && config.multipartThreshold < 5 * 1024 * 1024) {
    errors.push('多部分上传阈值不能小于5MB');
  }

  if (config.partSize && config.partSize < 5 * 1024 * 1024) {
    errors.push('分片大小不能小于5MB');
  }

  return errors;
}
