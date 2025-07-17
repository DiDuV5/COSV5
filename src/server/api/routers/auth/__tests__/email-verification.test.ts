/**
 * @fileoverview 邮箱验证tRPC路由测试
 * @description 测试邮箱验证相关的tRPC路由功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

// @ts-nocheck - 忽略测试文件中的类型检查问题

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { emailVerificationRouter } from '../email-verification';
import {
  createMockContextTyped,
  createMockUser,
  createMockVerificationToken,
  asMockPrismaClient,
  mockResolvedValue
} from '@/__tests__/types/mock-types-extended';

// Mock数据
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  emailVerified: null,
};

const mockVerifiedUser = {
  ...mockUser,
  emailVerified: new Date(),
};

const mockVerificationToken = {
  token: 'test-token-123',
  identifier: 'test@example.com',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后过期
};

const mockExpiredToken = createMockVerificationToken({
  token: 'test-token-123',
  identifier: 'test@example.com',
  expires: new Date(Date.now() - 60 * 60 * 1000), // 1小时前过期
});

// Mock数据库
const mockDb = {
  verificationToken: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Mock上下文
const createMockContext = (user?: any) => ({
  session: user ? {
    user: {
      id: user.id,
      email: user.email,
      username: user.username || 'testuser',
      userLevel: user.userLevel || 'USER',
      isVerified: user.isVerified || true,
      canPublish: user.canPublish || true,
      avatarUrl: user.avatarUrl || null,
      displayName: user.displayName || null,
      approvalStatus: user.approvalStatus || 'APPROVED'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
  } : null,
  db: mockDb,
  prisma: mockDb, // 添加prisma属性，指向同一个mock对象
});

// Mock邮件服务
jest.mock('@/lib/email', () => ({
  sendVerificationEmail: jest.fn() as any,
}));

// 使用统一的Mock类型定义
const mockDbTyped = asMockPrismaClient(mockDb);

describe('邮箱验证tRPC路由', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verify', () => {
    it('应该成功验证有效的令牌', async () => {
      (mockDbTyped.verificationToken.findUnique as any).mockResolvedValue(mockVerificationToken);
      (mockDbTyped.user.findUnique as any).mockResolvedValue(mockUser);
      (mockDbTyped.user.update as any).mockResolvedValue(mockVerifiedUser);
      (mockDbTyped.verificationToken.delete as any).mockResolvedValue({});

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(createMockContextTyped());

      const result = await caller.verify({ token: 'test-token-123' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('邮箱验证成功！');
      expect(result.user).toBeDefined();
      expect(mockDb.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { emailVerified: expect.any(Date) },
        select: expect.any(Object),
      });
    });

    it('应该拒绝无效的令牌', async () => {
      mockDbTyped.verificationToken.findUnique.mockResolvedValue(null);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.verify({ token: 'invalid-token' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('验证令牌无效');
    });

    it('应该拒绝过期的令牌', async () => {
      mockDb.verificationToken.findUnique.mockResolvedValue(mockExpiredToken);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.verify({ token: 'expired-token' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('验证令牌已过期');
    });

    it('应该处理已验证的用户', async () => {
      mockDb.verificationToken.findUnique.mockResolvedValue(mockVerificationToken);
      mockDb.user.findUnique.mockResolvedValue(mockVerifiedUser);
      mockDb.verificationToken.delete.mockResolvedValue({});

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.verify({ token: 'test-token-123' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('邮箱已验证');
      expect(mockDb.user.update).not.toHaveBeenCalled();
    });
  });

  describe('checkToken', () => {
    it('应该返回有效令牌的状态', async () => {
      mockDb.verificationToken.findUnique.mockResolvedValue(mockVerificationToken);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.checkToken({ token: 'test-token-123' });

      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.email).toBe(mockVerificationToken.identifier);
      expect(result.expiresAt).toEqual(mockVerificationToken.expires);
    });

    it('应该返回过期令牌的状态', async () => {
      mockDb.verificationToken.findUnique.mockResolvedValue(mockExpiredToken);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.checkToken({ token: 'expired-token' });

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.email).toBe(mockExpiredToken.identifier);
    });

    it('应该处理不存在的令牌', async () => {
      mockDb.verificationToken.findUnique.mockResolvedValue(null);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.checkToken({ token: 'nonexistent-token' });

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(false);
      expect(result.email).toBeUndefined();
    });
  });

  describe('resendVerification', () => {
    it('应该成功重新发送验证邮件', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockDb.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
      mockDb.verificationToken.create.mockResolvedValue(mockVerificationToken);

      const ctx = createMockContext(mockUser);
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.resendVerification();

      expect(result.success).toBe(true);
      expect(result.message).toBe('验证邮件已重新发送');
      expect(mockDb.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: mockUser.email },
      });
      expect(mockDb.verificationToken.create).toHaveBeenCalled();
    });

    it('应该拒绝为已验证用户重新发送', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockVerifiedUser);

      const ctx = createMockContext(mockVerifiedUser);
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.resendVerification();

      expect(result.success).toBe(false);
      expect(result.message).toBe('邮箱已验证，无需重新发送');
      expect(mockDb.verificationToken.create).not.toHaveBeenCalled();
    });

    it('应该处理不存在的用户', async () => {
      mockDb.user.findUnique.mockResolvedValue(null);

      const ctx = createMockContext(mockUser);
      const caller = emailVerificationRouter.createCaller(ctx);

      await expect(caller.resendVerification()).rejects.toThrow('用户不存在');
    });
  });

  describe('getVerificationStatus', () => {
    it('应该返回已验证用户的状态', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockVerifiedUser);
      mockDb.verificationToken.findFirst.mockResolvedValue(null);

      const ctx = createMockContext(mockVerifiedUser);
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.getVerificationStatus();

      expect(result.emailVerified).toBe(true);
      expect(result.verifiedAt).toEqual(mockVerifiedUser.emailVerified);
      expect(result.pendingVerification).toBe(false);
    });

    it('应该返回未验证用户的状态', async () => {
      mockDb.user.findUnique.mockResolvedValue(mockUser);
      mockDb.verificationToken.findFirst.mockResolvedValue(mockVerificationToken);

      const ctx = createMockContext(mockUser);
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.getVerificationStatus();

      expect(result.emailVerified).toBe(false);
      expect(result.verifiedAt).toBeNull();
      expect(result.pendingVerification).toBe(true);
      expect(result.pendingEmail).toBe(mockUser.email);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('应该清理过期的验证令牌', async () => {
      mockDb.verificationToken.deleteMany.mockResolvedValue({ count: 5 });

      const ctx = createMockContext(mockUser);
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.cleanupExpiredTokens();

      expect(result.cleaned).toBe(5);
      expect(mockDb.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expires: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });
});
