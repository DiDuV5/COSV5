/**
 * @fileoverview 配置管理功能测试
 * @description 测试审批配置管理的各种场景
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

// @ts-expect-error - 忽略测试文件中的类型检查问题

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { userApprovalRouter } from '../user-approval';

// Mock dependencies
const mockApprovalConfigManager = {
  getConfig: jest.fn(),
  updateConfig: jest.fn(),
  initializeMissingConfigs: jest.fn(),
  validateConfigIntegrity: jest.fn(),
};

jest.mock('@/lib/approval/approval-config-manager', () => ({
  ApprovalConfigManager: mockApprovalConfigManager,
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

describe('配置管理功能', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // 设置默认Mock实现
    mockApprovalConfigManager.getConfig = jest.fn();
    mockApprovalConfigManager.updateConfig = jest.fn();
    mockApprovalConfigManager.initializeMissingConfigs = jest.fn();
    mockApprovalConfigManager.validateConfigIntegrity = jest.fn();
  });

  describe('getEnhancedConfig', () => {
    it('应该返回增强的审批配置', async () => {
      const mockConfig = {
        registrationApprovalEnabled: true,
        notificationEnabled: true,
        autoApproveAdmin: false,
        timeoutHours: 72,
        autoRejectTimeout: true,
        batchSizeLimit: 50,
      };

      const mockIntegrity = {
        valid: true,
        missingKeys: [],
        invalidValues: [],
      };

      mockApprovalConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockApprovalConfigManager.validateConfigIntegrity.mockResolvedValue(mockIntegrity);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const result = await caller.getEnhancedConfig();

      expect(result).toEqual({
        config: mockConfig,
        integrity: mockIntegrity,
      });

      expect(mockApprovalConfigManager.getConfig).toHaveBeenCalled();
      expect(mockApprovalConfigManager.validateConfigIntegrity).toHaveBeenCalled();
    });

    it('应该在获取配置失败时抛出错误', async () => {
      mockApprovalConfigManager.getConfig.mockRejectedValue(new Error('Config error'));

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.getEnhancedConfig()).rejects.toThrow();
    });
  });

  describe('updateEnhancedConfig', () => {
    it('应该成功更新配置', async () => {
      const updates = {
        registrationApprovalEnabled: true,
        timeoutHours: 48,
      };

      const mockResult = {
        success: true,
        message: '配置更新成功',
      };

      mockApprovalConfigManager.updateConfig.mockResolvedValue(mockResult);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const result = await caller.updateEnhancedConfig(updates);

      expect(result).toEqual(mockResult);
      expect(mockApprovalConfigManager.updateConfig).toHaveBeenCalledWith(
        updates,
        mockContext.user.id
      );
    });

    it('应该验证配置参数范围', async () => {
      const invalidUpdates = {
        timeoutHours: 200, // 超出范围
      };

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.updateEnhancedConfig(invalidUpdates)).rejects.toThrow();
    });

    it('应该在更新失败时抛出错误', async () => {
      const updates = {
        registrationApprovalEnabled: false,
      };

      mockApprovalConfigManager.updateConfig.mockRejectedValue(new Error('Update failed'));

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.updateEnhancedConfig(updates)).rejects.toThrow();
    });
  });

  describe('initializeMissingConfigs', () => {
    it('应该初始化缺失的配置', async () => {
      const mockResult = {
        success: true,
        initialized: ['user_registration_approval_enabled', 'user_approval_timeout_hours'],
      };

      mockApprovalConfigManager.initializeMissingConfigs.mockResolvedValue(mockResult);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const result = await caller.initializeMissingConfigs();

      expect(result).toEqual(mockResult);
      expect(mockApprovalConfigManager.initializeMissingConfigs).toHaveBeenCalled();
    });

    it('应该在初始化失败时抛出错误', async () => {
      mockApprovalConfigManager.initializeMissingConfigs.mockRejectedValue(
        new Error('Initialization failed')
      );

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.initializeMissingConfigs()).rejects.toThrow();
    });
  });

  describe('配置验证', () => {
    it('应该验证timeoutHours的最小值', async () => {
      const invalidUpdates = {
        timeoutHours: 0, // 小于最小值
      };

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.updateEnhancedConfig(invalidUpdates)).rejects.toThrow();
    });

    it('应该验证timeoutHours的最大值', async () => {
      const invalidUpdates = {
        timeoutHours: 200, // 大于最大值
      };

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.updateEnhancedConfig(invalidUpdates)).rejects.toThrow();
    });

    it('应该验证batchSizeLimit的范围', async () => {
      const invalidUpdates = {
        batchSizeLimit: 0, // 小于最小值
      };

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.updateEnhancedConfig(invalidUpdates)).rejects.toThrow();
    });

    it('应该接受有效的配置值', async () => {
      const validUpdates = {
        registrationApprovalEnabled: true,
        notificationEnabled: false,
        autoApproveAdmin: true,
        timeoutHours: 48,
        autoRejectTimeout: false,
        batchSizeLimit: 25,
      };

      const mockResult = {
        success: true,
        message: '配置更新成功',
      };

      mockApprovalConfigManager.updateConfig.mockResolvedValue(mockResult);

      const mockContext = createMockContext('ADMIN');
      const caller = userApprovalRouter.createCaller(mockContext);

      const result = await caller.updateEnhancedConfig(validUpdates);

      expect(result).toEqual(mockResult);
      expect(mockApprovalConfigManager.updateConfig).toHaveBeenCalledWith(
        validUpdates,
        mockContext.user.id
      );
    });
  });

  describe('权限验证', () => {
    it('应该要求管理员权限才能更新配置', async () => {
      const updates = {
        registrationApprovalEnabled: true,
      };

      const mockContext = createMockContext('USER'); // 非管理员用户
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.updateEnhancedConfig(updates)).rejects.toThrow();
    });

    it('应该要求管理员权限才能初始化配置', async () => {
      const mockContext = createMockContext('USER'); // 非管理员用户
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.initializeMissingConfigs()).rejects.toThrow();
    });

    it('应该要求管理员权限才能获取增强配置', async () => {
      const mockContext = createMockContext('USER'); // 非管理员用户
      const caller = userApprovalRouter.createCaller(mockContext);

      await expect(caller.getEnhancedConfig()).rejects.toThrow();
    });
  });
});
