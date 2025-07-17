/**
 * @fileoverview 媒体调试常量和配置
 * @description 媒体调试页面使用的常量定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { MediaDebugInfo } from './types';

/**
 * 处理状态常量
 */
export const PROCESSING_STATUS = {
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PROCESSING: 'PROCESSING',
  PENDING: 'PENDING',
} as const;

/**
 * 媒体类型常量
 */
export const MEDIA_TYPES = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;

/**
 * 模拟媒体文件数据
 */
export const MOCK_MEDIA_FILES: MediaDebugInfo[] = [
  {
    id: '1',
    filename: 'image_001.jpg',
    originalName: 'cosplay_photo.jpg',
    url: '/uploads/image_001.jpg',
    thumbnailUrl: '/uploads/thumbnails/image_001_thumb.jpg',
    mediaType: MEDIA_TYPES.IMAGE,
    fileSize: 2048576,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    isProcessed: true,
    processingStatus: PROCESSING_STATUS.COMPLETED,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    filename: 'video_h264.mp4',
    originalName: 'dance_video.mp4',
    url: '/uploads/video_h264.mp4',
    thumbnailUrl: '/uploads/thumbnails/video_h264_thumb.jpg',
    mediaType: MEDIA_TYPES.VIDEO,
    fileSize: 15728640,
    mimeType: 'video/mp4',
    width: 1280,
    height: 720,
    duration: 120,
    isProcessed: true,
    processingStatus: PROCESSING_STATUS.COMPLETED,
    createdAt: '2024-01-15T11:00:00Z'
  },
  {
    id: '3',
    filename: 'broken_video.mp4',
    originalName: 'corrupted_file.mp4',
    url: '/uploads/broken_video.mp4',
    mediaType: MEDIA_TYPES.VIDEO,
    fileSize: 5242880,
    mimeType: 'video/mp4',
    isProcessed: false,
    processingStatus: PROCESSING_STATUS.FAILED,
    createdAt: '2024-01-15T12:00:00Z'
  }
];

/**
 * 快速链接配置
 */
export const QUICK_LINKS = [
  {
    href: '/admin/system-tests/upload',
    label: '上传测试'
  },
  {
    href: '/admin/system-tests/media',
    label: '媒体测试'
  },
  {
    href: '/admin/system-tests/system-status',
    label: '系统状态'
  }
] as const;
