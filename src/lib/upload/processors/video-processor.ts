/**
 * @fileoverview 视频处理器 - 重构后的模块化版本
 * @description 专门处理视频文件的上传、H.264转码、缩略图生成等功能
 * @author Augment AI
 * @date 2025-07-15
 * @version 2.0.0
 * @deprecated 请使用 ./video-processor/index.ts 中的新模块化版本
 */

// 重新导出新的模块化版本以保持向后兼容性
export { VideoProcessor } from './video-processor/index';

// 同时导出其他有用的类和类型
export {
  VideoMetadataExtractor,
  VideoTranscoder,
  VideoThumbnailGenerator,
  type VideoMetadata,
  type H264Config,
  type VideoProcessingResult,
  type ThumbnailOptions,
  type VideoValidationOptions,
} from './video-processor/index';
