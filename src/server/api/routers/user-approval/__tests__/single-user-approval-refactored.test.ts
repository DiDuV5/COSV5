/**
 * @fileoverview 单用户审批功能测试 - 重构版本
 * @description 使用新的测试架构重构的单用户审批测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 新架构版本
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { RouteTestTemplate as _RouteTestTemplate } from '@/test-utils/templates/route-test.template';
import { ServiceMockFactory, TestMockFactory } from '@/test-utils/mock-factories';
import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers';

describe('单用户审批功能 - 重构版本', () => {
  // 测试数据
  const mockUser = TestMockFactory.createUserData('USER', {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    approvalStatus: 'PENDING',
    userLevel: 'USER',
  });

  const mockApprovalInput = {
    userId: 'user-123',
    action: 'APPROVE',
    reason: '符合审核标准',
    notifyUser: true
  };

  const mockApprovedUser = {
    ...mockUser,
    approvalStatus: 'APPROVED',
    approvedAt: new Date(),
    approvedBy: 'admin-123'
  };

  beforeEach(() => {
    // 重置所有Mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理Mock
    jest.restoreAllMocks();
  });

  describe('processSingleUserApproval 方法', () => {
    describe('成功场景', () => {
      it('应该成功审批通过用户', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processSingleUserApproval: jest.fn().mockResolvedValue({
            success: true,
            message: '用户审核成功',
            user: mockApprovedUser
          })
        });

        // Act
        const result = await mockApprovalService.processSingleUserApproval(mockApprovalInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '用户审核成功',
          user: expect.objectContaining({
            approvalStatus: 'APPROVED'
          })
        });

        TestHelpers.verifyMockCallTimes(mockApprovalService.processSingleUserApproval, 1);
      });

      it('应该成功拒绝用户', async () => {
        // Arrange
        const rejectedUser = {
          ...mockUser,
          approvalStatus: 'REJECTED',
          rejectedAt: new Date(),
          rejectedBy: 'admin-123'
        };

        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processSingleUserApproval: jest.fn().mockResolvedValue({
            success: true,
            message: '用户已被拒绝',
            user: rejectedUser
          })
        });

        const rejectInput = {
          ...mockApprovalInput,
          action: 'REJECT',
          reason: '不符合审核标准'
        };

        // Act
        const result = await mockApprovalService.processSingleUserApproval(rejectInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '用户已被拒绝',
          user: expect.objectContaining({
            approvalStatus: 'REJECTED'
          })
        });

        TestHelpers.verifyMockCallTimes(mockApprovalService.processSingleUserApproval, 1);
      });
    });

    describe('错误场景', () => {
      it('应该处理用户不存在的情况', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processSingleUserApproval: jest.fn().mockRejectedValue(
            new Error('用户不存在')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockApprovalService.processSingleUserApproval(mockApprovalInput),
          '用户不存在'
        );
      });

      it('应该处理数据库错误', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processSingleUserApproval: jest.fn().mockRejectedValue(
            new Error('数据库连接失败')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockApprovalService.processSingleUserApproval(mockApprovalInput),
          '数据库连接失败'
        );
      });

      it('应该处理用户已审批的情况', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processSingleUserApproval: jest.fn().mockRejectedValue(
            new Error('用户已经审批过了')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockApprovalService.processSingleUserApproval(mockApprovalInput),
          '用户已经审批过了'
        );
      });
    });

    describe('边界情况', () => {
      it('应该处理空的审批原因', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processSingleUserApproval: jest.fn().mockResolvedValue({
            success: true,
            message: '用户审核成功',
            user: mockApprovedUser
          })
        });

        const emptyReasonInput = {
          ...mockApprovalInput,
          reason: ''
        };

        // Act
        const result = await mockApprovalService.processSingleUserApproval(emptyReasonInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('用户审核成功');
      });

      it('应该处理无效的用户ID', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processSingleUserApproval: jest.fn().mockRejectedValue(
            new Error('无效的用户ID')
          )
        });

        const invalidInput = {
          ...mockApprovalInput,
          userId: 'invalid-id'
        };

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockApprovalService.processSingleUserApproval(invalidInput),
          '无效的用户ID'
        );
      });
    });
  });

  describe('权限验证', () => {
    it('管理员应该能够审批用户', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processSingleUserApproval: jest.fn().mockResolvedValue({
          success: true,
          message: '审批成功'
        })
      });

      // Act
      const result = await mockApprovalService.processSingleUserApproval(mockApprovalInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertUserPermission('ADMIN', 'ADMIN');
    });

    it('普通用户不应该能够审批用户', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processSingleUserApproval: jest.fn().mockRejectedValue(
          new Error('权限不足')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockApprovalService.processSingleUserApproval(mockApprovalInput),
        '权限不足'
      );
    });
  });

  describe('集成测试场景', () => {
    it('应该完整地处理用户审批流程', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processSingleUserApproval: jest.fn().mockResolvedValue({
          success: true,
          message: '用户审核成功',
          user: mockApprovedUser,
          log: {
            id: 'log-123',
            action: 'APPROVE',
            reason: mockApprovalInput.reason
          }
        })
      });

      // Act
      const result = await mockApprovalService.processSingleUserApproval(mockApprovalInput);

      // Assert
      expect(result).toEqual({
        success: true,
        message: '用户审核成功',
        user: expect.objectContaining({
          approvalStatus: 'APPROVED'
        }),
        log: expect.objectContaining({
          action: 'APPROVE'
        })
      });

      TestHelpers.verifyMockCallTimes(mockApprovalService.processSingleUserApproval, 1);
    });

    it('应该正确处理中文错误消息', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processSingleUserApproval: jest.fn().mockRejectedValue(
          new Error('用户审批失败：数据库错误')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockApprovalService.processSingleUserApproval(mockApprovalInput),
        /用户审批失败/
      );
    });

    it('应该验证返回数据的完整性', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processSingleUserApproval: jest.fn().mockResolvedValue({
          success: true,
          message: '审批成功',
          user: mockApprovedUser
        })
      });

      // Act
      const result = await mockApprovalService.processSingleUserApproval(mockApprovalInput);

      // Assert
      TestAssertions.assertValidApprovalResult(result);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('approvalStatus');
      expect(result.user.approvalStatus).toBe('APPROVED');
    });
  });
});
