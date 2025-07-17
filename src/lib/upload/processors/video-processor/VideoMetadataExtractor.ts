/**
 * @fileoverview 视频元数据提取器
 * @description 专门负责提取视频文件的元数据信息
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import ffmpeg from 'fluent-ffmpeg';
import type { VideoMetadata, VideoValidationOptions } from './types';

/**
 * 视频元数据提取器类
 */
export class VideoMetadataExtractor {
  /**
   * 获取视频元数据
   */
  public async getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      console.log(`🔍 开始FFprobe分析: ${filePath}`);

      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('FFprobe分析超时（30秒）'));
      }, 30000);

      ffmpeg.ffprobe(filePath, (err, metadata) => {
        clearTimeout(timeout);

        if (err) {
          console.error('❌ FFprobe分析失败:', {
            filePath,
            error: err.message,
            stack: err.stack,
            code: (err as any).code
          });
          reject(new Error(`FFprobe分析失败: ${err.message}`));
          return;
        }

        try {
          console.log(`📊 FFprobe原始元数据:`, {
            format: metadata.format?.format_name,
            duration: metadata.format?.duration,
            streams: metadata.streams?.length
          });

          // 检查是否有流
          if (!metadata.streams || metadata.streams.length === 0) {
            reject(new Error('视频文件中未找到任何媒体流'));
            return;
          }

          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          if (!videoStream) {
            console.error('❌ 未找到视频流，可用流:', metadata.streams.map(s => ({
              index: s.index,
              codec_type: s.codec_type,
              codec_name: s.codec_name
            })));
            reject(new Error('视频文件中未找到视频流'));
            return;
          }

          console.log(`📹 视频流信息:`, {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            duration: videoStream.duration || metadata.format?.duration
          });

          // 安全地解析帧率
          const framerate = this.parseFramerate(videoStream.r_frame_rate);

          const result: VideoMetadata = {
            duration: parseFloat(String(metadata.format?.duration || videoStream.duration || 0)),
            width: parseInt(String(videoStream.width || 0)),
            height: parseInt(String(videoStream.height || 0)),
            codec: String(videoStream.codec_name || 'unknown'),
            bitrate: parseInt(String(metadata.format?.bit_rate || 0)),
            framerate: framerate,
            format: String(metadata.format?.format_name || 'unknown'),
          };

          console.log(`✅ 视频元数据解析完成:`, result);
          resolve(result);
        } catch (parseError) {
          console.error('❌ 元数据解析异常:', parseError);
          reject(new Error(`元数据解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`));
        }
      });
    });
  }

  /**
   * 验证视频元数据
   */
  public validateVideoMetadata(
    metadata: VideoMetadata, 
    options: VideoValidationOptions = {}
  ): void {
    const {
      maxDuration = 3600, // 默认1小时
      maxSize = 1024 * 1024 * 1024 // 默认1GB
    } = options;

    // 检查时长
    if (!metadata.duration || metadata.duration <= 0) {
      throw TRPCErrorHandler.validationError('无法读取视频时长信息，可能文件损坏');
    }

    if (metadata.duration > maxDuration) {
      throw TRPCErrorHandler.validationError(
        `视频时长过长: ${Math.round(metadata.duration)}秒。最大支持: ${maxDuration}秒`
      );
    }

    // 检查分辨率
    if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
      throw TRPCErrorHandler.validationError('无法读取视频分辨率信息，可能文件损坏');
    }

    // 检查编码格式
    if (!metadata.codec || metadata.codec === 'unknown') {
      throw TRPCErrorHandler.validationError('无法识别视频编码格式，可能文件损坏');
    }

    console.log(`🎬 视频验证通过: ${metadata.width}x${metadata.height}, 时长: ${Math.round(metadata.duration)}秒`);
  }

  /**
   * 检查是否为H.264编码
   */
  public isH264Encoded(metadata: VideoMetadata): boolean {
    const h264Codecs = ['h264', 'avc1', 'x264'];
    return h264Codecs.includes(metadata.codec?.toLowerCase());
  }

  /**
   * 安全地解析帧率
   */
  private parseFramerate(rFrameRate?: string): number {
    let framerate = 0;
    try {
      if (rFrameRate) {
        const [num, den] = rFrameRate.split('/').map(Number);
        if (den && den !== 0) {
          framerate = num / den;
        }
      }
    } catch (framerateError) {
      console.warn('⚠️ 帧率解析失败:', framerateError);
    }
    return framerate;
  }

  /**
   * 获取视频编码信息摘要
   */
  public getVideoSummary(metadata: VideoMetadata): string {
    const { width, height, duration, codec, bitrate } = metadata;
    const durationMin = Math.round(duration / 60 * 10) / 10;
    const bitrateKbps = Math.round(bitrate / 1000);
    
    return `${width}x${height} ${codec.toUpperCase()} ${durationMin}min ${bitrateKbps}kbps`;
  }
}
