/**
 * @fileoverview 视频缩略图生成器
 * @description 为视频文件自动生成多个时间点的缩略图
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const generator = new VideoThumbnailGenerator();
 * const result = await generator.generateThumbnails(videoPath);
 *
 * @dependencies
 * - ffmpeg: 视频处理和缩略图生成
 * - fs: 文件系统操作
 * - path: 路径处理
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，支持多时间点缩略图生成
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface ThumbnailConfig {
  /** 缩略图时间点（秒） */
  timeSeconds: number;
  /** 输出宽度 */
  width?: number;
  /** 输出高度 */
  height?: number;
  /** 输出质量 (1-31, 越小质量越高) */
  quality?: number;
  /** 输出格式 */
  format?: 'jpg' | 'png' | 'webp';
}

export interface GeneratedThumbnail {
  timeSeconds: number;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  buffer: Buffer;
  filename: string;
}

export interface ThumbnailGenerationResult {
  success: boolean;
  videoInfo?: {
    duration: number;
    width: number;
    height: number;
    frameRate: number;
  };
  thumbnails?: GeneratedThumbnail[];
  error?: string;
  processingTime?: number;
}

export interface ThumbnailGenerationOptions {
  /** 自定义时间点配置 */
  customTimePoints?: ThumbnailConfig[];
  /** 是否生成默认时间点 */
  generateDefaultTimePoints?: boolean;
  /** 缩略图尺寸 */
  thumbnailSize?: {
    width: number;
    height: number;
  };
  /** 输出目录 */
  outputDir?: string;
  /** 是否生成WebP格式 */
  generateWebP?: boolean;
}

export class VideoThumbnailGenerator {
  private tempDir: string;

  // 默认缩略图配置
  private readonly defaultThumbnailSize = {
    width: 320,
    height: 180
  };

  constructor(tempDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), 'temp', 'video-thumbnails');
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
  async getVideoInfo(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    frameRate: number;
  }> {
    try {
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`);
      const info = JSON.parse(stdout);
      
      const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
      
      return {
        duration: parseFloat(info.format?.duration || '0'),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        frameRate: videoStream ? parseFloat(videoStream.r_frame_rate?.split('/')[0] || '0') : 0
      };
    } catch (error) {
      throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 生成单个缩略图
   */
  async generateSingleThumbnail(
    videoPath: string,
    config: ThumbnailConfig,
    outputPath: string
  ): Promise<GeneratedThumbnail> {
    const {
      timeSeconds,
      width = this.defaultThumbnailSize.width,
      height = this.defaultThumbnailSize.height,
      quality = 2,
      format = 'jpg'
    } = config;

    console.log(`🖼️ 生成缩略图: ${timeSeconds}秒 (${width}x${height}, ${format})`);

    // 构建FFmpeg命令
    let ffmpegCmd = `ffmpeg -ss ${timeSeconds} -i "${videoPath}" -vframes 1`;
    
    // 设置输出尺寸
    ffmpegCmd += ` -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2"`;
    
    // 设置输出格式和质量
    switch (format) {
      case 'jpg':
        ffmpegCmd += ` -q:v ${quality}`;
        break;
      case 'png':
        ffmpegCmd += ` -compression_level 9`;
        break;
      case 'webp':
        ffmpegCmd += ` -q:v ${quality * 3}`;
        break;
    }
    
    ffmpegCmd += ` -y "${outputPath}"`;

    try {
      await execAsync(ffmpegCmd);
      
      if (!fs.existsSync(outputPath)) {
        throw new Error('Thumbnail generation failed - output file not found');
      }
      
      const buffer = fs.readFileSync(outputPath);
      const filename = path.basename(outputPath);
      
      console.log(`✅ 缩略图生成成功: ${filename} (${(buffer.length / 1024).toFixed(1)}KB)`);
      
      return {
        timeSeconds,
        width,
        height,
        format,
        fileSize: buffer.length,
        buffer,
        filename
      };
      
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 生成多个缩略图
   */
  async generateThumbnails(
    videoPath: string,
    options: ThumbnailGenerationOptions = {}
  ): Promise<ThumbnailGenerationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🎬 开始生成视频缩略图: ${path.basename(videoPath)}`);
      
      // 获取视频信息
      const videoInfo = await this.getVideoInfo(videoPath);
      
      console.log(`📊 视频信息:`);
      console.log(`   时长: ${Math.round(videoInfo.duration)}秒`);
      console.log(`   分辨率: ${videoInfo.width}x${videoInfo.height}`);
      console.log(`   帧率: ${Math.round(videoInfo.frameRate)}fps`);
      
      const {
        customTimePoints,
        generateDefaultTimePoints = true,
        thumbnailSize = this.defaultThumbnailSize,
        generateWebP = true
      } = options;
      
      // 确定要生成的时间点
      const timePoints: ThumbnailConfig[] = [];
      
      if (generateDefaultTimePoints) {
        // 默认时间点：1秒、中间点、结束前1秒
        const defaultPoints = [
          1, // 开始1秒
          Math.max(2, videoInfo.duration / 2), // 中间点
          Math.max(3, videoInfo.duration - 1) // 结束前1秒
        ].filter(time => time <= videoInfo.duration && time > 0);
        
        for (const timeSeconds of defaultPoints) {
          // JPEG版本
          timePoints.push({
            timeSeconds,
            width: thumbnailSize.width,
            height: thumbnailSize.height,
            format: 'jpg'
          });
          
          // WebP版本
          if (generateWebP) {
            timePoints.push({
              timeSeconds,
              width: thumbnailSize.width,
              height: thumbnailSize.height,
              format: 'webp'
            });
          }
        }
      }
      
      // 添加自定义时间点
      if (customTimePoints) {
        timePoints.push(...customTimePoints);
      }
      
      console.log(`📷 将生成 ${timePoints.length} 个缩略图`);
      
      // 生成缩略图
      const thumbnails: GeneratedThumbnail[] = [];
      
      for (let i = 0; i < timePoints.length; i++) {
        const config = timePoints[i];
        const outputFilename = `thumbnail_${config.timeSeconds}s_${config.width}x${config.height}.${config.format}`;
        const outputPath = path.join(this.tempDir, outputFilename);
        
        try {
          const thumbnail = await this.generateSingleThumbnail(videoPath, config, outputPath);
          thumbnails.push(thumbnail);
          
          // 清理临时文件
          fs.unlinkSync(outputPath);
          
        } catch (error) {
          console.warn(`⚠️ 生成缩略图失败 (${config.timeSeconds}s): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      console.log(`✅ 缩略图生成完成: ${path.basename(videoPath)}`);
      console.log(`📈 成功生成: ${thumbnails.length}/${timePoints.length} 个缩略图`);
      console.log(`⏱️ 处理耗时: ${processingTime}ms`);
      
      return {
        success: true,
        videoInfo,
        thumbnails,
        processingTime
      };
      
    } catch (error) {
      console.error(`❌ 缩略图生成失败: ${path.basename(videoPath)}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 生成视频预览图（封面图）
   */
  async generatePreviewImage(
    videoPath: string,
    timeSeconds: number = 1,
    size: { width: number; height: number } = { width: 640, height: 360 }
  ): Promise<Buffer> {
    const outputPath = path.join(this.tempDir, `preview_${Date.now()}.jpg`);
    
    try {
      const thumbnail = await this.generateSingleThumbnail(
        videoPath,
        {
          timeSeconds,
          width: size.width,
          height: size.height,
          format: 'jpg',
          quality: 2
        },
        outputPath
      );
      
      return thumbnail.buffer;
      
    } finally {
      // 清理临时文件
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
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
