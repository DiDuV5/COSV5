/**
 * @fileoverview FFmpeg类型定义 - CoserEden平台
 * @description FFmpeg处理器的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

/**
 * 视频元数据接口
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  fps: number;
  codec: string;
  format: string;
  aspectRatio: number;
  fileSize?: number;
  colorSpace?: string;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

/**
 * 转码进度信息
 */
export interface TranscodeProgress {
  frame: number;
  fps: number;
  bitrate: string;
  totalSize: number;
  outTimeUs: number;
  outTimeMs: number;
  outTime: string;
  dupFrames: number;
  dropFrames: number;
  speed: string;
  progress: number; // 0-100
}

/**
 * 转码配置选项
 */
export interface TranscodeOptions {
  codec?: 'libx264' | 'libx265' | 'libvpx-vp9';
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  crf?: number; // 质量参数 (0-51, 越小质量越好)
  maxWidth?: number;
  maxHeight?: number;
  maxBitrate?: string; // 如 '2000k'
  bufferSize?: string; // 如 '4000k'
  audioCodec?: 'aac' | 'mp3' | 'copy';
  audioBitrate?: string; // 如 '128k'
  enableHardwareAccel?: boolean;
  timeout?: number; // 超时时间（毫秒）
  retryAttempts?: number; // 重试次数
  qualityCheck?: boolean; // 是否进行质量检查
}

/**
 * FFmpeg处理器选项
 */
export interface FFmpegProcessorOptions {
  thumbnailTime?: number; // 缩略图提取时间点（秒）
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  quality?: number;
  enableProgressMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  tempDir?: string;
  timeout?: number; // 超时时间（毫秒）
}

/**
 * 转码结果
 */
export interface TranscodeResult {
  success: boolean;
  outputPath?: string;
  originalSize: number;
  outputSize?: number;
  compressionRatio?: number;
  processingTime: number;
  metadata?: VideoMetadata;
  error?: string;
  retryCount?: number;
  qualityScore?: number;
}

/**
 * 缩略图生成选项
 */
export interface ThumbnailOptions {
  time?: number; // 提取时间点（秒）
  width?: number;
  height?: number;
  quality?: number; // 1-31，数值越小质量越好
  format?: 'jpg' | 'png' | 'webp';
  count?: number; // 生成缩略图数量
  interval?: number; // 时间间隔（秒）
}

/**
 * 缩略图生成结果
 */
export interface ThumbnailResult {
  success: boolean;
  thumbnailPaths: string[];
  error?: string;
  processingTime: number;
}

/**
 * 格式转换选项
 */
export interface FormatConversionOptions {
  outputFormat: string; // 目标格式，如 'mp4', 'webm', 'avi'
  videoCodec?: string;
  audioCodec?: string;
  quality?: number;
  preserveMetadata?: boolean;
}

/**
 * 格式转换结果
 */
export interface FormatConversionResult {
  success: boolean;
  outputPath?: string;
  originalFormat: string;
  outputFormat: string;
  processingTime: number;
  error?: string;
}

/**
 * 视频编码选项
 */
export interface VideoEncodingOptions {
  codec: 'libx264' | 'libx265' | 'libvpx-vp9';
  preset?: string;
  crf?: number;
  profile?: 'baseline' | 'main' | 'high';
  level?: string;
  pixelFormat?: string;
  colorSpace?: string;
  enableTwoPass?: boolean;
}

/**
 * 视频解码信息
 */
export interface VideoDecodingInfo {
  isSupported: boolean;
  codec: string;
  profile?: string;
  level?: string;
  pixelFormat?: string;
  colorSpace?: string;
  hasAudio: boolean;
  audioCodec?: string;
  needsTranscoding: boolean;
  reason?: string;
}

/**
 * FFmpeg命令构建选项
 */
export interface FFmpegCommandOptions {
  inputPath: string;
  outputPath: string;
  videoOptions?: VideoEncodingOptions;
  audioOptions?: {
    codec?: string;
    bitrate?: string;
    sampleRate?: number;
    channels?: number;
  };
  filterOptions?: {
    scale?: string;
    fps?: number;
    deinterlace?: boolean;
  };
  globalOptions?: {
    overwrite?: boolean;
    threads?: number;
    preset?: string;
  };
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (sessionId: string, progress: TranscodeProgress) => void;

/**
 * 错误回调函数类型
 */
export type ErrorCallback = (sessionId: string, error: Error) => void;

/**
 * 完成回调函数类型
 */
export type CompletionCallback = (sessionId: string, result: TranscodeResult) => void;

/**
 * FFmpeg进程状态
 */
export enum ProcessStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * FFmpeg进程信息
 */
export interface ProcessInfo {
  sessionId: string;
  status: ProcessStatus;
  startTime: number;
  endTime?: number;
  inputPath: string;
  outputPath: string;
  progress?: TranscodeProgress;
  error?: string;
}

/**
 * 内存监控信息
 */
export interface MemoryMonitorInfo {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  percentage: number;
  timestamp: number;
}

/**
 * 质量检查结果
 */
export interface QualityCheckResult {
  score: number; // 0-100
  resolutionScore: number;
  bitrateScore: number;
  fpsScore: number;
  sizeScore: number;
  passed: boolean;
  issues: string[];
}

/**
 * 硬件加速选项
 */
export interface HardwareAccelOptions {
  enabled: boolean;
  type?: 'nvenc' | 'qsv' | 'vaapi' | 'videotoolbox';
  device?: string;
  fallbackToSoftware?: boolean;
}

/**
 * FFmpeg能力检测结果
 */
export interface FFmpegCapabilities {
  version: string;
  codecs: {
    video: string[];
    audio: string[];
  };
  formats: string[];
  filters: string[];
  hardwareAccel: string[];
  isAvailable: boolean;
}
