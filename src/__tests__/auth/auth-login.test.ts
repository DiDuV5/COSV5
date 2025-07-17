/**
 * @fileoverview 用户登录功能测试 - P0级别
 * @description 测试用户登录的核心功能，目标覆盖率90%+
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TRPCError as _TRPCError } from '@trpc/server';
import { authRouter } from '@/server/api/routers/auth-router';
import {
  createMockPrismaClient,
  createMockTRPCContext,
  setupBcryptMocks,
  setupJWTMocks,
  resetAllMocks,
  mockUsers,
  setupSuccessfulLogin,
  setupFailedLogin,
  expectSuccessfulLoginResult,
  expectFailedLoginResult,
} from './auth-test-utils';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('next-auth/jwt');

describe('用户登录功能测试 - P0级别', () => {
  let mockPrisma: any;
  let mockBcrypt: any;
  let mockJWT: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    mockBcrypt = setupBcryptMocks();
    mockJWT = setupJWTMocks();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetAllMocks(mockPrisma);
  });

  describe('成功登录场景', () => {
    it('应该使用用户名和密码成功登录', async () => {
      // 准备测试数据
      const loginData = {
        username: 'testuser',
        password: 'SecurePass123!',
      };

      // 设置模拟
      setupSuccessfulLogin(mockPrisma, mockBcrypt, mockUsers.validUser);

      // 创建caller
      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      // 执行测试
      const result = await caller.login(loginData);

      // 验证结果
      expectSuccessfulLoginResult(result, mockUsers.validUser);

      // 验证数据库调用
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: loginData.username },
            { email: loginData.username },
          ],
        },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUsers.validUser.passwordHash);
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('应该使用邮箱和密码成功登录', async () => {
      // 准备测试数据
      const loginData = {
        username: 'test@example.com',
        password: 'SecurePass123!',
      };

      // 设置模拟
      setupSuccessfulLogin(mockPrisma, mockBcrypt, mockUsers.validUser);

      // 创建caller
      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      // 执行测试
      const result = await caller.login(loginData);

      // 验证结果
      expectSuccessfulLoginResult(result, mockUsers.validUser);
    });

    it('应该为管理员用户成功登录', async () => {
      // 准备测试数据
      const loginData = {
        username: 'admin',
        password: 'AdminPass123!',
      };

      // 设置模拟
      setupSuccessfulLogin(mockPrisma, mockBcrypt, mockUsers.adminUser);

      // 创建caller
      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      // 执行测试
      const result = await caller.login(loginData);

      // 验证结果
      expectSuccessfulLoginResult(result, mockUsers.adminUser);
      expect(result.user.userLevel).toBe('ADMIN');
    });
  });

  describe('登录失败场景', () => {
    it('应该拒绝不存在的用户', async () => {
      // 准备测试数据
      const loginData = {
        username: 'nonexistent',
        password: 'password',
      };

      // 设置模拟
      setupFailedLogin(mockPrisma, mockBcrypt, 'user-not-found');

      // 创建caller
      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      // 执行测试并验证错误
      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        expectFailedLoginResult(error, '用户名或密码错误');
      }
    });

    it('应该拒绝错误密码', async () => {
      // 准备测试数据
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      // 设置模拟
      setupFailedLogin(mockPrisma, mockBcrypt, 'wrong-password');

      // 创建caller
      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      // 执行测试并验证错误
      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        expectFailedLoginResult(error, '用户名或密码错误');
      }
    });

    it('应该拒绝未验证邮箱的用户', async () => {
      // 准备测试数据
      const loginData = {
        username: 'unverified',
        password: 'password',
      };

      // 设置模拟
      setupFailedLogin(mockPrisma, mockBcrypt, 'unverified');

      // 创建caller
      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      // 执行测试并验证错误
      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        expectFailedLoginResult(error, '请先验证您的邮箱');
      }
    });

    it('应该拒绝非活跃用户', async () => {
      // 准备测试数据
      const loginData = {
        username: 'inactive',
        password: 'password',
      };

      // 设置模拟
      setupFailedLogin(mockPrisma, mockBcrypt, 'inactive');

      // 创建caller
      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      // 执行测试并验证错误
      await expect(caller.login(loginData)).rejects.toThrow();

      try {
        await caller.login(loginData);
      } catch (error) {
        expectFailedLoginResult(error, '账户已被禁用');
      }
    });
  });

  describe('输入验证', () => {
    it('应该拒绝空用户名', async () => {
      const loginData = {
        username: '',
        password: 'password',
      };

      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginData)).rejects.toThrow('用户名不能为空');
    });

    it('应该拒绝空密码', async () => {
      const loginData = {
        username: 'testuser',
        password: '',
      };

      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      await expect(caller.login(loginData)).rejects.toThrow('密码不能为空');
    });
  });

  describe('会话管理', () => {
    it('应该创建新的会话记录', async () => {
      const loginData = {
        username: 'testuser',
        password: 'SecurePass123!',
      };

      setupSuccessfulLogin(mockPrisma, mockBcrypt, mockUsers.validUser);

      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      await caller.login(loginData);

      // 验证会话创建
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUsers.validUser.id,
          sessionToken: expect.any(String),
          expires: expect.any(Date),
        }),
      });
    });

    it('应该清理用户的旧会话', async () => {
      const loginData = {
        username: 'testuser',
        password: 'SecurePass123!',
      };

      setupSuccessfulLogin(mockPrisma, mockBcrypt, mockUsers.validUser);

      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      await caller.login(loginData);

      // 验证旧会话清理
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: mockUsers.validUser.id,
          expires: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('JWT令牌生成', () => {
    it('应该生成有效的JWT令牌', async () => {
      const loginData = {
        username: 'testuser',
        password: 'SecurePass123!',
      };

      setupSuccessfulLogin(mockPrisma, mockBcrypt, mockUsers.validUser);

      const ctx = createMockTRPCContext({ prisma: mockPrisma });
      const caller = authRouter.createCaller(ctx as any);

      const result = await caller.login(loginData);

      // 验证JWT生成
      expect(mockJWT.mockEncode).toHaveBeenCalledWith({
        token: expect.objectContaining({
          sub: mockUsers.validUser.id,
          id: mockUsers.validUser.id,
          email: mockUsers.validUser.email,
          username: mockUsers.validUser.username,
          userLevel: mockUsers.validUser.userLevel,
        }),
        secret: expect.any(String),
      });

      expect(result.token).toBe('mock-jwt-token');
    });
  });
});
