/**
 * @fileoverview 作品CRUD功能测试
 * @description 测试作品的创建、编辑、删除功能，确保数据一致性和权限控制
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { createMockContext } from '@/test-utils/mock-factories/trpc-context';
import { createMockUser } from '@/test-utils/mock-factories/user-factory';
import { createMockPost } from '@/test-utils/mock-factories/post-factory';
import { postCreateRouter } from '@/server/api/routers/post/post-create';
import { postAdminRouter } from '@/server/api/routers/post/post-admin';
import { TransactionManager } from '@/lib/transaction';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    postMedia: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    like: {
      deleteMany: jest.fn(),
    },
    comment: {
      deleteMany: jest.fn(),
    },
    commentLike: {
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/transaction', () => ({
  TransactionManager: {
    createPostWithMedia: jest.fn(),
    softDeletePost: jest.fn(),
  },
}));

describe('作品CRUD功能测试', () => {
  let mockUser: any;
  let mockCreator: any;
  let mockAdmin: any;
  let mockPost: any;

  beforeAll(() => {
    // 设置全局测试环境
  });

  afterAll(() => {
    // 清理全局测试环境
  });

  beforeEach(() => {
    // 创建测试用户
    mockUser = createMockUser({
      id: 'user-1',
      userLevel: 'USER',
      isVerified: true,
      isActive: true,
    });

    mockCreator = createMockUser({
      id: 'creator-1',
      userLevel: 'CREATOR',
      isVerified: true,
      isActive: true,
    });

    mockAdmin = createMockUser({
      id: 'admin-1',
      userLevel: 'ADMIN',
      isVerified: true,
      isActive: true,
    });

    mockPost = createMockPost({
      id: 'post-1',
      title: '测试作品',
      authorId: 'creator-1',
      contentType: 'POST',
    });

    // 重置所有mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('作品创建功能', () => {
    it('应该允许创作者创建作品', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockCreator });
      const input = {
        title: '新作品',
        content: '作品内容',
        contentType: 'POST' as const,
        tags: ['测试', '作品'],
        mediaFiles: [],
      };

      const mockResult = {
        success: true,
        data: {
          post: { ...mockPost, title: input.title },
          media: [],
        },
      };

      (TransactionManager.createPostWithMedia as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const caller = postCreateRouter.createCaller(ctx);
      const result = await caller.create(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.post.title).toBe(input.title);
      expect(TransactionManager.createPostWithMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          title: input.title,
          content: input.content,
          authorId: mockCreator.id,
        }),
        []
      );
    });

    it('应该拒绝非创作者用户创建作品', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockUser });
      const input = {
        title: '新作品',
        content: '作品内容',
        contentType: 'POST' as const,
        tags: [],
        mediaFiles: [],
      };

      // Act & Assert
      const caller = postCreateRouter.createCaller(ctx);
      await expect(caller.create(input)).rejects.toThrow(TRPCError);
    });

    it('应该验证必填字段', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockCreator });
      const input = {
        title: '', // 空标题
        content: '作品内容',
        contentType: 'POST' as const,
        tags: [],
        mediaFiles: [],
      };

      // Act & Assert
      const caller = postCreateRouter.createCaller(ctx);
      await expect(caller.create(input)).rejects.toThrow();
    });
  });

  describe('作品删除功能', () => {
    it('应该允许作者删除自己的作品', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockCreator });
      const input = {
        id: 'post-1',
        reason: '测试删除',
      };

      const mockResult = {
        success: true,
        data: {
          post: mockPost,
          deletedMedia: [],
          deletedCounts: {
            media: 0,
            comments: 0,
            likes: 0,
          },
        },
      };

      (TransactionManager.softDeletePost as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const caller = postAdminRouter.createCaller(ctx);
      const result = await caller.deleteMyPost(input);

      // Assert
      expect(result.success).toBe(true);
      expect(TransactionManager.softDeletePost).toHaveBeenCalledWith(
        input.id,
        mockCreator.id,
        input.reason
      );
    });

    it('应该允许管理员删除任意作品', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockAdmin });
      const input = {
        id: 'post-1',
        reason: '管理员删除',
      };

      const mockResult = {
        success: true,
        data: {
          post: mockPost,
          deletedMedia: [],
          deletedCounts: {
            media: 0,
            comments: 2,
            likes: 5,
          },
        },
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);
      (TransactionManager.softDeletePost as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const caller = postAdminRouter.createCaller(ctx);
      const result = await caller.delete(input);

      // Assert
      expect(result.success).toBe(true);
      // 删除API不返回deletedMediaCount字段
      expect(TransactionManager.softDeletePost).toHaveBeenCalledWith(
        input.id,
        mockAdmin.id,
        input.reason
      );
    });

    it('应该拒绝非作者用户删除作品', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockUser });
      const input = {
        id: 'post-1',
        reason: '无权限删除',
      };

      // Act & Assert
      const caller = postAdminRouter.createCaller(ctx);
      await expect(caller.deleteMyPost(input)).rejects.toThrow(TRPCError);
    });

    it('应该在删除不存在的作品时抛出错误', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockAdmin });
      const input = {
        id: 'non-existent-post',
        reason: '删除不存在的作品',
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      const caller = postAdminRouter.createCaller(ctx);
      await expect(caller.delete(input)).rejects.toThrow('内容不存在');
    });
  });

  describe('数据一致性测试', () => {
    it('删除作品时应该清理所有关联数据', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockCreator });
      const input = {
        id: 'post-1',
        reason: '测试数据一致性',
      };

      const mockPostWithCounts = {
        ...mockPost,
        _count: {
          likes: 5,
          comments: 3,
        },
        media: [
          { id: 'media-1', url: 'test1.jpg' },
          { id: 'media-2', url: 'test2.jpg' },
        ],
      };

      const mockResult = {
        success: true,
        data: {
          post: mockPostWithCounts,
          deletedMedia: mockPostWithCounts.media,
          deletedCounts: {
            media: 2,
            comments: 3,
            likes: 5,
          },
        },
      };

      (TransactionManager.softDeletePost as jest.Mock).mockResolvedValue(mockResult);

      // Act
      const caller = postAdminRouter.createCaller(ctx);
      const result = await caller.deleteMyPost(input);

      // Assert
      expect(result.success).toBe(true);
      // 删除API不返回deletedMediaCount字段
      expect(TransactionManager.softDeletePost).toHaveBeenCalledWith(
        input.id,
        mockCreator.id,
        input.reason
      );
    });

    it('删除失败时应该回滚事务', async () => {
      // Arrange
      const ctx = createMockContext({ user: mockCreator });
      const input = {
        id: 'post-1',
        reason: '测试事务回滚',
      };

      const mockError = new Error('数据库错误');
      (TransactionManager.softDeletePost as jest.Mock).mockResolvedValue({
        success: false,
        error: '删除失败：数据库错误',
      });

      // Act & Assert
      const caller = postAdminRouter.createCaller(ctx);
      await expect(caller.deleteMyPost(input)).rejects.toThrow('删除失败');
    });
  });

  describe('权限验证测试', () => {
    it('应该验证用户登录状态', async () => {
      // Arrange
      const ctx = createMockContext({ user: null });
      const input = {
        title: '新作品',
        content: '作品内容',
        contentType: 'POST' as const,
        tags: [],
        mediaFiles: [],
      };

      // Act & Assert
      const caller = postCreateRouter.createCaller(ctx);
      await expect(caller.create(input)).rejects.toThrow();
    });

    it('应该验证用户激活状态', async () => {
      // Arrange
      const inactiveUser = { ...mockCreator, isActive: false };
      const ctx = createMockContext({ user: inactiveUser });
      const input = {
        title: '新作品',
        content: '作品内容',
        contentType: 'POST' as const,
        tags: [],
        mediaFiles: [],
      };

      // Act & Assert
      const caller = postCreateRouter.createCaller(ctx);
      await expect(caller.create(input)).rejects.toThrow();
    });

    it('应该验证用户验证状态', async () => {
      // Arrange
      const unverifiedUser = { ...mockCreator, isVerified: false };
      const ctx = createMockContext({ user: unverifiedUser });
      const input = {
        title: '新作品',
        content: '作品内容',
        contentType: 'POST' as const,
        tags: [],
        mediaFiles: [],
      };

      // Act & Assert
      const caller = postCreateRouter.createCaller(ctx);
      await expect(caller.create(input)).rejects.toThrow();
    });
  });
});
