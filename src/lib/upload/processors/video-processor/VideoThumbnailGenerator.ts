/**
 * @fileoverview 视频缩略图生成器
 * @description 专门负责生成视频缩略图
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import ffmpeg from 'fluent-ffmpeg';
import { unlink } from 'fs/promises';
import path from 'path';
import type { ThumbnailOptions } from './types';

/**
 * 视频缩略图生成器类
 */
export class VideoThumbnailGenerator {
  private readonly tempDir: string;
  private readonly getStorageManager: () => Promise<any>;

  constructor(tempDir: string, getStorageManager: () => Promise<any>) {
    this.tempDir = tempDir;
    this.getStorageManager = getStorageManager;
  }

  /**
   * 生成视频缩略图
   */
  public async generateVideoThumbnail(
    videoPath: string,
    options: ThumbnailOptions
  ): Promise<string> {
    const {
      originalStorageKey,
      duration,
      width = 600,
      seekTime
    } = options;

    // 计算截取时间点（视频的1/4处，但不超过10秒）
    const calculatedSeekTime = seekTime ?? Math.min(duration * 0.25, 10);

    let thumbnailPath: string | undefined;

    try {
      // 生成缩略图文件路径
      thumbnailPath = path.join(
        this.tempDir,
        `thumbnail_${Date.now()}_${originalStorageKey.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`
      );

      console.log(`🖼️ 开始生成视频缩略图:`, {
        videoPath,
        thumbnailPath,
        seekTime: calculatedSeekTime,
        duration,
        originalStorageKey
      });

      // 使用FFmpeg生成缩略图
      await this.generateThumbnailWithFFmpeg(videoPath, thumbnailPath, calculatedSeekTime, width);

      // 读取缩略图文件
      const thumbnailBuffer = await import('fs').then(fs => fs.promises.readFile(thumbnailPath!));

      // 生成存储键
      const thumbnailKey = originalStorageKey.replace(/\.[^.]+$/, '_thumbnail.jpg');

      // 获取存储管理器实例
      const storageManager = await this.getStorageManager();

      // 上传缩略图
      const uploadResult = await storageManager.uploadFile({
        key: thumbnailKey,
        buffer: thumbnailBuffer,
        contentType: 'image/jpeg',
        size: thumbnailBuffer.length,
        metadata: {
          type: 'video-thumbnail',
          originalKey: originalStorageKey,
          seekTime: calculatedSeekTime.toString(),
          width: width.toString(),
          generatedAt: new Date().toISOString(),
        },
      });

      console.log(`✅ 视频缩略图生成并上传成功: ${uploadResult.url}`);
      return uploadResult.url;

    } catch (error) {
      console.error('❌ 视频缩略图生成失败:', {
        videoPath,
        thumbnailPath,
        originalStorageKey,
        error: error instanceof Error ? error.message : String(error)
      });

      throw TRPCErrorHandler.internalError(
        `视频缩略图生成失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    } finally {
      // 确保清理临时文件
      if (thumbnailPath) {
        await unlink(thumbnailPath).catch(() => { });
      }
    }
  }

  /**
   * 使用FFmpeg生成缩略图
   */
  private async generateThumbnailWithFFmpeg(
    videoPath: string,
    thumbnailPath: string,
    seekTime: number,
    width: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🎬 FFmpeg缩略图生成: 时间点=${seekTime}s, 宽度=${width}px`);

      const startTime = Date.now();

      ffmpeg(videoPath)
        .seekInput(seekTime)
        .frames(1)
        .size(`${width}x?`)
        .format('image2')
        .outputOptions([
          '-q:v 2', // 高质量JPEG
          '-vf scale=' + width + ':-1' // 保持宽高比
        ])
        .output(thumbnailPath)
        .on('start', (commandLine) => {
          console.log(`🚀 FFmpeg缩略图命令: ${commandLine}`);
        })
        .on('end', () => {
          const duration = Date.now() - startTime;
          console.log(`✅ 缩略图生成完成，耗时: ${duration}ms`);
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg缩略图生成失败:', {
            videoPath,
            thumbnailPath,
            seekTime,
            width,
            error: err.message,
            stack: err.stack
          });
          reject(new Error(`缩略图生成失败: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * 批量生成多个时间点的缩略图
   */
  public async generateMultipleThumbnails(
    videoPath: string,
    options: ThumbnailOptions,
    timePoints: number[]
  ): Promise<string[]> {
    const thumbnailUrls: string[] = [];

    for (let i = 0; i < timePoints.length; i++) {
      const seekTime = timePoints[i];
      const thumbnailOptions = {
        ...options,
        seekTime,
        originalStorageKey: options.originalStorageKey.replace(/\.[^.]+$/, `_thumb_${i + 1}$&`)
      };

      try {
        const thumbnailUrl = await this.generateVideoThumbnail(videoPath, thumbnailOptions);
        thumbnailUrls.push(thumbnailUrl);
      } catch (error) {
        console.warn(`⚠️ 时间点 ${seekTime}s 的缩略图生成失败:`, error);
        // 继续生成其他缩略图
      }
    }

    return thumbnailUrls;
  }

  /**
   * 生成视频预览图（多个时间点）
   */
  public async generateVideoPreview(
    videoPath: string,
    options: ThumbnailOptions,
    previewCount = 4
  ): Promise<string[]> {
    const { duration } = options;

    // 计算均匀分布的时间点
    const timePoints: number[] = [];
    for (let i = 1; i <= previewCount; i++) {
      const timePoint = (duration / (previewCount + 1)) * i;
      timePoints.push(Math.min(timePoint, duration - 1)); // 确保不超过视频长度
    }

    console.log(`🎬 生成视频预览图: ${previewCount}个时间点`, timePoints);

    return this.generateMultipleThumbnails(videoPath, options, timePoints);
  }

  /**
   * 检查缩略图生成能力
   */
  public async checkThumbnailCapability(): Promise<boolean> {
    try {
      // 检查FFmpeg是否支持图像输出
      return new Promise((resolve) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            console.error('❌ FFmpeg图像格式检查失败:', err.message);
            resolve(false);
          } else {
            const hasImageSupport = formats && (
              'image2' in formats ||
              'mjpeg' in formats ||
              'png' in formats
            );
            console.log('✅ FFmpeg缩略图能力检查:', hasImageSupport ? '支持' : '不支持');
            resolve(!!hasImageSupport);
          }
        });
      });
    } catch (error) {
      console.error('❌ 缩略图能力检查失败:', error);
      return false;
    }
  }

  /**
   * 估算缩略图生成时间
   */
  public estimateThumbnailTime(duration: number, count = 1): number {
    // 每个缩略图大约需要1-3秒，取决于视频长度
    const baseTime = Math.min(3000, Math.max(1000, duration * 100));
    return baseTime * count;
  }
}
