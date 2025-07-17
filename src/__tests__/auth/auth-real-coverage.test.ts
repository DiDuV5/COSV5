/**
 * @fileoverview 认证系统真实覆盖率测试 - P1级别
 * @description 直接测试真实的auth-router代码，获得真实覆盖率，目标90%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 设置环境变量
process.env.COSEREEDEN_NEXTAUTH_SECRET = 'test-secret-key-for-jwt';

// Mock外部依赖但保留真实的认证逻辑
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn(),
}));

jest.mock('next-auth/jwt', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

// Mock TRPCError
class MockTRPCError extends Error {
  code: string;
  constructor(options: { code: string; message: string }) {
    super(options.message);
    this.name = 'TRPCError';
    this.code = options.code;
  }
}

// Mock TRPCErrorHandler但保留错误结构
jest.mock('@/lib/errors/trpc-error-handler', () => ({
  TRPCErrorHandler: {
    businessError: jest.fn((type: string, message: string) => {
      return new MockTRPCError({
        code: 'BAD_REQUEST',
        message: message || 'Business error',
      });
    }),
  },
  BusinessErrorType: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  },
}));

// Mock UserLevel
jest.mock('@/types/user-level', () => ({
  UserLevel: {
    GUEST: 'GUEST',
    USER: 'USER',
    VIP: 'VIP',
    CREATOR: 'CREATOR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  },
}));

// Mock auth模块
jest.mock('@/server/api/routers/auth/types', () => ({
  registerInputSchema: {},
  checkUsernameInputSchema: {},
  checkEmailInputSchema: {},
  updateProfileInputSchema: {},
  changePasswordInputSchema: {},
}));

jest.mock('@/server/api/routers/auth/index', () => ({
  processUserRegistration: jest.fn(),
  getUserProfile: jest.fn(),
  getUserSessionInfo: jest.fn(),
  updateUserProfile: jest.fn(),
}));

jest.mock('@/server/api/routers/auth/validation-helpers', () => ({
  validateUsernameAvailability: jest.fn(),
  validateEmailAvailability: jest.fn(),
}));

jest.mock('@/server/api/routers/auth/user-registration', () => ({
  resendVerificationEmail: jest.fn(),
}));

// Mock tRPC但保留真实的路由逻辑
jest.mock('@/server/api/trpc', () => ({
  createTRPCRouter: jest.fn((routes) => routes),
  publicProcedure: {
    input: jest.fn().mockReturnThis(),
    mutation: jest.fn((handler) => ({ handler })),
    query: jest.fn((handler) => ({ handler })),
  },
  authProcedure: {
    input: jest.fn().mockReturnThis(),
    mutation: jest.fn((handler) => ({ handler })),
    query: jest.fn((handler) => ({ handler })),
  },
}));

import * as bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';

describe('认证系统真实覆盖率测试 - P1级别', () => {
  let mockBcrypt: any;
  let mockEncode: any;
  let mockPrisma: any;
  let mockCtx: any;

  beforeEach(() => {
    mockBcrypt = bcrypt as any;
    mockEncode = encode as jest.MockedFunction<typeof encode>;

    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
      },
    };

    mockCtx = {
      prisma: mockPrisma,
      session: null,
      user: null,
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('登录功能真实测试', () => {
    it('应该成功执行真实的登录逻辑', async () => {
      // 动态导入真实的auth-router
      const { authRouter } = await import('@/server/api/routers/auth-router');

      // 准备测试数据
      const validUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: '$2a$10$hashedpassword',
        userLevel: 'USER',
        emailVerified: new Date(),
        isActive: true,
        displayName: 'Test User',
        canPublish: false,
        approvalStatus: 'APPROVED',
      };

      const loginInput = {
        username: 'testuser',
        password: 'SecurePass123!',
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(validUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({ ...validUser, lastLoginAt: new Date() });
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: validUser.id,
        sessionToken: `session_${validUser.id}_${Date.now()}`,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      mockEncode.mockResolvedValue('mock-jwt-token');

      // 创建调用器并执行真实的登录逻辑
      const caller = authRouter.createCaller(mockCtx);
      const result = await caller.login(loginInput);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.message).toBe('登录成功');
      expect(result.user).toMatchObject({
        id: validUser.id,
        username: validUser.username,
        email: validUser.email,
        userLevel: validUser.userLevel,
      });
      expect(result.token).toBeDefined();
      expect(result.token).toBe('mock-jwt-token');

      // 验证真实的函数调用
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: loginInput.username },
            { email: loginInput.username },
          ],
        },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginInput.password, validUser.passwordHash);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: validUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
      expect(mockEncode).toHaveBeenCalled();
    });

    it('应该拒绝不存在的用户', async () => {
      const { authRouter } = await import('@/server/api/routers/auth-router');

      const loginInput = {
        username: 'nonexistent',
        password: 'password',
      };

      mockPrisma.user.findFirst.mockResolvedValue(null);

      const caller = authRouter.createCaller(mockCtx);

      await expect(caller.login(loginInput))
        .rejects.toThrow('用户名或密码错误');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: loginInput.username },
            { email: loginInput.username },
          ],
        },
      });
    });

    it('应该拒绝错误密码', async () => {
      const { authRouter } = await import('@/server/api/routers/auth-router');

      const validUser = {
        id: 'user-123',
        username: 'testuser',
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: new Date(),
        isActive: true,
      };

      const loginInput = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      mockPrisma.user.findFirst.mockResolvedValue(validUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const caller = authRouter.createCaller(mockCtx);

      await expect(caller.login(loginInput))
        .rejects.toThrow('用户名或密码错误');

      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginInput.password, validUser.passwordHash);
    });

    it('应该拒绝未验证邮箱的用户', async () => {
      const { authRouter } = await import('@/server/api/routers/auth-router');

      const unverifiedUser = {
        id: 'user-123',
        username: 'testuser',
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: null,
        isActive: true,
      };

      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      mockPrisma.user.findFirst.mockResolvedValue(unverifiedUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const caller = authRouter.createCaller(mockCtx);

      await expect(caller.login(loginInput))
        .rejects.toThrow('请先验证邮箱后再登录');
    });

    it('应该拒绝非活跃用户', async () => {
      const { authRouter } = await import('@/server/api/routers/auth-router');

      const inactiveUser = {
        id: 'user-123',
        username: 'testuser',
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: new Date(),
        isActive: false,
      };

      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      mockPrisma.user.findFirst.mockResolvedValue(inactiveUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const caller = authRouter.createCaller(mockCtx);

      await expect(caller.login(loginInput))
        .rejects.toThrow('账户已被禁用，请联系管理员');
    });

    it('应该处理数据库错误', async () => {
      const { authRouter } = await import('@/server/api/routers/auth-router');

      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const caller = authRouter.createCaller(mockCtx);

      await expect(caller.login(loginInput))
        .rejects.toThrow();
    });

    it('应该处理JWT编码错误', async () => {
      const { authRouter } = await import('@/server/api/routers/auth-router');

      const validUser = {
        id: 'user-123',
        username: 'testuser',
        passwordHash: '$2a$10$hashedpassword',
        userLevel: 'USER',
        emailVerified: new Date(),
        isActive: true,
        displayName: 'Test User',
        canPublish: false,
        approvalStatus: 'APPROVED',
      };

      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      mockPrisma.user.findFirst.mockResolvedValue(validUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({ ...validUser, lastLoginAt: new Date() });
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: validUser.id,
        sessionToken: `session_${validUser.id}_${Date.now()}`,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      mockEncode.mockRejectedValue(new Error('JWT encoding failed'));

      const caller = authRouter.createCaller(mockCtx);

      await expect(caller.login(loginInput))
        .rejects.toThrow();
    });
  });
});
