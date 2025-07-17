/**
 * @fileoverview 转码后视频测试页面类型定义
 * @description 视频转码测试相关的接口和类型
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 视频质量等级
 */
export type VideoQuality = 'high' | 'medium' | 'low';

/**
 * 视频状态
 */
export type VideoStatus = 'completed' | 'failed' | 'processing';

/**
 * 播放测试结果接口
 */
export interface PlaybackTest {
  canPlay: boolean;
  loadTime: number;
  error?: string;
}

/**
 * 转码后视频接口
 */
export interface ConvertedVideo {
  id: string;
  originalName: string;
  originalUrl: string;
  convertedUrl: string;
  thumbnailUrl?: string;
  originalCodec: string;
  convertedCodec: string;
  originalSize: number;
  convertedSize: number;
  conversionTime: number;
  quality: VideoQuality;
  status: VideoStatus;
  createdAt: string;
  playbackTest?: PlaybackTest;
}

/**
 * 视频统计数据接口
 */
export interface VideoStatistics {
  completedCount: number;
  failedCount: number;
  averageCompressionRatio: number;
  averageConversionTime: number;
}

/**
 * 播放测试状态接口
 */
export interface PlaybackTestState {
  [videoId: string]: PlaybackTest;
}
