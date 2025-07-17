/**
 * @fileoverview 审批配置管理器单元测试
 * @description 测试ApprovalConfigManager的配置验证、缓存、热重载等功能
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { ApprovalConfigManager, ConfigHotReloadManager } from '../approval-config-manager';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

import { prisma } from '@/lib/prisma';

// Mock dependencies - 全局设置已处理大部分Mock

describe('ApprovalConfigManager', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // 获取Mock的prisma实例
    mockPrisma = prisma;
  });

  afterEach(() => {
    // 停止监听以清理资源
    ConfigHotReloadManager.stopWatching();
  });

  describe('getConfig', () => {
    it('应该返回正确的配置', async () => {
      const mockSettings = [
        { key: 'user_registration_approval_enabled', value: 'true' },
        { key: 'user_approval_notification_enabled', value: 'true' },
        { key: 'user_approval_auto_approve_admin', value: 'false' },
        { key: 'user_approval_timeout_hours', value: '48' },
        { key: 'user_approval_auto_reject_timeout', value: 'true' },
        { key: 'user_approval_batch_size_limit', value: '25' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const config = await ApprovalConfigManager.getConfig();

      expect(config).toEqual({
        registrationApprovalEnabled: true,
        notificationEnabled: true,
        autoApproveAdmin: false,
        timeoutHours: 48,
        autoRejectTimeout: true,
        batchSizeLimit: 25,
      });
    });

    it('应该返回默认配置当设置不存在时', async () => {
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);

      const config = await ApprovalConfigManager.getConfig();

      expect(config).toEqual({
        registrationApprovalEnabled: false,
        notificationEnabled: true,
        autoApproveAdmin: true,
        timeoutHours: 72,
        autoRejectTimeout: false,
        batchSizeLimit: 50,
      });
    });

    it('应该处理数据库错误并返回默认配置', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      const config = await ApprovalConfigManager.getConfig();

      expect(config).toEqual({
        registrationApprovalEnabled: false,
        notificationEnabled: true,
        autoApproveAdmin: true,
        timeoutHours: 72,
        autoRejectTimeout: false,
        batchSizeLimit: 50,
      });
    });

    it('应该使用缓存避免重复查询', async () => {
      const mockSettings = [
        { key: 'user_registration_approval_enabled', value: 'true' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      // 第一次调用
      await ApprovalConfigManager.getConfig();
      // 第二次调用
      await ApprovalConfigManager.getConfig();

      // 应该只查询一次数据库
      expect(mockPrisma.systemSetting.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateConfig', () => {
    it('应该成功更新配置', async () => {
      const updates = {
        registrationApprovalEnabled: true,
        timeoutHours: 48,
      };

      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await ApprovalConfigManager.updateConfig(updates, 'admin-123');

      expect(result).toEqual({
        success: true,
        message: '审批配置更新成功',
      });

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('应该验证超时时间范围', async () => {
      const updates = {
        timeoutHours: 200, // 超出范围
      };

      await expect(
        ApprovalConfigManager.updateConfig(updates, 'admin-123')
      ).rejects.toThrow();
    });

    it('应该验证批量操作限制范围', async () => {
      const updates = {
        batchSizeLimit: 150, // 超出范围
      };

      await expect(
        ApprovalConfigManager.updateConfig(updates, 'admin-123')
      ).rejects.toThrow();
    });

    it('应该处理空更新', async () => {
      const result = await ApprovalConfigManager.updateConfig({}, 'admin-123');

      expect(result).toEqual({
        success: true,
        message: '审批配置更新成功',
      });

      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      const updates = {
        registrationApprovalEnabled: true,
      };

      mockPrisma.systemSetting.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        ApprovalConfigManager.updateConfig(updates, 'admin-123')
      ).rejects.toThrow();
    });
  });

  describe('validateConfigIntegrity', () => {
    it('应该验证配置完整性', async () => {
      const mockSettings = [
        { key: 'user_registration_approval_enabled', value: 'true' },
        { key: 'user_approval_notification_enabled', value: 'true' },
        { key: 'user_approval_auto_approve_admin', value: 'false' },
        { key: 'user_approval_timeout_hours', value: '48' },
        { key: 'user_approval_auto_reject_timeout', value: 'true' },
        { key: 'user_approval_batch_size_limit', value: '25' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await ApprovalConfigManager.validateConfigIntegrity();

      expect(result).toEqual({
        valid: true,
        missingKeys: [],
        invalidValues: [],
      });
    });

    it('应该检测缺失的配置项', async () => {
      const mockSettings = [
        { key: 'user_registration_approval_enabled', value: 'true' },
        // 缺少其他配置项
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await ApprovalConfigManager.validateConfigIntegrity();

      expect(result.valid).toBe(false);
      expect(result.missingKeys.length).toBeGreaterThan(0);
    });

    it('应该检测无效的配置值', async () => {
      const mockSettings = [
        { key: 'user_registration_approval_enabled', value: 'invalid' }, // 无效布尔值
        { key: 'user_approval_timeout_hours', value: 'not_a_number' }, // 无效数字
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await ApprovalConfigManager.validateConfigIntegrity();

      expect(result.valid).toBe(false);
      expect(result.invalidValues.length).toBeGreaterThan(0);
    });

    it('应该处理数据库错误', async () => {
      mockPrisma.systemSetting.findMany.mockRejectedValue(new Error('Database error'));

      const result = await ApprovalConfigManager.validateConfigIntegrity();

      expect(result).toEqual({
        valid: false,
        missingKeys: [],
        invalidValues: [],
      });
    });
  });

  describe('initializeMissingConfigs', () => {
    it('应该初始化缺失的配置', async () => {
      // 模拟缺失配置的情况
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});

      const result = await ApprovalConfigManager.initializeMissingConfigs();

      expect(result.success).toBe(true);
      expect(result.initialized.length).toBeGreaterThan(0);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(result.initialized.length);
    });

    it('应该跳过已存在的配置', async () => {
      const mockSettings = [
        { key: 'user_registration_approval_enabled', value: 'true' },
        { key: 'user_approval_notification_enabled', value: 'true' },
        { key: 'user_approval_auto_approve_admin', value: 'false' },
        { key: 'user_approval_timeout_hours', value: '48' },
        { key: 'user_approval_auto_reject_timeout', value: 'true' },
        { key: 'user_approval_batch_size_limit', value: '25' },
      ];

      mockPrisma.systemSetting.findMany.mockResolvedValue(mockSettings);

      const result = await ApprovalConfigManager.initializeMissingConfigs();

      expect(result.success).toBe(true);
      expect(result.initialized.length).toBe(0);
      expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误', async () => {
      // 先让findMany成功返回空数组（表示缺失配置）
      mockPrisma.systemSetting.findMany.mockResolvedValue([]);
      // 然后让upsert失败
      mockPrisma.systemSetting.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        ApprovalConfigManager.initializeMissingConfigs()
      ).rejects.toThrow();
    });
  });
});

describe('ConfigHotReloadManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    ConfigHotReloadManager.stopWatching();
    jest.useRealTimers();
  });

  describe('配置监听', () => {
    it('应该启动配置监听', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      ConfigHotReloadManager.startWatching();

      // 验证定时器已设置
      expect(setIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });

    it('应该停止配置监听', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      ConfigHotReloadManager.startWatching();
      ConfigHotReloadManager.stopWatching();

      // 验证定时器已清除
      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('应该定期重新加载配置', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const reloadSpy = jest.spyOn(ApprovalConfigManager, 'reloadConfig').mockResolvedValue({} as any);

      ConfigHotReloadManager.startWatching();

      // 快进30秒（配置重载间隔）
      jest.advanceTimersByTime(30 * 1000);

      expect(consoleSpy).toHaveBeenCalledWith('🔄 重新加载审批配置');

      consoleSpy.mockRestore();
      reloadSpy.mockRestore();
    });

    it('应该手动刷新配置', async () => {
      // 这个测试验证手动重新加载配置不会抛出错误
      await expect(
        ApprovalConfigManager.reloadConfig()
      ).resolves.toBeDefined();
    });
  });
});
