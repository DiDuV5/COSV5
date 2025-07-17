/**
 * @fileoverview 用户注册流程集成测试
 * @description 测试用户注册的完整流程，包括验证、错误处理和邮件发送
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient as _PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { authRouter } from '@/server/api/routers/auth-router';
import { TRPCError } from '@trpc/server';
import { convertTRPCErrorToUserMessage } from '@/lib/errors/user-friendly-messages';
import {
import { sendVerificationEmail } from '@/lib/email';
import { sendVerificationEmail } from '@/lib/email';

  createMockPrismaClient,
  createMockContext as _createTestMockContext,
  resetAllMocks,
  type MockPrismaClient,
  type MockBcrypt
} from '../types/mock-types';
import { createTestContext } from '../helpers/test-context';

// Mock dependencies
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  sendVerificationEmail: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Create typed mocks
const mockPrisma: MockPrismaClient = createMockPrismaClient();
const mockBcrypt = bcrypt as unknown as MockBcrypt;

// Mock context
const createMockContext = (session: any = null) => createTestContext({
  session,
  prisma: mockPrisma as any,
});

describe('用户注册流程测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllMocks(mockPrisma);
    mockBcrypt.hash.mockResolvedValue('hashed_password');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('正常注册流程', () => {
    it('应该成功注册新用户', async () => {
      // 准备测试数据
      const registrationData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
        displayName: 'Test User',
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        userLevel: 'USER',
        isVerified: false,
        isActive: true,
        emailVerified: null,
        createdAt: new Date(),
      };

      // Mock数据库操作
      mockPrisma.user.findUnique.mockResolvedValue(null); // 用户名不存在
      mockPrisma.user.findFirst.mockResolvedValue(null); // 邮箱不存在
      mockPrisma.user.create.mockResolvedValue(mockUser as any);
      mockPrisma.verificationToken.create.mockResolvedValue({
        id: 'token-123',
        token: 'verification-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as any);

      // 执行注册
      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      const result = await caller.register(registrationData);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.message).toContain('注册成功');
      expect(result.user).toMatchObject({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      // 验证数据库调用
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' }
      });
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();

      // 验证密码加密
      expect(mockBcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 12);
    });

    it('应该发送验证邮件', async () => {

      const registrationData = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'SecurePass123!',
        displayName: 'Test User 2',
      };

      // Mock数据库操作
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-124',
        username: 'testuser2',
        email: 'test2@example.com',
        displayName: 'Test User 2',
        userLevel: 'USER',
        isVerified: false,
        isActive: true,
      } as any);
      mockPrisma.verificationToken.create.mockResolvedValue({
        id: 'token-124',
        token: 'verification-token-2',
        userId: 'user-124',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await caller.register(registrationData);

      // 验证邮件发送
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        'test2@example.com',
        'Test User 2',
        'verification-token-2'
      );
    });
  });

  describe('重复注册验证', () => {
    it('应该拒绝重复的用户名', async () => {
      const registrationData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      // Mock用户名已存在
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        username: 'existinguser',
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.register(registrationData)).rejects.toThrow();

      // 验证错误处理
      try {
        await caller.register(registrationData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('用户名已被占用');
        expect(userMessage.description).toContain('请选择其他用户名');
      }
    });

    it('应该拒绝重复的邮箱', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'SecurePass123!',
        displayName: 'New User',
      };

      // Mock邮箱已存在
      mockPrisma.user.findUnique.mockResolvedValue(null); // 用户名不存在
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.register(registrationData)).rejects.toThrow();

      // 验证错误处理
      try {
        await caller.register(registrationData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('邮箱已被注册');
        expect(userMessage.description).toContain('请使用其他邮箱地址');
      }
    });
  });

  describe('密码强度验证', () => {
    it('应该拒绝弱密码', async () => {
      const weakPasswords = [
        '123456',           // 太简单
        'password',         // 常见密码
        'abc123',          // 太短且简单
        'ALLUPPERCASE',    // 只有大写字母
        'alllowercase',    // 只有小写字母
        '12345678',        // 只有数字
      ];

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      for (const weakPassword of weakPasswords) {
        const registrationData = {
          username: 'testuser',
          email: 'test@example.com',
          password: weakPassword,
          displayName: 'Test User',
        };

        await expect(caller.register(registrationData)).rejects.toThrow();

        try {
          await caller.register(registrationData);
        } catch (error) {
          const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
          expect(userMessage.title).toBe('密码强度不足');
          expect(userMessage.description).toContain('密码必须包含');
        }
      }
    });

    it('应该接受强密码', async () => {
      const strongPasswords = [
        'SecurePass123!',
        'MyStr0ng@Password',
        'C0mpl3x#Pass',
        'Unbreakable2024$',
      ];

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      } as any);
      mockPrisma.verificationToken.create.mockResolvedValue({
        id: 'token-123',
        token: 'verification-token',
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      for (const strongPassword of strongPasswords) {
        const registrationData = {
          username: `testuser${Math.random()}`,
          email: `test${Math.random()}@example.com`,
          password: strongPassword,
          displayName: 'Test User',
        };

        const result = await caller.register(registrationData);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('邮件发送失败处理', () => {
    it('应该在邮件发送失败时提供友好提示', async () => {
      sendVerificationEmail.mockRejectedValue(new Error('SMTP connection failed'));

      const registrationData = {
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'SecurePass123!',
        displayName: 'Test User 3',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-125',
        username: 'testuser3',
        email: 'test3@example.com',
      } as any);
      mockPrisma.verificationToken.create.mockResolvedValue({
        id: 'token-125',
        token: 'verification-token-3',
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      const result = await caller.register(registrationData);

      // 注册应该成功，但邮件发送失败应该有提示
      expect(result.success).toBe(true);
      expect(result.message).toContain('注册成功');
      expect(result.emailSent).toBe(false);
      expect(result.message).toContain('邮件发送失败');
    });
  });

  describe('数据库错误处理', () => {
    it('应该处理数据库连接错误', async () => {
      const registrationData = {
        username: 'testuser4',
        email: 'test4@example.com',
        password: 'SecurePass123!',
        displayName: 'Test User 4',
      };

      // Mock数据库错误
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.register(registrationData)).rejects.toThrow();

      try {
        await caller.register(registrationData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('服务器错误');
        expect(userMessage.description).toContain('请稍后重试');
      }
    });

    it('应该处理事务回滚', async () => {
      const registrationData = {
        username: 'testuser5',
        email: 'test5@example.com',
        password: 'SecurePass123!',
        displayName: 'Test User 5',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-126',
        username: 'testuser5',
      } as any);

      // Mock验证令牌创建失败
      mockPrisma.verificationToken.create.mockRejectedValue(
        new Error('Token creation failed')
      );

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.register(registrationData)).rejects.toThrow();

      // 验证事务回滚逻辑
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.verificationToken.create).toHaveBeenCalled();
    });
  });
});
