/**
 * @fileoverview 审批历史和统计功能测试
 * @description 测试审批历史记录和统计信息的各种场景
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

// @ts-expect-error - 忽略测试文件中的类型检查问题

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { userApprovalRouter } from '../user-approval';

// 定义类型
interface ApprovalStatistics {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  averageProcessingTime: number;
  approvalRate: number;
  rejectionRate: number;
  pendingOlderThan24h: number;
  pendingOlderThan72h: number;
  recentActivity: Array<{
    date: string;
    approved: number;
    rejected: number;
  }>;
}

// Mock dependencies
const mockApprovalAuditLogger = {
  getApprovalHistory: jest.fn(),
  getApprovalStatistics: jest.fn(),
};

jest.mock('@/lib/approval/approval-audit-logger', () => ({
  ApprovalAuditLogger: mockApprovalAuditLogger,
}));

// 创建增强的Mock上下文函数
function createMockContext(userLevel: string = 'ADMIN') {
  const baseContext = global.createMockContext({ userLevel });
  return {
    ...baseContext,
    session: {
      ...baseContext.session,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: {
        ...baseContext.session.user,
        isVerified: true,
        canPublish: true,
        approvalStatus: 'APPROVED',
      },
    },
  };
}

describe('审批历史和统计功能', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 设置默认Mock实现
    mockApprovalAuditLogger.getApprovalHistory = jest.fn();
    mockApprovalAuditLogger.getApprovalStatistics = jest.fn();
  });

  describe('getApprovalHistory', () => {
    it('应该返回审批历史记录', async () => {
      const mockHistory = {
        logs: [
          {
            id: 'history-1',
            action: 'APPROVE_USER',
            userId: 'user-1',
            adminId: 'admin-1',
            adminName: 'Admin User',
            timestamp: new Date(),
            details: { reason: '符合要求' },
          },
          {
            id: 'history-2',
            action: 'REJECT_USER',
            userId: 'user-2',
            adminId: 'admin-1',
            adminName: 'Admin User',
            timestamp: new Date(),
            details: { reason: '不符合要求' },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          hasMore: false,
        },
      };

      mockApprovalAuditLogger.getApprovalHistory.mockResolvedValue(mockHistory);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const input = {
        page: 1,
        limit: 20,
      };

      const result = await caller.getApprovalHistory(input);

      expect(result).toEqual(mockHistory);
      expect(mockApprovalAuditLogger.getApprovalHistory).toHaveBeenCalledWith(input);
    });

    it('应该支持按用户ID筛选', async () => {
      const mockHistory = {
        logs: [
          {
            id: 'history-1',
            action: 'APPROVE_USER',
            userId: 'user-123',
            adminId: 'admin-1',
            adminName: 'Admin User',
            timestamp: new Date(),
            details: { reason: '符合要求' },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: false,
        },
      };

      mockApprovalAuditLogger.getApprovalHistory.mockResolvedValue(mockHistory);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const input = {
        userId: 'user-123',
        page: 1,
        limit: 20,
      };

      const result = await caller.getApprovalHistory(input);

      expect(result).toEqual(mockHistory);
      expect(mockApprovalAuditLogger.getApprovalHistory).toHaveBeenCalledWith(input);
    });

    it('应该支持按管理员ID筛选', async () => {
      const mockHistory = {
        logs: [
          {
            id: 'history-1',
            action: 'APPROVE_USER',
            userId: 'user-1',
            adminId: 'admin-123',
            adminName: 'Specific Admin',
            timestamp: new Date(),
            details: { reason: '符合要求' },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: false,
        },
      };

      mockApprovalAuditLogger.getApprovalHistory.mockResolvedValue(mockHistory);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const input = {
        adminId: 'admin-123',
        page: 1,
        limit: 20,
      };

      const result = await caller.getApprovalHistory(input);

      expect(result).toEqual(mockHistory);
      expect(mockApprovalAuditLogger.getApprovalHistory).toHaveBeenCalledWith(input);
    });

    it('应该支持按操作类型筛选', async () => {
      const mockHistory = {
        logs: [
          {
            id: 'history-1',
            action: 'APPROVE_USER',
            userId: 'user-1',
            adminId: 'admin-1',
            adminName: 'Admin User',
            timestamp: new Date(),
            details: { reason: '符合要求' },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          hasMore: false,
        },
      };

      mockApprovalAuditLogger.getApprovalHistory.mockResolvedValue(mockHistory);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const input = {
        action: 'APPROVE_USER' as const,
        page: 1,
        limit: 20,
      };

      const result = await caller.getApprovalHistory(input);

      expect(result).toEqual(mockHistory);
      expect(mockApprovalAuditLogger.getApprovalHistory).toHaveBeenCalledWith(input);
    });

    it('应该支持日期范围筛选', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const mockHistory = {
        logs: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false,
        },
      };

      mockApprovalAuditLogger.getApprovalHistory.mockResolvedValue(mockHistory);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const input = {
        startDate,
        endDate,
        page: 1,
        limit: 20,
      };

      const result = await caller.getApprovalHistory(input);

      expect(result).toEqual(mockHistory);
      expect(mockApprovalAuditLogger.getApprovalHistory).toHaveBeenCalledWith(input);
    });

    it('应该验证分页参数', async () => {
      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      // 测试无效的limit值
      await expect(caller.getApprovalHistory({
        page: 1,
        limit: 150, // 超出限制
      })).rejects.toThrow();
    });
  });

  describe('getApprovalStatisticsEnhanced', () => {
    it('应该返回审批统计信息', async () => {
      const mockStats: ApprovalStatistics = {
        totalPending: 10,
        totalApproved: 50,
        totalRejected: 5,
        averageProcessingTime: 24.5,
        approvalRate: 90.9,
        rejectionRate: 9.1,
        pendingOlderThan24h: 3,
        pendingOlderThan72h: 1,
        recentActivity: [
          { date: '2023-07-01', approved: 5, rejected: 1 },
          { date: '2023-07-02', approved: 3, rejected: 0 },
        ],
      };

      mockApprovalAuditLogger.getApprovalStatistics.mockResolvedValue(mockStats);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const result = await caller.getApprovalStatisticsEnhanced();

      expect(result).toEqual(mockStats);
      expect(mockApprovalAuditLogger.getApprovalStatistics).toHaveBeenCalledWith({});
    });

    it('应该支持日期范围查询', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-12-31');

      const mockStats: ApprovalStatistics = {
        totalPending: 5,
        totalApproved: 25,
        totalRejected: 2,
        averageProcessingTime: 18.2,
        approvalRate: 92.6,
        rejectionRate: 7.4,
        pendingOlderThan24h: 1,
        pendingOlderThan72h: 0,
        recentActivity: [],
      };

      mockApprovalAuditLogger.getApprovalStatistics.mockResolvedValue(mockStats);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const dateRange = { startDate, endDate };
      const result = await caller.getApprovalStatisticsEnhanced(dateRange);

      expect(result).toEqual(mockStats);
      expect(mockApprovalAuditLogger.getApprovalStatistics).toHaveBeenCalledWith(dateRange);
    });
  });

  describe('错误处理', () => {
    it('应该在获取历史记录失败时抛出错误', async () => {
      mockApprovalAuditLogger.getApprovalHistory.mockRejectedValue(new Error('Database error'));

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.getApprovalHistory({
        page: 1,
        limit: 20,
      })).rejects.toThrow();
    });

    it('应该在获取统计信息失败时抛出错误', async () => {
      mockApprovalAuditLogger.getApprovalStatistics.mockRejectedValue(new Error('Database error'));

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.getApprovalStatisticsEnhanced()).rejects.toThrow();
    });
  });

  describe('权限验证', () => {
    it('应该要求管理员权限才能查看历史记录', async () => {
      const mockContext = createMockContext('USER'); // 非管理员用户
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.getApprovalHistory({
        page: 1,
        limit: 20,
      })).rejects.toThrow();
    });

    it('应该要求管理员权限才能查看统计信息', async () => {
      const mockContext = createMockContext('USER'); // 非管理员用户
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.getApprovalStatisticsEnhanced()).rejects.toThrow();
    });
  });
});
