/**
 * @fileoverview Turnstile批量操作简单测试
 * @description 测试Turnstile功能的批量启用和禁用操作的核心功能
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { TurnstileFeatureManager } from '@/lib/security/turnstile-server-config';
import { TURNSTILE_FEATURES } from '@/types/turnstile';
import {
  type MockPrismaClient,
  asMockPrismaClient,
  createMockUser,
  createMockTurnstileConfig,
  setupDefaultMockBehavior,
  resetAllMocks
} from '@/__tests__/types/turnstile-mock-types';

// Mock环境变量
const mockEnv = {
  COSEREEDEN_TURNSTILE_ENABLED: 'true',
  NODE_ENV: 'test'
};

import { prisma } from '@/lib/prisma';
const mockPrisma = asMockPrismaClient(prisma);

describe('Turnstile批量操作核心功能', () => {
  let featureManager: TurnstileFeatureManager;
  const mockAdminId = 'admin-user-id';

  beforeEach(() => {
    // 设置环境变量
    Object.assign(process.env, mockEnv);

    // 重置单例实例
    (TurnstileFeatureManager as any).instance = undefined;
    featureManager = TurnstileFeatureManager.getInstance();

    // 重置所有mock
    jest.clearAllMocks();
    resetAllMocks(mockPrisma);

    // 设置默认Mock行为
    setupDefaultMockBehavior(mockPrisma);

    // 覆盖特定的Mock行为
    mockPrisma.turnstileConfig.findMany.mockResolvedValue([]);
    mockPrisma.turnstileConfig.findUnique.mockResolvedValue(createMockTurnstileConfig({
      featureId: 'USER_LOGIN',
      enabled: false
    }));
    mockPrisma.turnstileConfig.updateMany.mockResolvedValue({ count: 4 });

    // 手动设置初始化状态
    (featureManager as any).initialized = true;
  });

  afterEach(() => {
    // 清理环境变量
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('批量启用功能', () => {
    test('应该成功启用所有功能', async () => {
      // 执行批量启用
      const result = await featureManager.enableAllFeatures(mockAdminId);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.enabledCount).toBe(4);
      expect(result.totalCount).toBe(4);
      expect(result.errors).toHaveLength(0);

      // 验证数据库调用
      expect(mockPrisma.turnstileConfig.updateMany).toHaveBeenCalledWith({
        where: {
          featureId: {
            in: Object.keys(TURNSTILE_FEATURES)
          }
        },
        data: {
          enabled: true,
          updatedBy: mockAdminId,
          updatedAt: expect.any(Date)
        }
      });
    });

    test('应该处理数据库错误', async () => {
      // Mock数据库错误
      mockPrisma.turnstileConfig.updateMany.mockRejectedValue(new Error('Database error'));

      // 执行批量启用
      const result = await featureManager.enableAllFeatures(mockAdminId);

      // 验证错误处理
      expect(result.success).toBe(false);
      expect(result.enabledCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Database error');
    });
  });

  describe('批量禁用功能', () => {
    test('应该成功禁用所有功能', async () => {
      // 执行批量禁用
      const result = await featureManager.disableAllFeatures(mockAdminId);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.disabledCount).toBe(4);
      expect(result.totalCount).toBe(4);
      expect(result.errors).toHaveLength(0);

      // 验证数据库调用
      expect(mockPrisma.turnstileConfig.updateMany).toHaveBeenCalledWith({
        where: {
          featureId: {
            in: Object.keys(TURNSTILE_FEATURES)
          }
        },
        data: {
          enabled: false,
          updatedBy: mockAdminId,
          updatedAt: expect.any(Date)
        }
      });
    });

    test('应该处理数据库错误', async () => {
      // Mock数据库错误
      mockPrisma.turnstileConfig.updateMany.mockRejectedValue(new Error('Database error'));

      // 执行批量禁用
      const result = await featureManager.disableAllFeatures(mockAdminId);

      // 验证错误处理
      expect(result.success).toBe(false);
      expect(result.disabledCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Database error');
    });
  });

  describe('缓存管理', () => {
    test('批量操作应该清理缓存', async () => {
      // 执行批量启用
      const result = await featureManager.enableAllFeatures(mockAdminId);

      // 验证操作成功
      expect(result.success).toBe(true);

      // 验证缓存状态
      const cacheStatus = featureManager.getCacheStatus();
      expect(cacheStatus.size).toBe(0); // 批量操作后缓存应该被清理
    });
  });

  describe('权限验证', () => {
    test('应该验证用户ID', async () => {
      const invalidUserId = 'invalid-user-id';

      // Mock用户不存在
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // 执行批量启用应该失败
      const result = await featureManager.enableAllFeatures(invalidUserId);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('API结构验证', () => {
    test('enableAllFeatures应该返回正确的结构', async () => {
      const result = await featureManager.enableAllFeatures(mockAdminId);

      // 验证返回结构
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('enabledCount');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('disableAllFeatures应该返回正确的结构', async () => {
      const result = await featureManager.disableAllFeatures(mockAdminId);

      // 验证返回结构
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('disabledCount');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('日志记录', () => {
    test('应该记录批量操作日志', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 执行批量启用
      const result = await featureManager.enableAllFeatures(mockAdminId);

      // 验证操作成功
      expect(result.success).toBe(true);

      // 验证有日志记录
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('功能数量验证', () => {
    test('应该处理正确的功能数量', async () => {
      const allFeatures = Object.keys(TURNSTILE_FEATURES);

      // 执行批量启用
      const result = await featureManager.enableAllFeatures(mockAdminId);

      // 验证功能数量
      expect(result.totalCount).toBe(allFeatures.length);
      expect(result.enabledCount).toBe(allFeatures.length);
    });
  });
});
