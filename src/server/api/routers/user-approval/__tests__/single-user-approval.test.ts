/**
 * @fileoverview 单用户审批功能测试
 * @description 测试单个用户审批的各种场景
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

// 测试文件 - 单用户审批功能测试

import { describe, it, expect, beforeEach } from '@jest/globals';
import { processSingleUserApproval } from '../approval-handler';
import {
  createMockContext,
  createMockUser,
  createMockRequest,
  createApprovalInput,
  setupBasicMocks,
  expectApprovalResult,
  mockNotificationHandlers,
} from './test-utils';

describe('单用户审批功能', () => {
  let mockContext: any;
  let mockPrisma: any;

  beforeEach(() => {
    // 创建Mock上下文
    mockContext = createMockContext('ADMIN');
    mockPrisma = mockContext.prisma;

    // 设置基础Mock
    setupBasicMocks(mockContext);
  });

  describe('processSingleUserApproval - 成功场景', () => {
    it('应该成功审批通过用户', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        approvalStatus: 'PENDING',
        userLevel: 'USER',
      });

      const mockUpdatedUser = {
        ...mockUser,
        approvalStatus: 'APPROVED',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrisma.userApprovalLog.create.mockResolvedValue({});

      const input = createApprovalInput();
      const request = createMockRequest();

      const result = await processSingleUserApproval(
        mockContext.db,
        request,
        input.userId,
        input.action,
        input.reason,
        input.notifyUser,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectApprovalResult(result, {
        success: true,
        message: '用户审核成功',
        user: { approvalStatus: 'APPROVED' },
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: input.userId },
        select: expect.any(Object),
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: input.userId },
        data: expect.objectContaining({
          approvalStatus: 'APPROVED',
          approvedAt: expect.any(Date),
          approvedBy: mockContext.session.user.id,
        }),
      });

      expect(mockPrisma.userApprovalLog.create).toHaveBeenCalled();
      expect(mockNotificationHandlers.sendUserApprovalNotification).toHaveBeenCalled();
    });

    it('应该成功拒绝用户', async () => {
      const mockUser = createMockUser();
      const mockUpdatedUser = {
        ...mockUser,
        approvalStatus: 'REJECTED',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrisma.userApprovalLog.create.mockResolvedValue({});

      const input = createApprovalInput({
        action: 'REJECT',
        reason: '不符合要求',
      });
      const request = createMockRequest();

      const result = await processSingleUserApproval(
        mockContext.db,
        request,
        input.userId,
        input.action,
        input.reason,
        input.notifyUser,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectApprovalResult(result, {
        success: true,
        message: '用户审核成功',
        user: { approvalStatus: 'REJECTED' },
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: input.userId },
        data: expect.objectContaining({
          approvalStatus: 'REJECTED',
          rejectedAt: expect.any(Date),
          rejectedBy: mockContext.session.user.id,
          rejectionReason: input.reason,
        }),
      });
    });

    it('应该在不通知时跳过通知发送', async () => {
      const mockUser = createMockUser();
      const mockUpdatedUser = {
        ...mockUser,
        approvalStatus: 'APPROVED',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrisma.userApprovalLog.create.mockResolvedValue({});

      const input = createApprovalInput({
        notifyUser: false,
      });
      const request = createMockRequest();

      await processSingleUserApproval(
        mockContext.db,
        request,
        input.userId,
        input.action,
        input.reason,
        input.notifyUser,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expect(mockNotificationHandlers.sendUserApprovalNotification).not.toHaveBeenCalled();
    });
  });

  describe('processSingleUserApproval - 错误场景', () => {
    it('应该在用户不存在时抛出错误', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const input = createApprovalInput();
      const request = createMockRequest();

      await expect(
        processSingleUserApproval(
          mockContext.db,
          request,
          input.userId,
          input.action,
          input.reason,
          input.notifyUser,
          mockContext.session.user.id,
          mockContext.session.user.userLevel
        )
      ).rejects.toThrow();

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockNotificationHandlers.sendUserApprovalNotification).not.toHaveBeenCalled();
    });

    it('应该在用户已被审批时抛出错误', async () => {
      const mockUser = createMockUser({
        approvalStatus: 'APPROVED',
      });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const input = createApprovalInput();
      const request = createMockRequest();

      await expect(
        processSingleUserApproval(
          mockContext.db,
          request,
          input.userId,
          input.action,
          input.reason,
          input.notifyUser,
          mockContext.session.user.id,
          mockContext.session.user.userLevel
        )
      ).rejects.toThrow();

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('应该在数据库更新失败时抛出错误', async () => {
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'));

      const input = createApprovalInput();
      const request = createMockRequest();

      await expect(
        processSingleUserApproval(
          mockContext.db,
          request,
          input.userId,
          input.action,
          input.reason,
          input.notifyUser,
          mockContext.session.user.id,
          mockContext.session.user.userLevel
        )
      ).rejects.toThrow();

      expect(mockNotificationHandlers.sendUserApprovalNotification).not.toHaveBeenCalled();
    });

    it('应该在权限不足时抛出错误', async () => {
      // 创建非管理员用户上下文
      const userContext = createMockContext('USER');
      const mockUser = createMockUser();

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const input = createApprovalInput();
      const request = createMockRequest();

      await expect(
        processSingleUserApproval(
          userContext.db,
          request,
          input.userId,
          input.action,
          input.reason,
          input.notifyUser,
          userContext.session.user.id,
          userContext.session.user.userLevel
        )
      ).rejects.toThrow();

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('processSingleUserApproval - 边界情况', () => {
    it('应该处理空的审批原因', async () => {
      const mockUser = createMockUser();
      const mockUpdatedUser = {
        ...mockUser,
        approvalStatus: 'APPROVED',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrisma.userApprovalLog.create.mockResolvedValue({});

      const input = createApprovalInput({
        reason: undefined,
      });
      const request = createMockRequest();

      const result = await processSingleUserApproval(
        mockContext.db,
        request,
        input.userId,
        input.action,
        input.reason,
        input.notifyUser,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectApprovalResult(result, {
        success: true,
        message: '用户审核成功',
      });
    });

    it('应该处理长审批原因', async () => {
      const mockUser = createMockUser();
      const mockUpdatedUser = {
        ...mockUser,
        approvalStatus: 'APPROVED',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      mockPrisma.userApprovalLog.create.mockResolvedValue({});

      const longReason = 'A'.repeat(1000); // 长原因
      const input = createApprovalInput({
        reason: longReason,
      });
      const request = createMockRequest();

      const result = await processSingleUserApproval(
        mockContext.db,
        request,
        input.userId,
        input.action,
        input.reason,
        input.notifyUser,
        mockContext.session.user.id,
        mockContext.session.user.userLevel
      );

      expectApprovalResult(result, {
        success: true,
        message: '用户审核成功',
      });
    });
  });
});
