/**
 * @fileoverview 用户注册系统测试 - 重构版本
 * @description 使用新的测试架构重构的用户注册测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 新架构版本
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceMockFactory, TestMockFactory } from '@/test-utils/mock-factories';
import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers';

describe('用户注册系统 - 重构版本', () => {
  // 测试数据
  const mockRegistrationInput = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePassword123!',
    displayName: 'Test User',
    confirmPassword: 'SecurePassword123!'
  };

  const mockRegisteredUser = TestMockFactory.createUserData('USER', {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    approvalStatus: 'PENDING',
    isVerified: false,
    userLevel: 'USER'
  });

  const mockRegistrationResult = {
    success: true,
    message: '注册成功，请查收验证邮件',
    user: mockRegisteredUser,
    verificationToken: 'verification-token-123'
  };

  beforeEach(() => {
    // 重置所有Mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理Mock
    jest.restoreAllMocks();
  });

  describe('registerUser 方法', () => {
    describe('成功场景', () => {
      it('应该成功注册新用户', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockResolvedValue(mockRegistrationResult)
        });

        // Act
        const result = await mockAuthService.registerUser(mockRegistrationInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '注册成功，请查收验证邮件',
          user: expect.objectContaining({
            username: 'testuser',
            email: 'test@example.com',
            approvalStatus: 'PENDING',
            isVerified: false
          }),
          verificationToken: expect.any(String)
        });
        
        TestHelpers.verifyMockCallTimes(mockAuthService.registerUser, 1);
      });

      it('应该正确处理密码加密', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockResolvedValue({
            ...mockRegistrationResult,
            passwordHashed: true
          })
        });

        // Act
        const result = await mockAuthService.registerUser(mockRegistrationInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.passwordHashed).toBe(true);
        // 验证密码不会在返回结果中暴露
        expect(result.user).not.toHaveProperty('password');
      });

      it('应该生成验证令牌', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockResolvedValue(mockRegistrationResult)
        });

        // Act
        const result = await mockAuthService.registerUser(mockRegistrationInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.verificationToken).toBeDefined();
        expect(typeof result.verificationToken).toBe('string');
        expect(result.verificationToken.length).toBeGreaterThan(0);
      });
    });

    describe('错误场景', () => {
      it('应该处理用户名已存在的情况', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockRejectedValue(
            new Error('用户名已存在')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.registerUser(mockRegistrationInput),
          '用户名已存在'
        );
      });

      it('应该处理邮箱已存在的情况', async () => {
        // Arrange
        const duplicateEmailInput = {
          ...mockRegistrationInput,
          username: 'differentuser'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockRejectedValue(
            new Error('邮箱已被注册')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.registerUser(duplicateEmailInput),
          '邮箱已被注册'
        );
      });

      it('应该处理密码不匹配的情况', async () => {
        // Arrange
        const mismatchPasswordInput = {
          ...mockRegistrationInput,
          confirmPassword: 'DifferentPassword123!'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockRejectedValue(
            new Error('密码确认不匹配')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.registerUser(mismatchPasswordInput),
          '密码确认不匹配'
        );
      });

      it('应该处理无效的邮箱格式', async () => {
        // Arrange
        const invalidEmailInput = {
          ...mockRegistrationInput,
          email: 'invalid-email'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockRejectedValue(
            new Error('邮箱格式无效')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.registerUser(invalidEmailInput),
          '邮箱格式无效'
        );
      });

      it('应该处理弱密码', async () => {
        // Arrange
        const weakPasswordInput = {
          ...mockRegistrationInput,
          password: '123',
          confirmPassword: '123'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockRejectedValue(
            new Error('密码强度不足')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.registerUser(weakPasswordInput),
          '密码强度不足'
        );
      });
    });

    describe('边界情况', () => {
      it('应该处理最小长度的用户名', async () => {
        // Arrange
        const minUsernameInput = {
          ...mockRegistrationInput,
          username: 'ab' // 最小长度
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockResolvedValue({
            ...mockRegistrationResult,
            user: { ...mockRegisteredUser, username: 'ab' }
          })
        });

        // Act
        const result = await mockAuthService.registerUser(minUsernameInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.user.username).toBe('ab');
      });

      it('应该处理最大长度的用户名', async () => {
        // Arrange
        const maxUsername = 'a'.repeat(50); // 假设最大长度为50
        const maxUsernameInput = {
          ...mockRegistrationInput,
          username: maxUsername
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockResolvedValue({
            ...mockRegistrationResult,
            user: { ...mockRegisteredUser, username: maxUsername }
          })
        });

        // Act
        const result = await mockAuthService.registerUser(maxUsernameInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.user.username).toBe(maxUsername);
      });

      it('应该处理特殊字符的用户名', async () => {
        // Arrange
        const specialUsernameInput = {
          ...mockRegistrationInput,
          username: 'user_123-test'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          registerUser: jest.fn().mockResolvedValue({
            ...mockRegistrationResult,
            user: { ...mockRegisteredUser, username: 'user_123-test' }
          })
        });

        // Act
        const result = await mockAuthService.registerUser(specialUsernameInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.user.username).toBe('user_123-test');
      });
    });
  });

  describe('数据验证', () => {
    it('应该验证注册结果的完整性', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        registerUser: jest.fn().mockResolvedValue(mockRegistrationResult)
      });

      // Act
      const result = await mockAuthService.registerUser(mockRegistrationInput);

      // Assert
      TestAssertions.assertValidRegistrationResult(result);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('username');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('userLevel');
      expect(result.user).toHaveProperty('approvalStatus');
    });

    it('应该正确处理中文错误消息', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        registerUser: jest.fn().mockRejectedValue(
          new Error('注册失败：用户名包含非法字符')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockAuthService.registerUser(mockRegistrationInput),
        /注册失败/
      );
    });
  });

  describe('性能和可靠性测试', () => {
    it('应该在合理时间内完成注册', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        registerUser: jest.fn().mockResolvedValue(mockRegistrationResult)
      });

      // Act
      const startTime = Date.now();
      const result = await mockAuthService.registerUser(mockRegistrationInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertResponseTime(startTime, 200); // 200ms内完成
    });

    it('应该正确处理并发注册请求', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        registerUser: jest.fn()
          .mockResolvedValueOnce(mockRegistrationResult)
          .mockRejectedValueOnce(new Error('用户名已存在'))
      });

      const input1 = { ...mockRegistrationInput, username: 'user1' };
      const input2 = { ...mockRegistrationInput, username: 'user1' }; // 相同用户名

      // Act
      const [result1, result2] = await Promise.allSettled([
        mockAuthService.registerUser(input1),
        mockAuthService.registerUser(input2)
      ]);

      // Assert
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('rejected');
      TestHelpers.verifyMockCallTimes(mockAuthService.registerUser, 2);
    });
  });
});
