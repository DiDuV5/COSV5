/**
 * @fileoverview 视频处理器类型定义
 * @description 视频处理相关的类型和接口定义
 * @author Augment AI
 * @date 2025-07-15
 * @version 1.0.0
 */

/**
 * 视频元数据接口
 */
export interface VideoMetadata {
  /** 视频时长（秒） */
  duration: number;
  /** 视频宽度 */
  width: number;
  /** 视频高度 */
  height: number;
  /** 视频编码格式 */
  codec: string;
  /** 比特率 */
  bitrate: number;
  /** 帧率 */
  framerate: number;
  /** 容器格式 */
  format: string;
}

/**
 * H.264转码配置
 */
export interface H264Config {
  /** 视频编码器 */
  codec: string;
  /** 编码预设 */
  preset: string;
  /** 恒定质量因子 */
  crf: number;
  /** 最大比特率 */
  maxrate: string;
  /** 缓冲区大小 */
  bufsize: string;
  /** 输出格式 */
  format: string;
  /** 音频编码器 */
  audioCodec: string;
  /** 音频比特率 */
  audioBitrate: string;
}

/**
 * 视频处理结果
 */
export interface VideoProcessingResult {
  /** 处理后的缓冲区 */
  buffer: Buffer;
  /** 处理元数据 */
  metadata?: Record<string, any>;
}

/**
 * 缩略图生成选项
 */
export interface ThumbnailOptions {
  /** 原始存储键 */
  originalStorageKey: string;
  /** 视频时长 */
  duration: number;
  /** 缩略图宽度 */
  width?: number;
  /** 缩略图高度 */
  height?: number;
  /** 截取时间点（秒） */
  seekTime?: number;
}

/**
 * 视频验证选项
 */
export interface VideoValidationOptions {
  /** 最大文件大小（字节） */
  maxSize?: number;
  /** 最大时长（秒） */
  maxDuration?: number;
  /** 支持的格式列表 */
  supportedFormats?: string[];
}
