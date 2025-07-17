/**
 * @fileoverview 认证路由单元测试 - P0级别
 * @description 直接测试auth-router的登录功能，目标覆盖率90%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 在导入之前设置所有必要的mocks
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn(),
}));

jest.mock('next-auth/jwt', () => ({
  encode: jest.fn(),
  decode: jest.fn(),
}));

// Mock TRPCErrorHandler
jest.mock('@/lib/errors/trpc-error-handler', () => ({
  TRPCErrorHandler: {
    businessError: jest.fn((type, message) => {
      const error = new Error(message as string);
      error.name = 'TRPCError';
      return error;
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

// 现在导入要测试的模块
import { authRouter } from '@/server/api/routers/auth-router';
import * as bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';
import { createMockTRPCContext, mockUsers } from './auth-test-utils';

describe('认证路由单元测试 - P0级别', () => {
  let mockPrisma: any;
  let ctx: any;
  let mockBcrypt: any;
  let mockEncode: any;

  beforeEach(() => {
    // 创建mock Prisma客户端
    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      verificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      account: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
      $disconnect: jest.fn(),
    };

    // 创建测试上下文
    ctx = createMockTRPCContext({ prisma: mockPrisma });

    // 设置mocks
    mockBcrypt = bcrypt as any;
    mockEncode = encode as jest.MockedFunction<typeof encode>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('登录功能测试', () => {
    it('应该成功登录有效用户', async () => {
      // 准备测试数据
      const validUser = {
        ...mockUsers.validUser,
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: new Date(),
        lastLoginAt: null,
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

      // 创建caller并执行登录
      const caller = authRouter.createCaller(ctx as any);
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

      // 验证数据库调用
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: loginInput.username },
            { email: loginInput.username },
          ],
        },
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginInput.password,
        validUser.passwordHash
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: validUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });

      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: validUser.id,
          expires: expect.any(Date),
          sessionToken: expect.any(String),
        },
      });

      expect(mockEncode).toHaveBeenCalledWith({
        token: expect.objectContaining({
          sub: validUser.id,
          id: validUser.id,
          email: validUser.email,
          username: validUser.username,
          userLevel: validUser.userLevel,
        }),
        secret: expect.any(String),
      });
    });

    it('应该拒绝不存在的用户', async () => {
      const loginInput = {
        username: 'nonexistent',
        password: 'password',
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow('用户名或密码错误');

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
      const validUser = {
        ...mockUsers.validUser,
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: new Date(),
      };

      const loginInput = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(validUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow('用户名或密码错误');

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        loginInput.password,
        validUser.passwordHash
      );
    });

    it('应该拒绝未验证邮箱的用户', async () => {
      const unverifiedUser = {
        ...mockUsers.validUser,
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: null, // 未验证
      };

      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(unverifiedUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow('请先验证邮箱后再登录');
    });

    it('应该拒绝非活跃用户', async () => {
      const inactiveUser = {
        ...mockUsers.validUser,
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: new Date(),
        isActive: false,
      };

      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(inactiveUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow('账户已被禁用，请联系管理员');
    });
  });

  describe('输入验证测试', () => {
    it('应该验证用户名不能为空', async () => {
      const loginInput = {
        username: '',
        password: 'password',
      };

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow('用户名不能为空');
    });

    it('应该验证密码不能为空', async () => {
      const loginInput = {
        username: 'testuser',
        password: '',
      };

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow('密码不能为空');
    });
  });

  describe('错误处理测试', () => {
    it('应该处理数据库错误', async () => {
      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      // 模拟数据库错误
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow();
    });

    it('应该处理bcrypt错误', async () => {
      const validUser = {
        ...mockUsers.validUser,
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: new Date(),
      };

      const loginInput = {
        username: 'testuser',
        password: 'password',
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(validUser);
      mockBcrypt.compare.mockRejectedValue(new Error('bcrypt error'));

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow();
    });

    it('应该处理JWT编码错误', async () => {
      const validUser = {
        ...mockUsers.validUser,
        passwordHash: '$2a$10$hashedpassword',
        emailVerified: new Date(),
      };

      const loginInput = {
        username: 'testuser',
        password: 'password',
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
      mockEncode.mockRejectedValue(new Error('JWT encoding failed'));

      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginInput)).rejects.toThrow();
    });
  });
});
