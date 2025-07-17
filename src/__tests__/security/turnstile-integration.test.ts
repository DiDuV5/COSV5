/**
 * @fileoverview Turnstile降级机制集成测试
 * @description 测试Turnstile降级机制与验证器、中间件的完整集成
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { TurnstileValidator } from '@/lib/security/turnstile-validator';
import {
  TurnstileFallbackManager,
  turnstileFallbackManager,
  FallbackReason,
  SecurityLevel,
  FEATURE_SECURITY_LEVELS
} from '@/lib/security/turnstile-fallback-manager';
import { turnstileMonitor } from '@/lib/security/turnstile-monitoring';
import type { TurnstileFeatureId } from '@/types/turnstile';

// Mock环境变量
const mockEnv = {
  COSEREEDEN_TURNSTILE_ENABLED: 'true',
  COSEREEDEN_TURNSTILE_SITE_KEY: 'test-site-key',
  COSEREEDEN_TURNSTILE_SECRET_KEY: 'test-secret-key',
  COSEREEDEN_TURNSTILE_VERIFY_ENDPOINT: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  COSEREEDEN_TURNSTILE_ENABLE_FALLBACK: 'true',
  COSEREEDEN_TURNSTILE_FALLBACK_MODE: 'skip',
  COSEREEDEN_TURNSTILE_FALLBACK_TIMEOUT: '5000'
};

// Mock fetch
global.fetch = jest.fn();

describe('Turnstile降级机制集成测试', () => {
  let validator: TurnstileValidator;

  beforeEach(() => {
    // 设置环境变量
    Object.assign(process.env, mockEnv);

    // 重置单例实例
    (TurnstileValidator as any).instance = undefined;
    (turnstileFallbackManager.constructor as any).instance = undefined;
    (turnstileMonitor.constructor as any).instance = undefined;

    validator = TurnstileValidator.getInstance();

    // 重置监控数据
    turnstileMonitor.resetMetrics();

    // 重置fetch mock
    (fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    // 清理资源
    turnstileFallbackManager.destroy();

    // 清理环境变量
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('正常验证流程', () => {
    test('应该正常验证成功的token', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // Mock成功的Turnstile响应
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          challenge_ts: '2025-07-11T10:00:00.000Z',
          hostname: 'localhost'
        })
      });

      const result = await validator.validateToken('valid-token', '127.0.0.1', featureId);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBeFalsy();

      // 检查监控记录
      const metrics = turnstileMonitor.getFeatureMetrics(featureId);
      expect(metrics?.validations).toBe(1);
      expect(metrics?.successes).toBe(1);
      expect(metrics?.fallbacks).toBe(0);
    });

    test('应该正常处理验证失败', async () => {
      const featureId: TurnstileFeatureId = 'USER_REGISTER';

      // Mock失败的Turnstile响应
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          'error-codes': ['invalid-input-response']
        })
      });

      const result = await validator.validateToken('invalid-token', '127.0.0.1', featureId);

      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBeFalsy();

      // 检查监控记录
      const metrics = turnstileMonitor.getFeatureMetrics(featureId);
      expect(metrics?.validations).toBe(1);
      expect(metrics?.successes).toBe(0);
      expect(metrics?.failures).toBe(1);
    });
  });

  describe('降级触发场景', () => {
    test('应该在API超时时触发降级', async () => {
      const featureId: TurnstileFeatureId = 'GUEST_COMMENT';

      // Mock超时错误
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

      const result = await validator.validateToken('test-token', '127.0.0.1', featureId);

      // 第一次应该失败并触发降级
      expect(result.success).toBe(false);

      // 检查降级状态
      expect(turnstileFallbackManager.shouldFallback(featureId)).toBe(true);
      const state = turnstileFallbackManager.getFallbackState(featureId);
      expect(state?.reason).toBe(FallbackReason.API_TIMEOUT);
    });

    test('应该在降级状态下跳过验证', async () => {
      const featureId: TurnstileFeatureId = 'CONTENT_PUBLISH';

      // 手动触发降级
      await turnstileFallbackManager.triggerFallback(featureId, FallbackReason.SERVICE_UNAVAILABLE);

      // 验证应该跳过
      const result = await validator.validateToken('any-token', '127.0.0.1', featureId);

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.message).toContain('降级');

      // 检查监控记录
      const metrics = turnstileMonitor.getFeatureMetrics(featureId);
      expect(metrics?.fallbacks).toBe(1);
    });

    test('关键功能不应该降级', async () => {
      const criticalFeature: TurnstileFeatureId = 'PAYMENT_PROCESS';

      // 确认是关键功能
      expect(FEATURE_SECURITY_LEVELS[criticalFeature]).toBe(SecurityLevel.CRITICAL);

      // Mock API错误
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const result = await validator.validateToken('test-token', '127.0.0.1', criticalFeature);

      // 应该失败，不应该降级
      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBeFalsy();

      // 虽然触发了降级，但不应该生效
      expect(turnstileFallbackManager.shouldFallback(criticalFeature)).toBe(false);
    });
  });

  describe('降级恢复场景', () => {
    test('应该在服务恢复后自动恢复', async () => {
      const featureId: TurnstileFeatureId = 'FILE_UPLOAD';

      // 触发降级
      await turnstileFallbackManager.triggerFallback(featureId, FallbackReason.NETWORK_ERROR);
      expect(turnstileFallbackManager.shouldFallback(featureId)).toBe(true);

      // Mock健康检查成功
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true
      });

      // 执行健康检查
      const healthResult = await turnstileFallbackManager.performHealthCheck();
      expect(healthResult.isHealthy).toBe(true);

      // 手动触发恢复检查（模拟定时器）
      await turnstileFallbackManager.recoverFromFallback(featureId);

      // 应该已经恢复
      expect(turnstileFallbackManager.shouldFallback(featureId)).toBe(false);
    });
  });

  describe('监控和告警集成', () => {
    test('应该记录完整的验证流程指标', async () => {
      const featureId: TurnstileFeatureId = 'PASSWORD_RESET';

      // 正常验证
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      await validator.validateToken('token1', '127.0.0.1', featureId);

      // 失败验证
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });
      await validator.validateToken('token2', '127.0.0.1', featureId);

      // 降级验证
      await turnstileFallbackManager.triggerFallback(featureId, FallbackReason.API_ERROR);
      await validator.validateToken('token3', '127.0.0.1', featureId);

      // 检查指标
      const metrics = turnstileMonitor.getFeatureMetrics(featureId);
      expect(metrics?.validations).toBe(3);
      expect(metrics?.successes).toBe(2); // 1正常成功 + 1降级成功
      expect(metrics?.failures).toBe(1);
      expect(metrics?.fallbacks).toBe(1);

      const globalMetrics = turnstileMonitor.getGlobalMetrics();
      expect(globalMetrics.totalValidations).toBe(3);
      expect(globalMetrics.fallbackUsages).toBe(1);
    });

    test('应该在降级率过高时生成告警', async () => {
      const featureId: TurnstileFeatureId = 'ADMIN_OPERATIONS';
      let alertTriggered = false;

      // 添加告警处理器
      turnstileMonitor.addAlertHandler(async (event) => {
        if (event.title.includes('降级使用率过高')) {
          alertTriggered = true;
        }
      });

      // 触发降级
      await turnstileFallbackManager.triggerFallback(featureId, FallbackReason.RATE_LIMIT_EXCEEDED);

      // 记录大量降级使用
      for (let i = 0; i < 5; i++) {
        turnstileMonitor.recordValidation(featureId, true, 500, true);
      }

      // 等待告警处理
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(alertTriggered).toBe(true);
    });
  });

  describe('配置驱动的行为', () => {
    test('应该在禁用降级时正常失败', async () => {
      // 禁用降级
      process.env.COSEREEDEN_TURNSTILE_ENABLE_FALLBACK = 'false';

      // 重新创建实例
      (TurnstileFallbackManager as any).instance = undefined;
      const disabledFallbackManager = TurnstileFallbackManager.getInstance();

      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // Mock API错误
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const result = await validator.validateToken('test-token', '127.0.0.1', featureId);

      // 应该失败，不应该降级
      expect(result.success).toBe(false);
      expect(result.fallbackUsed).toBeFalsy();
      expect(disabledFallbackManager.shouldFallback(featureId)).toBe(false);

      disabledFallbackManager.destroy();
    });

    test('应该使用配置的超时时间', async () => {
      const featureId: TurnstileFeatureId = 'USER_REGISTER';

      // 设置短超时时间
      process.env.COSEREEDEN_TURNSTILE_FALLBACK_TIMEOUT = '100';

      // Mock慢响应
      (fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 200))
      );

      const startTime = Date.now();
      const result = await validator.validateToken('test-token', '127.0.0.1', featureId);
      const duration = Date.now() - startTime;

      // 应该在超时时间附近失败
      expect(duration).toBeLessThan(150);
      expect(result.success).toBe(false);
    });
  });

  describe('错误恢复场景', () => {
    test('应该从网络错误中恢复', async () => {
      const featureId: TurnstileFeatureId = 'CONTENT_PUBLISH';

      // 第一次网络错误
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      let result = await validator.validateToken('token1', '127.0.0.1', featureId);
      expect(result.success).toBe(false);

      // 检查降级状态
      expect(turnstileFallbackManager.shouldFallback(featureId)).toBe(true);

      // 第二次使用降级
      result = await validator.validateToken('token2', '127.0.0.1', featureId);
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);

      // 恢复正常
      await turnstileFallbackManager.recoverFromFallback(featureId);

      // 第三次正常验证
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      result = await validator.validateToken('token3', '127.0.0.1', featureId);
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBeFalsy();
    });
  });
});
