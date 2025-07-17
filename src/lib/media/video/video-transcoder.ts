/**
 * @fileoverview 视频转码服务
 * @description 使用FFmpeg将视频转码为H.264格式，确保浏览器兼容性
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const transcoder = new VideoTranscoder();
 * const result = await transcoder.transcodeToH264(inputPath, outputPath);
 *
 * @dependencies
 * - ffmpeg: 视频转码
 * - fs: 文件系统操作
 * - path: 路径处理
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，支持H.264转码
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { VideoThumbnailGenerator } from './video-thumbnail-generator';

const execAsync = promisify(exec);

export interface TranscodeOptions {
  /** 输出质量 (CRF值，18-28，越小质量越高) */
  quality?: number;
  /** 最大分辨率 (如 1920x1080) */
  maxResolution?: string;
  /** 目标码率 (kbps) */
  targetBitrate?: number;
  /** 是否保持原始音频 */
  preserveAudio?: boolean;
  /** 输出格式 */
  outputFormat?: 'mp4' | 'webm';
  /** 是否生成缩略图 */
  generateThumbnail?: boolean;
  /** 缩略图时间点 (秒) */
  thumbnailTime?: number;
}

export interface TranscodeResult {
  success: boolean;
  outputPath?: string;
  thumbnailPath?: string;
  thumbnails?: Array<{
    timeSeconds: number;
    format: string;
    buffer: Buffer;
    filename: string;
    fileSize: number;
  }>;
  originalSize?: number;
  outputSize?: number;
  compressionRatio?: number;
  duration?: number;
  error?: string;
  ffmpegLog?: string;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
  frameRate: number;
  audioCodec?: string;
}

export class VideoTranscoder {
  private tempDir: string;

  constructor(tempDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), 'temp', 'video-processing');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(inputPath: string): Promise<VideoInfo> {
    try {
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`);
      const info = JSON.parse(stdout);
      
      const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = info.streams.find((s: any) => s.codec_type === 'audio');
      
      return {
        duration: parseFloat(info.format?.duration || '0'),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        codec: videoStream?.codec_name || 'unknown',
        bitrate: parseInt(info.format?.bit_rate || '0'),
        frameRate: videoStream ? parseFloat(videoStream.r_frame_rate?.split('/')[0] || '0') : 0,
        audioCodec: audioStream?.codec_name
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 转码视频为H.264格式
   */
  async transcodeToH264(
    inputPath: string, 
    outputPath: string, 
    options: TranscodeOptions = {}
  ): Promise<TranscodeResult> {
    const {
      quality = 23,
      maxResolution,
      targetBitrate,
      preserveAudio = true,
      outputFormat = 'mp4',
      generateThumbnail = true,
      thumbnailTime = 1
    } = options;

    try {
      console.log(`🎬 开始转码: ${path.basename(inputPath)}`);
      
      // 获取原始视频信息
      const videoInfo = await this.getVideoInfo(inputPath);
      const originalSize = fs.statSync(inputPath).size;
      
      console.log(`📊 原始视频信息:`);
      console.log(`   编码: ${videoInfo.codec}`);
      console.log(`   分辨率: ${videoInfo.width}x${videoInfo.height}`);
      console.log(`   时长: ${Math.round(videoInfo.duration)}秒`);
      console.log(`   文件大小: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

      // 构建FFmpeg命令
      let ffmpegCmd = `ffmpeg -i "${inputPath}" -y`;

      // 视频编码设置 - 使用更兼容的参数
      ffmpegCmd += ` -c:v libx264 -crf ${quality} -preset medium`;

      // 像素格式转换 - 确保兼容性
      const videoFilters = ['format=yuv420p'];

      // 分辨率限制
      if (maxResolution) {
        videoFilters.push(`scale='min(${maxResolution.split('x')[0]},iw)':'min(${maxResolution.split('x')[1]},ih)':force_original_aspect_ratio=decrease`);
      }

      // 应用视频滤镜
      if (videoFilters.length > 0) {
        ffmpegCmd += ` -vf "${videoFilters.join(',')}"`;
      }

      // 设置兼容的profile和level
      ffmpegCmd += ` -profile:v main -level 3.1`;

      // 码率限制
      if (targetBitrate) {
        ffmpegCmd += ` -maxrate ${targetBitrate}k -bufsize ${targetBitrate * 2}k`;
      }

      // 音频编码设置
      if (preserveAudio && videoInfo.audioCodec) {
        if (videoInfo.audioCodec === 'aac') {
          ffmpegCmd += ` -c:a copy`; // 如果已经是AAC，直接复制
        } else {
          ffmpegCmd += ` -c:a aac -b:a 128k -ac 2 -ar 44100`; // 转码为AAC，强制立体声和标准采样率
        }
      } else {
        ffmpegCmd += ` -an`; // 移除音频
      }

      // 输出格式设置
      if (outputFormat === 'mp4') {
        ffmpegCmd += ` -movflags +faststart`; // 优化网络播放
        ffmpegCmd += ` -avoid_negative_ts make_zero`; // 避免时间戳问题
        ffmpegCmd += ` -fflags +genpts`; // 生成PTS
      }
      
      ffmpegCmd += ` "${outputPath}"`;
      
      console.log(`🔧 FFmpeg命令: ${ffmpegCmd}`);
      
      // 执行转码
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(ffmpegCmd);
      const endTime = Date.now();
      
      console.log(`⏱️ 转码耗时: ${Math.round((endTime - startTime) / 1000)}秒`);
      
      // 检查输出文件
      if (!fs.existsSync(outputPath)) {
        throw new Error('转码完成但输出文件不存在');
      }
      
      const outputSize = fs.statSync(outputPath).size;
      const compressionRatio = ((originalSize - outputSize) / originalSize) * 100;
      
      console.log(`📈 转码结果:`);
      console.log(`   输出大小: ${(outputSize / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   压缩率: ${compressionRatio.toFixed(1)}%`);
      
      const result: TranscodeResult = {
        success: true,
        outputPath,
        originalSize,
        outputSize,
        compressionRatio,
        duration: videoInfo.duration,
        ffmpegLog: stderr
      };
      
      // 生成缩略图
      if (generateThumbnail) {
        try {
          const thumbnailGenerator = new VideoThumbnailGenerator();
          const thumbnailResult = await thumbnailGenerator.generateThumbnails(inputPath, {
            generateDefaultTimePoints: true,
            generateWebP: true,
            thumbnailSize: { width: 320, height: 180 }
          });

          if (thumbnailResult.success && thumbnailResult.thumbnails) {
            result.thumbnails = thumbnailResult.thumbnails.map(thumb => ({
              timeSeconds: thumb.timeSeconds,
              format: thumb.format,
              buffer: thumb.buffer,
              filename: thumb.filename,
              fileSize: thumb.fileSize
            }));
            console.log(`🖼️ 缩略图生成: ${thumbnailResult.thumbnails.length}个`);
          }

          // 清理缩略图生成器
          thumbnailGenerator.cleanup();
        } catch (error) {
          console.warn(`⚠️ 缩略图生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ 转码失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ffmpegLog: error instanceof Error ? error.message : undefined
      };
    }
  }

  /**
   * 生成视频缩略图
   */
  async generateThumbnail(inputPath: string, timeSeconds: number = 1): Promise<string> {
    const outputPath = path.join(
      this.tempDir, 
      `${path.basename(inputPath, path.extname(inputPath))}_thumbnail.jpg`
    );
    
    const cmd = `ffmpeg -i "${inputPath}" -ss ${timeSeconds} -vframes 1 -q:v 2 -y "${outputPath}"`;
    
    await execAsync(cmd);
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('缩略图生成失败');
    }
    
    return outputPath;
  }

  /**
   * 检查视频是否需要转码
   */
  async needsTranscoding(inputPath: string): Promise<boolean> {
    try {
      const info = await this.getVideoInfo(inputPath);
      
      // 检查是否已经是H.264编码
      const isH264 = info.codec === 'h264';
      
      // 检查音频编码（如果有音频）
      const hasCompatibleAudio = !info.audioCodec || 
        info.audioCodec === 'aac' || 
        info.audioCodec === 'mp3';
      
      return !isH264 || !hasCompatibleAudio;
    } catch (error) {
      // 如果无法获取信息，假设需要转码
      return true;
    }
  }

  /**
   * 清理临时文件
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`⚠️ 清理临时文件失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
