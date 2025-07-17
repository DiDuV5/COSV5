/**
 * @fileoverview 抽象存储服务基类
 * @description 定义统一的对象存储接口，支持多种存储后端
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 实现自定义存储提供商
 * class CustomProvider extends BaseStorageProvider {
 *   async uploadFile(params) { ... }
 *   async downloadFile(key) { ... }
 * }
 *
 * @dependencies
 * - Node.js 18+
 * - TypeScript 5.0+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { EventEmitter } from 'events';

import { getFastMediaUrl } from '../smart-url-resolver';

/**
 * 存储提供商类型
 */
export type StorageProviderType = 'local' | 'cloudflare-r2' | 's3' | 'minio';

/**
 * 文件上传参数
 */
export interface UploadParams {
  /** 文件内容 */
  buffer: Buffer;
  /** 存储键名 */
  key: string;
  /** MIME类型 */
  contentType: string;
  /** 文件大小 */
  size: number;
  /** 元数据 */
  metadata?: Record<string, string>;
  /** 访问控制 */
  acl?: 'private' | 'public-read' | 'public-read-write';
  /** 缓存控制 */
  cacheControl?: string;
  /** 内容编码 */
  contentEncoding?: string;
}

/**
 * 文件上传结果
 */
export interface UploadResult {
  /** 存储键名 */
  key: string;
  /** 访问URL */
  url: string;
  /** CDN URL */
  cdnUrl?: string;
  /** 文件大小 */
  size: number;
  /** ETag */
  etag?: string;
  /** 版本ID */
  versionId?: string;
  /** 上传时间 */
  uploadedAt: Date;
  /** 内容类型 */
  contentType?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 文件下载结果
 */
export interface DownloadResult {
  /** 文件内容 */
  buffer: Buffer;
  /** MIME类型 */
  contentType: string;
  /** 文件大小 */
  size: number;
  /** 最后修改时间 */
  lastModified: Date;
  /** ETag */
  etag?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 存储键名 */
  key: string;
  /** 文件大小 */
  size: number;
  /** 最后修改时间 */
  lastModified: Date;
  /** ETag */
  etag?: string;
  /** 存储类别 */
  storageClass?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 列表查询参数
 */
export interface ListParams {
  /** 前缀过滤 */
  prefix?: string;
  /** 分隔符 */
  delimiter?: string;
  /** 最大返回数量 */
  maxKeys?: number;
  /** 继续标记 */
  nextContinuationToken?: string;
  /** 开始位置 */
  startAfter?: string;
}

/**
 * 列表查询结果
 */
export interface ListResult {
  /** 文件列表 */
  files: FileInfo[];
  /** 是否截断 */
  isTruncated: boolean;
  /** 下一页标记 */
  nextContinuationToken?: string;
  /** 公共前缀 */
  commonPrefixes?: string[];
  /** 文件数量 */
  keyCount?: number;
}

/**
 * 下载参数
 */
export interface DownloadParams {
  /** 存储键名 */
  key: string;
  /** 版本ID */
  versionId?: string;
  /** 范围下载 */
  range?: string;
  /** 是否使用缓存 */
  useCache?: boolean;
  /** 条件下载 - If-Match */
  ifMatch?: string;
  /** 条件下载 - If-None-Match */
  ifNoneMatch?: string;
  /** 条件下载 - If-Modified-Since */
  ifModifiedSince?: Date;
  /** 条件下载 - If-Unmodified-Since */
  ifUnmodifiedSince?: Date;
}

/**
 * 流式下载参数
 */
export interface StreamDownloadParams extends DownloadParams {
  /** 缓冲区大小 */
  bufferSize?: number;
}

/**
 * 复制参数
 */
export interface CopyParams {
  /** 源键名 */
  sourceKey: string;
  /** 目标键名 */
  destKey: string;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 复制结果
 */
export interface CopyResult {
  /** 源键名 */
  sourceKey: string;
  /** 目标键名 */
  key: string;
  /** ETag */
  etag?: string;
  /** 复制时间 */
  copiedAt: Date;
}

/**
 * 分片上传初始化参数
 */
export interface InitiateMultipartParams {
  /** 存储键名 */
  key: string;
  /** MIME类型 */
  contentType: string;
  /** 元数据 */
  metadata?: Record<string, string>;
  /** 访问控制 */
  acl?: 'private' | 'public-read' | 'public-read-write';
}

/**
 * 分片上传初始化结果
 */
export interface InitiateMultipartResult {
  /** 上传ID */
  uploadId: string;
  /** 存储键名 */
  key: string;
}

/**
 * 上传分片参数
 */
export interface UploadPartParams {
  /** 存储键名 */
  key: string;
  /** 上传ID */
  uploadId: string;
  /** 分片号 */
  partNumber: number;
  /** 分片内容 */
  buffer: Buffer;
}

/**
 * 上传分片结果
 */
export interface UploadPartResult {
  /** 分片号 */
  partNumber: number;
  /** ETag */
  etag: string;
}

/**
 * 完成分片上传参数
 */
export interface CompleteMultipartParams {
  /** 存储键名 */
  key: string;
  /** 上传ID */
  uploadId: string;
  /** 分片列表 */
  parts: Array<{
    partNumber: number;
    etag: string;
  }>;
}

/**
 * 分片上传参数
 */
export interface UploadPartParams {
  /** 存储键名 */
  key: string;
  /** 上传ID */
  uploadId: string;
  /** 分片编号 */
  partNumber: number;
  /** 分片内容 */
  buffer: Buffer;
}

/**
 * 分片上传结果
 */
export interface UploadPartResult {
  /** 分片编号 */
  partNumber: number;
  /** ETag */
  etag: string;
}

/**
 * 完成分片上传参数
 */
export interface CompleteMultipartParams {
  /** 存储键名 */
  key: string;
  /** 上传ID */
  uploadId: string;
  /** 分片列表 */
  parts: Array<{
    partNumber: number;
    etag: string;
  }>;
}

/**
 * 存储配置接口
 */
export interface StorageConfig {
  /** 提供商类型 */
  provider: StorageProviderType;
  /** 存储桶名称 */
  bucket?: string;
  /** 区域 */
  region?: string;
  /** 访问密钥ID */
  accessKeyId?: string;
  /** 秘密访问密钥 */
  secretAccessKey?: string;
  /** 端点URL */
  endpoint?: string;
  /** 是否强制路径样式 */
  forcePathStyle?: boolean;
  /** CDN域名 */
  cdnDomain?: string;
  /** 自定义域名 */
  customDomain?: string;
  /** 公开访问URL */
  publicUrl?: string;
  /** 公开访问 */
  publicAccess?: boolean;
  /** 账户ID */
  accountId?: string;
  /** API令牌 */
  apiToken?: string;
  /** 签名版本 */
  signatureVersion?: string;
  /** 基础路径 */
  basePath?: string;
  /** 默认ACL */
  defaultAcl?: 'private' | 'public-read' | 'public-read-write';
  /** 超时时间 */
  timeout?: number;
  /** 重试次数 */
  retryCount?: number;
}

/**
 * 抽象存储服务基类
 */
export abstract class BaseStorageProvider extends EventEmitter {
  protected config: StorageConfig;
  protected isInitialized = false;

  constructor(config: StorageConfig) {
    super();
    this.config = config;
  }

  /**
   * 初始化存储服务
   */
  abstract initialize(): Promise<void>;

  /**
   * 上传文件
   */
  abstract uploadFile(params: UploadParams): Promise<UploadResult>;

  /**
   * 下载文件
   */
  abstract downloadFile(key: string): Promise<DownloadResult>;

  /**
   * 删除文件
   */
  abstract deleteFile(key: string): Promise<void>;

  /**
   * 批量删除文件
   */
  abstract deleteFiles(keys: string[]): Promise<void>;

  /**
   * 检查文件是否存在
   */
  abstract fileExists(key: string): Promise<boolean>;

  /**
   * 获取文件信息
   */
  abstract getFileInfo(key: string): Promise<FileInfo>;

  /**
   * 列出文件
   */
  abstract listFiles(params?: ListParams): Promise<ListResult>;

  /**
   * 生成预签名URL
   */
  abstract generatePresignedUrl(
    key: string,
    operation: 'get' | 'put',
    expiresIn?: number
  ): Promise<string>;

  /**
   * 初始化分片上传
   */
  abstract initiateMultipartUpload(
    params: InitiateMultipartParams
  ): Promise<InitiateMultipartResult>;

  /**
   * 上传分片
   */
  abstract uploadPart(params: UploadPartParams): Promise<UploadPartResult>;

  /**
   * 完成分片上传
   */
  abstract completeMultipartUpload(params: CompleteMultipartParams): Promise<UploadResult>;

  /**
   * 取消分片上传
   */
  abstract abortMultipartUpload(key: string, uploadId: string): Promise<void>;

  /**
   * 复制文件
   */
  abstract copyFile(sourceKey: string, destKey: string): Promise<UploadResult>;

  /**
   * 获取配置
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 生成完整URL (使用智能解析器)
   */
  protected generateUrl(key: string): string {
    // 对于Cloudflare R2，使用智能URL解析器
    if (this.config.provider === 'cloudflare-r2') {
      // 使用快速URL解析（公开URL，最稳定）
      return getFastMediaUrl(key);
    }

    // 其他存储提供商的原有逻辑
    if (this.config.cdnDomain) {
      return `${this.config.cdnDomain}/${key}`;
    }

    if (this.config.endpoint && this.config.bucket) {
      const baseUrl = this.config.endpoint.replace(/\/$/, '');
      return `${baseUrl}/${this.config.bucket}/${key}`;
    }

    // 如果配置不完整，返回相对路径
    console.warn('⚠️ 存储配置不完整，使用R2存储备用URL:', {
      endpoint: this.config.endpoint,
      bucket: this.config.bucket,
      key,
    });
    const baseUrl = process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || 'https://cc.tutu365.cc';
    return `${baseUrl}/media/${key}`;
  }

  /**
   * 验证配置
   */
  protected validateConfig(): void {
    if (!this.config.provider) {
      throw new Error('存储提供商类型不能为空');
    }
  }

  /**
   * 发出事件
   */
  protected emitEvent(event: string, data: any): void {
    this.emit(event, data);
  }
}
