/**
 * @fileoverview 批量用户审批功能测试 - 重构版本
 * @description 使用新的测试架构重构的批量用户审批测试
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 新架构版本
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ServiceMockFactory, TestMockFactory } from '@/test-utils/mock-factories';
import { TestHelpers, TestAssertions } from '@/test-utils/test-helpers';

describe('批量用户审批功能 - 重构版本', () => {
  // 测试数据
  const mockUsers = [
    TestMockFactory.createUserData('USER', {
      id: 'user-1',
      username: 'testuser1',
      email: 'test1@example.com',
      approvalStatus: 'PENDING',
    }),
    TestMockFactory.createUserData('USER', {
      id: 'user-2',
      username: 'testuser2',
      email: 'test2@example.com',
      approvalStatus: 'PENDING',
    }),
    TestMockFactory.createUserData('USER', {
      id: 'user-3',
      username: 'testuser3',
      email: 'test3@example.com',
      approvalStatus: 'PENDING',
    }),
  ];

  const mockBatchApprovalInput = {
    userIds: ['user-1', 'user-2', 'user-3'],
    action: 'APPROVE',
    reason: '批量审核通过',
    notifyUsers: true
  };

  const mockBatchApprovalResult = {
    success: true,
    message: '批量审核完成',
    processed: 3,
    successful: 3,
    failed: 0,
    results: mockUsers.map(user => ({
      userId: user.id,
      success: true,
      message: '审核成功'
    }))
  };

  beforeEach(() => {
    // 重置所有Mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理Mock
    jest.restoreAllMocks();
  });

  describe('processBatchUserApproval 方法', () => {
    describe('成功场景', () => {
      it('应该成功批量审批用户', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockResolvedValue(mockBatchApprovalResult)
        });

        // Act
        const result = await mockApprovalService.processBatchUserApproval(mockBatchApprovalInput);

        // Assert
        expect(result).toEqual({
          success: true,
          message: '批量审核完成',
          processed: 3,
          successful: 3,
          failed: 0,
          results: expect.arrayContaining([
            expect.objectContaining({
              userId: 'user-1',
              success: true
            }),
            expect.objectContaining({
              userId: 'user-2',
              success: true
            }),
            expect.objectContaining({
              userId: 'user-3',
              success: true
            })
          ])
        });

        TestHelpers.verifyMockCallTimes(mockApprovalService.processBatchUserApproval, 1);
      });

      it('应该成功批量拒绝用户', async () => {
        // Arrange
        const rejectInput = {
          ...mockBatchApprovalInput,
          action: 'REJECT',
          reason: '批量拒绝'
        };

        const rejectResult = {
          ...mockBatchApprovalResult,
          message: '批量拒绝完成',
          results: mockUsers.map(user => ({
            userId: user.id,
            success: true,
            message: '拒绝成功'
          }))
        };

        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockResolvedValue(rejectResult)
        });

        // Act
        const result = await mockApprovalService.processBatchUserApproval(rejectInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('批量拒绝完成');
        expect(result.processed).toBe(3);
        expect(result.successful).toBe(3);
        expect(result.failed).toBe(0);

        TestHelpers.verifyMockCallTimes(mockApprovalService.processBatchUserApproval, 1);
      });

      it('应该处理部分成功的批量操作', async () => {
        // Arrange
        const partialSuccessResult = {
          success: true,
          message: '批量审核部分完成',
          processed: 3,
          successful: 2,
          failed: 1,
          results: [
            { userId: 'user-1', success: true, message: '审核成功' },
            { userId: 'user-2', success: true, message: '审核成功' },
            { userId: 'user-3', success: false, message: '用户不存在' }
          ]
        };

        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockResolvedValue(partialSuccessResult)
        });

        // Act
        const result = await mockApprovalService.processBatchUserApproval(mockBatchApprovalInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.processed).toBe(3);
        expect(result.successful).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.results).toHaveLength(3);

        // 验证失败的用户
        const failedResult = result.results.find((r: any) => !r.success);
        expect(failedResult).toBeDefined();
        expect(failedResult?.userId).toBe('user-3');
        expect(failedResult?.message).toBe('用户不存在');
      });
    });

    describe('错误场景', () => {
      it('应该处理空用户列表', async () => {
        // Arrange
        const emptyInput = {
          ...mockBatchApprovalInput,
          userIds: []
        };

        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockRejectedValue(
            new Error('用户列表不能为空')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockApprovalService.processBatchUserApproval(emptyInput),
          '用户列表不能为空'
        );
      });

      it('应该处理数据库事务失败', async () => {
        // Arrange
        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockRejectedValue(
            new Error('数据库事务失败')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockApprovalService.processBatchUserApproval(mockBatchApprovalInput),
          '数据库事务失败'
        );
      });

      it('应该处理无效的操作类型', async () => {
        // Arrange
        const invalidInput = {
          ...mockBatchApprovalInput,
          action: 'INVALID_ACTION'
        };

        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockRejectedValue(
            new Error('无效的操作类型')
          )
        });

        // Act & Assert
        await TestHelpers.expectAsyncError(
          () => mockApprovalService.processBatchUserApproval(invalidInput),
          '无效的操作类型'
        );
      });
    });

    describe('边界情况', () => {
      it('应该处理大量用户的批量操作', async () => {
        // Arrange
        const largeUserIds = Array.from({ length: 100 }, (_, i) => `user-${i + 1}`);
        const largeInput = {
          ...mockBatchApprovalInput,
          userIds: largeUserIds
        };

        const largeResult = {
          success: true,
          message: '大批量审核完成',
          processed: 100,
          successful: 100,
          failed: 0,
          results: largeUserIds.map(id => ({
            userId: id,
            success: true,
            message: '审核成功'
          }))
        };

        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockResolvedValue(largeResult)
        });

        // Act
        const result = await mockApprovalService.processBatchUserApproval(largeInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.processed).toBe(100);
        expect(result.successful).toBe(100);
        expect(result.failed).toBe(0);
        expect(result.results).toHaveLength(100);
      });

      it('应该处理重复的用户ID', async () => {
        // Arrange
        const duplicateInput = {
          ...mockBatchApprovalInput,
          userIds: ['user-1', 'user-1', 'user-2']
        };

        const mockApprovalService = ServiceMockFactory.createApprovalService({
          processBatchUserApproval: jest.fn().mockResolvedValue({
            success: true,
            message: '批量审核完成（已去重）',
            processed: 2,
            successful: 2,
            failed: 0,
            results: [
              { userId: 'user-1', success: true, message: '审核成功' },
              { userId: 'user-2', success: true, message: '审核成功' }
            ]
          })
        });

        // Act
        const result = await mockApprovalService.processBatchUserApproval(duplicateInput);

        // Assert
        expect(result.success).toBe(true);
        expect(result.processed).toBe(2); // 去重后只有2个用户
        expect(result.results).toHaveLength(2);
      });
    });
  });

  describe('权限验证', () => {
    it('管理员应该能够批量审批用户', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processBatchUserApproval: jest.fn().mockResolvedValue(mockBatchApprovalResult)
      });

      // Act
      const result = await mockApprovalService.processBatchUserApproval(mockBatchApprovalInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertUserPermission('ADMIN', 'ADMIN');
    });

    it('普通用户不应该能够批量审批用户', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processBatchUserApproval: jest.fn().mockRejectedValue(
          new Error('权限不足')
        )
      });

      // Act & Assert
      await TestHelpers.expectAsyncError(
        () => mockApprovalService.processBatchUserApproval(mockBatchApprovalInput),
        '权限不足'
      );
    });
  });

  describe('性能和可靠性测试', () => {
    it('应该在合理时间内完成批量操作', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processBatchUserApproval: jest.fn().mockResolvedValue(mockBatchApprovalResult)
      });

      // Act
      const startTime = Date.now();
      const result = await mockApprovalService.processBatchUserApproval(mockBatchApprovalInput);

      // Assert
      expect(result.success).toBe(true);
      TestAssertions.assertResponseTime(startTime, 100); // 100ms内完成
    });

    it('应该正确处理批量操作的统计信息', async () => {
      // Arrange
      const mockApprovalService = ServiceMockFactory.createApprovalService({
        processBatchUserApproval: jest.fn().mockResolvedValue(mockBatchApprovalResult)
      });

      // Act
      const result = await mockApprovalService.processBatchUserApproval(mockBatchApprovalInput);

      // Assert
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('results');
      expect(typeof result.processed).toBe('number');
      expect(typeof result.successful).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(Array.isArray(result.results)).toBe(true);

      // 验证统计数据的一致性
      expect(result.processed).toBe(result.successful + result.failed);
      expect(result.results).toHaveLength(result.processed);
    });
  });
});
