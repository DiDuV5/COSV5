/**
 * @fileoverview 统一认证中间件测试
 * @description 测试统一认证中间件的各种认证和权限检查功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  unifiedAuthMiddleware,
  basicAuth,
  verifiedAuth,
  creatorAuth,
  adminAuth,
  AuthMiddlewareOptions,
  AuthenticatedUser,
  BaseContext,
} from '../unified-auth-middleware';

// Mock数据
const mockUser: AuthenticatedUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  userLevel: 'USER',
  isVerified: true,
  canPublish: false,
  isActive: true,
  approvalStatus: 'APPROVED',
  avatarUrl: null,
  displayName: 'Test User',
};

const mockAdminUser: AuthenticatedUser = {
  ...mockUser,
  id: 'admin-123',
  username: 'admin',
  userLevel: 'ADMIN',
  canPublish: true,
};

const mockCreatorUser: AuthenticatedUser = {
  ...mockUser,
  id: 'creator-123',
  username: 'creator',
  userLevel: 'CREATOR',
  canPublish: true,
};

// Mock数据库
const mockDb = {
  user: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
  },
  userPermissionConfig: {
    findUnique: jest.fn() as jest.MockedFunction<any>,
  },
};

// Mock上下文
const createMockContext = (user?: AuthenticatedUser | null): BaseContext => ({
  session: user ? { user: { id: user.id } } : null,
  prisma: mockDb,
  db: mockDb,
});

describe('统一认证中间件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('unifiedAuthMiddleware', () => {
    it('应该成功认证有效用户', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      
      const ctx = createMockContext(mockUser);
      const result = await unifiedAuthMiddleware(ctx);

      expect(result.user).toEqual(mockUser);
      expect(result.session).toBeDefined();
    });

    it('应该拒绝未登录用户', async () => {
      const ctx = createMockContext();
      
      await expect(unifiedAuthMiddleware(ctx)).rejects.toThrow('请先登录');
    });

    it('应该拒绝不存在的用户', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);
      
      const ctx = createMockContext(mockUser);
      
      await expect(unifiedAuthMiddleware(ctx)).rejects.toThrow('用户不存在');
    });

    it('应该拒绝未激活的用户', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockDb.user.findUnique.mockResolvedValue(inactiveUser);
      
      const ctx = createMockContext(mockUser);
      
      await expect(unifiedAuthMiddleware(ctx)).rejects.toThrow('用户账户未激活');
    });

    it('应该拒绝审核被拒绝的用户', async () => {
      const rejectedUser = { ...mockUser, approvalStatus: 'REJECTED' };
      mockDb.user.findUnique.mockResolvedValue(rejectedUser);
      
      const ctx = createMockContext(mockUser);
      
      await expect(unifiedAuthMiddleware(ctx)).rejects.toThrow('用户审核被拒绝');
    });

    it('应该检查用户等级权限', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      
      const ctx = createMockContext(mockUser);
      const options: AuthMiddlewareOptions = {
        requiredLevel: 'ADMIN',
        operation: '管理操作',
      };
      
      await expect(unifiedAuthMiddleware(ctx, options)).rejects.toThrow('需要ADMIN级别权限');
    });

    it('应该检查验证状态', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      mockDb.user.findUnique.mockResolvedValue(unverifiedUser);
      
      const ctx = createMockContext(mockUser);
      const options: AuthMiddlewareOptions = {
        requireVerified: true,
      };
      
      await expect(unifiedAuthMiddleware(ctx, options)).rejects.toThrow('需要验证用户身份');
    });

    it('应该检查发布权限', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      
      const ctx = createMockContext(mockUser);
      const options: AuthMiddlewareOptions = {
        requirePublishPermission: true,
      };
      
      await expect(unifiedAuthMiddleware(ctx, options)).rejects.toThrow('您没有发布作品的权限');
    });
  });

  describe('预定义认证中间件', () => {
    it('basicAuth 应该只检查基本认证', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      
      const ctx = createMockContext(mockUser);
      const result = await basicAuth(ctx);

      expect(result.user).toEqual(mockUser);
    });

    it('verifiedAuth 应该检查验证状态', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      mockDb.user.findUnique.mockResolvedValue(unverifiedUser);
      
      const ctx = createMockContext(mockUser);
      
      await expect(verifiedAuth(ctx)).rejects.toThrow('需要验证用户身份');
    });

    it('creatorAuth 应该检查发布权限', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockCreatorUser);
      
      const ctx = createMockContext(mockCreatorUser);
      const result = await creatorAuth(ctx);

      expect(result.user).toEqual(mockCreatorUser);
    });

    it('adminAuth 应该检查管理员权限', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockAdminUser);
      
      const ctx = createMockContext(mockAdminUser);
      const result = await adminAuth(ctx);

      expect(result.user).toEqual(mockAdminUser);
    });

    it('adminAuth 应该拒绝非管理员用户', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      
      const ctx = createMockContext(mockUser);
      
      await expect(adminAuth(ctx)).rejects.toThrow('需要ADMIN级别权限');
    });
  });

  describe('用户等级层级检查', () => {
    it('应该正确比较用户等级', async () => {
      // VIP用户应该能访问USER级别的功能
      const vipUser = { ...mockUser, userLevel: 'VIP' as const };
      mockDb.user.findUnique.mockResolvedValue(vipUser);
      
      const ctx = createMockContext(vipUser);
      const options: AuthMiddlewareOptions = {
        requiredLevel: 'USER',
      };
      
      const result = await unifiedAuthMiddleware(ctx, options);
      expect(result.user).toEqual(vipUser);
    });

    it('应该拒绝权限不足的用户', async () => {
      // USER用户不能访问CREATOR级别的功能
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      
      const ctx = createMockContext(mockUser);
      const options: AuthMiddlewareOptions = {
        requiredLevel: 'CREATOR',
      };
      
      await expect(unifiedAuthMiddleware(ctx, options)).rejects.toThrow('需要CREATOR级别权限');
    });
  });

  describe('审核状态检查', () => {
    it('应该允许待审核用户访问（如果配置允许）', async () => {
      const pendingUser = { ...mockUser, approvalStatus: 'PENDING' };
      mockDb.user.findUnique.mockResolvedValue(pendingUser);
      
      const ctx = createMockContext(pendingUser);
      const options: AuthMiddlewareOptions = {
        requireApproved: true,
        allowPending: true,
      };
      
      const result = await unifiedAuthMiddleware(ctx, options);
      expect(result.user).toEqual(pendingUser);
    });

    it('应该拒绝待审核用户访问（如果配置不允许）', async () => {
      const pendingUser = { ...mockUser, approvalStatus: 'PENDING' };
      mockDb.user.findUnique.mockResolvedValue(pendingUser);
      
      const ctx = createMockContext(pendingUser);
      const options: AuthMiddlewareOptions = {
        requireApproved: true,
        allowPending: false,
      };
      
      await expect(unifiedAuthMiddleware(ctx, options)).rejects.toThrow('需要审核通过才能执行此操作');
    });
  });
});
