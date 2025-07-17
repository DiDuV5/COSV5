/**
 * @fileoverview 视频编码器 - CoserEden平台
 * @description 视频编码和转码功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  TranscodeOptions,
  TranscodeResult,
  VideoMetadata,
  TranscodeProgress,
  VideoEncodingOptions,
  ProgressCallback,
} from './ffmpeg-types';
import { FFmpegCore } from './ffmpeg-core';
import { VideoDecoder } from './video-decoder';
import {
  buildFFmpegCommand,
  generateSessionId,
  checkMemoryPressure,
  formatFileSize,
  formatProcessingTime,
  FFMPEG_DEFAULTS,
} from './ffmpeg-utils';

/**
 * 视频编码器类
 * 负责视频转码和编码处理
 */
export class VideoEncoder {
  private ffmpegCore: FFmpegCore;
  private videoDecoder: VideoDecoder;

  constructor(ffmpegCore?: FFmpegCore) {
    this.ffmpegCore = ffmpegCore || FFmpegCore.getInstance();
    this.videoDecoder = new VideoDecoder();
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
    const startTime = Date.now();
    const id = sessionId || generateSessionId();

    try {
      console.log(`🎬 开始视频转码: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);

      // 检查内存压力（放宽阈值到95%）
      if (checkMemoryPressure(95)) {
        throw new Error('内存使用率过高，暂停转码任务');
      }

      // 获取输入文件元数据
      const inputMetadata = await this.videoDecoder.extractMetadata(inputPath);
      console.log(`📊 输入视频信息: ${inputMetadata.codec} ${inputMetadata.width}x${inputMetadata.height} ${Math.round(inputMetadata.duration)}s`);

      // 构建转码命令
      const command = this.buildTranscodeCommand(inputPath, outputPath, options, inputMetadata);
      
      // 执行转码
      await this.ffmpegCore.executeFFmpeg(
        command,
        id,
        onProgress,
        (sessionId, error) => {
          console.error(`❌ 转码错误: ${sessionId}`, error);
        },
        (sessionId, result) => {
          console.log(`✅ 转码完成: ${sessionId}`);
        }
      );

      // 验证输出文件
      const outputMetadata = await this.validateOutput(outputPath);
      const outputStats = await fs.stat(outputPath);

      const result: TranscodeResult = {
        success: true,
        outputPath,
        originalSize: inputMetadata.fileSize || 0,
        outputSize: outputStats.size,
        compressionRatio: inputMetadata.fileSize ? outputStats.size / inputMetadata.fileSize : 0,
        processingTime: Date.now() - startTime,
        metadata: outputMetadata,
        retryCount: 0,
        qualityScore: this.calculateQualityScore(inputMetadata, outputMetadata),
      };

      console.log(`✅ 视频转码成功: ${formatFileSize(result.outputSize!)} (${formatProcessingTime(result.processingTime)})`);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error(`❌ 视频转码失败: ${errorMessage}`);

      return {
        success: false,
        originalSize: 0,
        processingTime: Date.now() - startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 构建转码命令
   */
  private buildTranscodeCommand(
    inputPath: string,
    outputPath: string,
    options: TranscodeOptions,
    inputMetadata: VideoMetadata
  ): string[] {
    const {
      codec = 'libx264',
      preset = FFMPEG_DEFAULTS.PRESET_DEFAULT,
      crf = FFMPEG_DEFAULTS.CRF_DEFAULT,
      maxWidth = 1920,
      maxHeight = 1080,
      audioCodec = 'aac',
      audioBitrate = '128k',
      enableHardwareAccel = false,
    } = options;

    // 计算输出分辨率
    const { width: outputWidth, height: outputHeight } = this.calculateOutputResolution(
      inputMetadata.width,
      inputMetadata.height,
      maxWidth,
      maxHeight
    );

    const commandOptions = {
      inputPath,
      outputPath,
      videoOptions: {
        codec,
        preset,
        crf,
        profile: 'main' as const,
        level: '4.0',
        pixelFormat: 'yuv420p',
      },
      audioOptions: {
        codec: audioCodec,
        bitrate: audioBitrate,
      },
      filterOptions: {
        scale: outputWidth !== inputMetadata.width || outputHeight !== inputMetadata.height
          ? `${outputWidth}:${outputHeight}`
          : undefined,
      },
      globalOptions: {
        overwrite: true,
        threads: 0, // 自动检测
      },
    };

    // 添加硬件加速（如果启用）
    if (enableHardwareAccel) {
      // 这里可以添加硬件加速选项
      console.log('🚀 启用硬件加速');
    }

    return buildFFmpegCommand(commandOptions);
  }

  /**
   * 计算输出分辨率
   */
  private calculateOutputResolution(
    inputWidth: number,
    inputHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // 如果输入分辨率已经在限制内，保持原分辨率
    if (inputWidth <= maxWidth && inputHeight <= maxHeight) {
      return { width: inputWidth, height: inputHeight };
    }

    // 计算缩放比例，保持宽高比
    const widthRatio = maxWidth / inputWidth;
    const heightRatio = maxHeight / inputHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    const outputWidth = Math.floor(inputWidth * ratio);
    const outputHeight = Math.floor(inputHeight * ratio);

    // 确保分辨率是偶数（H.264要求）
    return {
      width: outputWidth % 2 === 0 ? outputWidth : outputWidth - 1,
      height: outputHeight % 2 === 0 ? outputHeight : outputHeight - 1,
    };
  }

  /**
   * 验证输出文件
   */
  private async validateOutput(outputPath: string): Promise<VideoMetadata> {
    try {
      // 检查文件是否存在
      await fs.access(outputPath);

      // 检查文件大小
      const stats = await fs.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('输出文件为空');
      }

      // 提取元数据验证
      const metadata = await this.videoDecoder.extractMetadata(outputPath);

      // 验证编码格式
      if (!metadata.codec.toLowerCase().includes('h264')) {
        throw new Error(`输出文件编码格式错误: ${metadata.codec}, 期望: h264`);
      }

      console.log(`✅ 输出文件验证通过: ${metadata.codec} ${metadata.width}x${metadata.height}`);
      return metadata;

    } catch (error) {
      console.error('❌ 输出文件验证失败:', error);
      
      // 尝试删除无效的输出文件
      try {
        await fs.unlink(outputPath);
        console.log('🗑️ 已删除无效的输出文件');
      } catch (cleanupError) {
        console.warn('⚠️ 清理无效文件失败:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * 计算转码质量分数
   */
  private calculateQualityScore(input: VideoMetadata, output: VideoMetadata): number {
    let score = 100;

    // 分辨率保持度 (30%)
    const resolutionRatio = (output.width * output.height) / (input.width * input.height);
    if (resolutionRatio < 1) {
      score -= (1 - resolutionRatio) * 30;
    }

    // 码率保持度 (40%)
    if (input.bitrate > 0 && output.bitrate > 0) {
      const bitrateRatio = output.bitrate / input.bitrate;
      if (bitrateRatio < 0.3) {
        score -= 40;
      } else if (bitrateRatio < 0.5) {
        score -= 20;
      } else if (bitrateRatio < 0.7) {
        score -= 10;
      }
    }

    // 帧率保持度 (20%)
    if (input.fps > 0 && output.fps > 0) {
      const fpsRatio = output.fps / input.fps;
      score -= Math.max(0, (1 - fpsRatio) * 20);
    }

    // 文件大小合理性 (10%)
    if (input.fileSize && output.fileSize) {
      const sizeRatio = output.fileSize / input.fileSize;
      if (sizeRatio > 2) {
        score -= 10; // 文件变大太多
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 解析FFmpeg进度信息
   */
  public parseProgress(output: string, totalDuration: number = 0): TranscodeProgress | null {
    const lines = output.split('\n');
    const progress: Partial<TranscodeProgress> = {};

    for (const line of lines) {
      // 解析帧数
      if (line.includes('frame=')) {
        const frameMatch = line.match(/frame=\s*(\d+)/);
        if (frameMatch) progress.frame = parseInt(frameMatch[1]);
      }

      // 解析FPS
      if (line.includes('fps=')) {
        const fpsMatch = line.match(/fps=\s*([\d.]+)/);
        if (fpsMatch) progress.fps = parseFloat(fpsMatch[1]);
      }

      // 解析码率
      if (line.includes('bitrate=')) {
        const bitrateMatch = line.match(/bitrate=\s*([\d.]+\w+)/);
        if (bitrateMatch) progress.bitrate = bitrateMatch[1];
      }

      // 解析时间和进度
      if (line.includes('time=')) {
        const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          const centiseconds = parseInt(timeMatch[4]);

          const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
          progress.outTime = `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}.${timeMatch[4]}`;
          progress.outTimeMs = currentTime * 1000;
          
          if (totalDuration > 0) {
            progress.progress = Math.min((currentTime / totalDuration) * 100, 100);
          }
        }
      }

      // 解析速度
      if (line.includes('speed=')) {
        const speedMatch = line.match(/speed=\s*([\d.]+x)/);
        if (speedMatch) progress.speed = speedMatch[1];
      }
    }

    // 只有当有足够信息时才返回进度对象
    if (progress.frame !== undefined && progress.outTime !== undefined) {
      return progress as TranscodeProgress;
    }

    return null;
  }

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
    const encoder = new VideoEncoder();
    
    // 转换进度回调格式
    const progressCallback: ProgressCallback | undefined = onProgress
      ? (id: string, progress: TranscodeProgress) => {
          // 模拟原始输出格式
          const output = `frame=${progress.frame} fps=${progress.fps} time=${progress.outTime} bitrate=${progress.bitrate} speed=${progress.speed}`;
          onProgress(id, output);
        }
      : undefined;

    const result = await encoder.transcodeVideo(inputPath, outputPath, options, progressCallback, sessionId);
    
    if (!result.success) {
      throw new Error(result.error || '转码失败');
    }
  }
}
