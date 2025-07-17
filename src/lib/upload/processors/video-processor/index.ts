/**
 * @fileoverview 视频处理器模块统一导出
 * @description 重构后的视频处理器模块的统一入口
 * @author Augment AI
 * @date 2025-07-15
 * @version 2.0.0
 */

// 主要类导出
export { VideoProcessor } from './VideoProcessor';
export { VideoMetadataExtractor } from './VideoMetadataExtractor';
export { VideoTranscoder } from './VideoTranscoder';
export { VideoThumbnailGenerator } from './VideoThumbnailGenerator';

// 类型导出
export type {
  VideoMetadata,
  H264Config,
  VideoProcessingResult,
  ThumbnailOptions,
  VideoValidationOptions,
} from './types';

// 默认导出主处理器类
export { VideoProcessor as default } from './VideoProcessor';
