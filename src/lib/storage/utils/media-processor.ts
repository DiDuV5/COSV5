/**
 * @fileoverview 媒体文件处理工具
 * @description 集成对象存储的媒体文件处理，包括多尺寸生成、优化和转码
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 处理图片并生成多尺寸版本
 * const processor = new MediaProcessor(storageManager);
 * const result = await processor.processImage(buffer, 'image.jpg', {
 *   generateThumbnails: true,
 *   formats: ['webp', 'jpeg']
 * });
 *
 * @dependencies
 * - sharp: 图片处理
 * - StorageManager: 存储管理器
 * - FFmpegProcessor: 视频处理
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';
import { StorageManager } from '../object-storage/storage-manager';
import { type UploadParams, type UploadResult } from '../object-storage/base-storage-provider';
import { FFmpegProcessor } from '@/lib/upload/ffmpeg-processor';

/**
 * 图片尺寸配置
 */
export interface ImageSize {
  name: string;
  width: number;
  height: number;
  quality: number;
  format?: 'jpeg' | 'webp' | 'png';
}

/**
 * 媒体处理选项
 */
export interface MediaProcessingOptions {
  /** 是否生成缩略图 */
  generateThumbnails?: boolean;
  /** 输出格式 */
  formats?: ('jpeg' | 'webp' | 'png')[];
  /** 图片质量 */
  quality?: number;
  /** 最大宽度 */
  maxWidth?: number;
  /** 最大高度 */
  maxHeight?: number;
  /** 自定义尺寸 */
  customSizes?: ImageSize[];
  /** 是否保留原始文件 */
  preserveOriginal?: boolean;
  /** 存储路径前缀 */
  pathPrefix?: string;
}

/**
 * 媒体处理结果
 */
export interface MediaProcessingResult {
  /** 原始文件信息 */
  original: UploadResult;
  /** 主要处理后的文件 */
  processed: UploadResult;
  /** 缩略图列表 */
  thumbnails: Record<string, UploadResult>;
  /** 不同格式版本 */
  formats: Record<string, UploadResult>;
  /** 文件元数据 */
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    colorSpace: string;
  };
}

/**
 * 视频处理结果
 */
export interface VideoProcessingResult {
  /** 原始文件信息 */
  original: UploadResult;
  /** 转码后的文件 */
  transcoded?: UploadResult;
  /** 缩略图 */
  thumbnail?: UploadResult;
  /** 视频元数据 */
  metadata: {
    duration: number;
    width: number;
    height: number;
    codec: string;
    bitrate: number;
    fps: number;
  };
}

/**
 * 媒体文件处理器
 */
export class MediaProcessor {
  private storageManager: StorageManager;

  // 预定义的缩略图尺寸
  private static readonly DEFAULT_THUMBNAIL_SIZES: ImageSize[] = [
    { name: 'thumb', width: 150, height: 150, quality: 80, format: 'jpeg' },
    { name: 'small', width: 320, height: 240, quality: 85, format: 'jpeg' },
    { name: 'medium', width: 640, height: 480, quality: 85, format: 'jpeg' },
    { name: 'large', width: 1280, height: 960, quality: 90, format: 'jpeg' },
  ];

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  /**
   * 处理图片文件
   */
  async processImage(
    buffer: Buffer,
    filename: string,
    options: MediaProcessingOptions = {}
  ): Promise<MediaProcessingResult> {
    const {
      generateThumbnails = true,
      formats = ['webp', 'jpeg'],
      quality = 85,
      maxWidth = 2048,
      maxHeight = 2048,
      customSizes = [],
      preserveOriginal = true,
      pathPrefix = 'media',
    } = options;

    try {
      // 获取图片元数据
      const metadata = await this.getImageMetadata(buffer);

      // 生成文件键名
      const baseKey = this.generateFileKey(filename, pathPrefix);
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);

      const result: MediaProcessingResult = {
        original: {} as UploadResult,
        processed: {} as UploadResult,
        thumbnails: {},
        formats: {},
        metadata,
      };

      // 上传原始文件
      if (preserveOriginal) {
        const originalKey = `${pathPrefix}/original/${baseKey}`;
        result.original = await this.storageManager.uploadFile({
          buffer,
          key: originalKey,
          contentType: `image/${metadata.format}`,
          size: buffer.length,
          metadata: {
            width: metadata.width.toString(),
            height: metadata.height.toString(),
            originalName: filename,
          },
        });
      }

      // 处理主图片（调整尺寸和优化）
      let processedBuffer = buffer;
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        processedBuffer = await sharp(buffer)
          .resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality })
          .toBuffer();
      }

      const processedKey = `${pathPrefix}/processed/${nameWithoutExt}.jpg`;
      result.processed = await this.storageManager.uploadFile({
        buffer: processedBuffer,
        key: processedKey,
        contentType: 'image/jpeg',
        size: processedBuffer.length,
        metadata: {
          width: metadata.width.toString(),
          height: metadata.height.toString(),
          originalName: filename,
          processed: 'true',
        },
      });

      // 生成缩略图
      if (generateThumbnails) {
        const thumbnailSizes = customSizes.length > 0 ? customSizes : MediaProcessor.DEFAULT_THUMBNAIL_SIZES;

        for (const size of thumbnailSizes) {
          try {
            const thumbnailBuffer = await sharp(buffer)
              .resize(size.width, size.height, {
                fit: 'cover',
                position: 'center',
              })
              .toFormat(size.format || 'jpeg', { quality: size.quality })
              .toBuffer();

            const thumbnailKey = `${pathPrefix}/thumbnails/${nameWithoutExt}_${size.name}.${size.format || 'jpg'}`;
            result.thumbnails[size.name] = await this.storageManager.uploadFile({
              buffer: thumbnailBuffer,
              key: thumbnailKey,
              contentType: `image/${size.format || 'jpeg'}`,
              size: thumbnailBuffer.length,
              metadata: {
                width: size.width.toString(),
                height: size.height.toString(),
                originalName: filename,
                thumbnailSize: size.name,
              },
            });
          } catch (error) {
            console.warn(`⚠️ 生成缩略图失败 (${size.name}):`, error);
          }
        }
      }

      // 生成不同格式版本
      for (const format of formats) {
        if (format === metadata.format) continue; // 跳过原始格式

        try {
          let formatBuffer: Buffer;

          switch (format) {
            case 'webp':
              formatBuffer = await sharp(buffer)
                .resize(maxWidth, maxHeight, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .webp({ quality })
                .toBuffer();
              break;
            case 'png':
              formatBuffer = await sharp(buffer)
                .resize(maxWidth, maxHeight, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .png({ quality })
                .toBuffer();
              break;
            case 'jpeg':
            default:
              formatBuffer = await sharp(buffer)
                .resize(maxWidth, maxHeight, {
                  fit: 'inside',
                  withoutEnlargement: true,
                })
                .jpeg({ quality })
                .toBuffer();
              break;
          }

          const formatKey = `${pathPrefix}/formats/${nameWithoutExt}.${format}`;
          result.formats[format] = await this.storageManager.uploadFile({
            buffer: formatBuffer,
            key: formatKey,
            contentType: `image/${format}`,
            size: formatBuffer.length,
            metadata: {
              width: metadata.width.toString(),
              height: metadata.height.toString(),
              originalName: filename,
              format,
            },
          });
        } catch (error) {
          console.warn(`⚠️ 生成${format}格式失败:`, error);
        }
      }

      return result;
    } catch (error) {
      console.error('❌ 图片处理失败:', error);
      throw new Error(`图片处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 处理视频文件
   */
  async processVideo(
    buffer: Buffer,
    filename: string,
    options: MediaProcessingOptions = {}
  ): Promise<VideoProcessingResult> {
    const {
      preserveOriginal = true,
      pathPrefix = 'media',
    } = options;

    try {
      // 生成临时文件路径
      const tempPath = `/tmp/${crypto.randomUUID()}_${filename}`;
      const fs = await import('fs/promises');
      await fs.writeFile(tempPath, buffer);

      // 获取视频元数据
      const metadata = await FFmpegProcessor.extractVideoMetadata(tempPath);

      // 生成文件键名
      const baseKey = this.generateFileKey(filename, pathPrefix);
      const ext = path.extname(filename);
      const nameWithoutExt = path.basename(filename, ext);

      const result: VideoProcessingResult = {
        original: {} as UploadResult,
        metadata,
      };

      // 上传原始文件
      if (preserveOriginal) {
        const originalKey = `${pathPrefix}/original/${baseKey}`;
        result.original = await this.storageManager.uploadFile({
          buffer,
          key: originalKey,
          contentType: `video/${metadata.codec}`,
          size: buffer.length,
          metadata: {
            duration: metadata.duration.toString(),
            width: metadata.width.toString(),
            height: metadata.height.toString(),
            originalName: filename,
          },
        });
      }

      // 检查是否需要转码
      const needsTranscoding = await FFmpegProcessor.needsTranscoding(tempPath);

      if (needsTranscoding) {
        try {
          // 转码视频
          const transcodedPath = `/tmp/${crypto.randomUUID()}_transcoded.mp4`;
          await FFmpegProcessor.transcodeVideo(tempPath, transcodedPath, {
            codec: 'libx264',
            preset: 'medium',
            crf: 23,
            maxWidth: 1920,
            maxHeight: 1080,
          });

          // 读取转码后的文件
          const transcodedBuffer = await fs.readFile(transcodedPath);

          const transcodedKey = `${pathPrefix}/transcoded/${nameWithoutExt}_h264.mp4`;
          result.transcoded = await this.storageManager.uploadFile({
            buffer: transcodedBuffer,
            key: transcodedKey,
            contentType: 'video/mp4',
            size: transcodedBuffer.length,
            metadata: {
              duration: metadata.duration.toString(),
              width: metadata.width.toString(),
              height: metadata.height.toString(),
              originalName: filename,
              transcoded: 'true',
              codec: 'h264',
            },
          });

          // 清理转码文件
          await fs.unlink(transcodedPath).catch(() => {});
        } catch (error) {
          console.warn('⚠️ 视频转码失败:', error);
        }
      }

      // 生成缩略图
      try {
        const thumbnailPath = `/tmp/${crypto.randomUUID()}_thumb.jpg`;
        await FFmpegProcessor.generateThumbnail(tempPath, thumbnailPath, {
          time: Math.min(1, metadata.duration / 2),
          width: 320,
          height: 180,
        });

        const thumbnailBuffer = await fs.readFile(thumbnailPath);

        const thumbnailKey = `${pathPrefix}/thumbnails/${nameWithoutExt}_thumb.jpg`;
        result.thumbnail = await this.storageManager.uploadFile({
          buffer: thumbnailBuffer,
          key: thumbnailKey,
          contentType: 'image/jpeg',
          size: thumbnailBuffer.length,
          metadata: {
            width: '320',
            height: '180',
            originalName: filename,
            thumbnailFor: baseKey,
          },
        });

        // 清理缩略图文件
        await fs.unlink(thumbnailPath).catch(() => {});
      } catch (error) {
        console.warn('⚠️ 视频缩略图生成失败:', error);
      }

      // 清理临时文件
      await fs.unlink(tempPath).catch(() => {});

      return result;
    } catch (error) {
      console.error('❌ 视频处理失败:', error);
      throw new Error(`视频处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取图片元数据
   */
  private async getImageMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    colorSpace: string;
  }> {
    const metadata = await sharp(buffer).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false,
      colorSpace: metadata.space || 'unknown',
    };
  }

  /**
   * 生成文件键名
   */
  private generateFileKey(filename: string, pathPrefix: string): string {
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');

    return `${pathPrefix}/${nameWithoutExt}_${timestamp}_${random}${ext}`;
  }
}
