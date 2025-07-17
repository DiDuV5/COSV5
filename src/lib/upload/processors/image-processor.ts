/**
 * @fileoverview 图片处理器
 * @description 专门处理图片文件的上传、压缩、缩略图生成等功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import sharp from 'sharp';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { BaseProcessor } from './base-processor';
import {
  UploadType,
  ProcessingStatus,
  type UnifiedUploadRequest,
} from '../core/index';
import {
  DEFAULT_IMAGE_COMPRESSION_CONFIG,
  getCompressionConfigForFileSize,
  shouldCompressImage,
  getCompressionLogInfo
} from '@/lib/config/image-compression-config';
import { WebPConversionService } from '@/lib/services/webp-conversion-service';
import { DEFAULT_WEBP_CONFIG } from '@/lib/config/webp-conversion-config';

/**
 * 图片处理器类
 */
export class ImageProcessor extends BaseProcessor {
  readonly processorName = 'ImageProcessor';
  readonly supportedTypes = [UploadType.IMAGE, UploadType.AVATAR];

  // WebP转换服务
  private webpService: WebPConversionService;

  // 支持的图片格式
  private readonly supportedFormats = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
  ];

  constructor() {
    super();
    this.webpService = new WebPConversionService(DEFAULT_WEBP_CONFIG);
  }

  // 默认配置
  private readonly defaultConfig = {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
    thumbnailSizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 600, height: 600 },
    ],
  };

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
        `不支持的图片格式: ${mimeType}。支持的格式: ${this.supportedFormats.join(', ')}`
      );
    }

    // 使用Sharp验证图片
    try {
      const metadata = await sharp(buffer).metadata();

      if (!metadata.width || !metadata.height) {
        throw TRPCErrorHandler.validationError('无法读取图片尺寸信息');
      }

      // 检查图片尺寸限制
      const maxDimension = 8192; // 8K分辨率
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        throw TRPCErrorHandler.validationError(
          `图片尺寸过大: ${metadata.width}x${metadata.height}。最大支持: ${maxDimension}x${maxDimension}`
        );
      }

      console.log(`📸 图片验证通过: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}`);
      return true;

    } catch (error) {
      if (error instanceof Error && error.message.includes('Input buffer contains unsupported image format')) {
        throw TRPCErrorHandler.validationError('图片格式损坏或不受支持');
      }
      throw error;
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
      const originalMetadata = await sharp(request.buffer).metadata();
      let processedBuffer = request.buffer;
      let needsProcessing = false;

      // 获取处理配置
      const maxWidth = request.maxWidth || this.defaultConfig.maxWidth;
      const maxHeight = request.maxHeight || this.defaultConfig.maxHeight;
      const quality = request.imageQuality || this.defaultConfig.quality;

      console.log(`🔧 图片预处理开始: ${originalMetadata.width}x${originalMetadata.height}, 大小: ${(request.buffer.length / 1024 / 1024).toFixed(2)}MB`);

      // 统一使用WebP处理策略
      const webpConfig = DEFAULT_WEBP_CONFIG;
      const compressionConfig = getCompressionConfigForFileSize(request.buffer.length);

      // 检查是否需要调整尺寸
      if (originalMetadata.width! > maxWidth || originalMetadata.height! > maxHeight) {
        needsProcessing = true;
        console.log(`📏 需要调整尺寸: ${maxWidth}x${maxHeight}`);
      }

      // 检查是否需要转换为WebP（除非已经是WebP）
      if (request.mimeType !== 'image/webp') {
        needsProcessing = true;
        console.log(`🔄 需要转换为WebP: ${request.mimeType} → image/webp`);
      }

      // 检查是否需要压缩（基于文件大小）
      if (request.buffer.length > DEFAULT_IMAGE_COMPRESSION_CONFIG.compressionThreshold) {
        needsProcessing = true;
        console.log(`🗜️ 需要压缩: ${(request.buffer.length / 1024 / 1024).toFixed(2)}MB > ${(DEFAULT_IMAGE_COMPRESSION_CONFIG.compressionThreshold / 1024 / 1024).toFixed(2)}MB`);
      }

      // 执行图片处理
      if (needsProcessing) {
        let sharpInstance = sharp(request.buffer);

        // 调整尺寸（保持宽高比）
        if (originalMetadata.width! > maxWidth || originalMetadata.height! > maxHeight) {
          sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        // 统一转换为WebP格式
        const hasTransparency = originalMetadata.hasAlpha || false;
        const isAnimated = (originalMetadata.pages || 1) > 1;
        const isLargeFile = request.buffer.length > webpConfig.largeSizeThreshold;

        // 确定WebP质量
        let webpQuality: number;
        let lossless = false;

        if (request.mimeType === 'image/png' && hasTransparency) {
          // PNG透明图片使用无损压缩
          webpQuality = webpConfig.losslessQuality;
          lossless = true;
          console.log(`📸 WebP无损压缩设置: PNG透明图片`);
        } else if (isAnimated) {
          // 动图使用专门的质量设置
          webpQuality = webpConfig.animatedQuality;
          console.log(`📸 WebP动图压缩设置: 质量${webpQuality}%`);
        } else if (isLargeFile) {
          // 大文件使用更激进的压缩
          webpQuality = webpConfig.largeLossyQuality;
          console.log(`📸 WebP大文件压缩设置: 质量${webpQuality}%`);
        } else {
          // 普通文件使用标准质量
          webpQuality = webpConfig.lossyQuality;
          console.log(`📸 WebP标准压缩设置: 质量${webpQuality}%`);
        }

        // 应用WebP压缩
        sharpInstance = sharpInstance.webp({
          quality: webpQuality,
          effort: webpConfig.effort,
          lossless: lossless,
        });

        processedBuffer = await sharpInstance.toBuffer();

        // 更新MIME类型为WebP
        request.mimeType = 'image/webp';

        // 更新文件名扩展名为.webp
        if (!request.filename.endsWith('.webp')) {
          const nameWithoutExt = request.filename.replace(/\.[^/.]+$/, '');
          request.filename = `${nameWithoutExt}.webp`;
        }

        const compressionRatio = Math.round(((request.buffer.length - processedBuffer.length) / request.buffer.length) * 100);
        console.log(`✨ WebP转换完成: ${(request.buffer.length / 1024 / 1024).toFixed(2)}MB → ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB (压缩${compressionRatio}%)`);

        // 保存处理后的大小到元数据
        (request as any).processingMetadata = {
          processedSize: processedBuffer.length,
          compressionRatio: compressionRatio,
          originalFormat: originalMetadata.format,
          finalFormat: 'webp'
        };
      }

      return {
        buffer: processedBuffer,
        metadata: {
          originalWidth: originalMetadata.width,
          originalHeight: originalMetadata.height,
          originalFormat: originalMetadata.format,
          originalSize: request.buffer.length,
          processedSize: processedBuffer.length, // 添加处理后的大小
          processed: needsProcessing,
          compressionApplied: needsProcessing && processedBuffer.length < request.buffer.length,
          compressionRatio: needsProcessing ? ((request.buffer.length - processedBuffer.length) / request.buffer.length * 100) : 0,
          processingConfig: needsProcessing ? {
            maxWidth,
            maxHeight,
            quality,
            compressionThreshold: DEFAULT_IMAGE_COMPRESSION_CONFIG.compressionThreshold
          } : undefined,
        },
      };

    } catch (error) {
      throw TRPCErrorHandler.internalError(
        `图片预处理失败: ${error instanceof Error ? error.message : '未知错误'}`
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
    thumbnailUrl?: string;
    thumbnailSizes?: Array<{ size: string; url: string; width: number; height: number }>;
    fileSize?: number;
    metadata?: Record<string, any>;
    processedAt?: Date;
  }> {
    try {
      // 获取处理后的图片信息
      const metadata = await sharp(request.buffer).metadata();
      const width = metadata.width!;
      const height = metadata.height!;

      let thumbnailUrl: string | undefined;
      let thumbnailSizes: Array<{ size: string; url: string; width: number; height: number }> | undefined;

      // 生成缩略图
      if (request.generateThumbnails !== false) {
        console.log(`🖼️ 开始生成缩略图...`);

        const thumbnailResults = await this.generateThumbnails(
          request.buffer,
          uploadResult.storageKey,
          request.mimeType
        );

        thumbnailUrl = thumbnailResults.find(t => t.size === 'medium')?.url;
        thumbnailSizes = thumbnailResults;

        console.log(`✅ 缩略图生成完成: ${thumbnailResults.length}个尺寸`);
      }

      // WebP转换已在预处理中完成，无需异步转换
      let webpUrl: string | undefined;
      const webpConversionApplied = request.mimeType === 'image/webp';

      if (webpConversionApplied) {
        webpUrl = uploadResult.url;
        console.log(`✅ WebP转换已在预处理中完成，URL: ${webpUrl}`);
      } else {
        console.log(`ℹ️ 文件未转换为WebP (可能是不支持的格式)`);
      }

      // 获取处理后的文件大小（从预处理元数据中获取）
      const processedFileSize = (request as any).processingMetadata?.processedSize || uploadResult.size || request.buffer.length;

      console.log(`📊 图片处理大小信息: 原始=${request.buffer.length}, 处理后=${processedFileSize}, 压缩=${processedFileSize < request.buffer.length ? '是' : '否'}`);

      return {
        isProcessed: true,
        processingStatus: ProcessingStatus.COMPLETED,
        width,
        height,
        thumbnailUrl,
        thumbnailSizes,
        fileSize: processedFileSize, // 添加处理后的文件大小
        metadata: {
          format: metadata.format,
          colorSpace: metadata.space,
          hasAlpha: metadata.hasAlpha,
          density: metadata.density,
          exif: metadata.exif ? 'present' : 'none',
          originalSize: request.buffer.length,
          processedSize: processedFileSize,
          compressionApplied: processedFileSize < request.buffer.length,
          compressionRatio: processedFileSize < request.buffer.length ?
            Math.round(((request.buffer.length - processedFileSize) / request.buffer.length) * 100) : 0,
          webpConversion: webpConversionApplied ? {
            enabled: true,
            async: false, // 现在是同步处理
            processedAt: new Date().toISOString(),
            webpUrl: webpUrl,
            method: 'sync-preprocessing', // 标识为预处理中完成
          } : undefined,
        },
        processedAt: new Date(),
      };

    } catch (error) {
      console.error('图片后处理失败:', error);

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
   * 生成缩略图
   */
  private async generateThumbnails(
    buffer: Buffer,
    originalStorageKey: string,
    mimeType: string
  ): Promise<Array<{ size: string; url: string; width: number; height: number }>> {
    const results: Array<{ size: string; url: string; width: number; height: number }> = [];

    // 确定缩略图格式和MIME类型
    const isWebP = mimeType === 'image/webp';
    const thumbnailFormat = isWebP ? 'webp' : 'jpeg';
    const thumbnailMimeType = isWebP ? 'image/webp' : 'image/jpeg';
    const thumbnailExtension = isWebP ? 'webp' : 'jpg';

    for (const size of this.defaultConfig.thumbnailSizes) {
      try {
        // 生成缩略图 - 保持原始格式
        let sharpInstance = sharp(buffer)
          .resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
          });

        // 根据原始格式设置输出格式
        if (isWebP) {
          sharpInstance = sharpInstance.webp({ quality: 80 });
        } else {
          sharpInstance = sharpInstance.jpeg({ quality: 80 });
        }

        const thumbnailBuffer = await sharpInstance.toBuffer();

        // 生成存储键 - 确保扩展名与格式匹配
        const thumbnailKey = originalStorageKey.replace(
          /(\.[^.]+)$/,
          `_${size.name}.${thumbnailExtension}`
        );

        // 上传缩略图 - 使用正确的MIME类型
        const uploadResult = await this.storageManager.uploadFile({
          key: thumbnailKey,
          buffer: thumbnailBuffer,
          contentType: thumbnailMimeType, // 修复：使用正确的参数名
          size: thumbnailBuffer.length,   // 添加必需的size参数
          metadata: {
            type: 'thumbnail',
            size: size.name,
            originalKey: originalStorageKey,
            format: thumbnailFormat,
          },
        });

        results.push({
          size: size.name,
          url: uploadResult.url,
          width: size.width,
          height: size.height,
        });

        console.log(`✅ 缩略图生成成功 (${size.name}): ${thumbnailKey}, MIME: ${thumbnailMimeType}`);

      } catch (error) {
        console.error(`❌ 缩略图生成失败 (${size.name}):`, error);
        // 继续处理其他尺寸
      }
    }

    return results;
  }

  /**
   * 估算处理时间
   */
  public override estimateProcessingTime(fileSize: number): number {
    // 图片处理相对较快：每MB需要50ms，加上缩略图生成时间
    const baseTime = Math.round(fileSize / 1024 / 1024 * 50);
    const thumbnailTime = this.defaultConfig.thumbnailSizes.length * 200; // 每个缩略图200ms
    return Math.max(500, baseTime + thumbnailTime);
  }
}
