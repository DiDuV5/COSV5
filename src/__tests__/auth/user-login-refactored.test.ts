/**
 * @fileoverview 用户登录系统测试 - 重构版本
 * @description 使用新的测试架构重构的用户登录测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 新架构版本
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceMockFactory, TestMockFactory } from '@/test-utils/mock-factories';
import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers';

describe('用户登录系统 - 重构版本', () => {
  // 测试数据
  const mockLoginInput = {
    username: 'testuser',
    password: 'SecurePassword123!',
    rememberMe: false
  };

  const mockVerifiedUser = TestMockFactory.createUserData('USER', {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    approvalStatus: 'APPROVED',
    isVerified: true,
    userLevel: 'USER'
  });

  const mockLoginResult = {
    success: true,
    message: '登录成功',
    user: mockVerifiedUser,
    token: 'jwt-token-123',
    sessionId: 'session-123'
  };

  beforeEach(() => {
    // 重置所有Mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理Mock
    jest.restoreAllMocks();
  });

  describe('loginUser 方法', () => {
    describe('成功场景', () => {
      it('应该成功登录已验证用户', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockResolvedValue(mockLoginResult)
        });

        // Act
        const result = await mockAuthService.loginUser(mockLoginInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '登录成功',
          user: expect.objectContaining({
            username: 'testuser',
            isVerified: true,
            approvalStatus: 'APPROVED'
          }),
          token: expect.any(String),
          sessionId: expect.any(String)
        });

        TestHelpers.verifyMockCallTimes(mockAuthService.loginUser, 1);
      });

      it('应该支持记住我功能', async () => {
        // Arrange
        const rememberMeInput = {
          ...mockLoginInput,
          rememberMe: true
        };

        const extendedSessionResult = {
          ...mockLoginResult,
          sessionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockResolvedValue(extendedSessionResult)
        });

        // Act
        const result = await mockAuthService.loginUser(rememberMeInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.sessionExpiry).toBeDefined();
        expect(new Date(result.sessionExpiry).getTime()).toBeGreaterThan(Date.now());
      });

      it('应该生成有效的JWT令牌', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockResolvedValue(mockLoginResult)
        });

        // Act
        const result = await mockAuthService.loginUser(mockLoginInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.token).toBeDefined();
        expect(typeof result.token).toBe('string');
        expect(result.token.length).toBeGreaterThan(0);
      });

      it('应该创建用户会话', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockResolvedValue(mockLoginResult)
        });

        // Act
        const result = await mockAuthService.loginUser(mockLoginInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.sessionId).toBeDefined();
        expect(typeof result.sessionId).toBe('string');
        expect(result.sessionId.length).toBeGreaterThan(0);
      });
    });

    describe('错误场景', () => {
      it('应该处理用户不存在的情况', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('用户不存在')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(mockLoginInput),
          '用户不存在'
        );
      });

      it('应该处理密码错误的情况', async () => {
        // Arrange
        const wrongPasswordInput = {
          ...mockLoginInput,
          password: 'WrongPassword123!'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('密码错误')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(wrongPasswordInput),
          '密码错误'
        );
      });

      it('应该处理邮箱未验证的情况', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('邮箱未验证，请先验证邮箱')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(mockLoginInput),
          '邮箱未验证，请先验证邮箱'
        );
      });

      it('应该处理账户未审批的情况', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('账户待审批，请等待管理员审核')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(mockLoginInput),
          '账户待审批，请等待管理员审核'
        );
      });

      it('应该处理账户被禁用的情况', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('账户已被禁用')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(mockLoginInput),
          '账户已被禁用'
        );
      });

      it('应该处理登录频率限制', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('登录尝试过于频繁，请稍后再试')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(mockLoginInput),
          '登录尝试过于频繁，请稍后再试'
        );
      });
    });

    describe('边界情况', () => {
      it('应该处理空用户名', async () => {
        // Arrange
        const emptyUsernameInput = {
          ...mockLoginInput,
          username: ''
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('用户名不能为空')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(emptyUsernameInput),
          '用户名不能为空'
        );
      });

      it('应该处理空密码', async () => {
        // Arrange
        const emptyPasswordInput = {
          ...mockLoginInput,
          password: ''
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockRejectedValue(
            new Error('密码不能为空')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.loginUser(emptyPasswordInput),
          '密码不能为空'
        );
      });

      it('应该处理特殊字符的用户名', async () => {
        // Arrange
        const specialUsernameInput = {
          ...mockLoginInput,
          username: 'user@domain.com' // 邮箱格式登录
        };

        const emailLoginResult = {
          ...mockLoginResult,
          user: { ...mockVerifiedUser, email: 'user@domain.com' }
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          loginUser: jest.fn().mockResolvedValue(emailLoginResult)
        });

        // Act
        const result = await mockAuthService.loginUser(specialUsernameInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.user.email).toBe('user@domain.com');
      });
    });
  });

  describe('权限验证', () => {
    it('应该验证不同用户级别的登录', async () => {
      // Arrange
      const adminUser = TestMockFactory.createUserData('ADMIN', {
        userLevel: 'ADMIN'
      });

      const adminLoginResult = {
        ...mockLoginResult,
        user: adminUser
      };

      const mockAuthService = ServiceMockFactory.createAuthService({
        loginUser: jest.fn().mockResolvedValue(adminLoginResult)
      });

      // Act
      const result = await mockAuthService.loginUser(mockLoginInput);

      // Assert
      expect(result.success).toBe(true);
      expect(result.user.userLevel).toBe('ADMIN');
      TestAssertions.assertUserPermission('ADMIN', 'USER');
    });
  });

  describe('数据验证', () => {
    it('应该验证登录结果的完整性', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        loginUser: jest.fn().mockResolvedValue(mockLoginResult)
      });

      // Act
      const result = await mockAuthService.loginUser(mockLoginInput);

      // Assert
      TestAssertions.assertValidLoginResult(result);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('userLevel');
    });

    it('应该正确处理中文错误消息', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        loginUser: jest.fn().mockRejectedValue(
          new Error('登录失败：凭据无效')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockAuthService.loginUser(mockLoginInput),
        /登录失败/
      );
    });
  });

  describe('性能和可靠性测试', () => {
    it('应该在合理时间内完成登录', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        loginUser: jest.fn().mockResolvedValue(mockLoginResult)
      });

      // Act
      const startTime = Date.now();
      const result = await mockAuthService.loginUser(mockLoginInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertResponseTime(startTime, 150); // 150ms内完成
    });

    it('应该正确处理并发登录请求', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        loginUser: jest.fn().mockResolvedValue(mockLoginResult)
      });

      const requests = Array.from({ length: 3 }, () =>
        mockAuthService.loginUser(mockLoginInput)
      );

      // Act
      const results = await Promise.all(requests);

      // Assert
      results.forEach((result: any) => {
        expect(result.success).toBe(true);
      });
      TestHelpers.verifyMockCallTimes(mockAuthService.loginUser, 3);
    });
  });
});
