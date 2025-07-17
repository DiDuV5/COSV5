/**
 * @fileoverview 用户登录流程集成测试
 * @description 测试用户登录的完整流程，包括凭据验证、会话管理和JWT令牌生成
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient as _PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encode } from 'next-auth/jwt';

// Mock authRouter before importing
jest.mock('@/server/api/routers/auth-router', () => ({
  authRouter: {
    createCaller: jest.fn((ctx: any) => ({
      login: jest.fn() as any,
      register: jest.fn(),
      checkUsername: jest.fn(),
      checkEmail: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
    })),
  },
}));

import { authRouter } from '@/server/api/routers/auth-router';
import { TRPCError } from '@trpc/server';
import { convertTRPCErrorToUserMessage } from '@/lib/errors/user-friendly-messages';
import {
  createMockPrismaClient,
  createMockContext as _createTestMockContext,
  resetAllMocks,
  type MockPrismaClient,
  type MockBcrypt
} from '../types/mock-types';
import { createTestContext } from '../helpers/test-context';

// Mock dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('next-auth/jwt', () => ({
  encode: jest.fn(() => Promise.resolve('mock-jwt-token')),
  decode: jest.fn(),
}));

// Create typed mocks
const mockPrisma: MockPrismaClient = createMockPrismaClient();
const mockBcrypt = bcrypt as unknown as MockBcrypt;

// Mock context
const createMockContext = (session: any = null) => createTestContext({
  session,
  prisma: mockPrisma as any,
});

describe('用户登录流程测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllMocks(mockPrisma);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('正确凭据登录成功', () => {
    it('应该使用用户名和密码成功登录', async () => {
      const loginData = {
        username: 'testuser',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: true,
        emailVerified: new Date(),
        lastLoginAt: null,
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        sessionToken: 'session-token-123',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天
      });

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      const result = await caller.login(loginData);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.message).toContain('登录成功');
      expect(result.user).toMatchObject({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
      });
      expect(result.token).toBeDefined();

      // 验证数据库调用
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: 'testuser' },
            { email: 'testuser' },
          ],
        },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('SecurePass123!', 'hashed_password');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('应该使用邮箱和密码成功登录', async () => {
      const loginData = {
        username: 'test@example.com',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-124',
        username: 'testuser2',
        email: 'test@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: true,
        emailVerified: new Date(),
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-124',
        userId: 'user-124',
        sessionToken: 'session-token-124',
      });

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      const result = await caller.login(loginData);

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('test@example.com');
    });
  });

  describe('错误密码登录失败', () => {
    it('应该拒绝错误密码', async () => {
      const loginData = {
        username: 'testuser',
        password: 'WrongPassword123!',
      };

      const mockUser = {
        id: 'user-125',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: true,
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never); // 密码不匹配

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('登录失败');
        expect(userMessage.description).toContain('用户名或密码错误');
      }

      // 验证不会创建会话
      expect(mockPrisma.session.create).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('应该拒绝不存在的用户', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: 'AnyPassword123!',
      };

      // Mock用户不存在
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('登录失败');
        expect(userMessage.description).toContain('用户名或密码错误');
      }

      // 验证不会检查密码
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('未验证邮箱用户登录限制', () => {
    it('应该拒绝未验证邮箱的用户登录', async () => {
      const loginData = {
        username: 'unverifieduser',
        password: 'SecurePass123!',
      };

      const mockUnverifiedUser = {
        id: 'user-126',
        username: 'unverifieduser',
        email: 'unverified@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: false, // 未验证
        isActive: true,
        emailVerified: null,
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUnverifiedUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('邮箱未验证');
        expect(userMessage.description).toContain('请先验证您的邮箱');
        expect(userMessage.action).toBe('重新发送验证邮件');
      }

      // 验证不会创建会话
      expect(mockPrisma.session.create).not.toHaveBeenCalled();
    });

    it('应该拒绝非活跃用户登录', async () => {
      const loginData = {
        username: 'inactiveuser',
        password: 'SecurePass123!',
      };

      const mockInactiveUser = {
        id: 'user-127',
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: false, // 非活跃
        emailVerified: new Date(),
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockInactiveUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('账户已被禁用');
        expect(userMessage.description).toContain('请联系管理员');
      }
    });
  });

  describe('会话管理和JWT令牌生成', () => {
    it('应该创建有效的会话记录', async () => {
      const loginData = {
        username: 'sessionuser',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-128',
        username: 'sessionuser',
        email: 'session@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: true,
        emailVerified: new Date(),
      };

      const mockSession = {
        id: 'session-128',
        userId: 'user-128',
        sessionToken: 'unique-session-token-128',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue(mockSession as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      const result = await caller.login(loginData);

      // 验证会话创建
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-128',
          sessionToken: expect.any(String),
          expires: expect.any(Date),
        },
      });

      expect(result.token).toBeDefined();
    });

    it('应该清理用户的旧会话', async () => {
      const loginData = {
        username: 'cleanupuser',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-129',
        username: 'cleanupuser',
        email: 'cleanup@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: true,
        emailVerified: new Date(),
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 }); // 删除2个旧会话
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-129',
        userId: 'user-129',
        sessionToken: 'new-session-token-129',
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await caller.login(loginData);

      // 验证旧会话清理
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-129',
          expires: {
            lt: expect.any(Date),
          },
        },
      });
    });

    it('应该生成JWT令牌', async () => {

      const loginData = {
        username: 'jwtuser',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-130',
        username: 'jwtuser',
        email: 'jwt@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: true,
        emailVerified: new Date(),
      };

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-130',
        userId: 'user-130',
        sessionToken: 'session-token-130',
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      const result = await caller.login(loginData);

      // 验证JWT生成
      expect(encode).toHaveBeenCalledWith({
        token: {
          sub: 'user-130',
          username: 'jwtuser',
          email: 'jwt@example.com',
          userLevel: 'USER',
          sessionToken: 'session-token-130',
        },
        secret: expect.any(String),
      });

      expect(result.token).toBe('mock-jwt-token');
    });
  });

  describe('登录安全和限制', () => {
    it('应该记录登录时间', async () => {
      const loginData = {
        username: 'timeuser',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-131',
        username: 'timeuser',
        email: 'time@example.com',
        password: 'hashed_password',
        userLevel: 'USER',
        isVerified: true,
        isActive: true,
        emailVerified: new Date(),
        lastLoginAt: null,
      };

      const beforeLogin = new Date();

      // Mock数据库操作
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      } as any);
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-131',
        userId: 'user-131',
        sessionToken: 'session-token-131',
      } as any);

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await caller.login(loginData);

      const afterLogin = new Date();

      // 验证登录时间更新
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-131' },
        data: {
          lastLoginAt: expect.any(Date),
        },
      });

      const updateCall = mockPrisma.user.update.mock.calls[0];
      const lastLoginAt = (updateCall[0] as any)?.data?.lastLoginAt;
      expect(lastLoginAt.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      expect(lastLoginAt.getTime()).toBeLessThanOrEqual(afterLogin.getTime());
    });

    it('应该处理数据库错误', async () => {
      const loginData = {
        username: 'erroruser',
        password: 'SecurePass123!',
      };

      // Mock数据库错误
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database connection failed'));

      const ctx = createMockContext();
      const caller = authRouter.createCaller(ctx);

      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        const userMessage = convertTRPCErrorToUserMessage(error as TRPCError);
        expect(userMessage.title).toBe('服务器错误');
        expect(userMessage.description).toContain('请稍后重试');
      }
    });
  });
});
