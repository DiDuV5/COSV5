/**
 * @fileoverview 基本视频编码检测器
 * @description 基于文件头和扩展名的基本检测方法
 * @author Augment AI
 * @date 2025-07-03
 */

import { VideoCodecInfo } from '../types/video-codec-types';
import { 
  getFileExtension, 
  guessCodecFromExtension, 
  normalizeCodecName,
  isH264Codec
} from '../utils/video-codec-utils';

/**
 * 基本检测器类
 */
export class BasicDetector {
  private enableLogging: boolean;

  constructor(enableLogging = true) {
    this.enableLogging = enableLogging;
  }

  /**
   * 基本编码检测
   */
  detectBasicCodecInfo(videoBuffer: Buffer, filename: string): VideoCodecInfo {
    if (this.enableLogging) {
      console.log(`🔍 开始基本编码检测: ${filename}`);
    }

    // 基于文件扩展名和魔数的基本检测
    const ext = getFileExtension(filename);
    if (this.enableLogging) {
      console.log(`📁 文件扩展名: ${ext}`);
    }

    // 检测文件魔数
    const magicNumber = this.detectMagicNumber(videoBuffer);
    if (this.enableLogging) {
      console.log(`🔮 文件魔数: ${magicNumber}`);
    }

    // 基于扩展名推测编码
    let codec = 'unknown';
    let isH264 = false;
    let isCompatible = false;

    switch (ext) {
      case 'mp4':
        codec = this.detectMP4BasicCodec(videoBuffer);
        break;
      case 'mov':
        codec = 'h264'; // MOV通常是H.264
        break;
      case 'avi':
        codec = 'unknown_avi'; // AVI可能包含各种编码
        break;
      case 'mkv':
        codec = 'h264'; // MKV通常是H.264
        break;
      case 'webm':
        codec = 'vp8'; // WebM通常是VP8/VP9
        break;
      case 'flv':
        codec = 'h264'; // FLV通常是H.264
        break;
      default:
        codec = 'unknown_format';
    }

    // 标准化编码名称
    const normalizedCodec = normalizeCodecName(codec);
    isH264 = isH264Codec(normalizedCodec);
    isCompatible = isH264;

    // 基本信息（无法精确检测，使用默认值）
    const codecInfo: VideoCodecInfo = {
      codec: normalizedCodec,
      width: 0, // 无法检测
      height: 0, // 无法检测
      duration: 0, // 无法检测
      bitrate: 0, // 无法检测
      framerate: 0, // 无法检测
      isH264,
      isCompatible
    };

    if (this.enableLogging) {
      console.log(`📊 基本检测结果:`, codecInfo);
    }

    return codecInfo;
  }

  /**
   * 检测文件魔数
   */
  private detectMagicNumber(buffer: Buffer): string {
    if (buffer.length < 12) return 'unknown';

    // 检查常见视频格式的魔数
    const header = buffer.subarray(0, 12);

    // MP4/MOV (ftyp)
    if (header.includes(Buffer.from('ftyp'))) {
      return 'mp4/mov';
    }

    // AVI (RIFF...AVI)
    if (header.subarray(0, 4).equals(Buffer.from('RIFF')) && 
        header.subarray(8, 12).equals(Buffer.from('AVI '))) {
      return 'avi';
    }

    // WebM (EBML)
    if (header.subarray(0, 4).equals(Buffer.from([0x1A, 0x45, 0xDF, 0xA3]))) {
      return 'webm/mkv';
    }

    // FLV
    if (header.subarray(0, 3).equals(Buffer.from('FLV'))) {
      return 'flv';
    }

    return 'unknown';
  }

  /**
   * MP4基本编码检测
   */
  private detectMP4BasicCodec(buffer: Buffer): string {
    try {
      if (this.enableLogging) {
        console.log('🔍 开始MP4基本编码检测...');
      }

      // 查找ftyp box
      const ftypIndex = buffer.indexOf('ftyp');
      if (ftypIndex === -1) {
        if (this.enableLogging) {
          console.log('❌ 未找到ftyp box');
        }
        return 'unknown_mp4';
      }

      // 检查brand和compatible brands
      const ftypData = buffer.subarray(ftypIndex, ftypIndex + 20);
      const ftypString = ftypData.toString('ascii');

      if (this.enableLogging) {
        console.log(`📦 ftyp信息: ${ftypString}`);
      }

      // 基于brand推测编码
      if (ftypString.includes('isom') || 
          ftypString.includes('mp41') || 
          ftypString.includes('mp42') ||
          ftypString.includes('avc1')) {
        return 'h264'; // 很可能是H.264
      }

      if (ftypString.includes('hev1') || ftypString.includes('hvc1')) {
        return 'h265'; // H.265/HEVC
      }

      // 默认假设是H.264（MP4最常见的编码）
      return 'h264';

    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ MP4基本检测失败:', error);
      }
      return 'unknown_mp4';
    }
  }

  /**
   * 保守回退策略
   */
  getConservativeFallback(filename: string): VideoCodecInfo {
    if (this.enableLogging) {
      console.warn(`🛡️ 保守回退: ${filename} - 基于文件扩展名进行最后判断`);
    }

    const ext = getFileExtension(filename);
    let codec = 'unknown_needs_transcode';
    let isH264 = false;
    let isCompatible = false;

    // 基于扩展名的保守判断
    switch (ext) {
      case 'mp4':
      case 'mov':
        // MP4和MOV有较高概率是H.264，但不确定
        codec = 'probably_h264';
        isH264 = true; // 保守假设
        isCompatible = true;
        break;
      
      case 'avi':
        // AVI格式编码不确定，需要转码
        codec = 'unknown_avi_needs_transcode';
        isH264 = false;
        isCompatible = false;
        break;
      
      case 'mkv':
        // MKV可能是H.264，但不确定
        codec = 'probably_h264_mkv';
        isH264 = true; // 保守假设
        isCompatible = true;
        break;
      
      case 'webm':
        // WebM通常不是H.264
        codec = 'webm_not_h264';
        isH264 = false;
        isCompatible = false;
        break;
      
      case 'flv':
        // FLV可能是H.264
        codec = 'probably_h264_flv';
        isH264 = true; // 保守假设
        isCompatible = true;
        break;
      
      default:
        // 未知格式，需要转码
        codec = 'unknown_format_needs_transcode';
        isH264 = false;
        isCompatible = false;
    }

    const fallbackInfo: VideoCodecInfo = {
      codec,
      width: 0,
      height: 0,
      duration: 0,
      bitrate: 0,
      framerate: 0,
      isH264,
      isCompatible
    };

    if (this.enableLogging) {
      console.log(`🛡️ 保守回退结果:`, fallbackInfo);
    }

    return fallbackInfo;
  }

  /**
   * 快速检查MIME类型是否为视频
   */
  isVideoMimeType(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }
}
