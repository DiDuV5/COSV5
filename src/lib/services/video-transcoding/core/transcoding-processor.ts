/**
 * @fileoverview 转码处理器 - CoserEden平台
 * @description 负责执行视频转码操作
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import {
  type VideoInfo,
  type TranscodingOptions,
  type TranscodingResult,
  type TranscodingProgress,
  type QualitySettings,
  type ITranscodingProcessor,
  type TranscodingError,
  TranscodingErrorType,
} from './transcoding-types';
import { VideoInfoExtractor } from './video-info-extractor';

/**
 * 转码处理器类
 * 负责执行视频转码操作
 */
export class TranscodingProcessor extends EventEmitter implements ITranscodingProcessor {
  private videoInfoExtractor: VideoInfoExtractor;

  constructor() {
    super();
    this.videoInfoExtractor = new VideoInfoExtractor();
  }

  /**
   * 转码视频文件
   */
  public async transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: TranscodingOptions
  ): Promise<TranscodingResult> {
    const startTime = Date.now();

    try {
      console.log(`🎬 开始转码视频: ${inputPath} -> ${outputPath}`);

      // 确保输出目录存在
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // 获取原始视频信息
      const originalInfo = await this.videoInfoExtractor.getVideoInfo(inputPath);

      // 检查是否需要转码
      if (await this.shouldSkipTranscoding(inputPath, outputPath, originalInfo, options)) {
        return await this.handleSkipTranscoding(inputPath, outputPath, originalInfo, options, startTime);
      }

      // 获取质量设置
      const qualitySettings = this.getQualitySettings(options.quality);

      // 执行转码
      const transcodedInfo = await this.performTranscoding(
        inputPath,
        outputPath,
        qualitySettings,
        options
      );

      // 删除原始文件（如果需要）
      if (options.deleteOriginal) {
        await fs.unlink(inputPath);
        console.log(`🗑️ 已删除原始文件: ${inputPath}`);
      }

      const result: TranscodingResult = {
        success: true,
        inputFile: inputPath,
        outputFile: outputPath,
        originalInfo,
        transcodedInfo,
        processingTime: Date.now() - startTime
      };

      console.log(`✅ 转码完成: ${inputPath}`);
      this.emit('transcodingComplete', result);

      return result;

    } catch (error) {
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
   * 执行实际的转码操作
   */
  public async performTranscoding(
    inputPath: string,
    outputPath: string,
    qualitySettings: QualitySettings,
    options: TranscodingOptions
  ): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      console.log(`🔄 开始转码处理: ${inputPath}`);
      console.log(`   质量设置: CRF=${qualitySettings.crf}, Preset=${qualitySettings.preset}`);

      const command = ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format(options.outputFormat)
        .addOption('-crf', qualitySettings.crf.toString())
        .addOption('-preset', qualitySettings.preset)
        .addOption('-movflags', '+faststart') // 优化网络播放
        .addOption('-pix_fmt', 'yuv420p') // 确保兼容性
        .output(outputPath);

      // 监听进度
      command.on('progress', (progress: any) => {
        const progressInfo: TranscodingProgress = {
          percent: Math.round(progress.percent || 0),
          currentFps: Math.round(progress.currentFps || 0),
          currentKbps: Math.round(progress.currentKbps || 0),
          targetSize: String(progress.targetSize || '0kB'),
          timemark: progress.timemark || '00:00:00'
        };

        this.emit('progress', progressInfo);
        console.log(`📊 转码进度: ${progressInfo.percent}% (${progressInfo.timemark})`);
      });

      // 监听错误
      command.on('error', (err: any) => {
        console.error('❌ FFmpeg转码错误:', err);
        const error = this.createTranscodingError(
          TranscodingErrorType.TRANSCODING_FAILED,
          `转码失败: ${err.message}`,
          { inputPath, outputPath, qualitySettings }
        );
        reject(error);
      });

      // 监听完成
      command.on('end', async () => {
        try {
          console.log(`✅ FFmpeg转码完成: ${outputPath}`);
          const transcodedInfo = await this.videoInfoExtractor.getVideoInfo(outputPath);
          resolve(transcodedInfo);
        } catch (error) {
          const transcodingError = this.createTranscodingError(
            TranscodingErrorType.TRANSCODING_FAILED,
            `获取转码后视频信息失败: ${error}`,
            { inputPath, outputPath }
          );
          reject(transcodingError);
        }
      });

      // 开始转码
      try {
        command.run();
      } catch (error) {
        const transcodingError = this.createTranscodingError(
          TranscodingErrorType.TRANSCODING_FAILED,
          `启动转码失败: ${error}`,
          { inputPath, outputPath }
        );
        reject(transcodingError);
      }
    });
  }

  /**
   * 获取质量设置
   */
  public getQualitySettings(quality: TranscodingOptions['quality']): QualitySettings {
    const settings = {
      low: { crf: 28, preset: 'fast' },
      medium: { crf: 23, preset: 'medium' },
      high: { crf: 18, preset: 'slow' },
      ultra: { crf: 15, preset: 'veryslow' }
    };

    return settings[quality];
  }

  /**
   * 获取推荐的质量设置
   */
  public getRecommendedQuality(videoInfo: VideoInfo): TranscodingOptions['quality'] {
    const pixelCount = videoInfo.width * videoInfo.height;
    const bitrateKbps = videoInfo.bitrate / 1000;

    // 基于分辨率和比特率推荐质量
    if (pixelCount >= 1920 * 1080 && bitrateKbps > 5000) {
      return 'high';
    } else if (pixelCount >= 1280 * 720 && bitrateKbps > 2000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * 估算转码时间
   */
  public estimateTranscodingTime(videoInfo: VideoInfo, quality: TranscodingOptions['quality']): number {
    // 基于视频时长、分辨率和质量设置估算转码时间
    const duration = videoInfo.duration;
    const pixelCount = videoInfo.width * videoInfo.height;

    // 基础转码比率（实际时间 / 视频时长）
    let baseRatio = 0.5;

    // 根据分辨率调整
    if (pixelCount > 1920 * 1080) baseRatio *= 2;
    else if (pixelCount > 1280 * 720) baseRatio *= 1.5;

    // 根据质量设置调整
    const qualityMultipliers = {
      low: 0.8,
      medium: 1.0,
      high: 1.5,
      ultra: 2.5
    };

    baseRatio *= qualityMultipliers[quality];

    return Math.round(duration * baseRatio);
  }

  // 私有方法

  private async shouldSkipTranscoding(
    inputPath: string,
    outputPath: string,
    originalInfo: VideoInfo,
    options: TranscodingOptions
  ): Promise<boolean> {
    // 检查是否已经是H.264编码且格式正确
    const isH264 = originalInfo.codec.toLowerCase() === 'h264';
    const isMP4 = path.extname(outputPath).toLowerCase() === '.mp4';

    return isH264 && isMP4;
  }

  private async handleSkipTranscoding(
    inputPath: string,
    outputPath: string,
    originalInfo: VideoInfo,
    options: TranscodingOptions,
    startTime: number
  ): Promise<TranscodingResult> {
    console.log('📋 视频已经是H.264编码，直接复制文件');

    await fs.copyFile(inputPath, outputPath);

    if (options.deleteOriginal) {
      await fs.unlink(inputPath);
    }

    return {
      success: true,
      inputFile: inputPath,
      outputFile: outputPath,
      originalInfo,
      transcodedInfo: originalInfo,
      processingTime: Date.now() - startTime
    };
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

  /**
   * 验证输出路径
   */
  private async validateOutputPath(outputPath: string): Promise<void> {
    try {
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // 检查是否有写入权限
      await fs.access(outputDir, fs.constants.W_OK);

    } catch (error) {
      throw this.createTranscodingError(
        TranscodingErrorType.INVALID_OUTPUT_PATH,
        `输出路径无效或无写入权限: ${outputPath}`,
        { outputPath, originalError: error }
      );
    }
  }

  /**
   * 清理临时文件
   */
  public async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        console.log(`🧹 已清理临时文件: ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ 清理文件失败: ${filePath}`, error);
      }
    }
  }
}
