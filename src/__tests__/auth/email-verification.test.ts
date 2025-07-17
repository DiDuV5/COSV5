/**
 * @fileoverview 邮箱验证流程集成测试 - P1级别
 * @description 测试邮箱验证的完整流程，包括令牌验证、过期处理和状态更新，目标覆盖率80%+
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - P1级别增强
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient as _PrismaClient } from '@prisma/client';
import { emailVerificationRouter } from '@/server/api/routers/auth/email-verification';
import { TRPCError } from '@trpc/server';
import { createTestContext } from '../helpers/test-context';
import { convertTRPCErrorToUserMessage } from '@/lib/errors/user-friendly-messages';

import { sendVerificationEmail } from '@/lib/email';

// Mock dependencies
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  sendVerificationEmail: jest.fn(() => Promise.resolve(true)),
  EmailService: {
    sendVerificationEmailDetailed: jest.fn(() => Promise.resolve({
      success: true,
      messageId: 'test-message-id',
    })),
  },
}));

// Mock配置系统
jest.mock('@/lib/config/email-verification-config', () => ({
  emailVerificationConfig: {
    initialize: jest.fn(() => Promise.resolve(undefined)),
    generateVerificationUrl: jest.fn((token: string) =>
      `${process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`
    ),
    getConfig: jest.fn(() => ({
      tokenExpiryHours: 24,
      brandName: 'CoserEden',
      supportEmail: 'support@cosereeden.com',
    })),
  },
  getTokenExpiryDate: jest.fn(() =>
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  ),
}));

// Mock Prisma with proper typing
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  verificationToken: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

// Add mock methods manually to avoid type issues
Object.keys(mockPrisma).forEach(key => {
  if (typeof mockPrisma[key] === 'object' && mockPrisma[key] !== null) {
    Object.keys(mockPrisma[key]).forEach(method => {
      const mockMethod = mockPrisma[key][method];
      mockMethod.mockResolvedValue = jest.fn().mockReturnValue(mockMethod);
      mockMethod.mockRejectedValue = jest.fn().mockReturnValue(mockMethod);
    });
  }
});

mockPrisma.$transaction.mockImplementation((callback: any) => callback(mockPrisma));

// Mock context
const createMockContext = (session: any = null) => createTestContext({
  session,
  prisma: mockPrisma,
});

describe('邮箱验证流程测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('验证令牌有效性检查', () => {
    it('应该成功验证有效令牌', async () => {
      const validToken = 'valid-verification-token';
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        emailVerified: null,
        isVerified: false,
      };

      const mockTokenRecord = {
        id: 'token-123',
        token: validToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1小时后过期
        user: mockUser,
      };

      // Mock数据库操作
      mockPrisma.verificationToken.findUnique.mockResolvedValue(mockTokenRecord as any);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        emailVerified: new Date(),
        isVerified: true,
      } as any);
      mockPrisma.verificationToken.delete.mockResolvedValue(mockTokenRecord as any);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.verify({ token: validToken });

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.message).toContain('邮箱验证成功');
      expect(result.user).toMatchObject({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      });

      // 验证数据库调用
      expect(mockPrisma.verificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: validToken },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          emailVerified: expect.any(Date),
          isVerified: true,
        },
      });
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken },
      });
    });

    it('应该拒绝无效令牌', async () => {
      const invalidToken = 'invalid-verification-token';

      // Mock令牌不存在
      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      await expect(caller.verify({ token: invalidToken })).rejects.toThrow();

      try {
        await caller.verify({ token: invalidToken });
      } catch (_error) {
        const userMessage = convertTRPCErrorToUserMessage(_error as TRPCError);
        expect(userMessage.title).toBe('验证链接无效');
        expect(userMessage.description).toContain('验证链接已失效');
      }

      // 验证数据库调用
      expect(mockPrisma.verificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: invalidToken },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('过期令牌处理', () => {
    it('应该拒绝过期令牌', async () => {
      const expiredToken = 'expired-verification-token';
      const mockUser = {
        id: 'user-124',
        username: 'testuser2',
        email: 'test2@example.com',
        emailVerified: null,
        isVerified: false,
      };

      const mockExpiredTokenRecord = {
        id: 'token-124',
        token: expiredToken,
        userId: 'user-124',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1小时前过期
        user: mockUser,
      };

      // Mock过期令牌
      mockPrisma.verificationToken.findUnique.mockResolvedValue(mockExpiredTokenRecord as any);
      mockPrisma.verificationToken.delete.mockResolvedValue(mockExpiredTokenRecord as any);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      await expect(caller.verify({ token: expiredToken })).rejects.toThrow();

      try {
        await caller.verify({ token: expiredToken });
      } catch (_error) {
        const userMessage = convertTRPCErrorToUserMessage(_error as TRPCError);
        expect(userMessage.title).toBe('验证链接已过期');
        expect(userMessage.description).toContain('请重新发送验证邮件');
      }

      // 验证过期令牌被删除
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: expiredToken },
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('应该自动清理过期令牌', async () => {
      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      // Mock清理过期令牌
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 5 });

      const result = await caller.cleanupExpiredTokens();

      expect(result.cleaned).toBe(5);
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          expires: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('重复验证处理', () => {
    it('应该处理已验证用户的重复验证', async () => {
      const token = 'already-verified-token';
      const mockVerifiedUser = {
        id: 'user-125',
        username: 'verifieduser',
        email: 'verified@example.com',
        emailVerified: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天已验证
        isVerified: true,
      };

      const mockTokenRecord = {
        id: 'token-125',
        token,
        userId: 'user-125',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: mockVerifiedUser,
      };

      // Mock已验证用户
      mockPrisma.verificationToken.findUnique.mockResolvedValue(mockTokenRecord as any);
      mockPrisma.verificationToken.delete.mockResolvedValue(mockTokenRecord as any);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.verify({ token });

      // 应该返回成功，但提示已验证
      expect(result.success).toBe(true);
      expect(result.message).toContain('邮箱已验证');
      expect(result.user).toMatchObject({
        id: 'user-125',
        username: 'verifieduser',
        email: 'verified@example.com',
      });

      // 验证令牌被清理
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalled();
      // 用户状态不需要更新
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('重新发送验证邮件', () => {
    it('应该成功重新发送验证邮件', async () => {
      const userEmail = 'test@example.com';

      const mockUser = {
        id: 'user-126',
        username: 'testuser3',
        email: userEmail,
        displayName: 'Test User 3',
        emailVerified: null,
        isVerified: false,
      };

      // Mock数据库操作
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.verificationToken.create.mockResolvedValue({
        identifier: userEmail,
        token: 'new-verification-token',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        used: false,
        createdAt: new Date(),
      } as any);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.resendVerification({ email: userEmail });

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.message).toContain('验证邮件已重新发送');

      // 验证数据库调用
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userEmail },
      });
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: userEmail },
      });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();

      // 验证邮件发送
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        userEmail,
        'Test User 3',
        'new-verification-token'
      );
    });

    it('应该拒绝为不存在的邮箱重发验证邮件', async () => {
      const nonExistentEmail = 'nonexistent@example.com';

      // Mock用户不存在
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      await expect(caller.resendVerification({ email: nonExistentEmail })).rejects.toThrow();

      try {
        await caller.resendVerification({ email: nonExistentEmail });
      } catch (_error) {
        const userMessage = convertTRPCErrorToUserMessage(_error as TRPCError);
        expect(userMessage.title).toBe('用户不存在');
        expect(userMessage.description).toContain('该邮箱地址未注册');
      }
    });

    it('应该拒绝为已验证用户重发验证邮件', async () => {
      const verifiedEmail = 'verified@example.com';
      const mockVerifiedUser = {
        id: 'user-127',
        email: verifiedEmail,
        emailVerified: new Date(),
        isVerified: true,
      };

      // Mock已验证用户
      mockPrisma.user.findUnique.mockResolvedValue(mockVerifiedUser as any);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      await expect(caller.resendVerification({ email: verifiedEmail })).rejects.toThrow();

      try {
        await caller.resendVerification({ email: verifiedEmail });
      } catch (_error) {
        const userMessage = convertTRPCErrorToUserMessage(_error as TRPCError);
        expect(userMessage.title).toBe('邮箱已验证');
        expect(userMessage.description).toContain('该邮箱已经验证过了');
      }
    });
  });

  describe('验证成功后用户状态更新', () => {
    it('应该正确更新用户验证状态', async () => {
      const token = 'status-update-token';
      const mockUser = {
        id: 'user-128',
        username: 'statususer',
        email: 'status@example.com',
        displayName: 'Status User',
        emailVerified: null,
        isVerified: false,
        isActive: false, // 初始状态为非活跃
      };

      const mockTokenRecord = {
        id: 'token-128',
        token,
        userId: 'user-128',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: mockUser,
      };

      const updatedUser = {
        ...mockUser,
        emailVerified: new Date(),
        isVerified: true,
        isActive: true, // 验证后激活
      };

      // Mock数据库操作
      mockPrisma.verificationToken.findUnique.mockResolvedValue(mockTokenRecord as any);
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);
      mockPrisma.verificationToken.delete.mockResolvedValue(mockTokenRecord as any);

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      const result = await caller.verify({ token });

      // 验证用户状态更新
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-128' },
        data: {
          emailVerified: expect.any(Date),
          isVerified: true,
          isActive: true, // 确保用户被激活
        },
      });

      // 验证返回的用户对象包含正确的字段
      expect(result.user?.id).toBe('user-128');
      expect(result.user?.username).toBe('statususer');
      expect(result.user?.email).toBe('status@example.com');
      expect(result.user?.emailVerified).toBeInstanceOf(Date);
    });
  });

  describe('错误处理和恢复', () => {
    it('应该处理数据库事务失败', async () => {
      const token = 'transaction-fail-token';
      const mockUser = {
        id: 'user-129',
        email: 'transaction@example.com',
        emailVerified: null,
        isVerified: false,
      };

      const mockTokenRecord = {
        id: 'token-129',
        token,
        userId: 'user-129',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: mockUser,
      };

      // Mock数据库操作
      mockPrisma.verificationToken.findUnique.mockResolvedValue(mockTokenRecord as any);
      mockPrisma.user.update.mockRejectedValue(new Error('Database transaction failed'));

      const ctx = createMockContext();
      const caller = emailVerificationRouter.createCaller(ctx);

      await expect(caller.verify({ token })).rejects.toThrow();

      try {
        await caller.verify({ token });
      } catch (_error) {
        const userMessage = convertTRPCErrorToUserMessage(_error as TRPCError);
        expect(userMessage.title).toBe('服务器错误');
        expect(userMessage.description).toContain('请稍后重试');
      }
    });
  });
});
