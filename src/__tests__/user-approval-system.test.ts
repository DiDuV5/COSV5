/**
 * @fileoverview 用户审核系统测试
 * @description 测试用户审核系统的功能和兼容性
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Jest
 * - @testing-library/react
 * - @/lib/user-approval-helper
 * - @/lib/approval-security
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，用户审核系统测试
 */

import { describe, it, expect, beforeEach, afterEach as _afterEach, jest } from '@jest/globals';
import {
  getApprovalConfig,
  determineApprovalStatus,
  needsApproval as _needsApproval,
  hasApprovalPermission,
  getApprovalStatusText,
  isValidApprovalStatus,
} from '@/lib/user-approval-helper';
import {
  validateApprovalPermission,
  validateApprovalOperation,
  validateBatchApprovalOperation,
  validateApprovalReason,
} from '@/lib/approval-security';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    systemSetting: {
      findMany: jest.fn(),
    },
    userApprovalLog: {
      create: jest.fn(),
    },
  },
}));

describe('用户审核系统', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('审核配置管理', () => {
    it('应该正确获取默认审核配置', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.systemSetting.findMany as jest.MockedFunction<any>).mockResolvedValue([]);

      const config = await getApprovalConfig();

      expect(config).toEqual({
        registrationApprovalEnabled: false,
        notificationEnabled: true,
        autoApproveAdmin: true,
      });
    });

    it('应该正确解析数据库中的审核配置', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.systemSetting.findMany as jest.MockedFunction<any>).mockResolvedValue([
        { key: 'user_registration_approval_enabled', value: 'true' },
        { key: 'user_approval_notification_enabled', value: 'false' },
        { key: 'user_approval_auto_approve_admin', value: 'true' },
      ]);

      const config = await getApprovalConfig();

      expect(config).toEqual({
        registrationApprovalEnabled: true,
        notificationEnabled: false,
        autoApproveAdmin: true,
      });
    });
  });

  describe('审核状态确定', () => {
    it('应该为普通用户返回PENDING状态（当启用审核时）', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.systemSetting.findMany as jest.MockedFunction<any>).mockResolvedValue([
        { key: 'user_registration_approval_enabled', value: 'true' },
      ]);

      const status = await determineApprovalStatus('USER', false);
      expect(status).toBe('PENDING');
    });

    it('应该为管理员返回APPROVED状态（当启用自动批准时）', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.systemSetting.findMany as jest.MockedFunction<any>).mockResolvedValue([
        { key: 'user_registration_approval_enabled', value: 'true' },
        { key: 'user_approval_auto_approve_admin', value: 'true' },
      ]);

      const status = await determineApprovalStatus('ADMIN', true);
      expect(status).toBe('APPROVED');
    });

    it('应该在未启用审核时返回APPROVED状态', async () => {
      const { prisma } = await import('@/lib/prisma');
      (prisma.systemSetting.findMany as jest.MockedFunction<any>).mockResolvedValue([
        { key: 'user_registration_approval_enabled', value: 'false' },
      ]);

      const status = await determineApprovalStatus('USER', false);
      expect(status).toBe('APPROVED');
    });
  });

  describe('权限验证', () => {
    it('应该允许ADMIN用户进行审核操作', () => {
      expect(hasApprovalPermission('ADMIN')).toBe(true);
    });

    it('应该允许SUPER_ADMIN用户进行审核操作', () => {
      expect(hasApprovalPermission('SUPER_ADMIN')).toBe(true);
    });

    it('应该拒绝普通用户进行审核操作', () => {
      expect(hasApprovalPermission('USER')).toBe(false);
      expect(hasApprovalPermission('VIP')).toBe(false);
      expect(hasApprovalPermission('CREATOR')).toBe(false);
    });

    it('应该在权限不足时抛出错误', () => {
      expect(() => {
        validateApprovalPermission('USER', '用户审核');
      }).toThrow();
    });
  });

  describe('审核操作验证', () => {
    it('应该防止用户审核自己', () => {
      expect(() => {
        validateApprovalOperation('user1', 'user1', 'APPROVE', 'PENDING');
      }).toThrow('不能审核自己的账号');
    });

    it('应该防止重复审核已批准的用户', () => {
      expect(() => {
        validateApprovalOperation('user1', 'admin1', 'APPROVE', 'APPROVED');
      }).toThrow('用户已经通过审核');
    });

    it('应该防止重复拒绝已拒绝的用户', () => {
      expect(() => {
        validateApprovalOperation('user1', 'admin1', 'REJECT', 'REJECTED');
      }).toThrow('用户已经被拒绝');
    });

    it('应该只允许审核待审核状态的用户', () => {
      expect(() => {
        validateApprovalOperation('user1', 'admin1', 'APPROVE', 'APPROVED');
      }).toThrow();
    });
  });

  describe('批量审核验证', () => {
    it('应该验证用户ID数量限制', () => {
      expect(() => {
        validateBatchApprovalOperation([], 'admin1', 'APPROVE');
      }).toThrow('请选择要审核的用户');

      const tooManyUsers = Array.from({ length: 51 }, (_, i) => `user${i}`);
      expect(() => {
        validateBatchApprovalOperation(tooManyUsers, 'admin1', 'APPROVE');
      }).toThrow('一次最多只能审核50个用户');
    });

    it('应该防止批量操作中包含管理员自己', () => {
      expect(() => {
        validateBatchApprovalOperation(['user1', 'admin1', 'user2'], 'admin1', 'APPROVE');
      }).toThrow('不能在批量操作中包含自己的账号');
    });

    it('应该检测重复的用户ID', () => {
      expect(() => {
        validateBatchApprovalOperation(['user1', 'user2', 'user1'], 'admin1', 'APPROVE');
      }).toThrow('用户列表中包含重复的用户');
    });
  });

  describe('审核原因验证', () => {
    it('应该要求拒绝操作提供原因', () => {
      expect(() => {
        validateApprovalReason('REJECT');
      }).toThrow('拒绝用户时必须提供拒绝原因');

      expect(() => {
        validateApprovalReason('REJECT', '');
      }).toThrow('拒绝用户时必须提供拒绝原因');
    });

    it('应该允许批准操作不提供原因', () => {
      expect(() => {
        validateApprovalReason('APPROVE');
      }).not.toThrow();

      expect(() => {
        validateApprovalReason('APPROVE', '');
      }).not.toThrow();
    });

    it('应该限制原因长度', () => {
      const longReason = 'a'.repeat(501);
      expect(() => {
        validateApprovalReason('REJECT', longReason);
      }).toThrow('审核原因不能超过500个字符');
    });
  });

  describe('状态文本和验证', () => {
    it('应该返回正确的状态文本', () => {
      expect(getApprovalStatusText('PENDING')).toBe('待审核');
      expect(getApprovalStatusText('APPROVED')).toBe('已通过');
      expect(getApprovalStatusText('REJECTED')).toBe('已拒绝');
      expect(getApprovalStatusText('UNKNOWN')).toBe('未知状态');
    });

    it('应该正确验证审核状态', () => {
      expect(isValidApprovalStatus('PENDING')).toBe(true);
      expect(isValidApprovalStatus('APPROVED')).toBe(true);
      expect(isValidApprovalStatus('REJECTED')).toBe(true);
      expect(isValidApprovalStatus('INVALID')).toBe(false);
    });
  });

  describe('兼容性测试', () => {
    it('应该与现有用户等级系统兼容', async () => {
      const userLevels = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];

      for (const level of userLevels) {
        const isAdmin = level === 'ADMIN' || level === 'SUPER_ADMIN';
        const status = await determineApprovalStatus(level, isAdmin);
        expect(['PENDING', 'APPROVED']).toContain(status);
      }
    });

    it('应该与NextAuth.js会话结构兼容', () => {
      const mockSession = {
        user: {
          id: 'user1',
          username: 'testuser',
          userLevel: 'USER',
          approvalStatus: 'PENDING',
          email: 'test@example.com',
        },
      };

      expect(mockSession.user.approvalStatus).toBeDefined();
      expect(isValidApprovalStatus(mockSession.user.approvalStatus)).toBe(true);
    });
  });
});
