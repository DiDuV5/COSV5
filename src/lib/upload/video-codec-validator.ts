/**
 * @fileoverview 视频编码验证器 - CoserEden平台
 * @description 强制验证视频文件H.264编码，确保浏览器兼容性
 * @author Augment AI
 * @date 2025-07-03
 * @version 2.0.0 - 重构版本
 * @since 1.0.0
 *
 * @example
 * import { VideoCodecValidator } from '@/lib/upload/video-codec-validator';
 *
 * const validator = new VideoCodecValidator();
 * const result = await validator.validateVideoCodec(videoBuffer, 'video.mp4');
 *
 * if (!result.isValid) {
 *   throw TRPCErrorHandler.videoEncodingError(result.currentCodec, result.message);
 * }
 *
 * @dependencies
 * - @/lib/upload/upload-constants: 视频处理常量
 * - @/lib/errors/trpc-error-handler: 错误处理
 *
 * @changelog
 * - 2025-07-03: 重构版本，模块化设计
 * - 2025-06-21: 初始版本创建，实现H.264强制验证
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { VIDEO_PROCESSING } from './upload-constants';

// 导入重构后的模块
import type { VideoCodecInfo, VideoValidationResult, DetectionStrategy } from './types/video-codec-types';
import { FFprobeDetector } from './detectors/ffprobe-detector';
import { BasicDetector } from './detectors/basic-detector';
import { MP4Detector } from './detectors/mp4-detector';
import { 
  getConversionSuggestions, 
  getGeneralSuggestions,
  isH264Codec,
  getFileExtension
} from './utils/video-codec-utils';

// 重新导出类型定义以保持向后兼容
export type { VideoCodecInfo, VideoValidationResult };

/**
 * 视频编码验证器
 */
export class VideoCodecValidator {
  private readonly requiredCodec = VIDEO_PROCESSING.REQUIRED_CODEC;
  private readonly compatibleCodecs = VIDEO_PROCESSING.BROWSER_COMPATIBLE_CODECS;
  
  private ffprobeDetector: FFprobeDetector;
  private basicDetector: BasicDetector;
  private mp4Detector: MP4Detector;

  constructor() {
    this.ffprobeDetector = new FFprobeDetector();
    this.basicDetector = new BasicDetector();
    this.mp4Detector = new MP4Detector();
  }

  /**
   * 验证视频编码
   */
  public async validateVideoCodec(
    videoBuffer: Buffer,
    filename: string
  ): Promise<VideoValidationResult> {
    try {
      // 检测视频编码信息
      const codecInfo = await this.detectVideoCodec(videoBuffer, filename);
      
      // 验证编码兼容性
      const isCompatible = this.isCodecCompatible(codecInfo.codec);
      
      // 生成验证结果
      const result: VideoValidationResult = {
        isValid: isCompatible,
        currentCodec: codecInfo.codec,
        requiredCodec: this.requiredCodec,
        message: isCompatible 
          ? `✅ 视频编码验证通过: ${codecInfo.codec}` 
          : `❌ 视频编码不兼容: ${codecInfo.codec}，需要${this.requiredCodec}`,
        codecInfo,
        suggestions: isCompatible 
          ? [] 
          : getConversionSuggestions(codecInfo.codec)
      };

      console.log(`🎬 视频编码验证完成: ${filename}`, result);
      return result;

    } catch (error) {
      console.error(`❌ 视频编码验证失败: ${filename}`, error);
      
      return {
        isValid: false,
        currentCodec: 'detection_failed',
        requiredCodec: this.requiredCodec,
        message: `视频编码检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestions: getGeneralSuggestions()
      };
    }
  }

  /**
   * 验证视频文件（基于文件路径）
   */
  public async validateVideoFile(filePath: string): Promise<VideoValidationResult> {
    try {
      const fs = await import('fs');
      const videoBuffer = await fs.promises.readFile(filePath);
      return this.validateVideoCodec(videoBuffer, filePath);
    } catch (error) {
      console.error(`❌ 视频文件读取失败: ${filePath}`, error);
      
      return {
        isValid: false,
        currentCodec: 'file_read_failed',
        requiredCodec: this.requiredCodec,
        message: `视频文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestions: getGeneralSuggestions()
      };
    }
  }

  /**
   * 快速检查MIME类型是否为视频
   */
  public isVideoMimeType(mimeType: string): boolean {
    return this.basicDetector.isVideoMimeType(mimeType);
  }

  /**
   * 检查编码是否兼容（增强版 - 超严格验证）
   */
  private isCodecCompatible(codec: string): boolean {
    console.log(`🔍 编码兼容性检查: "${codec}"`);

    // 严格检查：只有明确的H.264编码才被认为是兼容的
    const isH264 = isH264Codec(codec);
    
    if (isH264) {
      console.log(`✅ 编码兼容: ${codec} 是H.264编码`);
      return true;
    }

    console.log(`❌ 编码不兼容: ${codec} 不是H.264编码`);
    return false;
  }

  /**
   * 检测视频编码信息（增强版 - 多层检测策略 + 重试机制）
   */
  private async detectVideoCodec(videoBuffer: Buffer, filename: string): Promise<VideoCodecInfo> {
    console.log(`🎬 开始视频编码检测: ${filename} (${videoBuffer.length} bytes)`);

    // 多层检测策略：FFprobe (重试) -> MP4专用 -> 基本检测 -> 保守回退
    let ffprobeAttempts = 0;
    const maxFFprobeAttempts = 2;

    // 策略1: FFprobe检测（重试机制）
    while (ffprobeAttempts < maxFFprobeAttempts) {
      try {
        ffprobeAttempts++;
        console.log(`🔍 FFprobe检测尝试 ${ffprobeAttempts}/${maxFFprobeAttempts}`);
        
        const codecInfo = await this.ffprobeDetector.detectVideoCodec(videoBuffer, filename);
        console.log(`✅ FFprobe检测成功: ${filename}`, codecInfo);
        return codecInfo;
      } catch (error) {
        console.warn(`⚠️ FFprobe检测失败 (尝试 ${ffprobeAttempts}):`, error);
        if (ffprobeAttempts >= maxFFprobeAttempts) {
          console.log(`❌ FFprobe检测最终失败，尝试其他方法`);
        }
      }
    }

    // 策略2: MP4专用检测
    const ext = getFileExtension(filename);
    if (ext === 'mp4') {
      try {
        console.log(`🔍 尝试MP4专用检测`);
        const mp4Codec = this.mp4Detector.detectMP4Codec(videoBuffer);
        if (mp4Codec && mp4Codec !== 'unknown_mp4') {
          const codecInfo: VideoCodecInfo = {
            codec: mp4Codec,
            width: 0,
            height: 0,
            duration: 0,
            bitrate: 0,
            framerate: 0,
            isH264: isH264Codec(mp4Codec),
            isCompatible: isH264Codec(mp4Codec)
          };
          console.log(`✅ MP4专用检测成功: ${filename}`, codecInfo);
          return codecInfo;
        }
      } catch (error) {
        console.warn(`⚠️ MP4专用检测失败:`, error);
      }
    }

    // 策略3: 基本检测
    try {
      console.log(`🔍 尝试基本检测`);
      const codecInfo = this.basicDetector.detectBasicCodecInfo(videoBuffer, filename);
      console.log(`✅ 基本检测完成: ${filename}`, codecInfo);
      return codecInfo;
    } catch (error) {
      console.warn(`⚠️ 基本检测失败:`, error);
    }

    // 策略4: 保守回退
    console.log(`🛡️ 使用保守回退策略`);
    return this.basicDetector.getConservativeFallback(filename);
  }
}

/**
 * 默认实例
 */
export const videoCodecValidator = new VideoCodecValidator();

/**
 * 便捷函数：验证视频编码并抛出错误
 */
export async function validateVideoCodecOrThrow(
  videoBuffer: Buffer,
  filename: string
): Promise<VideoCodecInfo> {
  const result = await videoCodecValidator.validateVideoCodec(videoBuffer, filename);
  
  if (!result.isValid) {
    throw TRPCErrorHandler.businessError(
      'VIDEO_ENCODING_ERROR' as any,
      result.message,
      {
        context: {
          filename,
          currentCodec: result.currentCodec,
          requiredCodec: result.requiredCodec,
          suggestions: result.suggestions
        }
      }
    );
  }
  
  return result.codecInfo!;
}

/**
 * 便捷函数：快速检查视频编码
 */
export async function quickValidateVideoCodec(
  videoBuffer: Buffer,
  filename: string
): Promise<boolean> {
  try {
    const result = await videoCodecValidator.validateVideoCodec(videoBuffer, filename);
    return result.isValid;
  } catch (error) {
    console.error(`❌ 快速验证失败: ${filename}`, error);
    return false;
  }
}
