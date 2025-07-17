/**
 * @fileoverview 视频转码类型定义 - CoserEden平台
 * @description 视频转码服务的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

/**
 * 视频信息接口
 */
export interface VideoInfo {
  format: string;
  codec: string;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  fps: number;
  size: number;
}

/**
 * 转码选项接口
 */
export interface TranscodingOptions {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  outputFormat: 'mp4';
  deleteOriginal: boolean;
  generateThumbnail: boolean;
}

/**
 * 转码进度接口
 */
export interface TranscodingProgress {
  percent: number;
  currentFps: number;
  currentKbps: number;
  targetSize: string;
  timemark: string;
}

/**
 * 转码结果接口
 */
export interface TranscodingResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  originalInfo: VideoInfo;
  transcodedInfo: VideoInfo;
  thumbnailPath?: string;
  error?: string;
  processingTime: number;
}

/**
 * 质量设置接口
 */
export interface QualitySettings {
  crf: number;
  preset: string;
}

/**
 * FFmpeg路径配置接口
 */
export interface FFmpegPaths {
  ffmpegPath: string | null;
  ffprobePath: string | null;
}

/**
 * 批量转码文件接口
 */
export interface BatchTranscodingFile {
  inputPath: string;
  outputPath: string;
}

/**
 * 转码配置接口
 */
export interface TranscodingConfig {
  tempDir: string;
  outputDir: string;
  maxConcurrentJobs: number;
  timeoutMs: number;
  enableLogging: boolean;
}

/**
 * FFmpeg检测器接口
 */
export interface IFFmpegDetector {
  detectFFmpegPath(): string | null;
  detectFFprobePath(): string | null;
  validatePaths(): boolean;
  getPaths(): FFmpegPaths;
}

/**
 * 视频信息提取器接口
 */
export interface IVideoInfoExtractor {
  getVideoInfo(filePath: string): Promise<VideoInfo>;
  validateVideoFile(filePath: string): Promise<boolean>;
  isH264Encoded(filePath: string): Promise<boolean>;
}

/**
 * 转码处理器接口
 */
export interface ITranscodingProcessor {
  transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: TranscodingOptions
  ): Promise<TranscodingResult>;
  performTranscoding(
    inputPath: string,
    outputPath: string,
    qualitySettings: QualitySettings,
    options: TranscodingOptions
  ): Promise<VideoInfo>;
  getQualitySettings(quality: TranscodingOptions['quality']): QualitySettings;
}

/**
 * 缩略图生成器接口
 */
export interface IThumbnailGenerator {
  generateThumbnail(videoPath: string, options?: ThumbnailOptions): Promise<string>;
  generateMultipleThumbnails(videoPath: string, timestamps: string[]): Promise<string[]>;
}

/**
 * 缩略图选项接口
 */
export interface ThumbnailOptions {
  timestamp?: string;
  size?: string;
  quality?: number;
  format?: 'jpg' | 'png';
}

/**
 * 批量转码管理器接口
 */
export interface IBatchTranscodingManager {
  transcodeVideos(
    files: BatchTranscodingFile[],
    options: TranscodingOptions
  ): Promise<TranscodingResult[]>;
  addToQueue(file: BatchTranscodingFile, options: TranscodingOptions): void;
  processQueue(): Promise<void>;
  getQueueStatus(): QueueStatus;
}

/**
 * 队列状态接口
 */
export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * 转码事件类型
 */
export type TranscodingEventType = 
  | 'progress'
  | 'fileComplete'
  | 'fileError'
  | 'batchComplete'
  | 'batchError'
  | 'queueUpdated';

/**
 * 转码事件数据
 */
export interface TranscodingEvent {
  type: TranscodingEventType;
  timestamp: number;
  data: any;
  source: string;
}

/**
 * 转码上下文接口
 */
export interface TranscodingContext {
  config: TranscodingConfig;
  ffmpegDetector: IFFmpegDetector;
  videoInfoExtractor: IVideoInfoExtractor;
  transcodingProcessor: ITranscodingProcessor;
  thumbnailGenerator: IThumbnailGenerator;
  batchManager: IBatchTranscodingManager;
}

/**
 * 转码统计接口
 */
export interface TranscodingStats {
  totalFiles: number;
  successfulTranscodings: number;
  failedTranscodings: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  totalSizeBefore: number;
  totalSizeAfter: number;
  compressionRatio: number;
}

/**
 * 转码任务接口
 */
export interface TranscodingTask {
  id: string;
  inputPath: string;
  outputPath: string;
  options: TranscodingOptions;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: TranscodingProgress;
  result?: TranscodingResult;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * 转码队列接口
 */
export interface ITranscodingQueue {
  add(task: TranscodingTask): void;
  remove(taskId: string): boolean;
  get(taskId: string): TranscodingTask | undefined;
  getAll(): TranscodingTask[];
  getByStatus(status: TranscodingTask['status']): TranscodingTask[];
  clear(): void;
  size(): number;
}

/**
 * 转码监控器接口
 */
export interface ITranscodingMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  getStats(): TranscodingStats;
  getSystemResources(): SystemResources;
  isHealthy(): boolean;
}

/**
 * 系统资源接口
 */
export interface SystemResources {
  cpuUsage: number;
  memoryUsage: number;
  diskSpace: number;
  activeTranscodings: number;
}

/**
 * 转码错误类型
 */
export enum TranscodingErrorType {
  FFMPEG_NOT_FOUND = 'FFMPEG_NOT_FOUND',
  FFPROBE_NOT_FOUND = 'FFPROBE_NOT_FOUND',
  INVALID_INPUT_FILE = 'INVALID_INPUT_FILE',
  INVALID_OUTPUT_PATH = 'INVALID_OUTPUT_PATH',
  TRANSCODING_FAILED = 'TRANSCODING_FAILED',
  THUMBNAIL_GENERATION_FAILED = 'THUMBNAIL_GENERATION_FAILED',
  INSUFFICIENT_DISK_SPACE = 'INSUFFICIENT_DISK_SPACE',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
}

/**
 * 转码错误接口
 */
export interface TranscodingError extends Error {
  type: TranscodingErrorType;
  code: string;
  details?: Record<string, any>;
  recoverable: boolean;
}

/**
 * 转码服务接口
 */
export interface IVideoTranscodingService {
  transcodeVideo(
    inputPath: string,
    outputPath: string,
    options: TranscodingOptions
  ): Promise<TranscodingResult>;
  
  transcodeVideos(
    files: BatchTranscodingFile[],
    options: TranscodingOptions
  ): Promise<TranscodingResult[]>;
  
  getVideoInfo(filePath: string): Promise<VideoInfo>;
  generateThumbnail(videoPath: string, options?: ThumbnailOptions): Promise<string>;
  getStats(): TranscodingStats;
  isHealthy(): boolean;
}
