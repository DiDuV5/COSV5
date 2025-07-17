/**
 * @fileoverview Cloudflare R2存储提供商
 * @description 基于AWS S3 SDK的Cloudflare R2存储实现
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const r2Provider = new R2StorageProvider({
 *   accountId: 'your-account-id',
 *   accessKeyId: 'your-access-key',
 *   secretAccessKey: 'your-secret-key',
 *   bucket: 'your-bucket',
 *   endpoint: 'https://your-account.r2.cloudflarestorage.com',
 *   cdnDomain: 'https://your-cdn-domain.com'
 * });
 *
 * @dependencies
 * - @aws-sdk/client-s3: AWS S3 SDK for R2 compatibility
 * - @aws-sdk/lib-storage: 分片上传支持
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，支持基础CRUD和健康检查
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  BaseStorageProvider,
  UploadOptions,
  UploadResult,
  DownloadResult,
  HealthStatus,
  StorageStats,
  FileInfo
} from '../base-storage-provider';

/**
 * R2存储配置接口
 */
export interface R2Config {
  /** Cloudflare账户ID */
  accountId: string;
  /** 访问密钥ID */
  accessKeyId: string;
  /** 秘密访问密钥 */
  secretAccessKey: string;
  /** 存储桶名称 */
  bucket: string;
  /** R2端点URL */
  endpoint: string;
  /** CDN域名 (可选) */
  cdnDomain?: string;
  /** 区域 (默认: auto) */
  region?: string;
  /** 是否强制路径样式 */
  forcePathStyle?: boolean;
}

/**
 * Cloudflare R2存储提供商
 */
export class R2StorageProvider extends BaseStorageProvider {
  readonly name = 'cloudflare-r2';
  readonly type = 'r2' as const;

  private client: S3Client;
  private config: R2Config;

  constructor(config: R2Config) {
    super();
    this.config = {
      region: 'auto',
      forcePathStyle: false,
      ...config
    };

    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      }
    });
  }

  /**
   * 上传文件到R2
   */
  async upload(file: Buffer, key: string, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      const startTime = Date.now();

      // 生成安全的存储键
      const safeKey = this.generateSafeKey(key);

      // 自动检测内容类型
      const contentType = options.contentType || this.getMimeType(key);

      // 清理metadata中的无效字符，确保HTTP头部兼容性
      const cleanMetadata: Record<string, string> = {};
      if (options.metadata) {
        Object.entries(options.metadata).forEach(([metaKey, metaValue]) => {
          // 清理键名：移除特殊字符，只保留字母数字和连字符
          const cleanKey = metaKey.replace(/[^a-zA-Z0-9-]/g, '');

          // 清理值：移除或替换无效字符
          let cleanValue = String(metaValue || '');
          // 移除控制字符和非ASCII字符
          cleanValue = cleanValue.replace(/[\x00-\x1F\x7F-\xFF]/g, '');
          // 替换中文字符为安全格式
          if (/[\u4e00-\u9fff]/.test(cleanValue)) {
            cleanValue = `chinese-content-${Date.now()}`;
          }
          // 限制长度
          cleanValue = cleanValue.substring(0, 100);

          if (cleanKey && cleanValue) {
            cleanMetadata[cleanKey] = cleanValue;
          }
        });
      }

      // 准备上传参数
      const uploadParams = {
        Bucket: this.config.bucket,
        Key: safeKey,
        Body: file,
        ContentType: contentType,
        CacheControl: options.cacheControl || 'public, max-age=31536000', // 1年缓存
        Metadata: cleanMetadata,
        ACL: options.acl || 'public-read',
        ...options.customHeaders
      };

      // 对于大文件使用分片上传
      let result;
      if (file.length > 100 * 1024 * 1024) { // 100MB以上使用分片上传
        const upload = new Upload({
          client: this.client,
          params: uploadParams,
          partSize: 10 * 1024 * 1024, // 10MB分片
          queueSize: 3 // 最多3个并发分片
        });

        result = await upload.done();
      } else {
        const command = new PutObjectCommand(uploadParams);
        result = await this.client.send(command);
      }

      const uploadTime = Date.now() - startTime;

      return {
        success: true,
        key: safeKey,
        url: this.getUrl(safeKey),
        cdnUrl: this.getCdnUrl(safeKey) || undefined,
        size: file.length,
        etag: result.ETag?.replace(/"/g, ''), // 移除引号
        metadata: options.metadata,
        uploadedAt: new Date()
      };

    } catch (error) {
      console.error('R2 upload failed:', error);
      return {
        success: false,
        key,
        url: '',
        size: file.length,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * 从R2下载文件
   */
  async download(key: string): Promise<DownloadResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      const result = await this.client.send(command);

      if (!result.Body) {
        throw new Error('Empty response body');
      }

      // 将流转换为Buffer
      const chunks: Uint8Array[] = [];
      const reader = result.Body.transformToWebStream().getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const buffer = Buffer.concat(chunks);

      return {
        buffer,
        contentType: result.ContentType,
        size: buffer.length,
        lastModified: result.LastModified,
        etag: result.ETag?.replace(/"/g, ''),
        metadata: result.Metadata
      };

    } catch (error) {
      console.error('R2 download failed:', error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 从R2删除文件
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      await this.client.send(command);

    } catch (error) {
      console.error('R2 delete failed:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      await this.client.send(command);
      return true;

    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件访问URL
   */
  getUrl(key: string): string {
    // 优先使用CDN URL
    const cdnUrl = this.getCdnUrl(key);
    if (cdnUrl) {
      return cdnUrl;
    }
    // 备用：使用R2的公共URL格式
    return `https://${this.config.bucket}.r2.cloudflarestorage.com/${key}`;
  }

  /**
   * 获取CDN URL
   */
  getCdnUrl(key: string): string | null {
    if (!this.config.cdnDomain) {
      return null;
    }

    // 确保CDN域名格式正确
    const domain = this.config.cdnDomain.replace(/\/$/, '');
    return `${domain}/${key}`;
  }

  /**
   * R2健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // 尝试列出存储桶内容来检查连接
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        MaxKeys: 1 // 只获取1个对象，减少开销
      });

      await this.client.send(command);

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        lastCheck: new Date(),
        details: {
          bucket: this.config.bucket,
          endpoint: this.config.endpoint,
          cdnDomain: this.config.cdnDomain
        }
      };

    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        lastCheck: new Date(),
        details: {
          bucket: this.config.bucket,
          endpoint: this.config.endpoint
        }
      };
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<StorageStats> {
    try {
      let totalFiles = 0;
      let totalSize = 0;
      let continuationToken: string | undefined;

      // 分页获取所有对象统计
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          MaxKeys: 1000,
          ContinuationToken: continuationToken
        });

        const result = await this.client.send(command);

        if (result.Contents) {
          totalFiles += result.Contents.length;
          totalSize += result.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
        }

        continuationToken = result.NextContinuationToken;

      } while (continuationToken);

      return {
        totalFiles,
        totalSize,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Failed to get R2 stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * 获取文件信息 (优化版本)
   */
  override async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key
      });

      const result = await this.client.send(command);

      return {
        key,
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        etag: result.ETag?.replace(/"/g, ''),
        contentType: result.ContentType,
        metadata: result.Metadata
      };

    } catch (error) {
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 复制文件
   */
  async copyFile(sourceKey: string, destKey: string): Promise<UploadResult> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${sourceKey}`,
        Key: destKey
      });

      const result = await this.client.send(command);

      // 获取文件信息
      const fileInfo = await this.getFileInfo(destKey);

      return {
        success: true,
        key: destKey,
        url: this.getUrl(destKey),
        cdnUrl: this.getCdnUrl(destKey) || undefined,
        size: fileInfo.size,
        etag: result.CopyObjectResult?.ETag?.replace(/"/g, ''),
        uploadedAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        key: destKey,
        url: '',
        size: 0,
        error: error instanceof Error ? error.message : 'Copy failed'
      };
    }
  }

  /**
   * 生成预签名URL (用于直接上传)
   */
  async generatePresignedUploadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // 注意：这里需要使用@aws-sdk/s3-request-presigner
    // 由于文件大小限制，这个功能将在后续实现
    throw new Error('Presigned URL generation not implemented yet');
  }
}
