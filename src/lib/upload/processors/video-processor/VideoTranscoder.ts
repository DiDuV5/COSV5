/**
 * @fileoverview 视频转码器
 * @description 专门负责视频H.264转码功能
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import ffmpeg from 'fluent-ffmpeg';
import { unlink, writeFile } from 'fs/promises';
import path from 'path';
import type { H264Config, VideoMetadata, VideoProcessingResult } from './types';
import { VideoMetadataExtractor } from './VideoMetadataExtractor';

/**
 * 视频转码器类
 */
export class VideoTranscoder {
  private readonly metadataExtractor: VideoMetadataExtractor;
  private readonly tempDir: string;

  // H.264转码配置
  private readonly h264Config: H264Config = {
    codec: 'libx264',
    preset: 'medium',
    crf: 23,
    maxrate: '2M',
    bufsize: '4M',
    format: 'mp4',
    audioCodec: 'aac',
    audioBitrate: '128k',
  };

  constructor(tempDir: string) {
    this.metadataExtractor = new VideoMetadataExtractor();
    this.tempDir = tempDir;
  }

  /**
   * 检查是否需要转码
   */
  public needsTranscoding(metadata: VideoMetadata, forceTranscode = false): boolean {
    if (forceTranscode) {
      return true;
    }
    return !this.metadataExtractor.isH264Encoded(metadata);
  }

  /**
   * 执行视频预处理（包含转码）
   */
  public async preprocessVideo(
    buffer: Buffer,
    filename: string,
    autoTranscode = true
  ): Promise<VideoProcessingResult> {
    let tempInputPath: string | undefined;
    let tempOutputPath: string | undefined;

    try {
      // 创建临时输入文件
      tempInputPath = path.join(this.tempDir, `input_${Date.now()}_${filename}`);
      await writeFile(tempInputPath, buffer);

      // 获取视频元数据
      const metadata = await this.metadataExtractor.getVideoMetadata(tempInputPath);

      // 检查是否需要转码
      const needsTranscoding = autoTranscode && this.needsTranscoding(metadata);

      let processedBuffer = buffer;
      let processingMetadata: Record<string, any> = {
        originalCodec: metadata.codec,
        originalDuration: metadata.duration,
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        originalBitrate: metadata.bitrate,
        needsTranscoding,
      };

      if (needsTranscoding) {
        console.log(`🔄 视频需要H.264转码: ${metadata.codec} → h264`);

        // 创建临时输出文件
        tempOutputPath = path.join(
          this.tempDir, 
          `output_${Date.now()}_${filename.replace(/\.[^.]+$/, '.mp4')}`
        );

        // 执行H.264转码
        await this.transcodeToH264(tempInputPath, tempOutputPath);

        // 读取转码后的文件
        const fs = await import('fs');
        const transcodedBuffer = await fs.promises.readFile(tempOutputPath);
        processedBuffer = Buffer.from(transcodedBuffer);

        // 获取转码后的元数据
        const transcodedMetadata = await this.metadataExtractor.getVideoMetadata(tempOutputPath);
        processingMetadata = {
          ...processingMetadata,
          transcoded: true,
          transcodedCodec: transcodedMetadata.codec,
          transcodedSize: transcodedBuffer.length,
          transcodedDuration: transcodedMetadata.duration,
        };

        console.log(`✅ H.264转码完成: ${buffer.length} → ${transcodedBuffer.length} bytes`);
      }

      return {
        buffer: processedBuffer,
        metadata: processingMetadata,
      };

    } catch (error) {
      throw TRPCErrorHandler.internalError(
        `视频预处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    } finally {
      // 确保清理所有临时文件
      if (tempInputPath) {
        await unlink(tempInputPath).catch(() => { });
      }
      if (tempOutputPath) {
        await unlink(tempOutputPath).catch(() => { });
      }
    }
  }

  /**
   * H.264转码
   */
  public async transcodeToH264(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔄 开始H.264转码: ${inputPath} → ${outputPath}`);

      const startTime = Date.now();

      ffmpeg(inputPath)
        .videoCodec(this.h264Config.codec)
        .audioCodec(this.h264Config.audioCodec)
        .addOption('-preset', this.h264Config.preset)
        .addOption('-crf', this.h264Config.crf.toString())
        .addOption('-maxrate', this.h264Config.maxrate)
        .addOption('-bufsize', this.h264Config.bufsize)
        .addOption('-movflags', '+faststart') // 优化网络播放
        .format(this.h264Config.format)
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`🚀 FFmpeg命令: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`⏳ 转码进度: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          const duration = Date.now() - startTime;
          console.log(`✅ H.264转码完成，耗时: ${Math.round(duration / 1000)}秒`);
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ H.264转码失败:', {
            inputPath,
            outputPath,
            error: err.message,
            stack: err.stack
          });
          reject(new Error(`H.264转码失败: ${err.message}`));
        })
        .run();
    });
  }

  /**
   * 获取转码配置
   */
  public getH264Config(): H264Config {
    return { ...this.h264Config };
  }

  /**
   * 更新转码配置
   */
  public updateH264Config(config: Partial<H264Config>): void {
    Object.assign(this.h264Config, config);
    console.log(`🔧 H.264转码配置已更新:`, this.h264Config);
  }

  /**
   * 估算转码时间
   */
  public estimateTranscodingTime(fileSize: number): number {
    // 转码每MB需要5秒
    return Math.round(fileSize / 1024 / 1024 * 5000);
  }

  /**
   * 检查转码能力
   */
  public async checkTranscodingCapability(): Promise<boolean> {
    try {
      // 检查FFmpeg是否可用
      return new Promise((resolve) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            console.error('❌ FFmpeg不可用:', err.message);
            resolve(false);
          } else {
            console.log('✅ FFmpeg转码能力检查通过');
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('❌ 转码能力检查失败:', error);
      return false;
    }
  }
}
