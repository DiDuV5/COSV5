/**
 * @fileoverview 基础上传处理器
 * @description 所有专门处理器的基类，提供通用功能和接口
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { prisma } from '@/lib/prisma';
import { getDefaultStorageManager } from '@/lib/storage/object-storage/storage-factory';
import {
  ProcessingStatus,
  UploadType,
  type UnifiedUploadRequest,
  type UnifiedUploadResult,
  type UploadProcessor
} from '../core/index';
import { generateFileHash, generateStorageKey } from '../core/upload-utils';

/**
 * 基础处理器抽象类
 */
export abstract class BaseProcessor implements UploadProcessor {
  abstract readonly processorName: string;
  abstract readonly supportedTypes: UploadType[];

  protected storageManager: any;

  constructor() {
    // 存储管理器将在第一次使用时异步初始化
    this.storageManager = null;
  }

  /**
   * 获取存储管理器实例（懒加载）
   */
  protected async getStorageManager(): Promise<any> {
    if (!this.storageManager) {
      this.storageManager = await getDefaultStorageManager();
    }
    return this.storageManager;
  }

  /**
   * 处理上传 - 模板方法
   */
  public async processUpload(request: UnifiedUploadRequest): Promise<UnifiedUploadResult> {
    const startTime = Date.now();

    try {
      console.log(`🚀 ${this.processorName}开始处理: ${request.filename}`);

      // 1. 验证文件
      await this.validateFile(request.buffer, request.filename, request.mimeType);

      // 2. 预处理文件（子类实现）- 移到前面，因为可能会修改文件名和MIME类型
      const preprocessedData = await this.preprocessFile(request);

      // 3. 生成文件标识（使用预处理后的文件名）
      const fileHash = generateFileHash(preprocessedData.buffer);
      const storageKey = generateStorageKey(request.filename, request.userId, fileHash);

      // 4. 重复文件检测由 UnifiedUploadServiceV2 统一处理

      // 5. 上传到存储
      const uploadResult = await this.uploadToStorage(
        preprocessedData.buffer,
        storageKey,
        request.mimeType,
        preprocessedData.metadata
      );

      // 6. 后处理（子类实现）
      // 将预处理元数据附加到请求对象中
      const requestWithMetadata = {
        ...request,
        processingMetadata: preprocessedData.metadata
      };
      const postProcessResult = await this.postProcessFile(requestWithMetadata, uploadResult);

      // 7. 保存到数据库
      const dbRecord = await this.saveToDatabase(request, uploadResult, postProcessResult, fileHash);

      // 8. 构建返回结果
      const result = this.buildResult(request, uploadResult, postProcessResult, dbRecord);

      const duration = Date.now() - startTime;
      console.log(`✅ ${this.processorName}处理完成: ${request.filename} (${duration}ms)`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${this.processorName}处理失败: ${request.filename} (${duration}ms)`, error);

      throw TRPCErrorHandler.internalError(
        `文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 验证文件 - 基础验证
   */
  public async validateFile(buffer: Buffer, filename: string, mimeType: string): Promise<boolean> {
    // 基础验证
    if (!buffer || buffer.length === 0) {
      throw TRPCErrorHandler.validationError('文件内容为空');
    }

    if (!filename || filename.trim().length === 0) {
      throw TRPCErrorHandler.validationError('文件名不能为空');
    }

    if (!mimeType || mimeType.trim().length === 0) {
      throw TRPCErrorHandler.validationError('文件类型不能为空');
    }

    // 检查文件类型是否支持
    const uploadType = this.getUploadTypeFromMimeType(mimeType);
    if (!this.supportedTypes.includes(uploadType)) {
      throw TRPCErrorHandler.validationError(
        `${this.processorName}不支持此文件类型: ${mimeType}`
      );
    }

    // 子类可以重写此方法进行更详细的验证
    return await this.validateSpecificFile(buffer, filename, mimeType);
  }

  /**
   * 估算处理时间
   */
  public estimateProcessingTime(fileSize: number): number {
    // 基础估算：每MB需要100ms
    return Math.max(1000, Math.round(fileSize / 1024 / 1024 * 100));
  }



  /**
   * 上传到存储
   */
  protected async uploadToStorage(
    buffer: Buffer,
    storageKey: string,
    mimeType: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    try {
      const storageManager = await this.getStorageManager();
      const result = await storageManager.uploadFile({
        key: storageKey,
        buffer,
        contentType: mimeType, // 修复：使用正确的参数名
        size: buffer.length,   // 添加必需的size参数
        metadata: {
          ...metadata,
          processor: this.processorName,
          uploadedAt: new Date().toISOString(),
        },
      });

      return {
        url: result.url,
        cdnUrl: result.cdnUrl,
        storageKey,
        size: buffer.length,
        etag: result.etag,
      };
    } catch (error) {
      throw TRPCErrorHandler.internalError(
        `存储上传失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 保存到数据库
   */
  protected async saveToDatabase(
    request: UnifiedUploadRequest,
    uploadResult: any,
    postProcessResult: any,
    fileHash: string
  ): Promise<any> {
    try {
      // 确定媒体类型
      const mediaType = this.getMediaType(request.mimeType);

      // 构建数据库保存的数据对象，确保字段名正确
      // 优先使用处理后的文件大小，如果没有则使用原始大小
      const finalFileSize = uploadResult.size || postProcessResult.fileSize || request.buffer.length;

      const dbData = {
        filename: request.filename,
        originalName: request.filename, // 确保使用正确的字段名
        mimeType: request.mimeType,
        fileSize: finalFileSize, // 使用处理后的文件大小
        url: uploadResult.url,
        cdnUrl: uploadResult.cdnUrl,
        storageKey: uploadResult.storageKey,
        fileHash,
        uploadedBy: request.userId,
        postId: request.postId,
        mediaType,
        isProcessed: postProcessResult.isProcessed || false,
        processingStatus: postProcessResult.processingStatus || ProcessingStatus.COMPLETED,
        width: postProcessResult.width,
        height: postProcessResult.height,
        duration: postProcessResult.duration,
        thumbnailUrl: postProcessResult.thumbnailUrl,
        // 将元数据映射到现有字段
        videoCodec: postProcessResult.metadata?.codec,
        bitrate: postProcessResult.metadata?.bitrate,
        frameRate: postProcessResult.metadata?.framerate,
        originalCodec: postProcessResult.metadata?.originalCodec,
        isTranscoded: postProcessResult.metadata?.isTranscoded || false,
        storageProvider: 'CLOUDFLARE_R2',
      };

      console.log(`📊 文件大小信息: 原始=${request.buffer.length}, 上传结果=${uploadResult.size}, 后处理=${postProcessResult.fileSize}, 最终=${finalFileSize}`);

      console.log('🔍 数据库保存数据:', JSON.stringify(dbData, null, 2));

      return await prisma.postMedia.create({
        data: dbData,
      });
    } catch (error) {
      throw TRPCErrorHandler.internalError(
        `数据库保存失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 根据MIME类型确定媒体类型
   */
  protected getMediaType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'IMAGE';
    } else if (mimeType.startsWith('video/')) {
      return 'VIDEO';
    } else if (mimeType === 'image/gif') {
      return 'GIF';
    } else {
      return 'DOCUMENT';
    }
  }

  /**
   * 构建返回结果
   */
  protected buildResult(
    request: UnifiedUploadRequest,
    uploadResult: any,
    postProcessResult: any,
    dbRecord: any
  ): UnifiedUploadResult {
    // 使用处理后的文件大小
    const finalSize = postProcessResult.fileSize || uploadResult.size || request.buffer.length;

    return {
      success: true,
      fileId: dbRecord.id,
      url: uploadResult.url,
      cdnUrl: uploadResult.cdnUrl,
      filename: request.filename,
      originalFilename: request.filename,
      mimeType: request.mimeType,
      size: finalSize, // 使用处理后的大小
      originalSize: request.buffer.length, // 保留原始大小用于对比
      processedSize: finalSize, // 明确标识处理后的大小
      isProcessed: postProcessResult.isProcessed || false,
      processingStatus: postProcessResult.processingStatus || ProcessingStatus.COMPLETED,
      width: postProcessResult.width,
      height: postProcessResult.height,
      duration: postProcessResult.duration,
      storageKey: uploadResult.storageKey,
      storageProvider: 'cloudflare-r2',
      storagePath: uploadResult.storageKey,
      thumbnailUrl: postProcessResult.thumbnailUrl,
      thumbnailSizes: postProcessResult.thumbnailSizes,
      metadata: dbRecord.metadata,
      fileHash: dbRecord.fileHash,
      uploadStrategy: 'direct' as any,
      // 添加压缩相关信息
      compressionApplied: postProcessResult.metadata?.compressionApplied,
      compressionRatio: postProcessResult.metadata?.compressionRatio,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
      processedAt: postProcessResult.processedAt,
    };
  }

  /**
   * 从已存在文件创建结果
   */
  protected createResultFromExisting(existingFile: any): UnifiedUploadResult {
    return {
      success: true,
      fileId: existingFile.id,
      url: existingFile.url,
      cdnUrl: existingFile.cdnUrl,
      filename: existingFile.filename,
      originalFilename: existingFile.originalFilename,
      mimeType: existingFile.mimeType,
      size: existingFile.size,
      isProcessed: existingFile.isProcessed,
      processingStatus: existingFile.processingStatus as ProcessingStatus,
      width: existingFile.width,
      height: existingFile.height,
      duration: existingFile.duration,
      storageKey: existingFile.storageKey,
      storageProvider: 'cloudflare-r2',
      storagePath: existingFile.storageKey,
      thumbnailUrl: existingFile.thumbnailUrl,
      metadata: existingFile.metadata,
      fileHash: existingFile.fileHash,
      uploadStrategy: 'deduplication' as any,
      createdAt: existingFile.createdAt,
      updatedAt: existingFile.updatedAt,
    };
  }

  /**
   * 获取上传类型
   */
  protected getUploadTypeFromMimeType(mimeType: string): UploadType {
    if (mimeType.startsWith('image/')) return UploadType.IMAGE;
    if (mimeType.startsWith('video/')) return UploadType.VIDEO;
    if (mimeType.startsWith('audio/')) return UploadType.AUDIO;
    return UploadType.DOCUMENT;
  }

  // 抽象方法 - 子类必须实现

  /**
   * 特定文件验证 - 子类实现
   */
  protected abstract validateSpecificFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<boolean>;

  /**
   * 预处理文件 - 子类实现
   */
  protected abstract preprocessFile(request: UnifiedUploadRequest): Promise<{
    buffer: Buffer;
    metadata?: Record<string, any>;
  }>;

  /**
   * 后处理文件 - 子类实现
   */
  protected abstract postProcessFile(
    request: UnifiedUploadRequest,
    uploadResult: any
  ): Promise<{
    isProcessed: boolean;
    processingStatus: ProcessingStatus;
    width?: number;
    height?: number;
    duration?: number;
    thumbnailUrl?: string;
    thumbnailSizes?: Array<{ size: string; url: string; width: number; height: number }>;
    metadata?: Record<string, any>;
    processedAt?: Date;
  }>;
}
