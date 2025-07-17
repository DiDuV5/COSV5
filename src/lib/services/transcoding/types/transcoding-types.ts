/**
 * @fileoverview 转码服务类型定义
 * @description 定义转码服务相关的所有类型和接口
 */

import * as path from 'path';

/**
 * 转码配置
 */
export interface TranscodingConfig {
  outputFormat: 'mp4' | 'webm' | 'avi';
  videoCodec: 'h264' | 'h265' | 'vp9';
  audioCodec: 'aac' | 'mp3' | 'opus';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution?: {
    width: number;
    height: number;
  };
  bitrate?: number;
  frameRate?: number;
  enableHardwareAcceleration?: boolean;
  customOptions?: string[];
}

/**
 * 转码任务
 */
export interface TranscodingTask {
  id: string;
  inputPath: string;
  outputPath: string;
  config: TranscodingConfig;
  status: TranscodingStatus;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  metadata?: VideoMetadata;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * 转码状态
 */
export type TranscodingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

/**
 * 视频元数据
 */
export interface VideoMetadata {
  codec: string;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  frameRate: number;
  fileSize: number;
  needsTranscoding: boolean;
  audioStreams?: AudioStreamInfo[];
  subtitleStreams?: SubtitleStreamInfo[];
}

/**
 * 音频流信息
 */
export interface AudioStreamInfo {
  index: number;
  codec: string;
  bitrate: number;
  sampleRate: number;
  channels: number;
  language?: string;
}

/**
 * 字幕流信息
 */
export interface SubtitleStreamInfo {
  index: number;
  codec: string;
  language?: string;
  title?: string;
}

/**
 * 转码结果
 */
export interface TranscodingResult {
  success: boolean;
  outputPath?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  processingTime?: number;
  error?: string;
  metadata?: VideoMetadata;
}

/**
 * 转码进度信息
 */
export interface TranscodingProgress {
  taskId: string;
  progress: number;
  currentTime: number;
  totalTime: number;
  fps: number;
  bitrate: string;
  speed: string;
  eta: string;
}

/**
 * 转码统计信息
 */
export interface TranscodingStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  totalCompressionRatio: number;
  queueLength: number;
  activeWorkers: number;
}

/**
 * 转码选项
 */
export interface TranscodingOptions {
  priority?: number;
  maxRetries?: number;
  enablePreview?: boolean;
  generateThumbnails?: boolean;
  thumbnailCount?: number;
  watermark?: {
    text?: string;
    imagePath?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
  outputDirectory?: string;
  tempDirectory?: string;
  cleanupTemp?: boolean;
}

/**
 * 硬件加速配置
 */
export interface HardwareAcceleration {
  enabled: boolean;
  type: 'nvidia' | 'intel' | 'amd' | 'auto';
  device?: string;
}

/**
 * 转码预设
 */
export interface TranscodingPreset {
  name: string;
  description: string;
  config: TranscodingConfig;
  targetUseCase: 'web' | 'mobile' | 'streaming' | 'archive';
}

/**
 * 默认转码配置
 */
export const DEFAULT_TRANSCODING_CONFIG: TranscodingConfig = {
  outputFormat: 'mp4',
  videoCodec: 'h264',
  audioCodec: 'aac',
  quality: 'medium',
  enableHardwareAcceleration: true,
};

/**
 * 质量预设
 */
export const QUALITY_PRESETS: Record<string, Partial<TranscodingConfig>> = {
  low: {
    bitrate: 500000, // 500kbps
    resolution: { width: 640, height: 360 },
    frameRate: 24,
  },
  medium: {
    bitrate: 1500000, // 1.5Mbps
    resolution: { width: 1280, height: 720 },
    frameRate: 30,
  },
  high: {
    bitrate: 5000000, // 5Mbps
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
  },
  ultra: {
    bitrate: 15000000, // 15Mbps
    resolution: { width: 3840, height: 2160 },
    frameRate: 60,
  },
};

/**
 * 转码预设
 */
export const TRANSCODING_PRESETS: TranscodingPreset[] = [
  {
    name: 'web-optimized',
    description: '网页播放优化',
    config: {
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      quality: 'medium',
      enableHardwareAcceleration: true,
    },
    targetUseCase: 'web',
  },
  {
    name: 'mobile-friendly',
    description: '移动设备友好',
    config: {
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      quality: 'low',
      resolution: { width: 720, height: 480 },
      enableHardwareAcceleration: true,
    },
    targetUseCase: 'mobile',
  },
  {
    name: 'streaming-hd',
    description: '高清流媒体',
    config: {
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      quality: 'high',
      enableHardwareAcceleration: true,
    },
    targetUseCase: 'streaming',
  },
];

/**
 * 工具函数：验证文件路径
 */
export function validateFilePath(filePath: string): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('文件路径不能为空');
  }

  if (filePath.includes('..') || filePath.includes('~')) {
    throw new Error('文件路径包含非法字符');
  }
}

/**
 * 工具函数：生成任务ID
 */
export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * 工具函数：计算压缩比
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0;
  return (originalSize - compressedSize) / originalSize;
}

/**
 * 工具函数：格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 工具函数：格式化时长
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 工具函数：获取输出文件名
 */
export function getOutputFileName(inputPath: string, config: TranscodingConfig): string {
  const ext = path.extname(inputPath);
  const baseName = path.basename(inputPath, ext);
  const outputExt = config.outputFormat === 'mp4' ? '.mp4' :
                   config.outputFormat === 'webm' ? '.webm' : '.avi';

  return `${baseName}_transcoded${outputExt}`;
}

/**
 * 工具函数：检查是否需要转码
 */
export function needsTranscoding(metadata: VideoMetadata, config: TranscodingConfig): boolean {
  // 检查编码格式
  if (metadata.codec === 'hevc' || metadata.codec === 'h265') {
    return true;
  }

  // 检查分辨率
  if (config.resolution) {
    if (metadata.width > config.resolution.width || metadata.height > config.resolution.height) {
      return true;
    }
  }

  // 检查比特率
  if (config.bitrate && metadata.bitrate > config.bitrate * 1.2) {
    return true;
  }

  return false;
}

/**
 * 工具函数：估算转码时间
 */
export function estimateTranscodingTime(
  duration: number,
  inputBitrate: number,
  outputBitrate: number,
  hardwareAcceleration: boolean = false
): number {
  // 基础转码速度（实时播放的倍数）
  const baseSpeed = hardwareAcceleration ? 4 : 1.5;

  // 根据比特率调整速度
  const bitrateRatio = inputBitrate / outputBitrate;
  const adjustedSpeed = baseSpeed * Math.min(bitrateRatio, 2);

  return duration / adjustedSpeed;
}

/**
 * 工具函数：创建转码任务
 */
export function createTranscodingTask(
  inputPath: string,
  outputPath: string,
  config: TranscodingConfig,
  options?: TranscodingOptions
): TranscodingTask {
  return {
    id: generateTaskId(),
    inputPath,
    outputPath,
    config,
    status: 'pending',
    progress: 0,
    priority: options?.priority || 5,
    retryCount: 0,
    maxRetries: options?.maxRetries || 3,
  };
}
