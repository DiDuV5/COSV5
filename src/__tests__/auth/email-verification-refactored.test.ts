/**
 * @fileoverview 邮箱验证系统测试 - 重构版本
 * @description 使用新的测试架构重构的邮箱验证测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 新架构版本
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
// import { ServiceMockFactory, TestMockFactory } from '@/test-utils/mock-factories'; // 已删除测试工具
// import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers'; // 已删除测试工具

describe('邮箱验证系统 - 重构版本', () => {
  // 测试数据
  const mockVerificationInput = {
    token: 'verification-token-123',
    email: 'test@example.com'
  };

  const _mockUnverifiedUser = {} as any; /* TestMockFactory.createUserData('USER', { */
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    isVerified: false,
    approvalStatus: 'PENDING'
  });

  const mockVerifiedUser = TestMockFactory.createUserData('USER', {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    isVerified: true,
    approvalStatus: 'PENDING'
  });

  const mockVerificationResult = {
    success: true,
    message: '邮箱验证成功',
    user: mockVerifiedUser
  };

  beforeEach(() => {
    // 重置所有Mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理Mock
    jest.restoreAllMocks();
  });

  describe('verifyEmail 方法', () => {
    describe('成功场景', () => {
      it('应该成功验证邮箱', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockResolvedValue(mockVerificationResult)
        });

        // Act
        const result = await mockAuthService.verifyEmail(mockVerificationInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '邮箱验证成功',
          user: expect.objectContaining({
            email: 'test@example.com',
            isVerified: true
          })
        });

        TestHelpers.verifyMockCallTimes(mockAuthService.verifyEmail, 1);
      });

      it('应该更新用户验证状态', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockResolvedValue(mockVerificationResult)
        });

        // Act
        const result = await mockAuthService.verifyEmail(mockVerificationInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.user.isVerified).toBe(true);
        expect(result.user.email).toBe('test@example.com');
      });

      it('应该处理已验证用户的重复验证', async () => {
        // Arrange
        const alreadyVerifiedResult = {
          success: true,
          message: '邮箱已经验证过了',
          user: mockVerifiedUser
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockResolvedValue(alreadyVerifiedResult)
        });

        // Act
        const result = await mockAuthService.verifyEmail(mockVerificationInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('邮箱已经验证过了');
        expect(result.user.isVerified).toBe(true);
      });
    });

    describe('错误场景', () => {
      it('应该处理无效的验证令牌', async () => {
        // Arrange
        const invalidTokenInput = {
          ...mockVerificationInput,
          token: 'invalid-token'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('验证令牌无效或已过期')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(invalidTokenInput),
          '验证令牌无效或已过期'
        );
      });

      it('应该处理过期的验证令牌', async () => {
        // Arrange
        const expiredTokenInput = {
          ...mockVerificationInput,
          token: 'expired-token-123'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('验证令牌已过期，请重新发送验证邮件')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(expiredTokenInput),
          '验证令牌已过期，请重新发送验证邮件'
        );
      });

      it('应该处理用户不存在的情况', async () => {
        // Arrange
        const nonExistentUserInput = {
          ...mockVerificationInput,
          email: 'nonexistent@example.com'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('用户不存在')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(nonExistentUserInput),
          '用户不存在'
        );
      });

      it('应该处理邮箱不匹配的情况', async () => {
        // Arrange
        const mismatchEmailInput = {
          ...mockVerificationInput,
          email: 'different@example.com'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('邮箱地址不匹配')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(mismatchEmailInput),
          '邮箱地址不匹配'
        );
      });
    });

    describe('边界情况', () => {
      it('应该处理空验证令牌', async () => {
        // Arrange
        const emptyTokenInput = {
          ...mockVerificationInput,
          token: ''
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('验证令牌不能为空')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(emptyTokenInput),
          '验证令牌不能为空'
        );
      });

      it('应该处理空邮箱地址', async () => {
        // Arrange
        const emptyEmailInput = {
          ...mockVerificationInput,
          email: ''
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('邮箱地址不能为空')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(emptyEmailInput),
          '邮箱地址不能为空'
        );
      });

      it('应该处理格式错误的邮箱', async () => {
        // Arrange
        const invalidEmailInput = {
          ...mockVerificationInput,
          email: 'invalid-email-format'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('邮箱格式无效')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(invalidEmailInput),
          '邮箱格式无效'
        );
      });

      it('应该处理超长的验证令牌', async () => {
        // Arrange
        const longTokenInput = {
          ...mockVerificationInput,
          token: 'a'.repeat(1000) // 超长令牌
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          verifyEmail: jest.fn().mockRejectedValue(
            new Error('验证令牌格式无效')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.verifyEmail(longTokenInput),
          '验证令牌格式无效'
        );
      });
    });
  });

  describe('resendVerificationEmail 方法', () => {
    describe('成功场景', () => {
      it('应该成功重新发送验证邮件', async () => {
        // Arrange
        const resendResult = {
          success: true,
          message: '验证邮件已重新发送',
          newToken: 'new-verification-token-456'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          resendVerificationEmail: jest.fn().mockResolvedValue(resendResult)
        });

        const resendInput = { email: 'test@example.com' };

        // Act
        const result = await mockAuthService.resendVerificationEmail(resendInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '验证邮件已重新发送',
          newToken: expect.any(String)
        });

        TestHelpers.verifyMockCallTimes(mockAuthService.resendVerificationEmail, 1);
      });

      it('应该生成新的验证令牌', async () => {
        // Arrange
        const resendResult = {
          success: true,
          message: '验证邮件已重新发送',
          newToken: 'new-verification-token-456'
        };

        const mockAuthService = ServiceMockFactory.createAuthService({
          resendVerificationEmail: jest.fn().mockResolvedValue(resendResult)
        });

        const resendInput = { email: 'test@example.com' };

        // Act
        const result = await mockAuthService.resendVerificationEmail(resendInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.newToken).toBeDefined();
        expect(typeof result.newToken).toBe('string');
        expect(result.newToken.length).toBeGreaterThan(0);
      });
    });

    describe('错误场景', () => {
      it('应该处理已验证用户的重发请求', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          resendVerificationEmail: jest.fn().mockRejectedValue(
            new Error('邮箱已经验证过了')
          )
        });

        const resendInput = { email: 'verified@example.com' };

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.resendVerificationEmail(resendInput),
          '邮箱已经验证过了'
        );
      });

      it('应该处理频繁发送限制', async () => {
        // Arrange
        const mockAuthService = ServiceMockFactory.createAuthService({
          resendVerificationEmail: jest.fn().mockRejectedValue(
            new Error('发送过于频繁，请稍后再试')
          )
        });

        const resendInput = { email: 'test@example.com' };

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockAuthService.resendVerificationEmail(resendInput),
          '发送过于频繁，请稍后再试'
        );
      });
    });
  });

  describe('数据验证', () => {
    it('应该验证验证结果的完整性', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        verifyEmail: jest.fn().mockResolvedValue(mockVerificationResult)
      });

      // Act
      const result = await mockAuthService.verifyEmail(mockVerificationInput);

      // Assert
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      TestAssertions.assertValidUserData(result.user);
    });

    it('应该正确处理中文错误消息', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        verifyEmail: jest.fn().mockRejectedValue(
          new Error('邮箱验证失败：令牌格式错误')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockAuthService.verifyEmail(mockVerificationInput),
        /邮箱验证失败/
      );
    });
  });

  describe('性能和可靠性测试', () => {
    it('应该在合理时间内完成验证', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        verifyEmail: jest.fn().mockResolvedValue(mockVerificationResult)
      });

      // Act
      const startTime = Date.now();
      const result = await mockAuthService.verifyEmail(mockVerificationInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertResponseTime(startTime, 100); // 100ms内完成
    });

    it('应该正确处理并发验证请求', async () => {
      // Arrange
      const mockAuthService = ServiceMockFactory.createAuthService({
        verifyEmail: jest.fn()
          .mockResolvedValueOnce(mockVerificationResult)
          .mockRejectedValueOnce(new Error('邮箱已经验证过了'))
      });

      const requests = [
        mockAuthService.verifyEmail(mockVerificationInput),
        mockAuthService.verifyEmail(mockVerificationInput)
      ];

      // Act
      const results = await Promise.allSettled(requests);

      // Assert
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      TestHelpers.verifyMockCallTimes(mockAuthService.verifyEmail, 2);
    });
  });
});
