/**
 * @fileoverview 视频分析器
 * @description 分析视频文件的元数据和特性
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import {
  type VideoMetadata,
  type AudioStreamInfo,
  type SubtitleStreamInfo,
  validateFilePath
} from '../types/transcoding-types';

/**
 * 视频分析器
 */
export class VideoAnalyzer {
  /**
   * 获取视频信息
   */
  async getVideoInfo(filePath: string): Promise<VideoMetadata> {
    validateFilePath(filePath);

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      throw new Error(`文件不存在: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ]);

      let output = '';
      let error = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            const metadata = this.parseVideoMetadata(info, filePath);
            resolve(metadata);
          } catch (parseError) {
            reject(new Error(`解析视频信息失败: ${parseError}`));
          }
        } else {
          reject(new Error(`ffprobe 失败: ${error}`));
        }
      });

      ffprobe.on('error', (err) => {
        reject(new Error(`启动 ffprobe 失败: ${err.message}`));
      });
    });
  }

  /**
   * 解析视频元数据
   */
  private parseVideoMetadata(info: any, filePath: string): VideoMetadata {
    const videoStream = info.streams.find((s: any) => s.codec_type === 'video');

    if (!videoStream) {
      throw new Error('未找到视频流');
    }

    const codec = videoStream.codec_name;
    const width = parseInt(videoStream.width) || 0;
    const height = parseInt(videoStream.height) || 0;
    const duration = parseFloat(info.format.duration) || 0;
    const bitrate = parseInt(info.format.bit_rate) || 0;
    const frameRate = this.parseFrameRate(videoStream.r_frame_rate);
    const fileSize = parseInt(info.format.size) || 0;

    // 解析音频流
    const audioStreams = this.parseAudioStreams(info.streams);

    // 解析字幕流
    const subtitleStreams = this.parseSubtitleStreams(info.streams);

    // 判断是否需要转码
    const needsTranscoding = this.determineTranscodingNeed(videoStream);

    return {
      codec,
      width,
      height,
      duration,
      bitrate,
      frameRate,
      fileSize,
      needsTranscoding,
      audioStreams,
      subtitleStreams,
    };
  }

  /**
   * 解析帧率
   */
  private parseFrameRate(frameRateStr: string): number {
    if (!frameRateStr) return 30;

    try {
      // 处理分数形式的帧率，如 "30/1"
      if (frameRateStr.includes('/')) {
        const [numerator, denominator] = frameRateStr.split('/').map(Number);
        return denominator !== 0 ? numerator / denominator : 30;
      }

      return parseFloat(frameRateStr) || 30;
    } catch {
      return 30;
    }
  }

  /**
   * 解析音频流
   */
  private parseAudioStreams(streams: any[]): AudioStreamInfo[] {
    return streams
      .filter(stream => stream.codec_type === 'audio')
      .map((stream, index) => ({
        index,
        codec: stream.codec_name || 'unknown',
        bitrate: parseInt(stream.bit_rate) || 0,
        sampleRate: parseInt(stream.sample_rate) || 0,
        channels: parseInt(stream.channels) || 0,
        language: stream.tags?.language,
      }));
  }

  /**
   * 解析字幕流
   */
  private parseSubtitleStreams(streams: any[]): SubtitleStreamInfo[] {
    return streams
      .filter(stream => stream.codec_type === 'subtitle')
      .map((stream, index) => ({
        index,
        codec: stream.codec_name || 'unknown',
        language: stream.tags?.language,
        title: stream.tags?.title,
      }));
  }

  /**
   * 判断是否需要转码
   */
  private determineTranscodingNeed(videoStream: any): boolean {
    const codec = videoStream.codec_name;
    const profile = videoStream.profile;

    // HEVC/H.265 需要转码以提高兼容性
    if (codec === 'hevc' || codec === 'h265') {
      return true;
    }

    // H.264 但不是 Baseline 或 Main profile 可能需要转码
    if (codec === 'h264' && profile && !['Constrained Baseline', 'Baseline', 'Main'].includes(profile)) {
      return true;
    }

    // 其他不常见的编码格式
    const commonCodecs = ['h264', 'h265', 'hevc', 'vp8', 'vp9', 'av1'];
    if (!commonCodecs.includes(codec)) {
      return true;
    }

    return false;
  }

  /**
   * 检查磁盘空间
   */
  async checkDiskSpace(outputPath: string, inputFileSize: number): Promise<void> {
    try {
      const outputDir = path.dirname(outputPath);
      const stats = await fs.statfs(outputDir).catch(() => null);

      if (stats) {
        const freeSpace = stats.bavail * (stats.bsize || 1);
        // 预估转码后文件大小为原文件的1.5倍，再加上1GB缓冲
        const requiredSpace = inputFileSize * 1.5 + 1024 * 1024 * 1024;

        if (freeSpace < requiredSpace) {
          throw new Error(
            `磁盘空间不足: 可用${(freeSpace / 1024 / 1024 / 1024).toFixed(2)}GB，` +
            `需要${(requiredSpace / 1024 / 1024 / 1024).toFixed(2)}GB`
          );
        }
      }
    } catch (error) {
      // 如果无法检查磁盘空间，记录警告但不阻止执行
      console.warn('无法检查磁盘空间:', error);
    }
  }

  /**
   * 验证视频文件
   */
  async validateVideoFile(filePath: string): Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    try {
      validateFilePath(filePath);

      // 检查文件是否存在
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        return { isValid: false, error: '指定路径不是文件' };
      }

      if (stats.size === 0) {
        return { isValid: false, error: '文件为空' };
      }

      if (stats.size < 1024) {
        warnings.push('文件大小异常小，可能不是有效的视频文件');
      }

      // 检查文件扩展名
      const ext = path.extname(filePath).toLowerCase();
      const supportedExts = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'];

      if (!supportedExts.includes(ext)) {
        warnings.push(`文件扩展名 ${ext} 可能不被支持`);
      }

      // 尝试读取视频信息
      try {
        await this.getVideoInfo(filePath);
      } catch (error) {
        return {
          isValid: false,
          error: `无法读取视频信息: ${error instanceof Error ? error.message : '未知错误'}`
        };
      }

      return { isValid: true, warnings };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 获取视频缩略图
   */
  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    timeOffset: number = 10
  ): Promise<void> {
    validateFilePath(inputPath);
    validateFilePath(outputPath);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-ss', timeOffset.toString(),
        '-vframes', '1',
        '-y', // 覆盖输出文件
        outputPath
      ]);

      let error = '';

      ffmpeg.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`生成缩略图失败: ${error}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`启动 ffmpeg 失败: ${err.message}`));
      });
    });
  }

  /**
   * 获取视频质量评估
   */
  async assessVideoQuality(filePath: string): Promise<{
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  }> {
    const metadata = await this.getVideoInfo(filePath);
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 检查分辨率
    if (metadata.width < 720 || metadata.height < 480) {
      issues.push('分辨率较低');
      recommendations.push('考虑提高输出分辨率');
      score -= 20;
    }

    // 检查比特率
    const expectedBitrate = metadata.width * metadata.height * metadata.frameRate * 0.1;
    if (metadata.bitrate < expectedBitrate * 0.5) {
      issues.push('比特率过低，可能影响画质');
      recommendations.push('增加比特率以提高画质');
      score -= 15;
    } else if (metadata.bitrate > expectedBitrate * 3) {
      issues.push('比特率过高，文件大小较大');
      recommendations.push('降低比特率以减小文件大小');
      score -= 10;
    }

    // 检查帧率
    if (metadata.frameRate < 24) {
      issues.push('帧率较低，可能影响流畅度');
      recommendations.push('提高帧率到24fps或以上');
      score -= 10;
    }

    // 检查编码格式
    if (metadata.needsTranscoding) {
      issues.push('编码格式兼容性较差');
      recommendations.push('转码为H.264以提高兼容性');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }
}
