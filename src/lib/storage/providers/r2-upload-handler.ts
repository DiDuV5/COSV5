/**
 * @fileoverview R2上传处理器
 * @description 处理文件上传，包括单文件上传和多部分上传
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  type PutObjectCommandInput,
  type CreateMultipartUploadCommandInput,
  type UploadPartCommandInput,
  type CompleteMultipartUploadCommandInput,
  type S3Client,
} from '@aws-sdk/client-s3';
import { cleanMetadata } from '../unified-r2-storage/utils';
import {
  type R2Config,
  type MultipartUploadParams,
  type UploadProgress,
  type MultipartUploadState,
  type CompletedPart,
  type R2OperationResult,
  R2_DEFAULTS
} from './r2-types';
import type { UploadParams, UploadResult } from '../object-storage/base-storage-provider';
// import { adaptiveUploadStrategy } from '../../upload/adaptive-upload-strategy'; // 暂时注释掉，模块不存在

/**
 * R2上传处理器
 */
export class R2UploadHandler {
  private s3Client: S3Client;
  private config: R2Config;
  private activeUploads = new Map<string, MultipartUploadState>();

  constructor(s3Client: S3Client, config: R2Config) {
    this.s3Client = s3Client;
    this.config = config;
  }

  /**
   * 上传文件
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    const startTime = Date.now();

    try {
      // 清理元数据
      const cleanedMetadata = cleanMetadata(params.metadata || {});

      // 使用固定策略判断上传方式，避免自适应策略的问题
      const useMultipart = this.shouldUseMultipartUpload(params.buffer.length);

      console.log(`🚀 使用${useMultipart ? '多部分' : '单文件'}上传策略，文件大小: ${Math.round(params.buffer.length / 1024 / 1024)}MB`);

      let result: UploadResult;

      if (useMultipart) {
        result = await this.multipartUpload({
          key: params.key,
          buffer: params.buffer,
          contentType: params.contentType,
          metadata: cleanedMetadata,
          acl: params.acl,
          cacheControl: params.cacheControl,
          contentEncoding: params.contentEncoding,
        });
      } else {
        result = await this.singleUpload(params, cleanedMetadata);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ 文件上传成功: ${params.key} (${duration}ms)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 文件上传失败: ${params.key} (${duration}ms)`, error);
      throw new Error(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 单文件上传
   */
  private async singleUpload(params: UploadParams, cleanedMetadata: Record<string, string>): Promise<UploadResult> {
    const uploadParams: PutObjectCommandInput = {
      Bucket: this.config.bucket!,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType,
      ContentLength: params.size,
      ACL: (params.acl || this.config.defaultAcl || R2_DEFAULTS.DEFAULT_ACL) as any,
      CacheControl: params.cacheControl,
      ContentEncoding: params.contentEncoding,
      Metadata: Object.keys(cleanedMetadata).length > 0 ? cleanedMetadata : undefined,
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await this.s3Client.send(command);

    return {
      key: params.key,
      url: this.generateFileUrl(params.key),
      etag: response.ETag?.replace(/"/g, '') || '',
      size: params.buffer.length,
      contentType: params.contentType || 'application/octet-stream',
      metadata: cleanedMetadata,
      uploadedAt: new Date(),
    };
  }

  /**
   * 多部分上传
   */
  async multipartUpload(params: MultipartUploadParams): Promise<UploadResult> {
    const uploadId = await this.initiateMultipartUpload(params);

    try {
      const completedParts = await this.uploadParts(uploadId, params);
      const result = await this.completeMultipartUpload(uploadId, params.key, completedParts);

      // 清理上传状态
      this.activeUploads.delete(uploadId);

      return result;
    } catch (error) {
      // 上传失败，中止多部分上传
      await this.abortMultipartUpload(uploadId, params.key);
      this.activeUploads.delete(uploadId);
      throw error;
    }
  }

  /**
   * 初始化多部分上传
   */
  private async initiateMultipartUpload(params: MultipartUploadParams): Promise<string> {
    const cleanedMetadata = cleanMetadata(params.metadata || {});

    const uploadParams: CreateMultipartUploadCommandInput = {
      Bucket: this.config.bucket!,
      Key: params.key,
      ContentType: params.contentType,
      ACL: (params.acl || this.config.defaultAcl || R2_DEFAULTS.DEFAULT_ACL) as any,
      Metadata: Object.keys(cleanedMetadata).length > 0 ? cleanedMetadata : undefined,
    };

    const command = new CreateMultipartUploadCommand(uploadParams);
    const response = await this.s3Client.send(command);

    if (!response.UploadId) {
      throw new Error('无法获取上传ID');
    }

    // 记录上传状态
    const uploadState: MultipartUploadState = {
      uploadId: response.UploadId,
      key: params.key,
      completedParts: [],
      totalParts: Math.ceil(params.buffer.length / (this.config.partSize || R2_DEFAULTS.PART_SIZE)),
      startTime: new Date(),
      lastUpdate: new Date(),
      status: 'pending',
    };

    this.activeUploads.set(response.UploadId, uploadState);

    return response.UploadId;
  }

  /**
   * 上传分片
   */
  private async uploadParts(uploadId: string, params: MultipartUploadParams): Promise<CompletedPart[]> {
    // 使用固定配置，避免自适应策略的问题
    const partSize = this.config.partSize || R2_DEFAULTS.PART_SIZE;
    const totalParts = Math.ceil(params.buffer.length / partSize);
    const completedParts: CompletedPart[] = [];
    const maxConcurrency = this.config.maxConcurrency || R2_DEFAULTS.MAX_CONCURRENCY;

    // 更新上传状态
    const uploadState = this.activeUploads.get(uploadId);
    if (uploadState) {
      uploadState.status = 'uploading';
      uploadState.lastUpdate = new Date();
    }

    // 创建分片上传任务
    const uploadTasks: Promise<CompletedPart>[] = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, params.buffer.length);
      const partBuffer = params.buffer.slice(start, end);

      const uploadTask = this.uploadPart(uploadId, params.key, partNumber, partBuffer);
      uploadTasks.push(uploadTask);

      // 控制并发数
      if (uploadTasks.length >= maxConcurrency || partNumber === totalParts) {
        const batchResults = await Promise.all(uploadTasks);
        completedParts.push(...batchResults);
        uploadTasks.length = 0; // 清空数组

        // 更新进度
        if (params.onProgress) {
          const progress: UploadProgress = {
            loaded: completedParts.length * partSize,
            total: params.buffer.length,
            percentage: (completedParts.length / totalParts) * 100,
            part: completedParts.length,
            totalParts,
          };
          params.onProgress(progress);
        }

        // 更新上传状态
        if (uploadState) {
          uploadState.completedParts = [...completedParts];
          uploadState.lastUpdate = new Date();
        }
      }
    }

    return completedParts.sort((a, b) => a.PartNumber - b.PartNumber);
  }

  /**
   * 上传单个分片
   */
  private async uploadPart(uploadId: string, key: string, partNumber: number, partBuffer: Buffer): Promise<CompletedPart> {
    const uploadParams: UploadPartCommandInput = {
      Bucket: this.config.bucket!,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: partBuffer,
      ContentLength: partBuffer.length,
    };

    const command = new UploadPartCommand(uploadParams);
    const response = await this.s3Client.send(command);

    if (!response.ETag) {
      throw new Error(`分片 ${partNumber} 上传失败：无法获取ETag`);
    }

    return {
      PartNumber: partNumber,
      ETag: response.ETag,
    };
  }

  /**
   * 完成多部分上传
   */
  private async completeMultipartUpload(uploadId: string, key: string, completedParts: CompletedPart[]): Promise<UploadResult> {
    const completeParams: CompleteMultipartUploadCommandInput = {
      Bucket: this.config.bucket!,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: completedParts,
      },
    };

    const command = new CompleteMultipartUploadCommand(completeParams);
    const response = await this.s3Client.send(command);

    // 更新上传状态
    const uploadState = this.activeUploads.get(uploadId);
    if (uploadState) {
      uploadState.status = 'completed';
      uploadState.lastUpdate = new Date();
    }

    return {
      key,
      url: this.generateFileUrl(key),
      etag: response.ETag?.replace(/"/g, '') || '',
      size: completedParts.reduce((total, part) => total + (part as any).Size || 0, 0),
      contentType: 'application/octet-stream', // 需要从原始参数获取
      metadata: {},
      uploadedAt: new Date(),
    };
  }

  /**
   * 中止多部分上传
   */
  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    try {
      const abortParams = {
        Bucket: this.config.bucket!,
        Key: key,
        UploadId: uploadId,
      };

      const command = new AbortMultipartUploadCommand(abortParams);
      await this.s3Client.send(command);

      // 更新上传状态
      const uploadState = this.activeUploads.get(uploadId);
      if (uploadState) {
        uploadState.status = 'aborted';
        uploadState.lastUpdate = new Date();
      }

      console.log(`🗑️ 已中止多部分上传: ${key} (${uploadId})`);
    } catch (error) {
      console.error(`❌ 中止多部分上传失败: ${key} (${uploadId})`, error);
    }
  }

  /**
   * 判断是否应该使用多部分上传
   */
  private shouldUseMultipartUpload(fileSize: number): boolean {
    if (!this.config.enableMultipartUpload) {
      return false;
    }

    const threshold = this.config.multipartThreshold || R2_DEFAULTS.MULTIPART_THRESHOLD;
    return fileSize > threshold;
  }



  /**
   * 生成文件URL
   */
  private generateFileUrl(key: string): string {
    if (this.config.customDomain) {
      return `https://${this.config.customDomain}/${key}`;
    }

    return `${this.config.endpoint}/${this.config.bucket}/${key}`;
  }

  /**
   * 获取活跃上传状态
   */
  getActiveUploads(): MultipartUploadState[] {
    return Array.from(this.activeUploads.values());
  }

  /**
   * 获取上传状态
   */
  getUploadState(uploadId: string): MultipartUploadState | undefined {
    return this.activeUploads.get(uploadId);
  }

  /**
   * 清理过期的上传状态
   */
  cleanupExpiredUploads(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [uploadId, state] of Array.from(this.activeUploads.entries())) {
      if (now - state.lastUpdate.getTime() > maxAge) {
        this.activeUploads.delete(uploadId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 清理了 ${cleaned} 个过期的上传状态`);
    }

    return cleaned;
  }
}
