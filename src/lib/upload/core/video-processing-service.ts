/**
 * @fileoverview 统一视频处理服务
 * @description 合并所有视频处理功能的统一服务，替代多个重复的视频处理器
 * @author Augment AI
 * @date 2025-07-01
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { FFmpegProcessor } from '../ffmpeg-processor';
import { globalServiceManager } from '../global-service-manager';

/**
 * 视频处理选项
 */
export interface VideoProcessingOptions {
  /** 强制H.264编码 */
  forceH264?: boolean;
  /** 生成缩略图 */
  generateThumbnail?: boolean;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** 视频质量 */
  quality?: number;
  /** 启用转码 */
  enableTranscoding?: boolean;
}

/**
 * 视频处理结果
 */
export interface VideoProcessingResult {
  success: boolean;
  filename: string;
  url: string;
  cdnUrl: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  thumbnailUrl?: string;
  wasTranscoded: boolean;
  processingTime: number;
  error?: string;
}

/**
 * 上传请求接口
 */
export interface VideoUploadRequest {
  filename: string;
  mimeType: string;
  userId: string;
  userLevel: string;
  postId?: string;
  autoTranscodeVideo?: boolean;
  generateThumbnails?: boolean;
}

/**
 * 统一视频处理服务
 * 整合所有视频处理功能，消除重复代码
 */
export class VideoProcessingService {
  private static instance: VideoProcessingService;
  private tempDir: string;
  private initialized = false;

  private constructor() {
    this.tempDir = path.join(process.cwd(), 'tmp', 'video-processing');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): VideoProcessingService {
    if (!VideoProcessingService.instance) {
      VideoProcessingService.instance = new VideoProcessingService();
    }
    return VideoProcessingService.instance;
  }

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      this.initialized = true;
      console.log('✅ 统一视频处理服务初始化完成');
    } catch (error) {
      console.error('❌ 视频处理服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 处理视频上传
   */
  public async processVideoUpload(
    buffer: Buffer,
    request: VideoUploadRequest,
    options: VideoProcessingOptions = {}
  ): Promise<VideoProcessingResult> {
    const startTime = Date.now();

    try {
      await this.initialize();

      console.log(`🎬 开始处理视频: ${request.filename} (${Math.round(buffer.length / 1024 / 1024)}MB)`);

      // 1. 验证视频文件
      const validation = await this.validateVideo(buffer, request.filename);
      if (!validation.isValid) {
        throw new Error(`视频验证失败: ${validation.error}`);
      }

      // 2. 检查是否需要转码
      const needsTranscoding = await this.checkTranscodingNeeded(buffer, request.filename, options);

      console.log(`🔍 视频编码检查: ${validation.codec} (需要转码: ${needsTranscoding})`);

      let processedBuffer = buffer;
      let wasTranscoded = false;
      let metadata = validation.metadata;

      // 3. 执行转码（如果需要）
      if (needsTranscoding) {
        const transcodingResult = await this.transcodeVideo(buffer, request.filename, options);
        processedBuffer = transcodingResult.buffer;
        wasTranscoded = true;
        metadata = transcodingResult.metadata;
        console.log(`✅ 视频转码完成: ${request.filename}`);
      }

      // 4. 生成存储键
      const fileHash = createHash('md5').update(processedBuffer).digest('hex').substring(0, 8);
      const storageKey = this.generateStorageKey(request.filename, request.userId, fileHash, wasTranscoded);

      // 5. 上传到R2存储
      const uploadResult = await this.uploadToStorage(processedBuffer, storageKey, request);

      // 6. 保存到数据库
      const mediaRecord = await this.saveToDatabase(uploadResult, request, metadata, wasTranscoded);

      return {
        success: true,
        filename: storageKey,
        url: uploadResult.url,
        cdnUrl: uploadResult.cdnUrl,
        fileSize: processedBuffer.length,
        width: metadata?.width,
        height: metadata?.height,
        duration: metadata?.duration,
        thumbnailUrl: metadata?.thumbnailUrl,
        wasTranscoded,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error(`❌ 视频处理失败: ${request.filename}`, error);
      return {
        success: false,
        filename: request.filename,
        url: '',
        cdnUrl: '',
        fileSize: buffer.length,
        wasTranscoded: false,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : '视频处理失败',
      };
    }
  }

  /**
   * 验证视频文件
   */
  private async validateVideo(buffer: Buffer, filename: string): Promise<{
    isValid: boolean;
    codec?: string;
    metadata?: any;
    error?: string;
  }> {
    try {
      const tempPath = path.join(this.tempDir, `temp_${Date.now()}_${filename}`);
      await fs.writeFile(tempPath, buffer);

      try {
        const metadata = await FFmpegProcessor.extractVideoMetadata(tempPath);
        return {
          isValid: true,
          codec: metadata.codec,
          metadata,
        };
      } finally {
        await fs.unlink(tempPath).catch(() => { });
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '视频验证失败',
      };
    }
  }

  /**
   * 检查是否需要转码
   */
  private async checkTranscodingNeeded(
    buffer: Buffer,
    filename: string,
    options: VideoProcessingOptions
  ): Promise<boolean> {
    // 如果明确禁用转码
    if (options.enableTranscoding === false) {
      return false;
    }

    // 如果强制H.264转码
    if (options.forceH264) {
      return true;
    }

    try {
      const tempPath = path.join(this.tempDir, `check_${Date.now()}_${filename}`);
      await fs.writeFile(tempPath, buffer);

      try {
        const metadata = await FFmpegProcessor.extractVideoMetadata(tempPath);

        // 检查编码格式
        const h264Codecs = ['h264', 'avc', 'avc1', 'x264'];
        const isH264 = h264Codecs.some(codec =>
          metadata.codec.toLowerCase().includes(codec.toLowerCase())
        );

        if (!isH264) {
          console.log(`🔍 检测到非H.264编码: ${metadata.codec}, 需要转码`);
          return true;
        }

        // 检查分辨率
        if (options.maxWidth && metadata.width > options.maxWidth) {
          console.log(`🔍 视频宽度超限: ${metadata.width} > ${options.maxWidth}, 需要转码`);
          return true;
        }

        if (options.maxHeight && metadata.height > options.maxHeight) {
          console.log(`🔍 视频高度超限: ${metadata.height} > ${options.maxHeight}, 需要转码`);
          return true;
        }

        console.log(`✅ 视频格式兼容，无需转码: ${metadata.codec} ${metadata.width}x${metadata.height}`);
        return false;

      } finally {
        await fs.unlink(tempPath).catch(() => { });
      }
    } catch (error) {
      console.warn('检查转码需求失败:', error);
      // 出错时默认转码以确保安全
      return true;
    }
  }

  /**
   * 转码视频
   */
  private async transcodeVideo(
    buffer: Buffer,
    filename: string,
    options: VideoProcessingOptions
  ): Promise<{ buffer: Buffer; metadata: any }> {
    const inputPath = path.join(this.tempDir, `input_${Date.now()}_${filename}`);
    const outputPath = path.join(this.tempDir, `output_${Date.now()}_h264.mp4`);

    try {
      await fs.writeFile(inputPath, buffer);

      console.log(`🔄 开始H.264转码: ${filename}`);

      await FFmpegProcessor.transcodeVideo(inputPath, outputPath, {
        codec: 'libx264',
        preset: 'medium',
        crf: options.quality || 26,
        maxWidth: options.maxWidth || 1920,
        maxHeight: options.maxHeight || 1080,
      });

      const transcodedBuffer = await fs.readFile(outputPath);
      const metadata = await FFmpegProcessor.extractVideoMetadata(outputPath);

      console.log(`✅ 转码完成: ${Math.round(transcodedBuffer.length / 1024 / 1024)}MB, ${metadata.codec}`);

      return { buffer: transcodedBuffer, metadata };

    } finally {
      // 清理临时文件
      await Promise.all([
        fs.unlink(inputPath).catch(() => { }),
        fs.unlink(outputPath).catch(() => { }),
      ]);
    }
  }

  /**
   * 生成存储键
   */
  private generateStorageKey(
    filename: string,
    userId: string,
    fileHash: string,
    wasTranscoded: boolean
  ): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const timestamp = Date.now();
    const ext = wasTranscoded ? 'mp4' : path.extname(filename);
    const suffix = wasTranscoded ? '_h264' : '';

    return `uploads/${year}/${month}/${day}/${userId}/${timestamp}_${fileHash}${suffix}${ext}`;
  }

  /**
   * 上传到存储
   */
  private async uploadToStorage(
    buffer: Buffer,
    storageKey: string,
    request: VideoUploadRequest
  ): Promise<{ url: string; cdnUrl: string }> {
    try {
      const r2Manager = await globalServiceManager.getR2ClientManager();
      const r2Client = r2Manager.getClient();

      const { PutObjectCommand } = await import('@aws-sdk/client-s3');
      const uploadResult = await r2Client.send(new PutObjectCommand({
        Bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME!,
        Key: storageKey,
        Body: buffer,
        ContentType: request.mimeType,
        Metadata: {
          originalName: request.filename,
          userId: request.userId,
          uploadTime: new Date().toISOString(),
          processedVideo: 'true',
        },
      }));

      const cdnDomain = process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN || 'https://pub-5c260d3ebc214eb5bdcdf7e45225fe5b.r2.dev';
      const url = `${cdnDomain}/${storageKey}`;
      return {
        url,
        cdnUrl: url,
      };
    } catch (error) {
      console.error('❌ 视频上传到R2失败:', error);
      throw TRPCErrorHandler.uploadError(
        'UPLOAD_FAILED',
        `视频上传失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 保存到数据库
   */
  private async saveToDatabase(
    uploadResult: { url: string; cdnUrl: string },
    request: VideoUploadRequest,
    metadata: any,
    wasTranscoded: boolean
  ): Promise<any> {
    try {
      const mediaRecord = await prisma.postMedia.create({
        data: {
          filename: path.basename(uploadResult.url),
          originalName: request.filename,
          mimeType: request.mimeType,
          fileSize: metadata?.fileSize || 0,
          url: uploadResult.url,
          uploadedBy: request.userId,
          mediaType: 'VIDEO', // 添加媒体类型
          width: metadata?.width,
          height: metadata?.height,
          duration: metadata?.duration,
          thumbnailUrl: metadata?.thumbnailUrl,
          isProcessed: true, // 添加处理状态
          processingStatus: 'COMPLETED', // 添加处理状态
          // 将元数据映射到现有字段
          videoCodec: metadata?.codec,
          bitrate: metadata?.bitrate,
          frameRate: metadata?.framerate,
          originalCodec: metadata?.originalCodec,
          isTranscoded: wasTranscoded,
          storageProvider: 'CLOUDFLARE_R2',
        },
      });

      console.log(`💾 视频数据库记录已创建: ${mediaRecord.id}`);
      return mediaRecord;
    } catch (error) {
      console.error('❌ 保存视频记录到数据库失败:', error);
      throw TRPCErrorHandler.internalError(
        `保存视频记录失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }
}

/**
 * 导出单例实例
 */
export const videoProcessingService = VideoProcessingService.getInstance();
