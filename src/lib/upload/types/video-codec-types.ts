/**
 * @fileoverview 视频编码相关类型定义
 * @description 视频编码验证器使用的类型定义
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 视频编码信息接口
 */
export interface VideoCodecInfo {
  codec: string;
  profile?: string;
  level?: string;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  framerate: number;
  isH264: boolean;
  isCompatible: boolean;
}

/**
 * 视频验证结果接口
 */
export interface VideoValidationResult {
  isValid: boolean;
  currentCodec: string;
  requiredCodec: string;
  message: string;
  codecInfo?: VideoCodecInfo;
  suggestions?: string[];
}

/**
 * FFprobe输出接口
 */
export interface FFprobeOutput {
  streams: Array<{
    codec_name?: string;
    codec_long_name?: string;
    profile?: string;
    level?: number;
    width?: number;
    height?: number;
    duration?: string;
    bit_rate?: string;
    r_frame_rate?: string;
    avg_frame_rate?: string;
    codec_type?: string;
  }>;
  format?: {
    duration?: string;
    bit_rate?: string;
    format_name?: string;
    format_long_name?: string;
  };
}

/**
 * 检测器配置接口
 */
export interface DetectorConfig {
  maxRetries: number;
  timeoutMs: number;
  enableLogging: boolean;
}

/**
 * 编码检测策略枚举
 */
export enum DetectionStrategy {
  FFPROBE = 'ffprobe',
  BASIC = 'basic',
  MP4_SPECIFIC = 'mp4_specific',
  CONSERVATIVE_FALLBACK = 'conservative_fallback'
}

/**
 * 支持的视频格式枚举
 */
export enum SupportedVideoFormat {
  MP4 = 'mp4',
  MOV = 'mov',
  AVI = 'avi',
  MKV = 'mkv',
  WEBM = 'webm',
  FLV = 'flv'
}

/**
 * 编码类型枚举
 */
export enum CodecType {
  H264 = 'h264',
  H265 = 'h265',
  VP8 = 'vp8',
  VP9 = 'vp9',
  AV1 = 'av1',
  UNKNOWN = 'unknown'
}
