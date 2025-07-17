/**
 * @fileoverview Turnstile降级机制测试
 * @description 测试Turnstile降级管理器的各种场景和功能
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import {
  TurnstileFallbackManager,
  FallbackMode,
  FallbackReason,
  SecurityLevel,
  FEATURE_SECURITY_LEVELS
} from '@/lib/security/turnstile-fallback-manager';
import { turnstileMonitor } from '@/lib/security/turnstile-monitoring';
import type { TurnstileFeatureId } from '@/types/turnstile';

// Mock环境变量
const mockEnv = {
  COSEREEDEN_TURNSTILE_ENABLE_FALLBACK: 'true',
  COSEREEDEN_TURNSTILE_FALLBACK_MODE: 'skip',
  COSEREEDEN_TURNSTILE_FALLBACK_TIMEOUT: '10000',
  COSEREEDEN_TURNSTILE_FALLBACK_MAX_FAILURES: '3',
  COSEREEDEN_TURNSTILE_FALLBACK_RECOVERY_INTERVAL: '60000',
  COSEREEDEN_TURNSTILE_FALLBACK_HEALTH_CHECK_INTERVAL: '30000',
  COSEREEDEN_TURNSTILE_FALLBACK_TELEGRAM_ALERTS: 'false'
};

// Mock fetch
global.fetch = jest.fn();

describe('TurnstileFallbackManager', () => {
  let fallbackManager: TurnstileFallbackManager;

  beforeEach(() => {
    // 设置环境变量
    Object.assign(process.env, mockEnv);

    // 重置单例实例
    (TurnstileFallbackManager as any).instance = undefined;
    fallbackManager = TurnstileFallbackManager.getInstance();

    // 清理监控数据
    turnstileMonitor.resetMetrics();

    // 重置fetch mock
    (fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    // 清理资源
    fallbackManager.destroy();

    // 清理环境变量
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('基本功能测试', () => {
    test('应该正确初始化降级管理器', () => {
      expect(fallbackManager).toBeInstanceOf(TurnstileFallbackManager);
    });

    test('应该正确检查是否需要降级', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // 初始状态不应该降级
      expect(fallbackManager.shouldFallback(featureId)).toBe(false);

      // 触发降级
      await fallbackManager.triggerFallback(featureId, FallbackReason.API_TIMEOUT);

      // 现在应该降级
      expect(fallbackManager.shouldFallback(featureId)).toBe(true);
    });

    test('关键功能不应该降级', async () => {
      const criticalFeature: TurnstileFeatureId = 'PAYMENT_PROCESS';

      // 确认是关键功能
      expect(FEATURE_SECURITY_LEVELS[criticalFeature]).toBe(SecurityLevel.CRITICAL);

      // 触发降级
      await fallbackManager.triggerFallback(criticalFeature, FallbackReason.API_ERROR);

      // 关键功能不应该降级
      expect(fallbackManager.shouldFallback(criticalFeature)).toBe(false);
    });
  });

  describe('降级触发测试', () => {
    test('应该正确触发降级', async () => {
      const featureId: TurnstileFeatureId = 'USER_REGISTER';
      const reason = FallbackReason.NETWORK_ERROR;
      const errorMessage = '网络连接失败';

      await fallbackManager.triggerFallback(featureId, reason, errorMessage);

      const state = fallbackManager.getFallbackState(featureId);
      expect(state).not.toBeNull();
      expect(state?.isActive).toBe(true);
      expect(state?.reason).toBe(reason);
      expect(state?.errorMessage).toBe(errorMessage);
      expect(state?.failureCount).toBe(1);
    });

    test('应该累计失败次数', async () => {
      const featureId: TurnstileFeatureId = 'GUEST_COMMENT';

      // 第一次失败
      await fallbackManager.triggerFallback(featureId, FallbackReason.API_ERROR);
      let state = fallbackManager.getFallbackState(featureId);
      expect(state?.failureCount).toBe(1);

      // 第二次失败
      await fallbackManager.triggerFallback(featureId, FallbackReason.API_ERROR);
      state = fallbackManager.getFallbackState(featureId);
      expect(state?.failureCount).toBe(2);
    });
  });

  describe('降级恢复测试', () => {
    test('应该正确恢复降级状态', async () => {
      const featureId: TurnstileFeatureId = 'CONTENT_PUBLISH';

      // 触发降级
      await fallbackManager.triggerFallback(featureId, FallbackReason.SERVICE_UNAVAILABLE);
      expect(fallbackManager.shouldFallback(featureId)).toBe(true);

      // 恢复降级
      await fallbackManager.recoverFromFallback(featureId);
      expect(fallbackManager.shouldFallback(featureId)).toBe(false);

      // 状态应该被清除
      const state = fallbackManager.getFallbackState(featureId);
      expect(state).toBeNull();
    });
  });

  describe('健康检查测试', () => {
    test('应该执行健康检查', async () => {
      // Mock成功的响应
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true
      });

      const result = await fallbackManager.performHealthCheck();

      expect(result.isHealthy).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('应该检测到服务不健康', async () => {
      // Mock失败的响应
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 500,
        ok: false
      });

      const result = await fallbackManager.performHealthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    test('应该处理网络错误', async () => {
      // Mock网络错误
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await fallbackManager.performHealthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('配置测试', () => {
    test('应该在禁用时不触发降级', () => {
      // 禁用降级
      process.env.COSEREEDEN_TURNSTILE_ENABLE_FALLBACK = 'false';

      // 重新创建实例
      (TurnstileFallbackManager as any).instance = undefined;
      const disabledManager = TurnstileFallbackManager.getInstance();

      const featureId: TurnstileFeatureId = 'USER_LOGIN';
      expect(disabledManager.shouldFallback(featureId)).toBe(false);

      disabledManager.destroy();
    });

    test('应该使用正确的降级模式', async () => {
      process.env.COSEREEDEN_TURNSTILE_FALLBACK_MODE = 'warn';

      (TurnstileFallbackManager as any).instance = undefined;
      const warnManager = TurnstileFallbackManager.getInstance();

      const featureId: TurnstileFeatureId = 'FILE_UPLOAD';
      await warnManager.triggerFallback(featureId, FallbackReason.RATE_LIMIT_EXCEEDED);

      const state = warnManager.getFallbackState(featureId);
      expect(state?.mode).toBe(FallbackMode.WARN);

      warnManager.destroy();
    });
  });

  describe('监控集成测试', () => {
    test('应该记录降级事件到监控系统', async () => {
      const featureId: TurnstileFeatureId = 'PASSWORD_RESET';

      // 记录一些验证事件
      turnstileMonitor.recordValidation(featureId, true, 1000, false);
      turnstileMonitor.recordValidation(featureId, false, 2000, false);

      // 触发降级
      await fallbackManager.triggerFallback(featureId, FallbackReason.DATABASE_ERROR);

      // 记录降级使用
      turnstileMonitor.recordValidation(featureId, true, 100, true);

      const metrics = turnstileMonitor.getFeatureMetrics(featureId);
      expect(metrics).not.toBeNull();
      expect(metrics?.fallbacks).toBe(1);
      expect(metrics?.validations).toBe(3);
    });
  });

  describe('边界条件测试', () => {
    test('应该处理无效的功能ID', async () => {
      const invalidFeatureId = 'INVALID_FEATURE' as TurnstileFeatureId;

      // 不应该抛出错误
      await expect(
        fallbackManager.triggerFallback(invalidFeatureId, FallbackReason.API_ERROR)
      ).resolves.not.toThrow();

      // 应该能够检查状态
      const state = fallbackManager.getFallbackState(invalidFeatureId);
      expect(state).not.toBeNull();
    });

    test('应该处理重复的恢复操作', async () => {
      const featureId: TurnstileFeatureId = 'ADMIN_OPERATIONS';

      // 恢复未降级的功能不应该出错
      await expect(
        fallbackManager.recoverFromFallback(featureId)
      ).resolves.not.toThrow();
    });

    test('应该正确处理所有降级原因', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';
      const reasons = Object.values(FallbackReason);

      for (const reason of reasons) {
        await fallbackManager.triggerFallback(featureId, reason);
        const state = fallbackManager.getFallbackState(featureId);
        expect(state?.reason).toBe(reason);

        await fallbackManager.recoverFromFallback(featureId);
      }
    });
  });

  describe('并发测试', () => {
    test('应该处理并发的降级操作', async () => {
      const featureId: TurnstileFeatureId = 'CONTENT_PUBLISH';

      // 并发触发降级
      const promises = Array.from({ length: 5 }, (_, i) =>
        fallbackManager.triggerFallback(featureId, FallbackReason.API_TIMEOUT, `Error ${i}`)
      );

      await Promise.all(promises);

      const state = fallbackManager.getFallbackState(featureId);
      expect(state?.failureCount).toBe(5);
    });
  });
});
