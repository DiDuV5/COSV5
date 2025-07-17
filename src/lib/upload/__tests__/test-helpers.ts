/**
 * @fileoverview 测试辅助函数
 * @description 提供统一的测试工具和模拟数据
 */

import { UserLevel } from '@/types/user-level';
import { HybridUploadStrategy } from '../hybrid-upload-strategy';
import { UploadRequest, UploadResult } from '../unified-service/types';

/**
 * 创建模拟的图片缓冲区
 */
export function createMockImageBuffer(size: number, format: 'jpg' | 'png' | 'gif' = 'jpg'): Buffer {
  const buffer = Buffer.alloc(size);

  // 添加文件头以模拟真实图片
  switch (format) {
    case 'jpg':
      buffer.write('\xFF\xD8\xFF', 0, 'binary'); // JPEG header
      break;
    case 'png':
      buffer.write('\x89PNG\r\n\x1a\n', 0, 'binary'); // PNG header
      break;
    case 'gif':
      buffer.write('GIF89a', 0, 'binary'); // GIF header
      break;
  }

  return buffer;
}

/**
 * 创建模拟的视频缓冲区
 */
export function createMockVideoBuffer(size: number, format: 'mp4' | 'avi' = 'mp4'): Buffer {
  const buffer = Buffer.alloc(size);

  switch (format) {
    case 'mp4':
      buffer.write('\x00\x00\x00\x20ftypmp4', 0, 'binary'); // MP4 header
      break;
    case 'avi':
      buffer.write('RIFF', 0, 'binary'); // AVI header
      break;
  }

  return buffer;
}

/**
 * 创建标准的上传请求对象
 */
export function createUploadRequest(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: {
    userId?: string;
    userLevel?: UserLevel;
    postId?: string;
    enableDeduplication?: boolean;
    generateThumbnails?: boolean;
    imageQuality?: number;
  } = {}
): UploadRequest {
  return {
    buffer,
    filename,
    mimeType,
    userId: options.userId || 'test-user-123',
    userLevel: options.userLevel || 'USER',
    postId: options.postId,
    enableDeduplication: options.enableDeduplication,
    generateThumbnails: options.generateThumbnails,
    imageQuality: options.imageQuality,
  };
}

/**
 * 测试用的混合上传策略包装器
 */
export async function testUploadFile(
  strategy: HybridUploadStrategy,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: {
    userId?: string;
    userLevel?: UserLevel;
    postId?: string;
    metadata?: Record<string, any>;
    generateThumbnails?: boolean;
    imageQuality?: number;
    maxWidth?: number;
    maxHeight?: number;
    forceStrategy?: any;
  } = {}
) {
  return await strategy.uploadFile(buffer, filename, mimeType, {
    userId: options.userId || 'test-user-123',
    userLevel: options.userLevel || 'USER',
    postId: options.postId,
  });
}

/**
 * 创建模拟的上传结果
 */
export function createMockUploadResult(
  success: boolean = true,
  options: Partial<UploadResult> = {}
): UploadResult {
  if (success) {
    return {
      success: true,
      fileId: options.fileId || 'test-file-id',
      filename: options.filename || 'test-file.jpg',
      originalName: options.originalName || 'test-file.jpg',
      url: options.url || 'https://example.com/test-file.jpg',
      cdnUrl: options.cdnUrl || 'https://cdn.example.com/test-file.jpg',
      thumbnailUrl: options.thumbnailUrl || 'https://cdn.example.com/test-file-thumb.jpg',
      mediaType: options.mediaType || 'IMAGE',
      fileSize: options.fileSize || 1024,
      width: options.width || 800,
      height: options.height || 600,
      uploadedAt: (options as any).uploadedAt || new Date(),
      metadata: (options as any).metadata || {},
      ...options,
    };
  } else {
    return {
      success: false,
      fileId: '',
      filename: '',
      originalName: '',
      url: '',
      cdnUrl: '',
      mediaType: 'IMAGE',
      fileSize: 0,
      uploadedAt: new Date(),
      metadata: {},
      error: options.error || '上传失败',
      ...options,
    };
  }
}

/**
 * 模拟文件大小常量
 */
export const TEST_FILE_SIZE = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  SMALL_FILE: 5 * 1024 * 1024, // 5MB
  LARGE_FILE: 100 * 1024 * 1024, // 100MB
  STREAMING_THRESHOLD: 50 * 1024 * 1024, // 50MB
};

/**
 * 模拟用户等级
 */
export const TEST_USER_LEVELS: Record<string, UserLevel> = {
  GUEST: 'GUEST',
  USER: 'USER',
  VIP: 'VIP',
  CREATOR: 'CREATOR',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};
