/**
 * @fileoverview 重构后的视频处理器主类
 * @description 专门处理视频文件的上传、H.264转码、缩略图生成等功能
 * @author Augment AI
 * @date 2025-07-15
 * @version 2.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { unlink, writeFile } from 'fs/promises';
import path from 'path';
import {
  ProcessingStatus,
  UploadType,
  type UnifiedUploadRequest,
} from '../../core/index';
import { BaseProcessor } from '../base-processor';
import type { VideoValidationOptions } from './types';
import { VideoMetadataExtractor } from './VideoMetadataExtractor';
import { VideoThumbnailGenerator } from './VideoThumbnailGenerator';
import { VideoTranscoder } from './VideoTranscoder';

/**
 * 重构后的视频处理器类
 */
export class VideoProcessor extends BaseProcessor {
  readonly processorName = 'VideoProcessor';
  readonly supportedTypes = [UploadType.VIDEO];

  // 支持的视频格式
  private readonly supportedFormats = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    'video/m4v',
  ];

  // 临时文件目录
  private readonly tempDir = path.join(process.cwd(), 'temp', 'video-processing');

  // 子模块实例
  private readonly metadataExtractor: VideoMetadataExtractor;
  private readonly transcoder: VideoTranscoder;
  private readonly thumbnailGenerator: VideoThumbnailGenerator;

  constructor() {
    super();
    this.ensureTempDir();

    // 初始化子模块
    this.metadataExtractor = new VideoMetadataExtractor();
    this.transcoder = new VideoTranscoder(this.tempDir);
    this.thumbnailGenerator = new VideoThumbnailGenerator(this.tempDir, () => this.getStorageManager());
  }

  /**
   * 确保临时目录存在
   */
  private async ensureTempDir(): Promise<void> {
    try {
      const { existsSync } = await import('fs');
      const { mkdir } = await import('fs/promises');

      if (!existsSync(this.tempDir)) {
        await mkdir(this.tempDir, { recursive: true });
        console.log(`📁 创建临时目录: ${this.tempDir}`);
      }
    } catch (error) {
      console.error('❌ 创建临时目录失败:', error);
      throw TRPCErrorHandler.internalError('视频处理临时目录创建失败');
    }
  }

  /**
   * 创建安全的文件名
   */
  private createSafeFilename(filename: string): string {
    // 获取文件扩展名
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);

    // 移除特殊字符，只保留字母、数字、下划线和连字符
    const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');

    return `${safeName}${ext}`;
  }

  /**
   * 特定文件验证
   */
  protected async validateSpecificFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<boolean> {
    // 检查MIME类型
    if (!this.supportedFormats.includes(mimeType)) {
      throw TRPCErrorHandler.validationError(
        `不支持的视频格式: ${mimeType}。支持的格式: ${this.supportedFormats.join(', ')}`
      );
    }

    // 检查文件大小限制（1GB）
    const maxSize = 1024 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw TRPCErrorHandler.validationError(
        `视频文件过大: ${Math.round(buffer.length / 1024 / 1024)}MB。最大支持: ${Math.round(maxSize / 1024 / 1024)}MB`
      );
    }

    // 使用FFmpeg验证视频文件
    let tempFilePath: string | undefined;
    try {
      // 创建安全的文件名，移除特殊字符
      const safeFilename = this.createSafeFilename(filename);
      tempFilePath = path.join(this.tempDir, `validate_${Date.now()}_${safeFilename}`);

      console.log(`🔧 文件名处理: "${filename}" -> "${safeFilename}"`);
      console.log(`📁 临时文件路径: ${tempFilePath}`);
      console.log(`📊 文件大小: ${Math.round(buffer.length / 1024 / 1024)}MB`);

      // 确保临时目录存在
      await this.ensureTempDir();

      // 写入临时文件
      await writeFile(tempFilePath, buffer);
      console.log(`✅ 临时文件写入成功: ${tempFilePath}`);

      // 验证文件是否写入成功
      const { stat } = await import('fs/promises');
      const fileStats = await stat(tempFilePath);
      console.log(`📋 临时文件状态: 大小=${fileStats.size}字节, 可读=${fileStats.isFile()}`);

      if (fileStats.size !== buffer.length) {
        throw new Error(`临时文件大小不匹配: 期望${buffer.length}字节, 实际${fileStats.size}字节`);
      }

      // 获取视频元数据并验证
      console.log(`🔍 开始提取视频元数据...`);
      const metadata = await this.metadataExtractor.getVideoMetadata(tempFilePath);

      const validationOptions: VideoValidationOptions = {
        maxSize,
        maxDuration: 3600, // 1小时
        supportedFormats: this.supportedFormats
      };

      this.metadataExtractor.validateVideoMetadata(metadata, validationOptions);

      console.log(`📊 视频元数据:`, {
        codec: metadata.codec,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        bitrate: metadata.bitrate,
        format: metadata.format
      });

      return true;

    } catch (error) {
      console.error('🚨 视频验证异常详情:', {
        filename,
        mimeType,
        bufferSize: buffer.length,
        tempFilePath,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });

      // 如果是已知的验证错误，直接抛出
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }

      // 根据错误类型提供更具体的错误信息
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('no such file') || errorMessage.includes('enoent')) {
          throw TRPCErrorHandler.validationError('临时文件创建失败，请检查系统权限');
        }

        if (errorMessage.includes('invalid data') || errorMessage.includes('unknown format')) {
          throw TRPCErrorHandler.validationError('视频文件格式无效或已损坏');
        }

        if (errorMessage.includes('permission denied') || errorMessage.includes('eacces')) {
          throw TRPCErrorHandler.validationError('文件权限错误，无法处理视频文件');
        }

        if (errorMessage.includes('timeout') || errorMessage.includes('killed')) {
          throw TRPCErrorHandler.validationError('视频处理超时，文件可能过大或损坏');
        }

        if (errorMessage.includes('ffprobe') || errorMessage.includes('ffmpeg')) {
          throw TRPCErrorHandler.validationError(`视频处理工具错误: ${error.message}`);
        }

        // 其他未知错误
        throw TRPCErrorHandler.validationError(`视频文件验证失败: ${error.message}`);
      }

      throw TRPCErrorHandler.validationError('视频文件损坏或格式不受支持');
    } finally {
      // 确保清理临时文件
      if (tempFilePath) {
        try {
          await unlink(tempFilePath);
          console.log(`🧹 临时文件清理成功: ${tempFilePath}`);
        } catch (cleanupError) {
          console.warn(`⚠️ 临时文件清理失败: ${tempFilePath}`, cleanupError);
        }
      }
    }
  }

  /**
   * 预处理文件
   */
  protected async preprocessFile(request: UnifiedUploadRequest): Promise<{
    buffer: Buffer;
    metadata?: Record<string, any>;
  }> {
    try {
      // 使用转码器进行预处理
      const result = await this.transcoder.preprocessVideo(
        request.buffer,
        request.filename,
        request.autoTranscodeVideo !== false
      );

      return result;
    } catch (error) {
      throw TRPCErrorHandler.internalError(
        `视频预处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 后处理文件
   */
  protected async postProcessFile(
    request: UnifiedUploadRequest,
    uploadResult: any
  ): Promise<{
    isProcessed: boolean;
    processingStatus: ProcessingStatus;
    width?: number;
    height?: number;
    duration?: number;
    thumbnailUrl?: string;
    metadata?: Record<string, any>;
    processedAt?: Date;
  }> {
    try {
      // 获取视频信息
      const tempFilePath = path.join(this.tempDir, `postprocess_${Date.now()}_${request.filename}`);
      await writeFile(tempFilePath, request.buffer);

      const metadata = await this.metadataExtractor.getVideoMetadata(tempFilePath);

      let thumbnailUrl: string | undefined;

      // 生成视频缩略图
      if (request.generateThumbnails !== false) {
        console.log(`🖼️ 开始生成视频缩略图...`);

        thumbnailUrl = await this.thumbnailGenerator.generateVideoThumbnail(tempFilePath, {
          originalStorageKey: uploadResult.storageKey,
          duration: metadata.duration
        });

        console.log(`✅ 视频缩略图生成完成`);
      }

      // 从处理元数据中获取转码信息
      const processingMetadata = (request as any).processingMetadata || {};
      const isTranscoded = processingMetadata.transcoded || false;
      const originalCodec = processingMetadata.originalCodec;

      // 如果转码了，使用转码后的编码信息；否则使用原始元数据
      const finalCodec = isTranscoded ? 'h264' : metadata.codec;
      const finalMetadata = {
        ...metadata,
        codec: finalCodec
      };

      console.log(`🔍 视频编码信息调试:`, {
        isTranscoded,
        originalCodec,
        metadataCodec: metadata.codec,
        finalCodec,
        thumbnailUrl,
        processingMetadata: JSON.stringify(processingMetadata, null, 2)
      });

      // 清理临时文件
      await unlink(tempFilePath).catch(() => { });

      return {
        isProcessed: true,
        processingStatus: ProcessingStatus.COMPLETED,
        width: finalMetadata.width,
        height: finalMetadata.height,
        duration: finalMetadata.duration,
        thumbnailUrl,
        metadata: {
          codec: finalMetadata.codec,
          bitrate: finalMetadata.bitrate,
          framerate: finalMetadata.framerate,
          format: finalMetadata.format,
          isH264: this.metadataExtractor.isH264Encoded(finalMetadata),
          originalCodec,
          isTranscoded,
        },
        processedAt: new Date(),
      };

    } catch (error) {
      console.error('视频后处理失败:', error);

      return {
        isProcessed: false,
        processingStatus: ProcessingStatus.FAILED,
        metadata: {
          error: error instanceof Error ? error.message : '未知错误',
        },
        processedAt: new Date(),
      };
    }
  }

  /**
   * 估算处理时间
   */
  public override estimateProcessingTime(fileSize: number): number {
    // 视频处理较慢：每MB需要2秒，加上转码时间
    const baseTime = Math.round(fileSize / 1024 / 1024 * 2000);
    const transcodingTime = this.transcoder.estimateTranscodingTime(fileSize);
    return Math.max(5000, baseTime + transcodingTime);
  }
}
