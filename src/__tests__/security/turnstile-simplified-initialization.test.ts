/**
 * @fileoverview Turnstile简化初始化流程测试
 * @description 测试简化后的Turnstile初始化流程和自动初始化机制
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { TurnstileFeatureManager } from '@/lib/security/turnstile-server-config';
import { startupInitialize, getInitializationStatus, resetStartupInitialization } from '@/lib/startup-initializer';
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
  COSEREEDEN_TURNSTILE_ENABLE_FALLBACK: 'true',
  NODE_ENV: 'test'
};

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    turnstileConfig: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

import { prisma } from '@/lib/prisma';
const mockPrisma = asMockPrismaClient(prisma);

describe('Turnstile简化初始化流程', () => {
  let featureManager: TurnstileFeatureManager;

  beforeEach(() => {
    // 设置环境变量
    Object.assign(process.env, mockEnv);

    // 重置单例实例
    (TurnstileFeatureManager as any).instance = undefined;
    featureManager = TurnstileFeatureManager.getInstance();

    // 重置启动初始化状态
    resetStartupInitialization();

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

    // 重置启动初始化状态
    resetStartupInitialization();
  });

  describe('自动初始化机制', () => {
    test('应该支持自动初始化', async () => {
      // 验证初始状态
      expect(featureManager.isInitialized()).toBe(false);

      // 执行启动初始化
      await startupInitialize();

      // 验证初始化完成
      expect(featureManager.isInitialized()).toBe(true);
    });

    test('应该防止重复初始化', async () => {
      // 第一次初始化
      await startupInitialize();
      expect(featureManager.isInitialized()).toBe(true);

      // 记录调用次数
      const initialCallCount = mockPrisma.turnstileConfig.upsert.mock.calls.length;

      // 第二次初始化
      await startupInitialize();

      // 验证没有重复调用数据库
      expect(mockPrisma.turnstileConfig.upsert.mock.calls.length).toBe(initialCallCount);
    });

    test('应该正确报告初始化状态', async () => {
      // 初始状态
      let status = getInitializationStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.isInitializing).toBe(false);
      expect(status.hasStarted).toBe(false);

      // 开始初始化
      const initPromise = startupInitialize();

      // 初始化中状态
      status = getInitializationStatus();
      expect(status.hasStarted).toBe(true);

      // 等待完成
      await initPromise;

      // 完成状态
      status = getInitializationStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isInitializing).toBe(false);
    });
  });

  describe('自动状态检查', () => {
    test('isFeatureEnabled应该自动触发初始化', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // 验证未初始化
      expect(featureManager.isInitialized()).toBe(false);

      // 调用功能检查
      await featureManager.isFeatureEnabled(featureId);

      // 验证自动初始化
      expect(featureManager.isInitialized()).toBe(true);
    });

    test('getAllFeatureStates应该自动触发初始化', async () => {
      // 验证未初始化
      expect(featureManager.isInitialized()).toBe(false);

      // 调用获取所有状态
      await featureManager.getAllFeatureStates();

      // 验证自动初始化
      expect(featureManager.isInitialized()).toBe(true);
    });

    test('enableFeature应该自动触发初始化', async () => {
      const featureId: TurnstileFeatureId = 'USER_REGISTER';
      const adminId = 'admin-user-id';

      // 验证未初始化
      expect(featureManager.isInitialized()).toBe(false);

      // 调用启用功能
      await featureManager.enableFeature(featureId, adminId);

      // 验证自动初始化
      expect(featureManager.isInitialized()).toBe(true);
    });
  });

  describe('初始化错误处理', () => {
    test('应该正确处理初始化失败', async () => {
      // Mock数据库错误
      mockPrisma.turnstileConfig.upsert.mockRejectedValue(new Error('Database error'));

      // 验证初始化失败
      await expect(startupInitialize()).rejects.toThrow('Database error');

      // 验证状态正确
      expect(featureManager.isInitialized()).toBe(false);
    });

    test('应该支持初始化重试', async () => {
      // 第一次失败
      mockPrisma.turnstileConfig.upsert.mockRejectedValueOnce(new Error('First failure'));

      await expect(startupInitialize()).rejects.toThrow('First failure');
      expect(featureManager.isInitialized()).toBe(false);

      // 第二次成功
      mockPrisma.turnstileConfig.upsert.mockResolvedValue({} as any);

      await startupInitialize();
      expect(featureManager.isInitialized()).toBe(true);
    });
  });

  describe('向后兼容性', () => {
    test('手动调用initialize应该仍然工作', async () => {
      // 直接调用初始化
      await featureManager.initialize();

      // 验证初始化成功
      expect(featureManager.isInitialized()).toBe(true);
    });

    test('重复调用initialize应该是安全的', async () => {
      // 多次调用初始化
      await featureManager.initialize();
      await featureManager.initialize();
      await featureManager.initialize();

      // 验证只初始化一次
      expect(featureManager.isInitialized()).toBe(true);

      // 验证数据库调用次数合理
      const allFeatures = Object.keys(TURNSTILE_FEATURES);
      expect(mockPrisma.turnstileConfig.upsert).toHaveBeenCalledTimes(allFeatures.length);
    });
  });

  describe('性能优化', () => {
    test('应该避免不必要的数据库查询', async () => {
      const featureId: TurnstileFeatureId = 'GUEST_COMMENT';

      // 第一次查询
      await featureManager.isFeatureEnabled(featureId);
      const firstCallCount = mockPrisma.turnstileConfig.findUnique.mock.calls.length;

      // 第二次查询（应该使用缓存）
      await featureManager.isFeatureEnabled(featureId);
      const secondCallCount = mockPrisma.turnstileConfig.findUnique.mock.calls.length;

      // 验证使用了缓存
      expect(secondCallCount).toBe(firstCallCount);
    });

    test('应该正确管理缓存', async () => {
      const featureId: TurnstileFeatureId = 'PASSWORD_RESET';

      // 建立缓存
      await featureManager.isFeatureEnabled(featureId);

      // 验证缓存存在
      const cacheStatus = featureManager.getCacheStatus();
      expect(cacheStatus.size).toBe(1);
      expect(cacheStatus.entries[0].featureId).toBe(featureId);

      // 清理缓存
      featureManager.clearAllCache();

      // 验证缓存已清理
      const clearedStatus = featureManager.getCacheStatus();
      expect(clearedStatus.size).toBe(0);
    });
  });

  describe('集成测试', () => {
    test('完整的初始化和功能管理流程', async () => {
      // 1. 自动初始化
      await startupInitialize();
      expect(featureManager.isInitialized()).toBe(true);

      // 2. 获取所有功能状态
      const states = await featureManager.getAllFeatureStates();
      expect(Object.keys(states)).toEqual(Object.keys(TURNSTILE_FEATURES));

      // 3. 启用一个功能
      const featureId: TurnstileFeatureId = 'USER_LOGIN';
      await featureManager.enableFeature(featureId, 'admin-id');

      // 4. 验证功能状态
      const isEnabled = await featureManager.isFeatureEnabled(featureId);
      expect(isEnabled).toBe(true); // 注意：这里依赖于mock的实现

      // 5. 验证缓存工作
      const cacheStatus = featureManager.getCacheStatus();
      expect(cacheStatus.size).toBeGreaterThan(0);
    });
  });
});
