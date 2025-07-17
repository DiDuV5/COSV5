/**
 * @fileoverview 视频信息提取器 - CoserEden平台
 * @description 负责提取视频文件信息和验证
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import {
  type VideoInfo,
  type IVideoInfoExtractor,
  type TranscodingError,
  TranscodingErrorType,
} from './transcoding-types';

/**
 * 视频信息提取器类
 * 负责提取视频文件信息和验证
 */
export class VideoInfoExtractor extends EventEmitter implements IVideoInfoExtractor {
  private readonly supportedFormats = [
    'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'm4v', '3gp'
  ];

  private readonly supportedCodecs = [
    'h264', 'h265', 'hevc', 'vp8', 'vp9', 'av1', 'mpeg4', 'xvid'
  ];

  constructor() {
    super();
  }

  /**
   * 获取视频文件信息
   */
  public async getVideoInfo(filePath: string): Promise<VideoInfo> {
    try {
      // 验证文件路径
      await this.validateFilePath(filePath);

      // 验证文件是否为视频文件
      await this.validateVideoFile(filePath);

      console.log(`🔍 正在获取视频信息: ${filePath}`);

      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error('❌ FFprobe错误:', err);
            const error = this.createTranscodingError(
              TranscodingErrorType.INVALID_INPUT_FILE,
              `获取视频信息失败: ${err.message}`,
              { filePath, originalError: err }
            );
            reject(error);
            return;
          }

          try {
            const videoInfo = this.parseMetadata(metadata, filePath);
            console.log('✅ 视频信息获取成功:', videoInfo);
            this.emit('videoInfoExtracted', { filePath, videoInfo });
            resolve(videoInfo);
          } catch (parseError) {
            const error = this.createTranscodingError(
              TranscodingErrorType.INVALID_INPUT_FILE,
              `解析视频元数据失败: ${parseError}`,
              { filePath, metadata }
            );
            reject(error);
          }
        });
      });

    } catch (error) {
      console.error('❌ 获取视频信息失败:', error);
      throw error;
    }
  }

  /**
   * 验证视频文件是否有效
   */
  public async validateVideoFile(filePath: string): Promise<boolean> {
    try {
      // 检查文件扩展名
      const extension = path.extname(filePath).toLowerCase().slice(1);
      if (!this.supportedFormats.includes(extension)) {
        throw this.createTranscodingError(
          TranscodingErrorType.UNSUPPORTED_FORMAT,
          `不支持的视频格式: ${extension}`,
          { filePath, supportedFormats: this.supportedFormats }
        );
      }

      // 检查文件大小
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        throw this.createTranscodingError(
          TranscodingErrorType.INVALID_INPUT_FILE,
          '视频文件为空',
          { filePath, fileSize: stats.size }
        );
      }

      // 检查文件是否可读
      await fs.access(filePath, fs.constants.R_OK);

      return true;

    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error; // 重新抛出我们的自定义错误
      }

      throw this.createTranscodingError(
        TranscodingErrorType.INVALID_INPUT_FILE,
        `视频文件验证失败: ${error}`,
        { filePath }
      );
    }
  }

  /**
   * 检查视频是否已经是H.264编码
   */
  public async isH264Encoded(filePath: string): Promise<boolean> {
    try {
      const videoInfo = await this.getVideoInfo(filePath);
      return videoInfo.codec.toLowerCase() === 'h264';
    } catch (error) {
      console.error('检查H.264编码失败:', error);
      return false;
    }
  }

  /**
   * 获取视频缩略图时间戳建议
   */
  public async getThumbnailTimestamps(filePath: string, count: number = 3): Promise<string[]> {
    try {
      const videoInfo = await this.getVideoInfo(filePath);
      const duration = videoInfo.duration;

      if (duration <= 0) {
        return ['00:00:01'];
      }

      const timestamps: string[] = [];
      for (let i = 1; i <= count; i++) {
        const time = (duration * i) / (count + 1);
        timestamps.push(this.formatTimestamp(time));
      }

      return timestamps;

    } catch (error) {
      console.error('获取缩略图时间戳失败:', error);
      return ['00:00:01', '00:00:05', '00:00:10'];
    }
  }

  /**
   * 检查视频是否需要转码
   */
  public async needsTranscoding(filePath: string, targetFormat: string = 'mp4'): Promise<boolean> {
    try {
      const videoInfo = await this.getVideoInfo(filePath);
      const currentExtension = path.extname(filePath).toLowerCase().slice(1);

      // 检查格式是否匹配
      if (currentExtension !== targetFormat) {
        return true;
      }

      // 检查编码是否为H.264
      if (videoInfo.codec.toLowerCase() !== 'h264') {
        return true;
      }

      // 检查是否有音频流且编码合适
      // 这里可以添加更多检查逻辑

      return false;

    } catch (error) {
      console.error('检查转码需求失败:', error);
      return true; // 出错时默认需要转码
    }
  }

  /**
   * 获取视频质量评估
   */
  public async assessVideoQuality(filePath: string): Promise<{
    resolution: 'low' | 'medium' | 'high' | 'ultra';
    bitrate: 'low' | 'medium' | 'high' | 'ultra';
    overall: 'low' | 'medium' | 'high' | 'ultra';
  }> {
    try {
      const videoInfo = await this.getVideoInfo(filePath);

      // 评估分辨率
      const pixelCount = videoInfo.width * videoInfo.height;
      let resolution: 'low' | 'medium' | 'high' | 'ultra';
      if (pixelCount < 480 * 360) resolution = 'low';
      else if (pixelCount < 1280 * 720) resolution = 'medium';
      else if (pixelCount < 1920 * 1080) resolution = 'high';
      else resolution = 'ultra';

      // 评估比特率
      const bitrateKbps = videoInfo.bitrate / 1000;
      let bitrate: 'low' | 'medium' | 'high' | 'ultra';
      if (bitrateKbps < 1000) bitrate = 'low';
      else if (bitrateKbps < 3000) bitrate = 'medium';
      else if (bitrateKbps < 8000) bitrate = 'high';
      else bitrate = 'ultra';

      // 综合评估
      const scores = { low: 1, medium: 2, high: 3, ultra: 4 };
      const avgScore = (scores[resolution] + scores[bitrate]) / 2;
      let overall: 'low' | 'medium' | 'high' | 'ultra';
      if (avgScore < 1.5) overall = 'low';
      else if (avgScore < 2.5) overall = 'medium';
      else if (avgScore < 3.5) overall = 'high';
      else overall = 'ultra';

      return { resolution, bitrate, overall };

    } catch (error) {
      console.error('视频质量评估失败:', error);
      return { resolution: 'medium', bitrate: 'medium', overall: 'medium' };
    }
  }

  // 私有方法

  private async validateFilePath(filePath: string): Promise<void> {
    if (!filePath || typeof filePath !== 'string') {
      throw this.createTranscodingError(
        TranscodingErrorType.INVALID_INPUT_FILE,
        '文件路径不能为空',
        { filePath }
      );
    }

    try {
      await fs.access(filePath);
    } catch (error) {
      throw this.createTranscodingError(
        TranscodingErrorType.INVALID_INPUT_FILE,
        `文件不存在或无法访问: ${filePath}`,
        { filePath, originalError: error }
      );
    }
  }

  private parseMetadata(metadata: any, filePath: string): VideoInfo {
    if (!metadata || !metadata.streams) {
      throw new Error('无法读取视频元数据');
    }

    const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video');
    if (!videoStream) {
      throw new Error('未找到视频流');
    }

    // 安全地解析帧率
    let fps = 0;
    if (videoStream.r_frame_rate) {
      try {
        const [numerator, denominator] = videoStream.r_frame_rate.split('/').map(Number);
        fps = denominator ? numerator / denominator : numerator;
      } catch (error) {
        console.warn('解析帧率失败，使用默认值');
        fps = 0;
      }
    }

    return {
      format: metadata.format?.format_name || 'unknown',
      codec: videoStream.codec_name || 'unknown',
      width: videoStream.width || 0,
      height: videoStream.height || 0,
      duration: parseFloat(String(metadata.format?.duration || '0')),
      bitrate: parseInt(String(metadata.format?.bit_rate || '0')),
      fps: fps,
      size: parseInt(String(metadata.format?.size || '0'))
    };
  }

  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
}
