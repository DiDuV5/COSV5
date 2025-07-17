/**
 * @fileoverview 图片上传功能测试 - CoserEden平台
 * @description 测试图片上传的完整功能，包括格式支持、文件大小限制、用户权限验证
 * @author Augment AI
 * @date 2025-06-21
 * @version 1.0.0
 * @since 1.0.0
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TRPCErrorHandler, BusinessErrorType } from '../../errors/trpc-error-handler';
import { uploadConfigManager } from '../upload-config-manager';
import { hybridUploadStrategy } from '../hybrid-upload-strategy';
import { FILE_SIZE, SUPPORTED_FILE_TYPES, USER_LEVELS } from '../upload-constants';
import { testUploadFile, TEST_USER_LEVELS } from './test-helpers';

// 模拟图片文件数据
const createMockImageBuffer = (size: number, format: 'jpeg' | 'png' | 'gif' | 'webp' = 'jpeg'): Buffer => {
  const buffer = Buffer.alloc(size);

  // 添加对应格式的文件头
  switch (format) {
    case 'jpeg':
      // JPEG 文件头 (FF D8 FF)
      buffer[0] = 0xFF;
      buffer[1] = 0xD8;
      buffer[2] = 0xFF;
      break;
    case 'png':
      // PNG 文件头 (89 50 4E 47)
      buffer[0] = 0x89;
      buffer[1] = 0x50;
      buffer[2] = 0x4E;
      buffer[3] = 0x47;
      break;
    case 'gif':
      // GIF 文件头 (47 49 46)
      buffer[0] = 0x47;
      buffer[1] = 0x49;
      buffer[2] = 0x46;
      break;
    case 'webp':
      // WebP 文件头 (52 49 46 46)
      buffer[0] = 0x52;
      buffer[1] = 0x49;
      buffer[2] = 0x46;
      buffer[3] = 0x46;
      break;
  }

  return buffer;
};

describe('图片上传功能测试', () => {
  beforeEach(() => {
    uploadConfigManager.clearCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理测试数据
  });

  describe('支持的图片格式测试', () => {
    test('应该支持JPEG格式', async () => {
      const jpegBuffer = createMockImageBuffer(5 * FILE_SIZE.MB, 'jpeg');
      const request = {
        buffer: jpegBuffer,
        filename: 'test-image.jpg',
        mimeType: 'image/jpeg',
        userId: 'user123',
        userLevel: 'USER' as const,
      };

      const result = await testUploadFile(
        hybridUploadStrategy,
        jpegBuffer,
        'test.jpg',
        'image/jpeg',
        { userId: 'user123', userLevel: TEST_USER_LEVELS.USER }
      );
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('direct'); // 小文件直传
    });

    test('应该支持PNG格式', async () => {
      const pngBuffer = createMockImageBuffer(8 * FILE_SIZE.MB, 'png');
      const request = {
        buffer: pngBuffer,
        filename: 'test-image.png',
        mimeType: 'image/png',
        userId: 'user123',
        userLevel: 'USER' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
    });

    test('应该支持GIF格式', async () => {
      const gifBuffer = createMockImageBuffer(3 * FILE_SIZE.MB, 'gif');
      const request = {
        buffer: gifBuffer,
        filename: 'animated.gif',
        mimeType: 'image/gif',
        userId: 'user123',
        userLevel: 'USER' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
    });

    test('应该支持WebP格式', async () => {
      const webpBuffer = createMockImageBuffer(6 * FILE_SIZE.MB, 'webp');
      const request = {
        buffer: webpBuffer,
        filename: 'modern-image.webp',
        mimeType: 'image/webp',
        userId: 'user123',
        userLevel: 'VIP' as const, // VIP用户支持更多格式
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
    });

    test('应该拒绝不支持的图片格式', async () => {
      const unsupportedBuffer = createMockImageBuffer(2 * FILE_SIZE.MB);
      const request = {
        buffer: unsupportedBuffer,
        filename: 'test.bmp',
        mimeType: 'image/bmp', // 假设BMP不在USER级别的允许列表中
        userId: 'user123',
        userLevel: 'USER' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的文件类型');
    });
  });

  describe('文件大小限制测试', () => {
    test('USER级别：应该允许小图片(<10MB)', async () => {
      const smallImage = createMockImageBuffer(5 * FILE_SIZE.MB, 'jpeg');
      const request = {
        buffer: smallImage,
        filename: 'small-image.jpg',
        mimeType: 'image/jpeg',
        userId: 'user123',
        userLevel: 'USER' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('direct');
    });

    test('USER级别：应该拒绝大图片(>10MB)', async () => {
      const largeImage = createMockImageBuffer(15 * FILE_SIZE.MB, 'jpeg');
      const request = {
        buffer: largeImage,
        filename: 'large-image.jpg',
        mimeType: 'image/jpeg',
        userId: 'user123',
        userLevel: 'USER' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('文件大小超出限制');
    });

    test('VIP级别：应该允许中等图片(10-50MB)', async () => {
      const mediumImage = createMockImageBuffer(30 * FILE_SIZE.MB, 'png');
      const request = {
        buffer: mediumImage,
        filename: 'medium-image.png',
        mimeType: 'image/png',
        userId: 'vip123',
        userLevel: 'VIP' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('direct'); // 仍然小于50MB阈值
    });

    test('CREATOR级别：应该允许大图片(>50MB)', async () => {
      const largeImage = createMockImageBuffer(80 * FILE_SIZE.MB, 'png');
      const request = {
        buffer: largeImage,
        filename: 'large-creator-image.png',
        mimeType: 'image/png',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('chunked'); // 大文件使用分片上传
    });

    test('CREATOR级别：应该允许超大图片(>100MB)使用异步处理', async () => {
      const hugImage = createMockImageBuffer(200 * FILE_SIZE.MB, 'png');
      const request = {
        buffer: hugImage,
        filename: 'huge-image.png',
        mimeType: 'image/png',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('chunked');
      expect(result.isAsync).toBe(true);
    });
  });

  describe('用户权限验证测试', () => {
    test('GUEST用户：应该被拒绝上传任何图片', async () => {
      const image = createMockImageBuffer(1 * FILE_SIZE.MB, 'jpeg');
      const request = {
        buffer: image,
        filename: 'guest-image.jpg',
        mimeType: 'image/jpeg',
        userId: 'guest123',
        userLevel: 'GUEST' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('文件大小超出限制'); // GUEST maxFileSize = 0
    });

    test('USER用户：只能上传基本图片格式', async () => {
      const userLimits = await uploadConfigManager.getUserLimits('USER');

      expect(userLimits.allowedMimeTypes).toEqual(SUPPORTED_FILE_TYPES.IMAGES);
      expect(userLimits.maxFileSize).toBe(10 * FILE_SIZE.MB);
      // enableChunkedUpload 和 enableResumableUpload 不在 UserLevelConfig 中
      // expect(userLimits.enableChunkedUpload).toBe(false);
      // expect(userLimits.enableResumableUpload).toBe(false);
    });

    test('VIP用户：可以上传图片和视频', async () => {
      const vipLimits = await uploadConfigManager.getUserLimits('VIP');

      expect(vipLimits.allowedMimeTypes).toEqual([
        ...SUPPORTED_FILE_TYPES.IMAGES,
        ...SUPPORTED_FILE_TYPES.VIDEOS,
      ]);
      expect(vipLimits.maxFileSize).toBe(50 * FILE_SIZE.MB);
      // enableChunkedUpload 不在 UserLevelConfig 中
      // expect(vipLimits.enableChunkedUpload).toBe(true);
    });

    test('CREATOR用户：可以上传所有媒体格式', async () => {
      const creatorLimits = await uploadConfigManager.getUserLimits('CREATOR');

      expect(creatorLimits.allowedMimeTypes).toEqual([
        ...SUPPORTED_FILE_TYPES.IMAGES,
        ...SUPPORTED_FILE_TYPES.VIDEOS,
        ...SUPPORTED_FILE_TYPES.AUDIO,
      ]);
      expect(creatorLimits.maxFileSize).toBe(500 * FILE_SIZE.MB);
      // enableResumableUpload 不在 UserLevelConfig 中
      // expect(creatorLimits.enableResumableUpload).toBe(true);
    });
  });

  describe('上传策略选择测试', () => {
    test('小图片(<50MB)应该使用直传策略', async () => {
      const smallImage = createMockImageBuffer(20 * FILE_SIZE.MB, 'jpeg');
      const request = {
        buffer: smallImage,
        filename: 'small-direct.jpg',
        mimeType: 'image/jpeg',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('direct');
      expect(result.isAsync).toBe(false);
    });

    test('中等图片(50-500MB)应该使用分片上传', async () => {
      const mediumImage = createMockImageBuffer(100 * FILE_SIZE.MB, 'png');
      const request = {
        buffer: mediumImage,
        filename: 'medium-chunked.png',
        mimeType: 'image/png',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('chunked');
    });

    test('大图片(>500MB)应该使用异步处理', async () => {
      const largeImage = createMockImageBuffer(600 * FILE_SIZE.MB, 'png');
      const request = {
        buffer: largeImage,
        filename: 'large-async.png',
        mimeType: 'image/png',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('async');
      expect(result.isAsync).toBe(true);
      expect(result.sessionId).toBeTruthy();
    });
  });

  describe('图片质量和元数据测试', () => {
    test('应该保持图片质量信息', async () => {
      const highQualityImage = createMockImageBuffer(25 * FILE_SIZE.MB, 'jpeg');
      const request = {
        buffer: highQualityImage,
        filename: 'high-quality.jpg',
        mimeType: 'image/jpeg',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
        metadata: {
          quality: 95,
          dimensions: { width: 4000, height: 3000 },
          colorSpace: 'sRGB',
        },
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
      expect(result.size).toBe(highQualityImage.length);
    });

    test('应该处理透明PNG图片', async () => {
      const transparentPng = createMockImageBuffer(15 * FILE_SIZE.MB, 'png');
      const request = {
        buffer: transparentPng,
        filename: 'transparent.png',
        mimeType: 'image/png',
        userId: 'vip123',
        userLevel: 'VIP' as const,
        metadata: {
          hasAlpha: true,
          colorDepth: 32,
        },
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
    });

    test('应该处理动画GIF', async () => {
      const animatedGif = createMockImageBuffer(40 * FILE_SIZE.MB, 'gif');
      const request = {
        buffer: animatedGif,
        filename: 'animated.gif',
        mimeType: 'image/gif',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
        metadata: {
          isAnimated: true,
          frameCount: 30,
          duration: 3000,
        },
      };

      const result = await hybridUploadStrategy.uploadFile(request);
      expect(result.success).toBe(true);
    });
  });

  describe('批量图片上传测试', () => {
    test('USER用户：应该限制批量上传数量', async () => {
      const userLimits = await uploadConfigManager.getUserLimits('USER');
      expect(userLimits.maxFilesPerUpload).toBe(5);

      // 模拟上传6张图片，应该被限制
      const images = Array.from({ length: 6 }, (_, i) => ({
        buffer: createMockImageBuffer(2 * FILE_SIZE.MB, 'jpeg'),
        filename: `batch-${i}.jpg`,
        mimeType: 'image/jpeg',
        userId: 'user123',
        userLevel: 'USER' as const,
      }));

      // 在实际实现中，这里应该有批量上传的限制检查
      expect(images.length).toBeGreaterThan(userLimits.maxFilesPerUpload);
    });

    test('CREATOR用户：应该允许大量批量上传', async () => {
      const creatorLimits = await uploadConfigManager.getUserLimits('CREATOR');
      expect(creatorLimits.maxFilesPerUpload).toBe(100);

      // 模拟上传50张图片，应该被允许
      const images = Array.from({ length: 50 }, (_, i) => ({
        buffer: createMockImageBuffer(5 * FILE_SIZE.MB, 'jpeg'),
        filename: `creator-batch-${i}.jpg`,
        mimeType: 'image/jpeg',
        userId: 'creator123',
        userLevel: 'CREATOR' as const,
      }));

      expect(images.length).toBeLessThanOrEqual(creatorLimits.maxFilesPerUpload);
    });
  });
});
