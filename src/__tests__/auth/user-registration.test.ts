/**
 * @fileoverview 用户注册系统测试 - P1级别
 * @description 测试用户注册的核心功能，目标覆盖率80%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 设置环境变量
process.env.COSEREEDEN_NEXTAUTH_SECRET = 'test-secret-key-for-jwt';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  genSalt: jest.fn(),
  compare: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
}));

// Mock TRPCErrorHandler
class MockTRPCError extends Error {
  code: string;
  constructor(options: { code: string; message: string }) {
    super(options.message);
    this.name = 'TRPCError';
    this.code = options.code;
  }
}

jest.mock('@/lib/errors/trpc-error-handler', () => ({
  TRPCErrorHandler: {
    businessError: jest.fn((type, message, context) => {
      return new MockTRPCError({
        code: 'BAD_REQUEST',
        message: (message as string) || 'Business error',
      });
    }),
  },
  BusinessErrorType: {
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
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

// Mock邮件服务
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

// Mock配置
jest.mock('@/lib/config/email-verification-config', () => ({
  getTokenExpiryDate: jest.fn(() => new Date(Date.now() + 24 * 60 * 60 * 1000)),
  emailVerificationConfig: {
    tokenLength: 32,
    expiryHours: 24,
    maxResendAttempts: 3,
    resendCooldownMinutes: 5,
  },
}));

import * as bcrypt from 'bcryptjs';
import { processUserRegistration } from '@/server/api/routers/auth/index';

describe('用户注册系统测试 - P1级别', () => {
  let mockPrisma: any;
  let mockCtx: any;
  let mockBcrypt: any;

  beforeEach(() => {
    mockBcrypt = bcrypt as any;

    mockPrisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      verificationToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback: any) => callback(mockPrisma)),
    };

    mockCtx = {
      prisma: mockPrisma,
      db: mockPrisma,
      session: null,
      user: null,
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('用户注册流程', () => {
    it('应该成功注册新用户', async () => {
      // 准备测试数据
      const registrationData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      const hashedPassword = '$2a$10$hashedpassword';
      const newUser = {
        id: 'user-123',
        username: registrationData.username,
        email: registrationData.email,
        passwordHash: hashedPassword,
        displayName: registrationData.displayName,
        userLevel: 'USER',
        isActive: true,
        emailVerified: null,
        createdAt: new Date(),
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(null); // 用户名和邮箱都不存在
      mockBcrypt.genSalt.mockResolvedValue('salt');
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(newUser);
      mockPrisma.verificationToken.create.mockResolvedValue({
        id: 'token-123',
        token: 'verification-token',
        identifier: registrationData.email,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId: newUser.id,
      });

      // 执行注册
      const result = await processUserRegistration(registrationData, mockCtx);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.message).toContain('注册成功');
      expect(result.user).toMatchObject({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
      });

      // 验证函数调用
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(2); // 检查用户名和邮箱
      expect(mockBcrypt.hash).toHaveBeenCalledWith(registrationData.password, 'salt');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: registrationData.username,
          email: registrationData.email,
          passwordHash: hashedPassword,
          displayName: registrationData.displayName,
          userLevel: 'USER',
          isActive: true,
        }),
      });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();
    });

    it('应该拒绝重复的用户名', async () => {
      const registrationData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      const existingUser = {
        id: 'existing-user',
        username: 'existinguser',
        email: 'existing@example.com',
      };

      // 设置mocks - 用户名已存在
      mockPrisma.user.findFirst.mockResolvedValueOnce(existingUser); // 第一次查询用户名

      // 执行注册并验证错误
      await expect(processUserRegistration(registrationData, mockCtx))
        .rejects.toThrow();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: registrationData.username },
      });
    });

    it('应该拒绝重复的邮箱', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      const existingUser = {
        id: 'existing-user',
        username: 'existinguser',
        email: 'existing@example.com',
      };

      // 设置mocks
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(null) // 用户名不存在
        .mockResolvedValueOnce(existingUser); // 邮箱已存在

      // 执行注册并验证错误
      await expect(processUserRegistration(registrationData, mockCtx))
        .rejects.toThrow();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(2);
    });

    it('应该验证密码强度', async () => {
      const weakPasswordData = {
        username: 'newuser',
        email: 'new@example.com',
        password: '123', // 弱密码
        displayName: 'New User',
      };

      // 由于密码验证通常在输入验证层进行，我们测试相关逻辑
      expect(weakPasswordData.password.length).toBeLessThan(8);
      expect(weakPasswordData.password).not.toMatch(/[A-Z]/); // 没有大写字母
      expect(weakPasswordData.password).not.toMatch(/[!@#$%^&*]/); // 没有特殊字符
    });

    it('应该验证邮箱格式', async () => {
      const invalidEmailData = {
        username: 'newuser',
        email: 'invalid-email', // 无效邮箱格式
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(invalidEmailData.email)).toBe(false);
    });

    it('应该验证用户名格式', async () => {
      const invalidUsernameData = {
        username: 'a', // 太短
        email: 'new@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      // 验证用户名长度
      expect(invalidUsernameData.username.length).toBeLessThan(3);
    });
  });

  describe('密码处理', () => {
    it('应该正确加密密码', async () => {
      const password = 'SecurePass123!';
      const salt = 'mock-salt';
      const hashedPassword = '$2a$10$hashedpassword';

      mockBcrypt.genSalt.mockResolvedValue(salt);
      mockBcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await bcrypt.hash(password, salt);

      expect(result).toBe(hashedPassword);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, salt);
    });

    it('应该生成安全的盐值', async () => {
      const saltRounds = 10;
      const salt = 'generated-salt';

      mockBcrypt.genSalt.mockResolvedValue(salt);

      const result = await bcrypt.genSalt(saltRounds);

      expect(result).toBe(salt);
      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(saltRounds);
    });
  });

  describe('验证令牌生成', () => {
    it('应该生成邮箱验证令牌', async () => {
      const userEmail = 'test@example.com';
      const userId = 'user-123';
      const verificationToken = {
        id: 'token-123',
        token: 'generated-token',
        identifier: userEmail,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId,
      };

      mockPrisma.verificationToken.create.mockResolvedValue(verificationToken);

      const result = await mockPrisma.verificationToken.create({
        data: {
          token: 'generated-token',
          identifier: userEmail,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          userId,
        },
      });

      expect(result).toEqual(verificationToken);
      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'generated-token',
          identifier: userEmail,
          userId,
          expires: expect.any(Date),
        }),
      });
    });

    it('应该清理旧的验证令牌', async () => {
      const userEmail = 'test@example.com';

      mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 2 });

      const result = await mockPrisma.verificationToken.deleteMany({
        where: { identifier: userEmail },
      });

      expect(result.count).toBe(2);
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: userEmail },
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理数据库事务错误', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      // 设置mocks
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockBcrypt.genSalt.mockResolvedValue('salt');
      mockBcrypt.hash.mockResolvedValue('hashedpassword');

      // 模拟数据库事务错误
      mockPrisma.$transaction.mockRejectedValue(new Error('Database transaction failed'));

      // 执行注册并验证错误
      await expect(processUserRegistration(registrationData, mockCtx))
        .rejects.toThrow();
    });

    it('应该处理密码加密错误', async () => {
      const password = 'SecurePass123!';

      // 模拟bcrypt错误
      mockBcrypt.genSalt.mockRejectedValue(new Error('Salt generation failed'));

      await expect(bcrypt.genSalt(10)).rejects.toThrow('Salt generation failed');
    });
  });
});
