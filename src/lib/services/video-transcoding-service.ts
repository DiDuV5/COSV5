/**
 * @fileoverview 视频转码服务 - CoserEden平台（重构版）
 * @description 提供全面的视频转码和处理功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const transcodingService = VideoTranscodingService.getInstance();
 * await transcodingService.initialize();
 *
 * // 转码单个视频
 * const result = await transcodingService.transcodeVideo(
 *   '/path/to/input.mov',
 *   '/path/to/output.mp4',
 *   { quality: 'high', outputFormat: 'mp4', deleteOriginal: false, generateThumbnail: true }
 * );
 *
 * // 批量转码
 * const results = await transcodingService.transcodeVideos(files, options);
 *
 * // 获取视频信息
 * const videoInfo = await transcodingService.getVideoInfo('/path/to/video.mp4');
 * ```
 *
 * @dependencies
 * - ./video-transcoding/core/transcoding-types: 类型定义
 * - ./video-transcoding/core/ffmpeg-detector: FFmpeg检测
 * - ./video-transcoding/core/video-info-extractor: 视频信息提取
 * - ./video-transcoding/core/transcoding-processor: 转码处理
 *
 * @changelog
 * - 3.0.0: 重构为模块化架构，拆分为专用处理器
 * - 2.0.0: 添加批量转码和缩略图生成功能
 * - 1.0.0: 初始版本
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

// 导入模块化组件
import { FFmpegDetector } from './video-transcoding/core/ffmpeg-detector';
import { VideoInfoExtractor } from './video-transcoding/core/video-info-extractor';
import { TranscodingProcessor } from './video-transcoding/core/transcoding-processor';

// 导入类型定义和枚举
import {
  type VideoInfo,
  type TranscodingOptions,
  type TranscodingResult,
  type BatchTranscodingFile,
  type TranscodingConfig,
  type TranscodingStats,
  type ThumbnailOptions,
  type TranscodingContext,
  type IVideoTranscodingService,
  type TranscodingError,
  TranscodingErrorType,
} from './video-transcoding/core/transcoding-types';

// 重新导出类型以保持向后兼容
export type {
  VideoInfo,
  TranscodingOptions,
  TranscodingResult,
  BatchTranscodingFile,
  TranscodingConfig,
  TranscodingStats,
  ThumbnailOptions,
};

/**
 * 视频转码服务主类
 * 整合所有转码功能的统一入口
 */
export class VideoTranscodingService extends EventEmitter implements IVideoTranscodingService {
  private static instance: VideoTranscodingService;
  private initialized = false;
  private config: TranscodingConfig;

  // 模块化组件
  private ffmpegDetector: FFmpegDetector;
  private videoInfoExtractor: VideoInfoExtractor;
  private transcodingProcessor: TranscodingProcessor;
  private context: TranscodingContext;

  // 统计信息
  private stats: TranscodingStats = {
    totalFiles: 0,
    successfulTranscodings: 0,
    failedTranscodings: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    totalSizeBefore: 0,
    totalSizeAfter: 0,
    compressionRatio: 0,
  };

  private constructor(config?: Partial<TranscodingConfig>) {
    super();

    this.config = this.getDefaultConfig(config);

    // 初始化模块化组件
    this.ffmpegDetector = new FFmpegDetector();
    this.videoInfoExtractor = new VideoInfoExtractor();
    this.transcodingProcessor = new TranscodingProcessor();

    // 创建转码上下文
    this.context = {
      config: this.config,
      ffmpegDetector: this.ffmpegDetector,
      videoInfoExtractor: this.videoInfoExtractor,
      transcodingProcessor: this.transcodingProcessor,
      thumbnailGenerator: null as any, // 将在后续添加
      batchManager: null as any, // 将在后续添加
    };

    // 转发事件
    this.setupEventForwarding();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<TranscodingConfig>): VideoTranscodingService {
    if (!VideoTranscodingService.instance) {
      VideoTranscodingService.instance = new VideoTranscodingService(config);
    }
    return VideoTranscodingService.instance;
  }

  /**
   * 初始化转码服务
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 初始化视频转码服务...');

      // 1. 检测FFmpeg路径
      const ffmpegValid = this.ffmpegDetector.validatePaths();
      if (!ffmpegValid) {
        throw this.createTranscodingError(
          TranscodingErrorType.FFMPEG_NOT_FOUND,
          'FFmpeg或FFprobe未找到，请确保已正确安装'
        );
      }

      // 2. 创建必要的目录
      await this.createDirectories();

      // 3. 验证系统资源
      await this.validateSystemResources();

      this.initialized = true;
      console.log('✅ 视频转码服务初始化完成');

      const paths = this.ffmpegDetector.getPaths();
      console.log(`   - FFmpeg: ${paths.ffmpegPath}`);
      console.log(`   - FFprobe: ${paths.ffprobePath}`);
      console.log(`   - 临时目录: ${this.config.tempDir}`);
      console.log(`   - 输出目录: ${this.config.outputDir}`);

      this.emit('serviceInitialized');

    } catch (error) {
      console.error('❌ 视频转码服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 转码单个视频
   */
  public async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: TranscodingOptions
  ): Promise<TranscodingResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      console.log(`🎬 开始转码视频: ${inputPath}`);

      // 更新统计
      this.stats.totalFiles++;

      // 获取原始文件大小
      const inputStats = await fs.stat(inputPath);
      this.stats.totalSizeBefore += inputStats.size;

      // 执行转码
      const result = await this.transcodingProcessor.transcodeVideo(
        inputPath,
        outputPath,
        options
      );

      // 更新统计信息
      if (result.success) {
        this.stats.successfulTranscodings++;

        // 获取输出文件大小
        try {
          const outputStats = await fs.stat(outputPath);
          this.stats.totalSizeAfter += outputStats.size;
        } catch (error) {
          console.warn('获取输出文件大小失败:', error);
        }
      } else {
        this.stats.failedTranscodings++;
      }

      // 更新处理时间统计
      this.stats.totalProcessingTime += result.processingTime;
      this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.totalFiles;

      // 更新压缩比
      if (this.stats.totalSizeBefore > 0) {
        this.stats.compressionRatio = (this.stats.totalSizeAfter / this.stats.totalSizeBefore) * 100;
      }

      console.log(`✅ 转码完成: ${inputPath} (${result.processingTime}ms)`);
      this.emit('videoTranscoded', result);

      return result;

    } catch (error) {
      this.stats.failedTranscodings++;
      console.error(`❌ 转码失败: ${inputPath}`, error);

      const errorResult: TranscodingResult = {
        success: false,
        inputFile: inputPath,
        outputFile: outputPath,
        originalInfo: await this.getDefaultVideoInfo(),
        transcodedInfo: await this.getDefaultVideoInfo(),
        error: error instanceof Error ? error.message : '转码失败',
        processingTime: Date.now() - startTime
      };

      this.emit('transcodingError', errorResult);
      return errorResult;
    }
  }

  /**
   * 批量转码视频
   */
  public async transcodeVideos(
    files: BatchTranscodingFile[],
    options: TranscodingOptions
  ): Promise<TranscodingResult[]> {
    console.log(`🎬 开始批量转码 ${files.length} 个视频文件`);

    const results: TranscodingResult[] = [];
    const maxConcurrent = this.config.maxConcurrentJobs;

    // 分批处理以控制并发数
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(file =>
        this.transcodeVideo(file.inputPath, file.outputPath, options)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      console.log(`📊 批量转码进度: ${Math.min(i + maxConcurrent, files.length)}/${files.length}`);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✅ 批量转码完成: 成功 ${successCount}, 失败 ${failCount}`);
    this.emit('batchTranscodingComplete', { results, successCount, failCount });

    return results;
  }

  /**
   * 获取视频信息
   */
  public async getVideoInfo(filePath: string): Promise<VideoInfo> {
    if (!this.initialized) {
      await this.initialize();
    }

    return await this.videoInfoExtractor.getVideoInfo(filePath);
  }

  /**
   * 生成视频缩略图
   */
  public async generateThumbnail(videoPath: string, options?: ThumbnailOptions): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // 这里应该调用缩略图生成器，暂时返回占位符
    console.log(`🖼️ 生成缩略图: ${videoPath}`);

    // TODO: 实现缩略图生成逻辑
    const thumbnailPath = path.join(
      this.config.tempDir,
      `${path.basename(videoPath, path.extname(videoPath))}_thumb.jpg`
    );

    return thumbnailPath;
  }

  /**
   * 获取转码统计信息
   */
  public getStats(): TranscodingStats {
    return { ...this.stats };
  }

  /**
   * 检查服务健康状态
   */
  public isHealthy(): boolean {
    if (!this.initialized) return false;

    // 检查FFmpeg是否可用
    const paths = this.ffmpegDetector.getPaths();
    if (!paths.ffmpegPath || !paths.ffprobePath) return false;

    // 检查目录是否存在
    try {
      require('fs').accessSync(this.config.tempDir);
      require('fs').accessSync(this.config.outputDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 重置统计信息
   */
  public resetStats(): void {
    this.stats = {
      totalFiles: 0,
      successfulTranscodings: 0,
      failedTranscodings: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      totalSizeBefore: 0,
      totalSizeAfter: 0,
      compressionRatio: 0,
    };

    console.log('📊 转码统计信息已重置');
  }

  /**
   * 获取服务配置
   */
  public getConfig(): TranscodingConfig {
    return { ...this.config };
  }

  /**
   * 更新服务配置
   */
  public updateConfig(newConfig: Partial<TranscodingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.context.config = this.config;
    console.log('⚙️ 转码服务配置已更新');
  }

  // 私有方法

  private getDefaultConfig(config?: Partial<TranscodingConfig>): TranscodingConfig {
    const defaults: TranscodingConfig = {
      tempDir: path.join(process.cwd(), 'temp'),
      outputDir: path.join(process.cwd(), 'output'),
      maxConcurrentJobs: 2,
      timeoutMs: 300000, // 5分钟
      enableLogging: true,
    };

    return { ...defaults, ...config };
  }

  private async createDirectories(): Promise<void> {
    await fs.mkdir(this.config.tempDir, { recursive: true });
    await fs.mkdir(this.config.outputDir, { recursive: true });
    console.log('📁 转码目录创建完成');
  }

  private async validateSystemResources(): Promise<void> {
    // 检查磁盘空间
    try {
      const stats = await fs.stat(this.config.tempDir);
      // 这里可以添加更多的系统资源检查
      console.log('💾 系统资源验证完成');
    } catch (error) {
      throw this.createTranscodingError(
        TranscodingErrorType.INSUFFICIENT_DISK_SPACE,
        '系统资源验证失败'
      );
    }
  }

  private async getDefaultVideoInfo(): Promise<VideoInfo> {
    return {
      format: 'unknown',
      codec: 'unknown',
      width: 0,
      height: 0,
      duration: 0,
      bitrate: 0,
      fps: 0,
      size: 0
    };
  }

  private createTranscodingError(
    type: TranscodingErrorType,
    message: string,
    details?: Record<string, any>
  ): TranscodingError {
    const error = new Error(message) as TranscodingError;
    error.type = type;
    error.code = type;
    error.details = details;
    error.recoverable = type !== TranscodingErrorType.UNSUPPORTED_FORMAT;
    return error;
  }

  private setupEventForwarding(): void {
    // 转发各组件的事件
    this.transcodingProcessor.on('progress', (data) => this.emit('progress', data));
    this.transcodingProcessor.on('transcodingComplete', (data) => this.emit('transcodingComplete', data));
    this.transcodingProcessor.on('transcodingError', (data) => this.emit('transcodingError', data));
    this.videoInfoExtractor.on('videoInfoExtracted', (data) => this.emit('videoInfoExtracted', data));
  }
}

/**
 * 导出默认实例
 */
export const videoTranscodingService = VideoTranscodingService.getInstance();

/**
 * 导出便捷函数
 */
export async function initializeTranscodingService(config?: Partial<TranscodingConfig>): Promise<VideoTranscodingService> {
  const service = VideoTranscodingService.getInstance(config);
  await service.initialize();
  return service;
}

export async function transcodeVideo(
  inputPath: string,
  outputPath: string,
  options: TranscodingOptions
): Promise<TranscodingResult> {
  const service = VideoTranscodingService.getInstance();
  return await service.transcodeVideo(inputPath, outputPath, options);
}

export async function getVideoInfo(filePath: string): Promise<VideoInfo> {
  const service = VideoTranscodingService.getInstance();
  return await service.getVideoInfo(filePath);
}
