/**
 * @fileoverview 审批超时管理器单元测试
 * @description 测试ApprovalTimeoutManager的超时检测、自动处理、通知机制
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ApprovalTimeoutManager, TimeoutScheduler } from '../approval-timeout-manager';
import { ApprovalConfigManager } from '../approval-config-manager';
import { ApprovalAuditLogger } from '../approval-audit-logger';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('../approval-config-manager', () => ({
  ApprovalConfigManager: {
    getConfig: jest.fn(),
  },
}));

jest.mock('../approval-audit-logger', () => ({
  ApprovalAuditLogger: {
    logApprovalAction: jest.fn(),
  },
}));

const mockApprovalConfigManager = {
  getConfig: jest.fn() as jest.MockedFunction<typeof ApprovalConfigManager.getConfig>,
};

const mockApprovalAuditLogger = {
  logApprovalAction: jest.fn() as jest.MockedFunction<typeof ApprovalAuditLogger.logApprovalAction>,
};

describe('ApprovalTimeoutManager', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // 获取Mock的prisma实例
    mockPrisma = prisma;

    // 默认配置
    mockApprovalConfigManager.getConfig.mockResolvedValue({
      registrationApprovalEnabled: true,
      notificationEnabled: true,
      autoApproveAdmin: true,
      timeoutHours: 72,
      autoRejectTimeout: false,
      batchSizeLimit: 50,
    });
  });

  describe('getTimeoutUsers', () => {
    it('应该返回超时的用户列表', async () => {
      const timeoutDate = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72小时前
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          displayName: 'User 1',
          createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000), // 80小时前
        },
        {
          id: 'user-2',
          username: 'user2',
          email: 'user2@example.com',
          displayName: 'User 2',
          createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000), // 100小时前
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.getTimeoutUsers();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        ...mockUsers[0],
        hoursOverdue: expect.any(Number),
      });
      expect(result[0].hoursOverdue).toBeGreaterThan(0);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: 'PENDING',
          createdAt: {
            lt: expect.any(Date),
          },
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });

    it('应该返回空列表当没有超时用户时', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.getTimeoutUsers();

      expect(result).toHaveLength(0);
    });

    it('应该处理数据库错误', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      const manager = ApprovalTimeoutManager.getInstance();
      await expect(
        manager.getTimeoutUsers()
      ).rejects.toThrow();
    });
  });

  describe('processTimeoutApprovals', () => {
    it('应该在审批未启用时返回空结果', async () => {
      mockApprovalConfigManager.getConfig.mockResolvedValue({
        registrationApprovalEnabled: false,
        notificationEnabled: true,
        autoApproveAdmin: true,
        timeoutHours: 72,
        autoRejectTimeout: false,
        batchSizeLimit: 50,
      });

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.checkAndProcessTimeouts();

      expect(result).toEqual({
        processedCount: 0,
        autoRejectedCount: 0,
        notifiedCount: 0,
        errors: [],
      });
    });

    it('应该处理没有超时用户的情况', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.checkAndProcessTimeouts();

      expect(result).toEqual({
        processedCount: 0,
        autoRejectedCount: 0,
        notifiedCount: 0,
        errors: [],
      });
    });

    it('应该自动拒绝超时用户当配置启用时', async () => {
      mockApprovalConfigManager.getConfig.mockResolvedValue({
        registrationApprovalEnabled: true,
        notificationEnabled: true,
        autoApproveAdmin: true,
        timeoutHours: 72,
        autoRejectTimeout: true, // 启用自动拒绝
        batchSizeLimit: 50,
      });

      const mockTimeoutUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          displayName: 'User 1',
          createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
          hoursOverdue: 8,
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockTimeoutUsers);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
      mockApprovalAuditLogger.logApprovalAction.mockResolvedValue({
        success: true,
        message: 'Logged successfully'
      });

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.checkAndProcessTimeouts();

      expect(result.processedCount).toBe(1);
      expect(result.autoRejectedCount).toBe(1);
      expect(result.notifiedCount).toBe(0);

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user-1'] },
          approvalStatus: 'PENDING',
        },
        data: {
          approvalStatus: 'REJECTED',
          updatedAt: expect.any(Date),
        },
      });

      expect(mockApprovalAuditLogger.logApprovalAction).toHaveBeenCalledWith({
        action: 'TIMEOUT_REJECT',
        adminId: 'system',
        adminName: 'System',
        targetUserIds: ['user-1'],
        reason: '审批超时自动拒绝',
        batchId: expect.any(String),
        details: expect.any(Object),
      });
    });

    it('应该发送超时提醒当自动拒绝未启用时', async () => {
      const mockTimeoutUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          displayName: 'User 1',
          createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
          hoursOverdue: 8,
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockTimeoutUsers);
      mockPrisma.timeoutNotification.findFirst.mockResolvedValue(null); // 没有最近的通知
      mockPrisma.timeoutNotification.create.mockResolvedValue({});

      const { sendEmail } = await import('@/lib/email');
      (sendEmail as jest.MockedFunction<any>).mockResolvedValue(true);

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.checkAndProcessTimeouts();

      expect(result.processedCount).toBe(1);
      expect(result.autoRejectedCount).toBe(0);
      expect(result.notifiedCount).toBe(1);

      expect(sendEmail).toHaveBeenCalled();
      expect(mockPrisma.timeoutNotification.create).toHaveBeenCalled();
    });

    it('应该分批处理大量超时用户', async () => {
      // 创建51个超时用户（超过默认批次大小50）
      const mockTimeoutUsers = Array.from({ length: 51 }, (_, i) => ({
        id: `user-${i}`,
        username: `user${i}`,
        email: `user${i}@example.com`,
        displayName: `User ${i}`,
        createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
        hoursOverdue: 8,
      }));

      mockApprovalConfigManager.getConfig.mockResolvedValue({
        registrationApprovalEnabled: true,
        notificationEnabled: true,
        autoApproveAdmin: true,
        timeoutHours: 72,
        autoRejectTimeout: true,
        batchSizeLimit: 50,
      });

      mockPrisma.user.findMany.mockResolvedValue(mockTimeoutUsers);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 50 }).mockResolvedValueOnce({ count: 1 });
      mockApprovalAuditLogger.logApprovalAction.mockResolvedValue({
        success: true,
        message: 'Logged successfully'
      });

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.checkAndProcessTimeouts();

      expect(result.processedCount).toBe(51);
      expect(result.autoRejectedCount).toBe(51); // 50 + 1
      expect(mockPrisma.user.updateMany).toHaveBeenCalledTimes(2); // 两个批次
    });

    it('应该处理批次处理中的错误', async () => {
      const mockTimeoutUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          displayName: 'User 1',
          createdAt: new Date(Date.now() - 80 * 60 * 60 * 1000),
          hoursOverdue: 8,
        },
      ];

      mockApprovalConfigManager.getConfig.mockResolvedValue({
        registrationApprovalEnabled: true,
        notificationEnabled: true,
        autoApproveAdmin: true,
        timeoutHours: 72,
        autoRejectTimeout: true,
        batchSizeLimit: 50,
      });

      mockPrisma.user.findMany.mockResolvedValue(mockTimeoutUsers);
      mockPrisma.user.updateMany.mockRejectedValue(new Error('Database error'));

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.checkAndProcessTimeouts();

      expect(result.processedCount).toBe(1);
      expect(result.autoRejectedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getUpcomingTimeoutUsers', () => {
    it('应该返回即将超时的用户', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          username: 'user1',
          email: 'user1@example.com',
          displayName: 'User 1',
          createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50小时前，即将超时
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const manager = ApprovalTimeoutManager.getInstance();
      const result = await manager.getUpcomingTimeoutUsers();

      expect(result).toHaveLength(1);
      expect(result[0].hoursOverdue).toBeGreaterThan(0);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          approvalStatus: 'PENDING',
          createdAt: {
            lt: expect.any(Date), // 48小时前（72-24）
            gte: expect.any(Date), // 72小时前
          },
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  });

  // cleanupTimeoutRecords方法已被移除，因为它不在当前的ApprovalTimeoutManager实现中
});

describe('TimeoutScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    const scheduler = TimeoutScheduler.getInstance();
    scheduler.stop();
    jest.useRealTimers();
  });

  describe('调度器管理', () => {
    it('应该启动超时检查调度', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      const scheduler = TimeoutScheduler.getInstance();
      scheduler.start();

      expect(consoleSpy).toHaveBeenCalledWith('审批超时调度器已启动');
      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // 超时检查 + 管理员提醒

      consoleSpy.mockRestore();
      setIntervalSpy.mockRestore();
    });

    it('应该停止超时检查调度', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const scheduler = TimeoutScheduler.getInstance();
      scheduler.start();
      scheduler.stop();

      expect(consoleSpy).toHaveBeenCalledWith('审批超时调度器已停止');
      expect(clearIntervalSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('应该定期执行超时检查', async () => {
      jest.useFakeTimers();

      const manager = ApprovalTimeoutManager.getInstance();
      const processTimeoutApprovalsSpy = jest.spyOn(manager, 'checkAndProcessTimeouts')
        .mockResolvedValue({
          processedCount: 0,
          autoRejectedCount: 0,
          notifiedCount: 0,
          errors: [],
        });

      const scheduler = TimeoutScheduler.getInstance();
      scheduler.start();

      // 快进1小时
      jest.advanceTimersByTime(60 * 60 * 1000);

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(processTimeoutApprovalsSpy).toHaveBeenCalled();

      processTimeoutApprovalsSpy.mockRestore();
      jest.useRealTimers();
    });

    it('应该定期发送管理员提醒', async () => {
      jest.useFakeTimers();

      const manager = ApprovalTimeoutManager.getInstance();
      const sendAdminTimeoutRemindersSpy = jest.spyOn(manager, 'sendAdminReminders')
        .mockResolvedValue();

      const scheduler = TimeoutScheduler.getInstance();
      scheduler.start();

      // 快进24小时
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sendAdminTimeoutRemindersSpy).toHaveBeenCalled();

      sendAdminTimeoutRemindersSpy.mockRestore();
      jest.useRealTimers();
    });

    it('应该处理定时任务中的错误', async () => {
      jest.useFakeTimers();

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const manager = ApprovalTimeoutManager.getInstance();
      const processTimeoutApprovalsSpy = jest.spyOn(manager, 'checkAndProcessTimeouts')
        .mockRejectedValue(new Error('Timeout processing error'));

      const scheduler = TimeoutScheduler.getInstance();
      scheduler.start();

      // 快进1小时
      jest.advanceTimersByTime(60 * 60 * 1000);

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalledWith('定时超时检查失败:', expect.any(Error));

      processTimeoutApprovalsSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
