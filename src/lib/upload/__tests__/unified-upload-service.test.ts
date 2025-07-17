/**
 * @fileoverview 统一上传服务单元测试
 * @description 测试统一上传服务的核心功能
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - jest: 测试框架
 * - @/lib/upload/unified-upload-service: 被测试的服务
 *
 * @changelog
 * - 2025-06-15: 初始版本创建
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UnifiedUploadService, type UploadRequest } from '../unified-service';
import { UserLevel } from '@/types/user-level';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    systemSetting: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    uploadSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    uploadChunk: {
      count: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    postMedia: {
      aggregate: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/media/storage/storage-manager', () => ({
  globalStorageManager: {
    initialize: jest.fn(),
    uploadFile: jest.fn(),
  },
}));

jest.mock('@/lib/upload/file-security-validator', () => ({
  FileSecurityValidator: {
    validateFileSecurity: jest.fn(),
  },
}));

jest.mock('@/lib/upload/advanced-upload-rate-limiter', () => ({
  advancedUploadRateLimiter: {
    canStartUpload: jest.fn(),
    startUploadSession: jest.fn(),
    endUploadSession: jest.fn(),
  },
}));

describe('UnifiedUploadService', () => {
  let uploadService: UnifiedUploadService;
  let mockPrisma: any;
  let mockStorageManager: any;
  let mockSecurityValidator: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    // 重置所有 mocks
    jest.clearAllMocks();
    
    // 获取 mock 实例
    mockPrisma = require('@/lib/prisma').prisma;
    mockStorageManager = require('@/lib/media/storage/storage-manager').globalStorageManager;
    mockSecurityValidator = require('@/lib/upload/file-security-validator').FileSecurityValidator;
    mockRateLimiter = require('@/lib/upload/advanced-upload-rate-limiter').advancedUploadRateLimiter;
    
    // 获取服务实例
    uploadService = UnifiedUploadService.getInstance();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = UnifiedUploadService.getInstance();
      const instance2 = UnifiedUploadService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getConfig', () => {
    it('应该返回默认配置', async () => {
      // Mock 系统设置为空
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const config = await uploadService.getConfig();

      expect(config).toEqual({
        maxFileSize: 5000 * 1024 * 1024, // 5GB
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'video/mp4',
          'video/webm',
        ],
        enableDeduplication: true,
        imageQuality: 85,
        enableThumbnails: true,
        maxFilesPerPost: 800,
        chunkSize: 5 * 1024 * 1024, // 5MB
        maxConcurrentUploads: 5,
      });
    });

    it('应该使用系统设置覆盖默认配置', async () => {
      // Mock 系统设置
      mockPrisma.systemSetting.findMany.mockResolvedValue([
        { key: 'upload.maxFileSize', value: '1000' },
        { key: 'upload.imageQuality', value: '90' },
        { key: 'upload.enableDeduplication', value: 'false' },
      ]);

      const config = await uploadService.getConfig();

      expect(config.maxFileSize).toBe(1000 * 1024 * 1024); // 1GB
      expect(config.imageQuality).toBe(90);
      expect(config.enableDeduplication).toBe(false);
    });
  });

  describe('uploadFile', () => {
    const mockUploadRequest: UploadRequest = {
      buffer: Buffer.from('test file content'),
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      userId: 'user123',
      userLevel: 'USER' as UserLevel,
    };

    beforeEach(() => {
      // Mock 默认配置
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);
      
      // Mock 存储管理器初始化
      mockStorageManager.initialize.mockResolvedValue(undefined);
      
      // Mock 权限检查
      mockPrisma.userPermissionConfig.findUnique.mockResolvedValue({
        canUploadImages: true,
        canUploadVideos: true,
        maxImagesPerUpload: 100,
        maxVideosPerUpload: 10,
      });
      
      // Mock 速率限制检查
      mockRateLimiter.canStartUpload.mockReturnValue({
        allowed: true,
      });
      
      // Mock 安全验证
      mockSecurityValidator.validateFileSecurity.mockResolvedValue({
        isValid: true,
        isSafe: true,
        confidence: 100,
        warnings: [],
      });
      
      // Mock 存储上传
      mockStorageManager.uploadFile.mockResolvedValue({
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

    it('应该成功上传文件', async () => {
      const result = await uploadService.uploadFile(mockUploadRequest);

      expect(result.success).toBe(true);
      expect(result.file).toBeDefined();
      expect(result.file?.id).toBe('file123');
      expect(result.file?.filename).toBe('test.jpg');
    });

    it('应该验证文件大小', async () => {
      const largeFileRequest = {
        ...mockUploadRequest,
        buffer: Buffer.alloc(6000 * 1024 * 1024), // 6GB，超过默认5GB限制
      };

      const result = await uploadService.uploadFile(largeFileRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('文件大小不能超过');
    });

    it('应该验证文件类型', async () => {
      const invalidTypeRequest = {
        ...mockUploadRequest,
        mimeType: 'application/pdf',
      };

      const result = await uploadService.uploadFile(invalidTypeRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的文件类型');
    });

    it('应该检查用户权限', async () => {
      // Mock 权限检查失败
      mockPrisma.userPermissionConfig.findUnique.mockResolvedValue({
        canUploadImages: false,
        canUploadVideos: true,
        maxImagesPerUpload: 100,
        maxVideosPerUpload: 10,
      });

      const result = await uploadService.uploadFile(mockUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('没有上传图片的权限');
    });

    it('应该检查速率限制', async () => {
      // Mock 速率限制失败
      mockRateLimiter.canStartUpload.mockReturnValue({
        allowed: false,
        reason: '上传频率过高',
      });

      const result = await uploadService.uploadFile(mockUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('上传频率过高');
    });

    it('应该进行安全验证', async () => {
      // Mock 安全验证失败
      mockSecurityValidator.validateFileSecurity.mockResolvedValue({
        isValid: false,
        isSafe: false,
        confidence: 0,
        errors: ['恶意文件'],
        warnings: [],
      });

      const result = await uploadService.uploadFile(mockUploadRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('安全验证失败');
    });
  });

  describe('getUserUploadStats', () => {
    it('应该返回用户上传统计', async () => {
      const userId = 'user123';

      // Mock 数据库查询
      mockPrisma.mediaFile.aggregate
        .mockResolvedValueOnce({ _count: { id: 100 }, _sum: { fileSize: 1000000 } }) // total
        .mockResolvedValueOnce({ _count: { id: 5 }, _sum: { fileSize: 50000 } })     // today
        .mockResolvedValueOnce({ _count: { id: 20 }, _sum: { fileSize: 200000 } });  // month

      const stats = await uploadService.getUserUploadStats(userId);

      expect(stats).toEqual({
        totalFiles: 100,
        totalSize: 1000000,
        todayFiles: 5,
        todaySize: 50000,
        monthFiles: 20,
        monthSize: 200000,
      });
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('应该清理过期的上传会话', async () => {
      // Mock 过期会话
      mockPrisma.uploadSession.findMany.mockResolvedValue([
        { id: 'session1' },
        { id: 'session2' },
      ]);

      // Mock 删除操作
      mockPrisma.uploadChunk.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.uploadSession.deleteMany.mockResolvedValue({ count: 2 });

      const cleanedCount = await uploadService.cleanupExpiredSessions();

      expect(cleanedCount).toBe(2);
      expect(mockPrisma.uploadChunk.deleteMany).toHaveBeenCalledWith({
        where: {
          sessionId: {
            in: ['session1', 'session2'],
          },
        },
      });
      expect(mockPrisma.uploadSession.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['session1', 'session2'],
          },
        },
      });
    });

    it('应该在没有过期会话时返回0', async () => {
      // Mock 没有过期会话
      mockPrisma.uploadSession.findMany.mockResolvedValue([]);

      const cleanedCount = await uploadService.cleanupExpiredSessions();

      expect(cleanedCount).toBe(0);
      expect(mockPrisma.uploadChunk.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.uploadSession.deleteMany).not.toHaveBeenCalled();
    });
  });
});
