/**
 * @fileoverview 上传策略管理
 * @description 管理不同的文件上传策略
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { StreamUploadParams, UploadResult, UploadStrategyConfig } from './types';
import { getR2Config } from './config';
import { cleanMetadata } from './utils';

/**
 * 上传策略管理器
 */
export class UploadStrategies {
  private s3Client: S3Client;
  private config: UploadStrategyConfig;

  constructor(s3Client: S3Client) {
    this.s3Client = s3Client;
    this.config = {
      smallFileThreshold: 50 * 1024 * 1024, // 50MB
      largeFileThreshold: 100 * 1024 * 1024, // 100MB
      directUploadMaxSize: 50 * 1024 * 1024, // 50MB
      multipartChunkSize: 10 * 1024 * 1024, // 10MB
      multipartConcurrency: 3,
      requestTimeout: 300000, // 5分钟
    };
  }

  /**
   * 选择上传策略
   */
  public selectStrategy(fileSize: number): 'direct' | 'multipart' | 'stream' {
    if (fileSize < this.config.smallFileThreshold) {
      return 'direct';
    } else if (fileSize >= this.config.largeFileThreshold) {
      return 'multipart';
    } else {
      return 'multipart';
    }
  }

  /**
   * 执行直接上传
   */
  public async directUpload(params: StreamUploadParams): Promise<any> {
    console.log(`🔧 开始直接上传: ${params.key}, 大小: ${(params.size / 1024 / 1024).toFixed(1)}MB`);

    const cleanedMetadata = cleanMetadata(params.metadata || {});
    const r2Config = getR2Config();

    console.log(`🔧 R2配置: bucket=${r2Config.bucket}, endpoint=${r2Config.endpoint}`);

    const uploadParams = {
      Bucket: r2Config.bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
      ContentLength: params.size,
      ACL: 'public-read' as const,
      Metadata: cleanedMetadata,
    };

    console.log(`🚀 发送上传命令到R2...`);
    const command = new PutObjectCommand(uploadParams);

    try {
      const result = await this.s3Client.send(command);
      console.log(`✅ 直接上传成功: ${params.key}`);
      return result;
    } catch (error) {
      console.error(`❌ 直接上传失败: ${params.key}`, error);
      throw error;
    }
  }

  /**
   * 执行分片上传
   */
  public async multipartUpload(params: StreamUploadParams): Promise<any> {
    console.log(`🔧 开始分片上传: ${params.key}, 大小: ${(params.size / 1024 / 1024).toFixed(1)}MB`);

    const cleanedMetadata = cleanMetadata(params.metadata || {});
    const r2Config = getR2Config();

    console.log(`🔧 R2配置: bucket=${r2Config.bucket}, endpoint=${r2Config.endpoint}`);

    const uploadParams = {
      Bucket: r2Config.bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
      ContentLength: params.size,
      ACL: 'public-read' as const,
      Metadata: cleanedMetadata,
    };

    // 根据文件大小动态调整分片配置
    const isLargeFile = params.size >= this.config.largeFileThreshold;
    const partSize = isLargeFile
      ? Math.max(this.config.multipartChunkSize, Math.ceil(params.size / 100))
      : this.config.multipartChunkSize;
    const queueSize = isLargeFile ? 5 : this.config.multipartConcurrency;

    console.log(`🔧 分片配置: partSize=${(partSize / 1024 / 1024).toFixed(1)}MB, queueSize=${queueSize}, isLargeFile=${isLargeFile}`);

    const upload = new Upload({
      client: this.s3Client,
      params: uploadParams,
      partSize,
      queueSize,
    });

    // 添加进度回调
    if (params.onProgress) {
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          console.log(`📊 上传进度: ${percentage}% (${(progress.loaded / 1024 / 1024).toFixed(1)}MB/${(progress.total / 1024 / 1024).toFixed(1)}MB)`);
          params.onProgress!({
            loaded: progress.loaded,
            total: progress.total,
            percentage,
          });
        }
      });
    }

    console.log(`🚀 开始分片上传到R2...`);
    try {
      const result = await upload.done();
      console.log(`✅ 分片上传成功: ${params.key}`);
      return result;
    } catch (error) {
      console.error(`❌ 分片上传失败: ${params.key}`, error);
      throw error;
    }
  }

  /**
   * 执行流式上传（当前与分片上传相同，可扩展）
   */
  public async streamUpload(params: StreamUploadParams): Promise<any> {
    return this.multipartUpload(params);
  }

  /**
   * 批量上传文件
   */
  public async batchUpload(uploads: StreamUploadParams[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const errors: Error[] = [];

    // 并发上传，但限制并发数
    const concurrency = 3;
    const chunks: StreamUploadParams[][] = [];
    for (let i = 0; i < uploads.length; i += concurrency) {
      chunks.push(uploads.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(params => this.executeUpload(params))
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason);
          console.error('批量上传中的文件失败:', result.reason);
        }
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`批量上传完全失败: ${errors.map(e => e.message).join(', ')}`);
    }

    console.log(`✅ 批量上传完成: ${results.length}/${uploads.length} 成功`);
    return results;
  }

  /**
   * 执行上传（内部方法）
   */
  private async executeUpload(params: StreamUploadParams): Promise<UploadResult> {
    const strategy = this.selectStrategy(params.size);
    let uploadResult;

    switch (strategy) {
      case 'direct':
        uploadResult = await this.directUpload(params);
        break;
      case 'multipart':
        uploadResult = await this.multipartUpload(params);
        break;
      case 'stream':
        uploadResult = await this.streamUpload(params);
        break;
      default:
        throw new Error(`未知的上传策略: ${strategy}`);
    }

    // 这里需要配合CDN管理器生成完整的结果
    // 暂时返回基础结果
    return {
      key: params.key,
      url: '', // 需要CDN管理器填充
      cdnUrl: '', // 需要CDN管理器填充
      size: params.size,
      etag: uploadResult.ETag,
      uploadedAt: new Date(),
      environment: 'development', // 需要从外部传入
      usedDomain: '', // 需要CDN管理器填充
      uploadMethod: strategy,
    } as UploadResult;
  }
}
