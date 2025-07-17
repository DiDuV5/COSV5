/**
 * @fileoverview 视频解码器 - CoserEden平台
 * @description 视频解码和格式检测功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import type {
  VideoMetadata,
  VideoDecodingInfo,
} from './ffmpeg-types';
import {
  parseFPS,
  SUPPORTED_CODECS,
} from './ffmpeg-utils';

/**
 * 视频解码器类
 * 负责视频文件的解码、元数据提取和格式检测
 */
export class VideoDecoder {
  /**
   * 提取视频元数据
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<VideoMetadata> - 视频元数据
   * 
   * @example
   * ```typescript
   * const decoder = new VideoDecoder();
   * const metadata = await decoder.extractMetadata('/path/to/video.mp4');
   * console.log(`分辨率: ${metadata.width}x${metadata.height}`);
   * ```
   */
  public async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      // 检查文件是否存在
      fs.access(videoPath).catch(() => {
        reject(new Error(`视频文件不存在: ${videoPath}`));
        return;
      });

      const command = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoPath
      ];

      console.log(`🔍 提取视频元数据: ${videoPath}`);
      const ffprobe = spawn('ffprobe', command);
      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe失败 (退出码: ${code}): ${errorOutput}`));
          return;
        }

        try {
          const data = JSON.parse(output);
          const videoStream = data.streams.find((stream: any) => stream.codec_type === 'video');
          const audioStream = data.streams.find((stream: any) => stream.codec_type === 'audio');

          if (!videoStream) {
            reject(new Error('未找到视频流'));
            return;
          }

          const metadata: VideoMetadata = {
            width: parseInt(videoStream.width) || 0,
            height: parseInt(videoStream.height) || 0,
            duration: parseFloat(data.format.duration) || 0,
            bitrate: parseInt(data.format.bit_rate) || 0,
            fps: parseFPS(videoStream.r_frame_rate),
            codec: videoStream.codec_name || 'unknown',
            format: data.format.format_name || 'unknown',
            aspectRatio: videoStream.width && videoStream.height ?
              videoStream.width / videoStream.height : 0,
            fileSize: parseInt(data.format.size) || 0,
            colorSpace: videoStream.color_space || 'unknown',
            audioCodec: audioStream?.codec_name || 'none',
            audioChannels: audioStream?.channels || 0,
            audioSampleRate: audioStream?.sample_rate || 0
          };

          console.log(`✅ 元数据提取完成: ${metadata.codec} ${metadata.width}x${metadata.height}`);
          resolve(metadata);
        } catch (error) {
          reject(new Error(`解析FFprobe输出失败: ${error instanceof Error ? error.message : '未知错误'}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`启动FFprobe失败: ${error.message}`));
      });
    });
  }

  /**
   * 检测视频解码信息
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<VideoDecodingInfo> - 解码信息
   */
  public async detectDecodingInfo(videoPath: string): Promise<VideoDecodingInfo> {
    try {
      const metadata = await this.extractMetadata(videoPath);
      
      const decodingInfo: VideoDecodingInfo = {
        isSupported: this.isCodecSupported(metadata.codec),
        codec: metadata.codec,
        hasAudio: metadata.audioCodec !== 'none',
        audioCodec: metadata.audioCodec,
        needsTranscoding: false,
      };

      // 检查是否需要转码
      const transcodingCheck = this.checkTranscodingNeed(metadata);
      decodingInfo.needsTranscoding = transcodingCheck.needed;
      decodingInfo.reason = transcodingCheck.reason;

      console.log(`🔍 解码检测完成: ${metadata.codec}, 需要转码: ${decodingInfo.needsTranscoding}`);
      
      return decodingInfo;
    } catch (error) {
      console.error('❌ 解码信息检测失败:', error);
      throw error;
    }
  }

  /**
   * 检查编解码器是否支持
   * 
   * @param codec - 编解码器名称
   * @returns 是否支持
   */
  private isCodecSupported(codec: string): boolean {
    const normalizedCodec = codec.toLowerCase();
    return SUPPORTED_CODECS.VIDEO.INPUT.some(supportedCodec =>
      normalizedCodec.includes(supportedCodec.toLowerCase())
    );
  }

  /**
   * 检查是否需要转码
   * 
   * @param metadata - 视频元数据
   * @returns 转码检查结果
   */
  private checkTranscodingNeed(metadata: VideoMetadata): { needed: boolean; reason?: string } {
    const reasons: string[] = [];

    // 检查编解码器兼容性
    const isH264Compatible = SUPPORTED_CODECS.VIDEO.H264_VARIANTS.some(codec =>
      metadata.codec.toLowerCase().includes(codec.toLowerCase())
    );

    if (!isH264Compatible) {
      reasons.push(`非H.264编码: ${metadata.codec}`);
    }

    // 检查分辨率
    if (metadata.width > 1920 || metadata.height > 1080) {
      reasons.push(`分辨率过高: ${metadata.width}x${metadata.height}`);
    }

    // 检查比特率
    if (metadata.bitrate && metadata.bitrate > 8000000) { // 8Mbps
      reasons.push(`比特率过高: ${Math.round(metadata.bitrate / 1000000)}Mbps`);
    }

    // 检查帧率
    if (metadata.fps > 60) {
      reasons.push(`帧率过高: ${metadata.fps}fps`);
    }

    // 检查文件大小
    if (metadata.fileSize && metadata.fileSize > 500 * 1024 * 1024) { // 500MB
      reasons.push(`文件过大: ${Math.round(metadata.fileSize / 1024 / 1024)}MB`);
    }

    return {
      needed: reasons.length > 0,
      reason: reasons.length > 0 ? reasons.join(', ') : undefined,
    };
  }

  /**
   * 检查视频是否需要转码（静态方法，向后兼容）
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<boolean> - 是否需要转码
   */
  public static async needsTranscoding(videoPath: string): Promise<boolean> {
    try {
      const decoder = new VideoDecoder();
      const decodingInfo = await decoder.detectDecodingInfo(videoPath);
      return decodingInfo.needsTranscoding;
    } catch (error) {
      console.warn('检查转码需求失败:', error);
      // 出错时默认转码以确保安全
      return true;
    }
  }

  /**
   * 提取视频元数据（静态方法，向后兼容）
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<VideoMetadata> - 视频元数据
   */
  public static async extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    const decoder = new VideoDecoder();
    return decoder.extractMetadata(videoPath);
  }

  /**
   * 验证视频文件完整性
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<boolean> - 文件是否完整
   */
  public async validateVideoIntegrity(videoPath: string): Promise<boolean> {
    try {
      // 检查文件是否存在
      const stats = await fs.stat(videoPath);
      if (stats.size === 0) {
        console.error('❌ 视频文件为空');
        return false;
      }

      // 尝试提取元数据
      const metadata = await this.extractMetadata(videoPath);
      
      // 基本完整性检查
      if (metadata.width === 0 || metadata.height === 0) {
        console.error('❌ 视频分辨率无效');
        return false;
      }

      if (metadata.duration === 0) {
        console.error('❌ 视频时长无效');
        return false;
      }

      console.log('✅ 视频文件完整性验证通过');
      return true;
    } catch (error) {
      console.error('❌ 视频完整性验证失败:', error);
      return false;
    }
  }

  /**
   * 获取视频基本信息（快速检查）
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<{codec: string, duration: number, size: number}> - 基本信息
   */
  public async getBasicInfo(videoPath: string): Promise<{
    codec: string;
    duration: number;
    size: number;
    format: string;
  }> {
    try {
      const [metadata, stats] = await Promise.all([
        this.extractMetadata(videoPath),
        fs.stat(videoPath)
      ]);

      return {
        codec: metadata.codec,
        duration: metadata.duration,
        size: stats.size,
        format: metadata.format,
      };
    } catch (error) {
      console.error('❌ 获取视频基本信息失败:', error);
      throw error;
    }
  }

  /**
   * 检查视频是否为H.264编码
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<boolean> - 是否为H.264编码
   */
  public async isH264Encoded(videoPath: string): Promise<boolean> {
    try {
      const metadata = await this.extractMetadata(videoPath);
      return SUPPORTED_CODECS.VIDEO.H264_VARIANTS.some(codec =>
        metadata.codec.toLowerCase().includes(codec.toLowerCase())
      );
    } catch (error) {
      console.error('❌ 检查H.264编码失败:', error);
      return false;
    }
  }

  /**
   * 获取视频流信息
   * 
   * @param videoPath - 视频文件路径
   * @returns Promise<any> - 详细流信息
   */
  public async getStreamInfo(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const command = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-select_streams', 'v:0', // 只选择第一个视频流
        videoPath
      ];

      const ffprobe = spawn('ffprobe', command);
      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`获取流信息失败: ${errorOutput}`));
          return;
        }

        try {
          const data = JSON.parse(output);
          resolve(data.streams[0] || null);
        } catch (error) {
          reject(new Error(`解析流信息失败: ${error instanceof Error ? error.message : '未知错误'}`));
        }
      });

      ffprobe.on('error', (error) => {
        reject(new Error(`启动FFprobe失败: ${error.message}`));
      });
    });
  }
}
