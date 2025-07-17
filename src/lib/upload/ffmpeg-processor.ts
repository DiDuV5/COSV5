/**
 * @fileoverview FFmpeg处理器 - CoserEden平台（重构版）
 * @description 统一的FFmpeg视频处理服务，提供转码、缩略图生成等功能
 *
 * 主要功能：
 * - 视频转码（H.264编码）
 * - 缩略图生成
 * - 视频元数据提取
 * - 进度监控
 * - 内存管理
 * - 错误处理和重试机制
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const processor = new FFmpegProcessor();
 * await processor.initialize();
 *
 * // 转码视频
 * await processor.transcodeVideo('/input.mp4', '/output.mp4', {
 *   codec: 'libx264',
 *   preset: 'medium',
 *   crf: 23
 * });
 *
 * // 生成缩略图
 * await processor.generateThumbnail('/video.mp4', '/thumb.jpg', {
 *   time: 10,
 *   width: 320,
 *   height: 240
 * });
 * ```
 *
 * @dependencies
 * - ./ffmpeg/ffmpeg-core: 核心FFmpeg处理
 * - ./ffmpeg/video-encoder: 视频编码
 * - ./ffmpeg/video-decoder: 视频解码
 * - ./ffmpeg/thumbnail-generator: 缩略图生成
 * - ./ffmpeg/format-converter: 格式转换
 *
 * @changelog
 * - 3.0.0: 重构为模块化架构，拆分为专用处理器
 * - 2.1.0: 添加内存监控、进度跟踪、错误重试机制
 * - 2.0.0: 重构为类架构，添加会话管理
 * - 1.0.0: 初始版本
 */

// 导入模块化组件
import { FFmpegCore } from './ffmpeg/ffmpeg-core';
import { VideoEncoder } from './ffmpeg/video-encoder';
import { VideoDecoder } from './ffmpeg/video-decoder';
import { ThumbnailGenerator } from './ffmpeg/thumbnail-generator';
import { FormatConverter } from './ffmpeg/format-converter';
import * as path from 'path';

// 导入类型定义
import type {
  FFmpegProcessorOptions,
  VideoMetadata,
  TranscodeOptions,
  TranscodeResult,
  ThumbnailOptions,
  ThumbnailResult,
  FormatConversionOptions,
  FormatConversionResult,
  ProcessInfo,
  ProgressCallback,
  TranscodeProgress,
} from './ffmpeg/ffmpeg-types';

// 导入工具函数
import {
  isFFmpegAvailable,
  isFFprobeAvailable,
  detectFFmpegCapabilities,
  generateSessionId,
  formatFileSize,
  formatProcessingTime,
} from './ffmpeg/ffmpeg-utils';

// 重新导出类型以保持向后兼容
export type {
  FFmpegProcessorOptions,
  VideoMetadata,
  TranscodeOptions,
  TranscodeResult,
  ThumbnailOptions,
  ThumbnailResult,
  FormatConversionOptions,
  FormatConversionResult,
  ProcessInfo,
  ProgressCallback,
  TranscodeProgress,
};

/**
 * FFmpeg处理器主类
 * 整合所有FFmpeg相关功能的统一入口
 */
export class FFmpegProcessor {
  private static instance: FFmpegProcessor;
  private initialized = false;

  // 模块化组件
  private ffmpegCore: FFmpegCore;
  private videoEncoder: VideoEncoder;
  private videoDecoder: VideoDecoder;
  private thumbnailGenerator: ThumbnailGenerator;
  private formatConverter: FormatConverter;

  private readonly options: FFmpegProcessorOptions;

  constructor(options: FFmpegProcessorOptions = {}) {
    this.options = options;
    
    // 初始化模块化组件
    this.ffmpegCore = new FFmpegCore(options);
    this.videoEncoder = new VideoEncoder(this.ffmpegCore);
    this.videoDecoder = new VideoDecoder();
    this.thumbnailGenerator = new ThumbnailGenerator(this.ffmpegCore);
    this.formatConverter = new FormatConverter(this.ffmpegCore);
  }

  /**
   * 获取单例实例
   */
  static getInstance(options?: FFmpegProcessorOptions): FFmpegProcessor {
    if (!FFmpegProcessor.instance) {
      FFmpegProcessor.instance = new FFmpegProcessor(options);
    }
    return FFmpegProcessor.instance;
  }

  /**
   * 初始化FFmpeg处理器
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 初始化FFmpeg处理器...');

      // 检查FFmpeg和ffprobe可用性
      const [ffmpegAvailable, ffprobeAvailable] = await Promise.all([
        isFFmpegAvailable(),
        isFFprobeAvailable()
      ]);

      if (!ffmpegAvailable) {
        throw new Error('FFmpeg不可用，请确保已正确安装');
      }

      if (!ffprobeAvailable) {
        throw new Error('FFprobe不可用，请确保已正确安装');
      }

      // 检测FFmpeg能力
      const capabilities = await detectFFmpegCapabilities();
      console.log(`📊 FFmpeg版本: ${capabilities.version}`);
      console.log(`🎬 支持的视频编码器: ${capabilities.codecs.video.length}个`);
      console.log(`🔊 支持的音频编码器: ${capabilities.codecs.audio.length}个`);

      this.initialized = true;
      console.log('✅ FFmpeg处理器初始化完成');
    } catch (error) {
      console.error('❌ FFmpeg处理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 转码视频文件
   * 
   * @param inputPath - 输入文件路径
   * @param outputPath - 输出文件路径
   * @param options - 转码选项
   * @param onProgress - 进度回调
   * @param sessionId - 会话ID（可选）
   * @returns Promise<TranscodeResult> - 转码结果
   */
  public async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: TranscodeOptions = {},
    onProgress?: ProgressCallback,
    sessionId?: string
  ): Promise<TranscodeResult> {
    await this.initialize();
    return this.videoEncoder.transcodeVideo(inputPath, outputPath, options, onProgress, sessionId);
  }

  /**
   * 生成视频缩略图
   * 
   * @param videoPath - 视频文件路径
   * @param outputPath - 输出路径（文件或目录）
   * @param options - 缩略图选项
   * @returns Promise<ThumbnailResult> - 生成结果
   */
  public async generateThumbnail(
    videoPath: string,
    outputPath: string,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    await this.initialize();
    
    // 如果输出路径是文件，提取目录
    const outputDir = outputPath.endsWith('/') ? outputPath : path.dirname(outputPath);
    
    return this.thumbnailGenerator.generateThumbnail(videoPath, outputDir, options);
  }

  /**
   * 提取视频元数据
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<VideoMetadata> - 视频元数据
   */
  public async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    await this.initialize();
    return this.videoDecoder.extractMetadata(videoPath);
  }

  /**
   * 转换视频格式
   * 
   * @param inputPath - 输入文件路径
   * @param outputPath - 输出文件路径
   * @param options - 转换选项
   * @returns Promise<FormatConversionResult> - 转换结果
   */
  public async convertFormat(
    inputPath: string,
    outputPath: string,
    options: FormatConversionOptions
  ): Promise<FormatConversionResult> {
    await this.initialize();
    return this.formatConverter.convertFormat(inputPath, outputPath, options);
  }

  /**
   * 检查视频是否需要转码
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<boolean> - 是否需要转码
   */
  public async needsTranscoding(videoPath: string): Promise<boolean> {
    await this.initialize();
    const decodingInfo = await this.videoDecoder.detectDecodingInfo(videoPath);
    return decodingInfo.needsTranscoding;
  }

  /**
   * 验证视频文件完整性
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<boolean> - 文件是否完整
   */
  public async validateVideo(videoPath: string): Promise<boolean> {
    await this.initialize();
    return this.videoDecoder.validateVideoIntegrity(videoPath);
  }

  /**
   * 获取活动进程信息
   * 
   * @returns 活动进程列表
   */
  public getActiveProcesses(): ProcessInfo[] {
    return this.ffmpegCore.getActiveProcesses();
  }

  /**
   * 终止指定进程
   * 
   * @param sessionId - 会话ID
   * @returns 是否成功终止
   */
  public killProcess(sessionId: string): boolean {
    return this.ffmpegCore.killProcess(sessionId);
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    console.log('🧹 开始清理FFmpeg处理器资源...');
    
    await this.ffmpegCore.cleanup();
    
    this.initialized = false;
    console.log('✅ FFmpeg处理器资源清理完成');
  }

  // ========== 向后兼容的静态方法 ==========

  /**
   * 静态方法：转码视频（向后兼容）
   */
  public static async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: any = {},
    onProgress?: (sessionId: string, output: string) => void,
    sessionId?: string
  ): Promise<void> {
    const processor = FFmpegProcessor.getInstance();
    
    // 转换进度回调格式
    const progressCallback: ProgressCallback | undefined = onProgress
      ? (id: string, progress: TranscodeProgress) => {
          const output = `frame=${progress.frame} fps=${progress.fps} time=${progress.outTime} bitrate=${progress.bitrate} speed=${progress.speed}`;
          onProgress(id, output);
        }
      : undefined;

    const result = await processor.transcodeVideo(inputPath, outputPath, options, progressCallback, sessionId);
    
    if (!result.success) {
      throw new Error(result.error || '转码失败');
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
    const processor = FFmpegProcessor.getInstance();
    await ThumbnailGenerator.generateThumbnail(videoPath, outputPath, options);
  }

  /**
   * 静态方法：提取元数据（向后兼容）
   */
  public static async extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    const processor = FFmpegProcessor.getInstance();
    return processor.extractMetadata(videoPath);
  }

  /**
   * 静态方法：检查转码需求（向后兼容）
   */
  public static async needsTranscoding(videoPath: string): Promise<boolean> {
    return VideoDecoder.needsTranscoding(videoPath);
  }
}
