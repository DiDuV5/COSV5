/**
 * @fileoverview 上传适配器单元测试
 * @description 测试上传适配器的功能
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - jest: 测试框架
 * - @/lib/upload/upload-adapters: 被测试的适配器
 *
 * @changelog
 * - 2025-06-15: 初始版本创建
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TRPCUploadAdapter, RESTUploadAdapter } from '../upload-adapters';
import { UserLevel } from '@/types/user-level';

import { getUnifiedUploadService } from '@/lib/upload/unified-service';
import { getUnifiedUploadService } from '@/lib/upload/unified-service';

// Mock dependencies
jest.mock('@/lib/upload/unified-service', () => ({
  getUnifiedUploadService: jest.fn(() => ({
    uploadFile: jest.fn(),
    uploadFiles: jest.fn(),
  })),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    postMedia: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

describe('TRPCUploadAdapter', () => {
  let mockUnifiedService: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnifiedService = getUnifiedUploadService();
    mockPrisma = require('@/lib/prisma').prisma;
  });

  describe('processUpload', () => {
    const mockParams = {
      fileData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/',
      filename: 'test.jpg',
      userId: 'user123',
    };

    beforeEach(() => {
      // Mock 用户查询
      mockPrisma.user.findUnique.mockResolvedValue({
        userLevel: 'USER',
      });

      // Mock 统一上传服务
      mockUnifiedService.uploadFile.mockResolvedValue({
        success: true,
        file: {
          id: 'file123',
          filename: 'test.jpg',
          originalName: 'test.jpg',
          url: 'https://example.com/test.jpg',
          mediaType: 'IMAGE',
          fileSize: 1024,
        },
      });
    });

    it('应该成功处理tRPC上传', async () => {
      const result = await TRPCUploadAdapter.processUpload(mockParams);

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(mockUnifiedService.uploadFile).toHaveBeenCalledWith({
        fileData: mockParams.fileData,
        filename: mockParams.filename,
        mimeType: 'image/jpeg',
        userId: mockParams.userId,
        userLevel: 'USER',
        postId: undefined,
        enableDeduplication: undefined,
        generateThumbnails: undefined,
        imageQuality: undefined,
        maxWidth: undefined,
        maxHeight: undefined,
      });
    });

    it('应该处理用户不存在的情况', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await TRPCUploadAdapter.processUpload(mockParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户不存在');
    });

    it('应该验证文件数据格式', async () => {
      const invalidParams = {
        ...mockParams,
        fileData: 'invalid-data',
      };

      const result = await TRPCUploadAdapter.processUpload(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('无效的文件数据格式');
    });

    it('应该验证base64数据', async () => {
      const invalidParams = {
        ...mockParams,
        fileData: 'data:image/jpeg;base64,',
      };

      const result = await TRPCUploadAdapter.processUpload(invalidParams);

      expect(result.success).toBe(false);
      expect(result.error).toBe('无效的base64数据');
    });
  });

  describe('unifiedUpload', () => {
    const mockParams = {
      fileData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/',
      filename: 'test.jpg',
      userId: 'user123',
      autoTranscode: true,
      generateMultipleSizes: true,
      enableDeduplication: true,
      generateThumbnails: true,
      priority: 'normal' as const,
      enableStreaming: true,
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        userLevel: 'USER',
      });

      mockUnifiedService.uploadFile.mockResolvedValue({
        success: true,
        file: {
          id: 'file123',
          filename: 'test.jpg',
          originalName: 'test.jpg',
          url: 'https://example.com/test.jpg',
          mediaType: 'IMAGE',
          fileSize: 1024,
        },
      });
    });

    it('应该处理统一上传', async () => {
      const result = await TRPCUploadAdapter.unifiedUpload(mockParams);

      expect(result.success).toBe(true);
      expect(mockUnifiedService.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          autoTranscodeVideo: true,
          generateThumbnails: true,
          enableDeduplication: true,
        })
      );
    });
  });

  describe('processFileEnhanced', () => {
    const mockParams = {
      fileData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/',
      filename: 'test.jpg',
      userId: 'user123',
      replaceExisting: true,
      postId: 'post123',
    };

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        userLevel: 'USER',
      });

      mockPrisma.postMedia.findMany.mockResolvedValue([
        { id: 'existing-file' },
      ]);

      mockPrisma.postMedia.deleteMany.mockResolvedValue({ count: 1 });

      mockUnifiedService.uploadFile.mockResolvedValue({
        success: true,
        file: {
          id: 'file123',
          filename: 'test.jpg',
          originalName: 'test.jpg',
          url: 'https://example.com/test.jpg',
          mediaType: 'IMAGE',
          fileSize: 1024,
        },
      });
    });

    it('应该处理文件替换', async () => {
      const result = await TRPCUploadAdapter.processFileEnhanced(mockParams);

      expect(result.success).toBe(true);
      expect(mockPrisma.postMedia.findMany).toHaveBeenCalledWith({
        where: {
          postId: 'post123',
          OR: [
            { filename: 'test.jpg' },
            { originalName: 'test.jpg' },
          ],
        },
      });
      expect(mockPrisma.postMedia.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['existing-file'],
          },
        },
      });
    });
  });
});

describe('RESTUploadAdapter', () => {
  let mockUnifiedService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnifiedService = getUnifiedUploadService();
  });

  describe('processBatchUpload', () => {
    const mockFile1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' });
    const mockFile2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' });

    const mockParams = {
      files: [mockFile1, mockFile2],
      userId: 'user123',
      userLevel: 'USER' as UserLevel,
    };

    beforeEach(() => {
      mockUnifiedService.uploadFiles.mockResolvedValue({
        results: [
          {
            success: true,
            file: {
              id: 'file1',
              filename: 'test1.jpg',
              originalName: 'test1.jpg',
              url: 'https://example.com/test1.jpg',
              mediaType: 'IMAGE',
              fileSize: 1024,
            },
          },
          {
            success: true,
            file: {
              id: 'file2',
              filename: 'test2.jpg',
              originalName: 'test2.jpg',
              url: 'https://example.com/test2.jpg',
              mediaType: 'IMAGE',
              fileSize: 1024,
            },
          },
        ],
        summary: {
          total: 2,
          successful: 2,
          failed: 0,
        },
      });
    });

    it('应该处理批量上传', async () => {
      const result = await RESTUploadAdapter.processBatchUpload(mockParams);

      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(2);

      expect(mockUnifiedService.uploadFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          file: mockFile1,
          filename: 'test1.jpg',
          mimeType: 'image/jpeg',
          userId: 'user123',
          userLevel: 'USER',
        }),
        expect.objectContaining({
          file: mockFile2,
          filename: 'test2.jpg',
          mimeType: 'image/jpeg',
          userId: 'user123',
          userLevel: 'USER',
        }),
      ]);
    });
  });

  describe('processSingleUpload', () => {
    const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    beforeEach(() => {
      mockUnifiedService.uploadFile.mockResolvedValue({
        success: true,
        file: {
          id: 'file123',
          filename: 'test.jpg',
          originalName: 'test.jpg',
          url: 'https://example.com/test.jpg',
          mediaType: 'IMAGE',
          fileSize: 1024,
        },
      });
    });

    it('应该处理单文件上传', async () => {
      const result = await RESTUploadAdapter.processSingleUpload({
        file: mockFile,
        userId: 'user123',
        userLevel: 'USER' as UserLevel,
        postId: 'post123',
        enableDeduplication: true,
      });

      expect(result.success).toBe(true);
      expect(result.file?.id).toBe('file123');

      expect(mockUnifiedService.uploadFile).toHaveBeenCalledWith({
        file: mockFile,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: mockFile.size,
        userId: 'user123',
        userLevel: 'USER',
        postId: 'post123',
        enableDeduplication: true,
      });
    });
  });
});
