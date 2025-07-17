/**
 * @fileoverview 批量用户审批功能测试
 * @description 测试批量用户审批的各种场景
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

// @ts-expect-error - 忽略测试文件中的类型检查问题

import { describe, it, expect, beforeEach } from '@jest/globals';
import { processBatchUserApproval } from '../approval-handler';
import {
  createMockContext,
  createMockUsers,
  createMockRequest,
  createBatchApprovalInput,
  setupBasicMocks,
  expectBatchApprovalResult,
  mockNotificationHandlers,
} from './test-utils';

describe('批量用户审批功能', () => {
  let mockContext: any;
  let mockPrisma: any;

  beforeEach(() => {
    // 创建Mock上下文
    mockContext = createMockContext('ADMIN');
    mockPrisma = mockContext.prisma;

    // 设置基础Mock
    setupBasicMocks(mockContext);
  });

  describe('processBatchUserApproval - 成功场景', () => {
    it('应该成功批量审批用户', async () => {
      const mockUsers = createMockUsers(3);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            updateMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
          userApprovalLog: {
            createMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
        });
      });

      const input = createBatchApprovalInput();
      const request = createMockRequest();

      const result = await processBatchUserApproval(
        mockContext.db,
        request,
        input.userIds,
        input.action,
        input.reason,
        input.notifyUsers,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectBatchApprovalResult(result, {
        success: true,
        message: '批量审核完成',
        processedCount: 3,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: input.userIds },
          approvalStatus: 'PENDING',
        },
        select: expect.any(Object),
      });

      expect(mockNotificationHandlers.sendBatchUserApprovalNotifications).toHaveBeenCalled();
    });

    it('应该成功批量拒绝用户', async () => {
      const mockUsers = createMockUsers(2);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          userApprovalLog: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        });
      });

      const input = createBatchApprovalInput({
        action: 'REJECT',
        reason: '批量拒绝',
      });
      const request = createMockRequest();

      const result = await processBatchUserApproval(
        mockContext.db,
        request,
        input.userIds.slice(0, 2), // 只处理前两个用户
        input.action,
        input.reason,
        input.notifyUsers,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectBatchApprovalResult(result, {
        success: true,
        message: '批量审核完成',
        processedCount: 2,
      });
    });

    it('应该在不通知时跳过通知发送', async () => {
      const mockUsers = createMockUsers(2);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          userApprovalLog: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        });
      });

      const input = createBatchApprovalInput({
        notifyUsers: false,
      });
      const request = createMockRequest();

      await processBatchUserApproval(
        mockContext.db,
        request,
        input.userIds.slice(0, 2),
        input.action,
        input.reason,
        input.notifyUsers,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expect(mockNotificationHandlers.sendBatchUserApprovalNotifications).not.toHaveBeenCalled();
    });
  });

  describe('processBatchUserApproval - 错误场景', () => {
    it('应该在没有待审批用户时抛出错误', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const input = createBatchApprovalInput();
      const request = createMockRequest();

      await expect(
        processBatchUserApproval(
          mockContext.db,
          request,
          input.userIds,
          input.action,
          input.reason,
          input.notifyUsers,
          mockContext.session.user.id,
          mockContext.session.user.userLevel
        )
      ).rejects.toThrow();

      expect(mockNotificationHandlers.sendBatchUserApprovalNotifications).not.toHaveBeenCalled();
    });

    it('应该在批量操作超出限制时抛出错误', async () => {
      const largeUserIds = Array.from({ length: 60 }, (_, i) => `user-${i + 1}`);

      const input = createBatchApprovalInput({
        userIds: largeUserIds,
      });
      const request = createMockRequest();

      await expect(
        processBatchUserApproval(
          mockContext.db,
          request,
          input.userIds,
          input.action,
          input.reason,
          input.notifyUsers,
          mockContext.session.user.id,
          mockContext.session.user.userLevel
        )
      ).rejects.toThrow();
    });

    it('应该在事务失败时抛出错误', async () => {
      const mockUsers = createMockUsers(2);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const input = createBatchApprovalInput();
      const request = createMockRequest();

      await expect(
        processBatchUserApproval(
          mockContext.db,
          request,
          input.userIds.slice(0, 2),
          input.action,
          input.reason,
          input.notifyUsers,
          mockContext.session.user.id,
          mockContext.session.user.userLevel
        )
      ).rejects.toThrow();

      expect(mockNotificationHandlers.sendBatchUserApprovalNotifications).not.toHaveBeenCalled();
    });

    it('应该在权限不足时抛出错误', async () => {
      // 创建非管理员用户上下文
      const userContext = createMockContext('USER');

      const input = createBatchApprovalInput();
      const request = createMockRequest();

      await expect(
        processBatchUserApproval(
          userContext.db,
          request,
          input.userIds,
          input.action,
          input.reason,
          input.notifyUsers,
          userContext.session.user.id,
          userContext.session.user.userLevel
        )
      ).rejects.toThrow();
    });
  });

  describe('processBatchUserApproval - 边界情况', () => {
    it('应该处理空的用户ID列表', async () => {
      const input = createBatchApprovalInput({
        userIds: [],
      });
      const request = createMockRequest();

      await expect(
        processBatchUserApproval(
          mockContext.db,
          request,
          input.userIds,
          input.action,
          input.reason,
          input.notifyUsers,
          mockContext.session.user.id,
          mockContext.session.user.userLevel
        )
      ).rejects.toThrow();
    });

    it('应该处理部分用户不存在的情况', async () => {
      // 只返回部分用户
      const mockUsers = createMockUsers(2);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
          userApprovalLog: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        });
      });

      const input = createBatchApprovalInput({
        userIds: ['user-1', 'user-2', 'user-nonexistent'],
      });
      const request = createMockRequest();

      const result = await processBatchUserApproval(
        mockContext.db,
        request,
        input.userIds,
        input.action,
        input.reason,
        input.notifyUsers,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectBatchApprovalResult(result, {
        success: true,
        message: '批量审核完成',
        processedCount: 2,
      });
    });

    it('应该处理单个用户的批量操作', async () => {
      const mockUsers = createMockUsers(1);

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          user: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          userApprovalLog: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        });
      });

      const input = createBatchApprovalInput({
        userIds: ['user-1'],
      });
      const request = createMockRequest();

      const result = await processBatchUserApproval(
        mockContext.db,
        request,
        input.userIds,
        input.action,
        input.reason,
        input.notifyUsers,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectBatchApprovalResult(result, {
        success: true,
        message: '批量审核完成',
        processedCount: 1,
      });
    });
  });
});
