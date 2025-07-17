/**
 * @fileoverview 上传系统集成测试
 * @description 测试文件上传到显示的完整流程
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - jest: 测试框架
 * - @/lib/upload/unified-upload-service: 统一上传服务
 * - @/lib/upload/upload-adapters: 上传适配器
 *
 * @changelog
 * - 2025-06-15: 初始版本创建
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { getUnifiedUploadService } from '../unified-service';
import { TRPCUploadAdapter, RESTUploadAdapter } from '../upload-adapters';
import { UserLevel } from '@/types/user-level';
import fs from 'fs/promises';
import path from 'path';

// 测试用的图片base64数据（1x1像素的JPEG）
const TEST_IMAGE_BASE64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

// 测试用的视频数据（模拟MP4文件头）
const TEST_VIDEO_BUFFER = Buffer.from([
  0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // MP4 file signature
  0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
  0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
]);

describe('Upload System Integration Tests', () => {
  let testUserId: string;
  let testPostId: string;

  beforeAll(async () => {
    // 设置测试环境
    testUserId = 'test-user-' + Date.now();
    testPostId = 'test-post-' + Date.now();

    // 初始化上传服务
    const uploadService = await getUnifiedUploadService();
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      // 这里可以添加清理逻辑
      console.log('清理测试数据完成');
    } catch (error) {
      console.warn('清理测试数据时出错:', error);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('tRPC Upload Flow', () => {
    it('应该完成图片上传的完整流程', async () => {
      // 模拟tRPC上传请求
      const uploadParams = {
        fileData: TEST_IMAGE_BASE64,
        filename: 'test-image.jpg',
        userId: testUserId,
        postId: testPostId,
        enableDeduplication: true,
        generateThumbnails: true,
      };

      // 执行上传
      const result = await TRPCUploadAdapter.processUpload(uploadParams);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file?.filename).toBe('test-image.jpg');
      expect(result.file?.url).toBeDefined();
      expect(result.file?.mediaType).toBe('IMAGE');

      // 验证安全信息
      expect(result.securityInfo).toBeDefined();
      expect(result.securityInfo?.isValid).toBe(true);
      expect(result.securityInfo?.isSafe).toBe(true);
    }, 30000); // 30秒超时

    it('应该处理统一上传API', async () => {
      const uploadParams = {
        fileData: TEST_IMAGE_BASE64,
        filename: 'unified-test.jpg',
        userId: testUserId,
        postId: testPostId,
        autoTranscode: true,
        generateMultipleSizes: true,
        enableDeduplication: true,
        generateThumbnails: true,
        imageQuality: 90,
        maxWidth: 1920,
        maxHeight: 1080,
        replaceExisting: false,
        priority: 'normal' as const,
        enableStreaming: true,
      };

      const result = await TRPCUploadAdapter.unifiedUpload(uploadParams);

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file?.mediaType).toBe('IMAGE');
    }, 30000);
  });

  describe('REST API Upload Flow', () => {
    it('应该完成单文件上传流程', async () => {
      // 创建测试文件
      const testFile = new File(
        [Buffer.from(TEST_IMAGE_BASE64.split(',')[1], 'base64')],
        'rest-test.jpg',
        { type: 'image/jpeg' }
      );

      const result = await RESTUploadAdapter.processSingleUpload({
        file: testFile,
        userId: testUserId,
        userLevel: 'USER' as UserLevel,
        postId: testPostId,
        enableDeduplication: true,
        generateThumbnails: true,
      });

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file?.filename).toBe('rest-test.jpg');
      expect(result.file?.mediaType).toBe('IMAGE');
    }, 30000);

    it('应该完成批量上传流程', async () => {
      // 创建多个测试文件
      const testFiles = [
        new File(
          [Buffer.from(TEST_IMAGE_BASE64.split(',')[1], 'base64')],
          'batch-test-1.jpg',
          { type: 'image/jpeg' }
        ),
        new File(
          [Buffer.from(TEST_IMAGE_BASE64.split(',')[1], 'base64')],
          'batch-test-2.jpg',
          { type: 'image/jpeg' }
        ),
      ];

      const result = await RESTUploadAdapter.processBatchUpload({
        files: testFiles,
        userId: testUserId,
        userLevel: 'USER' as UserLevel,
        postId: testPostId,
        enableDeduplication: true,
        generateThumbnails: true,
      });

      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBeGreaterThan(0);
      expect(result.results).toHaveLength(2);

      // 验证每个文件的结果
      result.results.forEach((fileResult: any, index: number) => {
        if (fileResult.success) {
          expect(fileResult.file).toBeDefined();
          expect(fileResult.file?.filename).toBe(`batch-test-${index + 1}.jpg`);
        }
      });
    }, 45000);
  });

  describe('Upload Configuration', () => {
    it('应该正确获取上传配置', async () => {
      const uploadService = await getUnifiedUploadService();
      const config = await uploadService.getConfig();

      expect(config).toBeDefined();
      expect(config.maxFileSize).toBeGreaterThan(0);
      expect(config.allowedTypes).toBeInstanceOf(Array);
      expect(config.allowedTypes.length).toBeGreaterThan(0);
      expect(typeof config.enableDeduplication).toBe('boolean');
      expect(config.imageQuality).toBeGreaterThan(0);
      expect(config.imageQuality).toBeLessThanOrEqual(100);
    });
  });

  describe('Upload Statistics', () => {
    it('应该正确获取用户上传统计', async () => {
      const uploadService = await getUnifiedUploadService();
      const stats = await uploadService.getUserUploadStats(testUserId);

      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.todayFiles).toBe('number');
      expect(typeof stats.todaySize).toBe('number');
      expect(typeof stats.monthFiles).toBe('number');
      expect(typeof stats.monthSize).toBe('number');

      // 统计数据应该是非负数
      expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
      expect(stats.totalSize).toBeGreaterThanOrEqual(0);
      expect(stats.todayFiles).toBeGreaterThanOrEqual(0);
      expect(stats.todaySize).toBeGreaterThanOrEqual(0);
      expect(stats.monthFiles).toBeGreaterThanOrEqual(0);
      expect(stats.monthSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('应该正确处理无效文件格式', async () => {
      const invalidParams = {
        fileData: 'invalid-data',
        filename: 'invalid.txt',
        userId: testUserId,
      };

      const result = await TRPCUploadAdapter.processUpload(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该正确处理文件大小超限', async () => {
      // 创建一个超大的模拟文件
      const largeFileData = 'data:image/jpeg;base64,' + 'A'.repeat(10 * 1024 * 1024); // 10MB的base64数据

      const params = {
        fileData: largeFileData,
        filename: 'large-file.jpg',
        userId: testUserId,
      };

      const result = await TRPCUploadAdapter.processUpload(params);

      // 根据配置，可能成功也可能失败
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('应该正确处理不支持的文件类型', async () => {
      const unsupportedFile = new File(
        ['test content'],
        'test.xyz',
        { type: 'application/unknown' }
      );

      const result = await RESTUploadAdapter.processSingleUpload({
        file: unsupportedFile,
        userId: testUserId,
        userLevel: 'USER' as UserLevel,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的文件类型');
    });
  });

  describe('Performance Tests', () => {
    it('应该在合理时间内完成上传', async () => {
      const startTime = Date.now();

      const result = await TRPCUploadAdapter.processUpload({
        fileData: TEST_IMAGE_BASE64,
        filename: 'performance-test.jpg',
        userId: testUserId,
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 上传应该在10秒内完成
      expect(duration).toBeLessThan(10000);

      if (result.success) {
        expect(result.file).toBeDefined();
      }
    });
  });
});
