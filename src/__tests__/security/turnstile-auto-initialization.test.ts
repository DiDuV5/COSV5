/**
 * @fileoverview Turnstile自动初始化测试
 * @description 测试Turnstile功能的自动初始化机制
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { TurnstileFeatureManager } from '@/lib/security/turnstile-server-config';
import { TURNSTILE_FEATURES, type TurnstileFeatureId } from '@/types/turnstile';
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

describe('Turnstile自动初始化', () => {
  let featureManager: TurnstileFeatureManager;

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
    mockPrisma.turnstileConfig.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    // 清理环境变量
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('自动初始化检查', () => {
    test('isInitialized方法应该正确报告状态', () => {
      // 初始状态应该是未初始化
      expect(featureManager.isInitialized()).toBe(false);
    });

    test('ensureInitialized应该在需要时自动初始化', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // 验证未初始化
      expect(featureManager.isInitialized()).toBe(false);

      // 调用需要初始化的方法
      await featureManager.isFeatureEnabled(featureId);

      // 验证自动初始化
      expect(featureManager.isInitialized()).toBe(true);
    });

    test('手动初始化应该仍然工作', async () => {
      // 直接调用初始化
      await featureManager.initialize();

      // 验证初始化成功
      expect(featureManager.isInitialized()).toBe(true);
    });

    test('重复初始化应该是安全的', async () => {
      // 多次调用初始化
      await featureManager.initialize();
      await featureManager.initialize();

      // 验证只初始化一次
      expect(featureManager.isInitialized()).toBe(true);

      // 验证数据库调用次数合理
      const allFeatures = Object.keys(TURNSTILE_FEATURES);
      expect(mockPrisma.turnstileConfig.upsert).toHaveBeenCalledTimes(allFeatures.length);
    });
  });

  describe('功能状态管理', () => {
    test('getAllFeatureStates应该自动初始化', async () => {
      // 验证未初始化
      expect(featureManager.isInitialized()).toBe(false);

      // 调用获取所有状态
      const states = await featureManager.getAllFeatureStates();

      // 验证自动初始化
      expect(featureManager.isInitialized()).toBe(true);

      // 验证返回正确的功能列表
      expect(Object.keys(states)).toEqual(Object.keys(TURNSTILE_FEATURES));
    });

    test('isFeatureEnabled应该自动初始化', async () => {
      const featureId: TurnstileFeatureId = 'USER_REGISTER';

      // 验证未初始化
      expect(featureManager.isInitialized()).toBe(false);

      // 调用功能检查
      const isEnabled = await featureManager.isFeatureEnabled(featureId);

      // 验证自动初始化
      expect(featureManager.isInitialized()).toBe(true);

      // 验证返回布尔值
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('缓存机制', () => {
    test('应该正确管理缓存', async () => {
      const featureId: TurnstileFeatureId = 'PASSWORD_RESET';

      // Mock数据库返回
      mockPrisma.turnstileConfig.findUnique.mockResolvedValue(createMockTurnstileConfig({
        featureId,
        enabled: true
      }));

      // 第一次查询
      await featureManager.isFeatureEnabled(featureId);

      // 验证缓存存在
      const cacheStatus = featureManager.getCacheStatus();
      expect(cacheStatus.size).toBeGreaterThan(0);

      // 清理缓存
      featureManager.clearAllCache();

      // 验证缓存已清理
      const clearedStatus = featureManager.getCacheStatus();
      expect(clearedStatus.size).toBe(0);
    });

    test('应该避免重复数据库查询', async () => {
      const featureId: TurnstileFeatureId = 'GUEST_COMMENT';

      // Mock数据库返回
      mockPrisma.turnstileConfig.findUnique.mockResolvedValue(createMockTurnstileConfig({
        featureId,
        enabled: false
      }));

      // 第一次查询
      await featureManager.isFeatureEnabled(featureId);
      const firstCallCount = mockPrisma.turnstileConfig.findUnique.mock.calls.length;

      // 第二次查询（应该使用缓存）
      await featureManager.isFeatureEnabled(featureId);
      const secondCallCount = mockPrisma.turnstileConfig.findUnique.mock.calls.length;

      // 验证使用了缓存
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('错误处理', () => {
    test('应该正确处理数据库错误', async () => {
      // Mock数据库错误
      mockPrisma.turnstileConfig.upsert.mockRejectedValue(new Error('Database error'));

      // 验证初始化失败
      await expect(featureManager.initialize()).rejects.toThrow();

      // 验证状态正确
      expect(featureManager.isInitialized()).toBe(false);
    });

    test('应该在数据库错误时使用降级机制', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // Mock数据库错误
      mockPrisma.turnstileConfig.findUnique.mockRejectedValue(new Error('Database error'));

      // 调用功能检查
      const isEnabled = await featureManager.isFeatureEnabled(featureId);

      // 应该返回安全的默认值
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('向后兼容性', () => {
    test('现有API应该继续工作', async () => {
      // 测试所有主要API方法
      await featureManager.initialize();

      const states = await featureManager.getAllFeatureStates();
      expect(typeof states).toBe('object');

      const isEnabled = await featureManager.isFeatureEnabled('USER_LOGIN');
      expect(typeof isEnabled).toBe('boolean');

      const cacheStatus = featureManager.getCacheStatus();
      expect(typeof cacheStatus.size).toBe('number');
    });
  });
});
