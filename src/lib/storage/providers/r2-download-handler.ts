/**
 * @fileoverview R2下载处理器
 * @description 处理文件下载和流式下载
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  GetObjectCommand,
  HeadObjectCommand,
  type GetObjectCommandInput,
  type HeadObjectCommandInput,
  type S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  type R2Config,
  type PresignedUrlOptions,
  R2_DEFAULTS
} from './r2-types';
import type {
  DownloadParams,
  DownloadResult,
  StreamDownloadParams,
  FileInfo
} from '../object-storage/base-storage-provider';

/**
 * R2下载处理器
 */
export class R2DownloadHandler {
  private s3Client: S3Client;
  private config: R2Config;
  private downloadCache = new Map<string, { data: Buffer; timestamp: number; etag: string }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  constructor(s3Client: S3Client, config: R2Config) {
    this.s3Client = s3Client;
    this.config = config;
  }

  /**
   * 下载文件
   */
  async downloadFile(params: DownloadParams): Promise<DownloadResult> {
    const startTime = Date.now();

    try {
      // 检查缓存
      if (params.useCache !== false) {
        const cached = await this.getCachedFile(params.key);
        if (cached) {
          console.log(`📦 从缓存获取文件: ${params.key}`);
          return cached;
        }
      }

      const downloadParams: GetObjectCommandInput = {
        Bucket: this.config.bucket!,
        Key: params.key,
        Range: params.range,
        IfMatch: params.ifMatch,
        IfNoneMatch: params.ifNoneMatch,
        IfModifiedSince: params.ifModifiedSince,
        IfUnmodifiedSince: params.ifUnmodifiedSince,
      };

      const command = new GetObjectCommand(downloadParams);
      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('响应中没有文件内容');
      }

      // 将流转换为Buffer
      const buffer = await this.streamToBuffer(response.Body as any);

      const result: DownloadResult = {
        buffer,
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || buffer.length,
        etag: response.ETag?.replace(/"/g, '') || '',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
      };

      // 缓存结果
      if (params.useCache !== false && buffer.length < 10 * 1024 * 1024) { // 只缓存小于10MB的文件
        this.cacheFile(params.key, buffer, result.etag || '');
      }

      const duration = Date.now() - startTime;
      console.log(`✅ 文件下载成功: ${params.key} (${duration}ms, ${buffer.length} bytes)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 文件下载失败: ${params.key} (${duration}ms)`, error);
      throw new Error(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 流式下载文件
   */
  async streamDownload(params: StreamDownloadParams): Promise<NodeJS.ReadableStream> {
    try {
      const downloadParams: GetObjectCommandInput = {
        Bucket: this.config.bucket!,
        Key: params.key,
        Range: params.range,
      };

      const command = new GetObjectCommand(downloadParams);
      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('响应中没有文件内容');
      }

      console.log(`🌊 开始流式下载: ${params.key}`);
      return response.Body as NodeJS.ReadableStream;
    } catch (error) {
      console.error(`❌ 流式下载失败: ${params.key}`, error);
      throw new Error(`流式下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const headParams: HeadObjectCommandInput = {
        Bucket: this.config.bucket!,
        Key: key,
      };

      const command = new HeadObjectCommand(headParams);
      const response = await this.s3Client.send(command);

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag?.replace(/"/g, '') || '',
        storageClass: response.StorageClass,
      };
    } catch (error) {
      console.error(`❌ 获取文件信息失败: ${key}`, error);
      throw new Error(`获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileInfo(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成预签名URL
   */
  async generatePresignedUrl(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    try {
      const {
        expiresIn = R2_DEFAULTS.PRESIGNED_URL_EXPIRES,
        method = 'GET',
        responseContentType,
        responseContentDisposition,
        versionId,
      } = options;

      const commandParams: GetObjectCommandInput = {
        Bucket: this.config.bucket!,
        Key: key,
        ResponseContentType: responseContentType,
        ResponseContentDisposition: responseContentDisposition,
        VersionId: versionId,
      };

      let command;
      switch (method) {
        case 'GET':
          command = new GetObjectCommand(commandParams);
          break;
        default:
          throw new Error(`不支持的HTTP方法: ${method}`);
      }

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      console.log(`🔗 生成预签名URL: ${key} (有效期: ${expiresIn}秒)`);
      return url;
    } catch (error) {
      console.error(`❌ 生成预签名URL失败: ${key}`, error);
      throw new Error(`生成预签名URL失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量获取文件信息
   */
  async batchGetFileInfo(keys: string[]): Promise<Array<{ key: string; info?: FileInfo; error?: string }>> {
    const results: Array<{ key: string; info?: FileInfo; error?: string }> = [];

    // 控制并发数
    const concurrency = 5;
    const chunks = this.chunkArray(keys, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (key) => {
        try {
          const info = await this.getFileInfo(key);
          return { key, info };
        } catch (error) {
          return {
            key,
            error: error instanceof Error ? error.message : '未知错误'
          };
        }
      });

      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * 从缓存获取文件
   */
  private async getCachedFile(key: string): Promise<DownloadResult | null> {
    const cached = this.downloadCache.get(key);
    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.downloadCache.delete(key);
      return null;
    }

    // 验证ETag（如果可能）
    try {
      const fileInfo = await this.getFileInfo(key);
      if (fileInfo.etag !== cached.etag) {
        this.downloadCache.delete(key);
        return null;
      }
    } catch (error) {
      // 如果无法获取文件信息，删除缓存
      this.downloadCache.delete(key);
      return null;
    }

    return {
      buffer: cached.data,
      contentType: 'application/octet-stream', // 缓存中没有保存这个信息
      size: cached.data.length,
      etag: cached.etag,
      lastModified: new Date(cached.timestamp),
      metadata: {},
    };
  }

  /**
   * 缓存文件
   */
  private cacheFile(key: string, buffer: Buffer, etag: string): void {
    this.downloadCache.set(key, {
      data: buffer,
      timestamp: Date.now(),
      etag,
    });
  }

  /**
   * 将流转换为Buffer
   */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 清理下载缓存
   */
  clearCache(): void {
    this.downloadCache.clear();
    console.log('🧹 已清理下载缓存');
  }

  /**
   * 清理过期缓存
   */
  cleanupExpiredCache(): number {
    const now = Date.now();
    let cleaned = 0;

    Array.from(this.downloadCache.entries()).forEach(([key, cached]) => {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.downloadCache.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 清理了 ${cleaned} 个过期的下载缓存`);
    }

    return cleaned;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    size: number;
    totalSize: number;
    entries: Array<{
      key: string;
      size: number;
      timestamp: Date;
      etag: string;
    }>;
  } {
    let totalSize = 0;
    const entries = Array.from(this.downloadCache.entries()).map(([key, cached]) => {
      totalSize += cached.data.length;
      return {
        key,
        size: cached.data.length,
        timestamp: new Date(cached.timestamp),
        etag: cached.etag,
      };
    });

    return {
      size: this.downloadCache.size,
      totalSize,
      entries,
    };
  }
}
