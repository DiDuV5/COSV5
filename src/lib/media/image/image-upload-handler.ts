/**
 * @fileoverview 图片上传处理器
 * @description 集成图片处理和存储上传的完整流程
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const handler = new ImageUploadHandler();
 * const result = await handler.handleImageUpload(buffer, filename);
 *
 * @dependencies
 * - ./image-processor: 图片处理器
 * - ../storage/storage-manager: 存储管理器
 * - ../../prisma: 数据库操作
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，集成图片处理和存储上传
 */

import { ImageProcessor, ImageProcessingOptions, ProcessedImage } from './image-processor';
import { globalStorageManager } from '../storage/storage-manager';
import { prisma } from '../../prisma';
import crypto from 'crypto';

export interface ImageUploadResult {
  success: boolean;
  mediaId?: string;
  originalImage?: {
    url: string;
    cdnUrl: string;
    fileSize: number;
  };
  processedImages?: Array<{
    size: string;
    format: string;
    url: string;
    cdnUrl: string;
    width: number;
    height: number;
    fileSize: number;
  }>;
  error?: string;
  processingTime?: number;
}

export interface ImageUploadOptions extends ImageProcessingOptions {
  /** 关联的帖子ID */
  postId?: string;
  /** 图片标题 */
  caption?: string;
  /** 替代文本 */
  altText?: string;
  /** 是否上传原图 */
  uploadOriginal?: boolean;
  /** 元数据 */
  metadata?: Record<string, string>;
}

export class ImageUploadHandler {
  private processor: ImageProcessor;

  constructor() {
    this.processor = new ImageProcessor();
  }

  /**
   * 处理图片上传的完整流程
   */
  async handleImageUpload(
    buffer: Buffer,
    originalFilename: string,
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    const startTime = Date.now();

    try {
      console.log(`📸 开始处理图片上传: ${originalFilename}`);

      // 初始化存储管理器
      await globalStorageManager.initialize();

      // 验证图片格式
      const isValidImage = await this.processor.validateImage(buffer);
      if (!isValidImage) {
        throw new Error('Invalid image format');
      }

      // 处理图片生成多尺寸版本
      const processingResult = await this.processor.processImage(
        buffer,
        originalFilename,
        options
      );

      if (!processingResult.success) {
        throw new Error(processingResult.error || 'Image processing failed');
      }

      const { originalInfo, processedImages } = processingResult;

      // 计算文件哈希
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // 检查是否已存在相同文件
      const existingFile = await prisma.fileHash.findUnique({
        where: { hash: fileHash }
      });

      if (existingFile) {
        console.log(`♻️ 文件已存在，复用现有记录: ${originalFilename}`);

        // 更新引用计数
        await prisma.fileHash.update({
          where: { hash: fileHash },
          data: {
            uploadCount: { increment: 1 },
            lastUploadAt: new Date()
          }
        });

        // 为当前上传创建新的PostMedia记录（与视频处理器保持一致）
        const duplicateMediaRecord = await prisma.postMedia.create({
          data: {
            postId: options.postId, // 可能为null，后续通过mediaIds关联
            filename: originalFilename,
            originalName: originalFilename,
            mimeType: `image/${originalInfo?.format}`,
            fileSize: buffer.length,
            fileHash: fileHash,
            mediaType: 'IMAGE',
            url: existingFile.url,

            // 复用现有文件的元数据
            width: existingFile.width,
            height: existingFile.height,

            // 处理状态
            isProcessed: true,
            processingStatus: 'COMPLETED',
            storageProvider: 'CLOUDFLARE_R2',
            order: 1,
          }
        });

        console.log(`✅ 图片去重处理完成，创建新媒体记录: ${duplicateMediaRecord.id}`);

        return {
          success: true,
          mediaId: duplicateMediaRecord.id,
          originalImage: {
            url: existingFile.url,
            cdnUrl: existingFile.url, // 使用现有URL作为CDN URL
            fileSize: buffer.length,
          }
        };
      }

      // 上传原图（如果需要）
      let originalUploadResult;
      if (options.uploadOriginal !== false) {
        console.log('📤 上传原图...');
        originalUploadResult = await globalStorageManager.uploadWithFallback(
          buffer,
          originalFilename,
          {
            contentType: `image/${originalInfo?.format}`,
            metadata: {
              ...options.metadata,
              type: 'original',
              width: originalInfo?.width?.toString() || '0',
              height: originalInfo?.height?.toString() || '0'
            }
          }
        );

        if (!originalUploadResult.success) {
          throw new Error(`Original image upload failed: ${originalUploadResult.error}`);
        }
      }

      // 上传处理后的图片
      const uploadedImages: Array<{
        size: string;
        format: string;
        url: string;
        cdnUrl: string;
        width: number;
        height: number;
        fileSize: number;
      }> = [];

      if (processedImages) {
        for (const processedImage of processedImages) {
          console.log(`📤 上传 ${processedImage.size} (${processedImage.format})...`);

          const uploadResult = await globalStorageManager.uploadWithFallback(
            processedImage.buffer,
            processedImage.filename,
            {
              contentType: `image/${processedImage.format}`,
              metadata: {
                ...options.metadata,
                type: processedImage.size,
                format: processedImage.format,
                width: processedImage.width.toString(),
                height: processedImage.height.toString()
              }
            }
          );

          if (uploadResult.success) {
            uploadedImages.push({
              size: processedImage.size,
              format: processedImage.format,
              url: uploadResult.url!,
              cdnUrl: uploadResult.cdnUrl!,
              width: processedImage.width,
              height: processedImage.height,
              fileSize: processedImage.fileSize
            });
            console.log(`✅ ${processedImage.size} 上传成功`);
          } else {
            console.warn(`⚠️ ${processedImage.size} 上传失败: ${uploadResult.error}`);
          }
        }
      }

      // 创建或更新FileHash记录
      if (!existingFile) {
        await prisma.fileHash.create({
          data: {
            hash: fileHash,
            filename: originalFilename,
            mimeType: `image/${originalInfo?.format}`,
            fileSize: buffer.length,
            url: originalUploadResult?.url || uploadedImages[0]?.url || '',
            uploadCount: 1
          }
        });
      }

      // 创建主媒体记录
      const mediaRecord = await prisma.postMedia.create({
        data: {
          postId: options.postId,
          filename: originalUploadResult?.key || uploadedImages[0]?.url.split('/').pop() || originalFilename,
          originalName: originalFilename,
          mimeType: `image/${originalInfo?.format}`,
          fileSize: buffer.length,
          fileHash: fileHash,
          mediaType: 'IMAGE',
          url: originalUploadResult?.url || uploadedImages[0]?.url || '',
          cdnUrl: originalUploadResult?.cdnUrl || uploadedImages[0]?.cdnUrl || '',

          // 图片特有字段
          width: originalInfo?.width,
          height: originalInfo?.height,

          // 多尺寸URL字段
          thumbnailUrl: uploadedImages.find(img => img.size === 'thumbnail')?.cdnUrl,
          smallUrl: uploadedImages.find(img => img.size === 'small')?.cdnUrl,
          mediumUrl: uploadedImages.find(img => img.size === 'medium')?.cdnUrl,
          largeUrl: uploadedImages.find(img => img.size === 'large')?.cdnUrl,

          // 处理状态
          isProcessed: true,
          processingStatus: 'COMPLETED',

          // 其他字段
          caption: options.caption,
          altText: options.altText,
          storageProvider: originalUploadResult?.provider || uploadedImages[0]?.url.includes('r2.dev') ? 'cloudflare-r2' : 'local'
        }
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log(`🎉 图片上传完成: ${originalFilename}`);
      console.log(`📊 生成版本: ${uploadedImages.length}个`);
      console.log(`⏱️ 总耗时: ${totalTime}ms`);

      return {
        success: true,
        mediaId: mediaRecord.id,
        originalImage: originalUploadResult ? {
          url: originalUploadResult.url!,
          cdnUrl: originalUploadResult.cdnUrl!,
          fileSize: buffer.length
        } : undefined,
        processedImages: uploadedImages,
        processingTime: totalTime
      };

    } catch (error) {
      console.error(`❌ 图片上传失败: ${originalFilename}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    } finally {
      // 清理临时文件
      this.processor.cleanup();
    }
  }

  /**
   * 批量处理图片上传
   */
  async handleBatchUpload(
    images: Array<{ buffer: Buffer; filename: string; options?: ImageUploadOptions }>,
    globalOptions: ImageUploadOptions = {}
  ): Promise<ImageUploadResult[]> {
    console.log(`🔄 开始批量上传 ${images.length} 张图片`);

    const results: ImageUploadResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const { buffer, filename, options = {} } = images[i];
      console.log(`📷 处理第 ${i + 1}/${images.length} 张: ${filename}`);

      const mergedOptions = { ...globalOptions, ...options };
      const result = await this.handleImageUpload(buffer, filename, mergedOptions);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    console.log(`📊 批量上传完成:`);
    console.log(`   成功: ${successCount}张`);
    console.log(`   失败: ${failCount}张`);

    return results;
  }

  /**
   * 获取支持的图片格式
   */
  getSupportedFormats(): string[] {
    return this.processor.getSupportedFormats();
  }
}
