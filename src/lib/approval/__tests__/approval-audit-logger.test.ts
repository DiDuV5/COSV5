/**
 * @fileoverview 审批审计日志系统单元测试
 * @description 测试ApprovalAuditLogger的日志记录、历史查询、统计分析功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ApprovalAuditLogger } from '../approval-audit-logger';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

import { prisma } from '@/lib/prisma';

// Mock dependencies - 全局设置已处理大部分Mock

describe('ApprovalAuditLogger', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // 获取Mock的prisma实例
    mockPrisma = prisma;
  });

  describe('logApprovalAction', () => {
    it('应该记录单个用户审批操作', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        approvalStatus: 'PENDING',
      });
      mockPrisma.approvalHistory.create.mockResolvedValue({});

      await ApprovalAuditLogger.logApprovalAction({
        action: 'APPROVE_USER',
        adminId: 'admin-123',
        adminName: 'Admin User',
        targetUserId: 'user-123',
        reason: '符合要求',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-123',
          action: 'APPROVE_USER',
          level: 'INFO',
          resource: 'user_approval',
        }),
      });

      expect(mockPrisma.approvalHistory.create).toHaveBeenCalled();
    });

    it('应该记录批量审批操作', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', approvalStatus: 'PENDING' },
        { id: 'user-2', approvalStatus: 'PENDING' },
      ]);
      mockPrisma.approvalHistory.createMany.mockResolvedValue({});

      await ApprovalAuditLogger.logApprovalAction({
        action: 'BATCH_APPROVE',
        adminId: 'admin-123',
        adminName: 'Admin User',
        targetUserIds: ['user-1', 'user-2'],
        reason: '批量审批',
        batchId: 'batch-123',
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(mockPrisma.approvalHistory.createMany).toHaveBeenCalled();
    });

    it('应该处理非用户状态变更操作', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      await ApprovalAuditLogger.logApprovalAction({
        action: 'VIEW_APPROVAL_QUEUE',
        adminId: 'admin-123',
        adminName: 'Admin User',
        details: { operation: 'view_queue' },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(mockPrisma.approvalHistory.create).not.toHaveBeenCalled();
    });

    it('应该处理记录失败但不抛出错误', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      // 应该不抛出错误
      await expect(
        ApprovalAuditLogger.logApprovalAction({
          action: 'APPROVE_USER',
          adminId: 'admin-123',
          adminName: 'Admin User',
          targetUserId: 'user-123',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getApprovalHistory', () => {
    it('应该返回审批历史记录', async () => {
      const mockRecords = [
        {
          id: 'history-1',
          userId: 'user-123',
          previousStatus: 'PENDING',
          newStatus: 'APPROVED',
          action: 'APPROVE_USER',
          adminId: 'admin-123',
          reason: '符合要求',
          timestamp: new Date(),
          batchId: null,
          user: { username: 'testuser', email: 'test@example.com' },
          admin: { username: 'admin', displayName: 'Admin User' },
        },
      ];

      mockPrisma.approvalHistory.findMany.mockResolvedValue(mockRecords);
      mockPrisma.approvalHistory.count.mockResolvedValue(1);

      const result = await ApprovalAuditLogger.getApprovalHistory({
        offset: 0,
        limit: 20,
      });

      expect(result).toEqual({
        records: expect.arrayContaining([
          expect.objectContaining({
            id: 'history-1',
            userId: 'user-123',
            username: 'testuser',
            email: 'test@example.com',
            action: 'APPROVE_USER',
            adminName: 'Admin User',
          }),
        ]),
        total: 1,
        page: 1,
        totalPages: 1,
      });
    });

    it('应该支持按用户ID过滤', async () => {
      mockPrisma.approvalHistory.findMany.mockResolvedValue([]);
      mockPrisma.approvalHistory.count.mockResolvedValue(0);

      await ApprovalAuditLogger.getApprovalHistory({
        userId: 'user-123',
      });

      expect(mockPrisma.approvalHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 20,
        include: expect.any(Object),
      });
    });

    it('应该支持按时间范围过滤', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      mockPrisma.approvalHistory.findMany.mockResolvedValue([]);
      mockPrisma.approvalHistory.count.mockResolvedValue(0);

      await ApprovalAuditLogger.getApprovalHistory({
        startDate,
        endDate,
      });

      expect(mockPrisma.approvalHistory.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 20,
        include: expect.any(Object),
      });
    });

    it('应该支持分页', async () => {
      mockPrisma.approvalHistory.findMany.mockResolvedValue([]);
      mockPrisma.approvalHistory.count.mockResolvedValue(100);

      const result = await ApprovalAuditLogger.getApprovalHistory({
        offset: 20, // (3-1) * 10
        limit: 10,
      });

      expect(mockPrisma.approvalHistory.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        skip: 20, // (3-1) * 10
        take: 10,
        include: expect.any(Object),
      });

      expect(result.total).toBe(100);
      expect(result.hasMore).toBe(true);
    });

    it('应该处理数据库错误', async () => {
      mockPrisma.approvalHistory.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        ApprovalAuditLogger.getApprovalHistory({})
      ).rejects.toThrow();
    });
  });

  describe('getApprovalStatistics', () => {
    it('应该返回审批统计信息', async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Mock各种统计查询
      mockPrisma.user.count
        .mockResolvedValueOnce(10) // totalPending
        .mockResolvedValueOnce(50) // totalApproved
        .mockResolvedValueOnce(5); // totalRejected

      mockPrisma.approvalHistory.count
        .mockResolvedValueOnce(8) // todayApproved
        .mockResolvedValueOnce(2) // todayRejected
        .mockResolvedValueOnce(1) // timeoutCount
        .mockResolvedValueOnce(3); // batchOperations

      mockPrisma.approvalHistory.findMany.mockResolvedValue([
        {
          timestamp: new Date(),
          user: { createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // 1天前创建
        },
        {
          timestamp: new Date(),
          user: { createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // 2天前创建
        },
      ]);

      const result = await ApprovalAuditLogger.getApprovalStatistics();

      expect(result).toEqual({
        totalPending: 10,
        totalApproved: 50,
        totalRejected: 5,
        todayApproved: 8,
        todayRejected: 2,
        avgProcessingTime: expect.any(Number),
        timeoutCount: 1,
        batchOperations: 3,
      });

      expect(result.averageProcessingTime).toBeGreaterThan(0);
    });

    it('应该处理空数据情况', async () => {
      // Mock所有查询返回0
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.approvalHistory.count.mockResolvedValue(0);
      mockPrisma.approvalHistory.findMany.mockResolvedValue([]);

      const result = await ApprovalAuditLogger.getApprovalStatistics();

      expect(result).toEqual({
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        todayApproved: 0,
        todayRejected: 0,
        avgProcessingTime: 0,
        timeoutCount: 0,
        batchOperations: 0,
      });
    });

    it('应该支持自定义时间范围', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.approvalHistory.count.mockResolvedValue(0);
      mockPrisma.approvalHistory.findMany.mockResolvedValue([]);

      await ApprovalAuditLogger.getApprovalStatistics({
        startDate,
        endDate,
      });

      // 验证时间范围被正确传递
      expect(mockPrisma.approvalHistory.findMany).toHaveBeenCalledWith({
        where: {
          action: { in: ['APPROVE_USER', 'REJECT_USER'] },
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: { createdAt: true },
          },
        },
      });
    });

    it('应该处理数据库错误', async () => {
      mockPrisma.user.count.mockRejectedValue(new Error('Database error'));

      await expect(
        ApprovalAuditLogger.getApprovalStatistics()
      ).rejects.toThrow();
    });
  });

  describe('cleanupOldLogs', () => {
    it('应该清理过期的审计日志', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 25 });

      const result = await ApprovalAuditLogger.cleanupOldLogs(90);

      expect(result).toEqual({ deletedCount: 25 });

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          resource: 'user_approval',
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it('应该使用默认保留期限', async () => {
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 10 });

      await ApprovalAuditLogger.cleanupOldLogs();

      // 验证使用了90天的默认值
      const call = mockPrisma.auditLog.deleteMany.mock.calls[0][0];
      const cutoffDate = call.where.createdAt.lt;
      const expectedCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // 允许1秒的误差
      expect(Math.abs(cutoffDate.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
    });

    it('应该处理数据库错误', async () => {
      mockPrisma.auditLog.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(
        ApprovalAuditLogger.cleanupOldLogs(90)
      ).rejects.toThrow();
    });
  });
});
