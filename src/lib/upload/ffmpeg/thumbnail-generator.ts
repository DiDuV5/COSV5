/**
 * @fileoverview 缩略图生成器 - CoserEden平台
 * @description 视频缩略图生成专用模块
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  ThumbnailOptions,
  ThumbnailResult,
  VideoMetadata,
} from './ffmpeg-types';
import { FFmpegCore } from './ffmpeg-core';
import { VideoDecoder } from './video-decoder';
import {
  generateSessionId,
  ensureDirectory,
  formatFileSize,
  FFMPEG_DEFAULTS,
} from './ffmpeg-utils';

/**
 * 缩略图生成器类
 * 负责从视频文件生成缩略图
 */
export class ThumbnailGenerator {
  private ffmpegCore: FFmpegCore;
  private videoDecoder: VideoDecoder;

  constructor(ffmpegCore?: FFmpegCore) {
    this.ffmpegCore = ffmpegCore || FFmpegCore.getInstance();
    this.videoDecoder = new VideoDecoder();
  }

  /**
   * 生成视频缩略图
   * 
   * @param videoPath - 视频文件路径
   * @param outputDir - 输出目录
   * @param options - 缩略图选项
   * @returns Promise<ThumbnailResult> - 生成结果
   * 
   * @example
   * ```typescript
   * const generator = new ThumbnailGenerator();
   * const result = await generator.generateThumbnail('/path/to/video.mp4', '/path/to/output', {
   *   time: 10,
   *   width: 320,
   *   height: 240,
   *   format: 'jpg'
   * });
   * ```
   */
  public async generateThumbnail(
    videoPath: string,
    outputDir: string,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    const startTime = Date.now();

    try {
      console.log(`📸 开始生成缩略图: ${path.basename(videoPath)}`);

      // 确保输出目录存在
      await ensureDirectory(outputDir);

      // 获取视频元数据
      const metadata = await this.videoDecoder.extractMetadata(videoPath);
      console.log(`📊 视频信息: ${metadata.width}x${metadata.height}, 时长: ${Math.round(metadata.duration)}s`);

      // 处理选项
      const processedOptions = this.processOptions(options, metadata);

      // 生成缩略图
      const thumbnailPaths = await this.generateThumbnails(videoPath, outputDir, processedOptions, metadata);

      const result: ThumbnailResult = {
        success: true,
        thumbnailPaths,
        processingTime: Date.now() - startTime,
      };

      console.log(`✅ 缩略图生成完成: ${thumbnailPaths.length}个文件`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ 缩略图生成失败: ${errorMessage}`);

      return {
        success: false,
        thumbnailPaths: [],
        processingTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 处理缩略图选项
   */
  private processOptions(options: ThumbnailOptions, metadata: VideoMetadata): Required<ThumbnailOptions> {
    const {
      time = Math.min(FFMPEG_DEFAULTS.THUMBNAIL_TIME, metadata.duration / 2),
      width = FFMPEG_DEFAULTS.THUMBNAIL_WIDTH,
      height = FFMPEG_DEFAULTS.THUMBNAIL_HEIGHT,
      quality = 2,
      format = 'jpg',
      count = 1,
      interval = 0,
    } = options;

    // 确保时间在有效范围内
    const validTime = Math.max(0, Math.min(time, metadata.duration - 1));

    // 计算合适的分辨率
    const { width: outputWidth, height: outputHeight } = this.calculateThumbnailSize(
      metadata.width,
      metadata.height,
      width,
      height
    );

    return {
      time: validTime,
      width: outputWidth,
      height: outputHeight,
      quality: Math.max(1, Math.min(31, quality)),
      format,
      count: Math.max(1, count),
      interval: Math.max(0, interval),
    };
  }

  /**
   * 计算缩略图尺寸
   */
  private calculateThumbnailSize(
    videoWidth: number,
    videoHeight: number,
    targetWidth: number,
    targetHeight: number
  ): { width: number; height: number } {
    const videoAspectRatio = videoWidth / videoHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    let outputWidth: number;
    let outputHeight: number;

    if (videoAspectRatio > targetAspectRatio) {
      // 视频更宽，以宽度为准
      outputWidth = targetWidth;
      outputHeight = Math.round(targetWidth / videoAspectRatio);
    } else {
      // 视频更高，以高度为准
      outputHeight = targetHeight;
      outputWidth = Math.round(targetHeight * videoAspectRatio);
    }

    // 确保尺寸是偶数
    return {
      width: outputWidth % 2 === 0 ? outputWidth : outputWidth - 1,
      height: outputHeight % 2 === 0 ? outputHeight : outputHeight - 1,
    };
  }

  /**
   * 生成缩略图文件
   */
  private async generateThumbnails(
    videoPath: string,
    outputDir: string,
    options: Required<ThumbnailOptions>,
    metadata: VideoMetadata
  ): Promise<string[]> {
    const thumbnailPaths: string[] = [];

    if (options.count === 1) {
      // 生成单个缩略图
      const outputPath = path.join(outputDir, `thumbnail.${options.format}`);
      await this.generateSingleThumbnail(videoPath, outputPath, options);
      thumbnailPaths.push(outputPath);
    } else {
      // 生成多个缩略图
      const interval = options.interval || metadata.duration / (options.count + 1);
      
      for (let i = 0; i < options.count; i++) {
        const time = Math.min(options.time + (i * interval), metadata.duration - 1);
        const outputPath = path.join(outputDir, `thumbnail_${i + 1}.${options.format}`);
        
        await this.generateSingleThumbnail(videoPath, outputPath, {
          ...options,
          time,
        });
        
        thumbnailPaths.push(outputPath);
      }
    }

    return thumbnailPaths;
  }

  /**
   * 生成单个缩略图
   */
  private async generateSingleThumbnail(
    videoPath: string,
    outputPath: string,
    options: Required<ThumbnailOptions>
  ): Promise<void> {
    const sessionId = generateSessionId();

    const command = [
      '-i', videoPath,
      '-ss', options.time.toString(),
      '-vframes', '1',
      '-vf', `scale=${options.width}:${options.height}`,
      '-q:v', options.quality.toString(),
      '-y', // 覆盖输出文件
      outputPath
    ];

    console.log(`📸 生成缩略图: ${path.basename(outputPath)} (${options.width}x${options.height})`);

    await this.ffmpegCore.executeFFmpeg(command, sessionId);

    // 验证生成的缩略图
    await this.validateThumbnail(outputPath);
  }

  /**
   * 验证缩略图文件
   */
  private async validateThumbnail(thumbnailPath: string): Promise<void> {
    try {
      const stats = await fs.stat(thumbnailPath);
      
      if (stats.size === 0) {
        throw new Error('缩略图文件为空');
      }

      if (stats.size < 1024) { // 小于1KB可能有问题
        console.warn(`⚠️ 缩略图文件过小: ${formatFileSize(stats.size)}`);
      }

      console.log(`✅ 缩略图验证通过: ${formatFileSize(stats.size)}`);
    } catch (error) {
      console.error('❌ 缩略图验证失败:', error);
      
      // 尝试删除无效文件
      try {
        await fs.unlink(thumbnailPath);
      } catch (cleanupError) {
        console.warn('清理无效缩略图失败:', cleanupError);
      }
      
      throw error;
    }
  }

  /**
   * 生成视频预览图（多个时间点）
   * 
   * @param videoPath - 视频文件路径
   * @param outputDir - 输出目录
   * @param count - 预览图数量
   * @param options - 其他选项
   * @returns Promise<ThumbnailResult> - 生成结果
   */
  public async generatePreviewImages(
    videoPath: string,
    outputDir: string,
    count: number = 6,
    options: Omit<ThumbnailOptions, 'count'> = {}
  ): Promise<ThumbnailResult> {
    const metadata = await this.videoDecoder.extractMetadata(videoPath);
    
    // 计算时间点，避开开头和结尾
    const startOffset = Math.max(1, metadata.duration * 0.1); // 跳过前10%
    const endOffset = Math.max(1, metadata.duration * 0.1);   // 跳过后10%
    const availableDuration = metadata.duration - startOffset - endOffset;
    const interval = availableDuration / (count - 1);

    const previewOptions: ThumbnailOptions = {
      ...options,
      time: startOffset,
      count,
      interval,
    };

    return this.generateThumbnail(videoPath, outputDir, previewOptions);
  }

  /**
   * 生成动画GIF预览
   * 
   * @param videoPath - 视频文件路径
   * @param outputPath - 输出GIF路径
   * @param options - GIF选项
   * @returns Promise<boolean> - 是否成功
   */
  public async generateAnimatedPreview(
    videoPath: string,
    outputPath: string,
    options: {
      startTime?: number;
      duration?: number;
      width?: number;
      fps?: number;
    } = {}
  ): Promise<boolean> {
    try {
      const {
        startTime = 10,
        duration = 3,
        width = 320,
        fps = 10,
      } = options;

      const sessionId = generateSessionId();

      const command = [
        '-i', videoPath,
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-vf', `scale=${width}:-1:flags=lanczos,fps=${fps}`,
        '-y',
        outputPath
      ];

      console.log(`🎬 生成动画预览: ${path.basename(outputPath)}`);

      await this.ffmpegCore.executeFFmpeg(command, sessionId);

      // 验证生成的GIF
      const stats = await fs.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('动画预览文件为空');
      }

      console.log(`✅ 动画预览生成完成: ${formatFileSize(stats.size)}`);
      return true;

    } catch (error) {
      console.error('❌ 动画预览生成失败:', error);
      return false;
    }
  }

  /**
   * 静态方法：生成缩略图（向后兼容）
   */
  public static async generateThumbnail(
    videoPath: string,
    outputPath: string,
    options: {
      time?: number;
      width?: number;
      height?: number;
    } = {}
  ): Promise<void> {
    const generator = new ThumbnailGenerator();
    const outputDir = path.dirname(outputPath);
    const filename = path.basename(outputPath);
    const ext = path.extname(filename).slice(1) as 'jpg' | 'png';

    const thumbnailOptions: ThumbnailOptions = {
      time: options.time,
      width: options.width,
      height: options.height,
      format: ext || 'jpg',
    };

    const result = await generator.generateThumbnail(videoPath, outputDir, thumbnailOptions);
    
    if (!result.success) {
      throw new Error(result.error || '缩略图生成失败');
    }

    // 如果输出文件名不同，重命名
    if (result.thumbnailPaths[0] !== outputPath) {
      await fs.rename(result.thumbnailPaths[0], outputPath);
    }
  }
}
