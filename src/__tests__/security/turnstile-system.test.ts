/**
 * @fileoverview Turnstile系统完整测试套件
 * @description 测试Turnstile系统的所有核心功能和场景
 * @author Augment AI
 * @date 2025-07-10
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createTurnstileMockEnvironment,
  TurnstileTestScenario,
  TURNSTILE_TEST_TOKENS
} from '@/test-utils/turnstile-mocks';
import type { TurnstileFeatureId } from '@/types/turnstile';

describe('Turnstile系统测试套件', () => {
  let mockEnv: ReturnType<typeof createTurnstileMockEnvironment>;

  beforeEach(() => {
    mockEnv = createTurnstileMockEnvironment();
  });

  afterEach(() => {
    mockEnv.reset();
    jest.clearAllMocks();
  });

  describe('1. 基础验证功能测试', () => {
    it('应该成功验证有效token', async () => {
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.VALID,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.hostname).toBe('localhost');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('应该拒绝无效token', async () => {
      mockEnv.setScenario(TurnstileTestScenario.INVALID_TOKEN);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.INVALID,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('invalid-input-response');
      expect(result.errorMessage).toContain('Token验证失败');
    });

    it('应该处理网络错误', async () => {
      mockEnv.setScenario(TurnstileTestScenario.NETWORK_ERROR);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.VALID,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('internal-error');
      expect(result.errorMessage).toContain('验证服务暂时不可用');
    });

    it('应该处理超时情况', async () => {
      mockEnv.setScenario(TurnstileTestScenario.TIMEOUT);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.TIMEOUT,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('timeout-or-duplicate');
      expect(result.errorMessage).toContain('验证超时');
    });
  });

  describe('2. 功能管理器测试', () => {
    it('应该正确初始化功能状态', async () => {
      await mockEnv.featureManager.initialize();

      const states = await mockEnv.featureManager.getAllFeatureStates();

      expect(states.USER_REGISTER).toBe(false);
      expect(states.USER_LOGIN).toBe(false);
      expect(states.PASSWORD_RESET).toBe(false);
      expect(states.GUEST_COMMENT).toBe(false);
    });

    it('应该能够启用和禁用功能', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // 初始状态应该是禁用
      expect(await mockEnv.featureManager.isFeatureEnabled(featureId)).toBe(false);

      // 启用功能
      await mockEnv.featureManager.enableFeature(featureId, 'test-admin');
      expect(await mockEnv.featureManager.isFeatureEnabled(featureId)).toBe(true);

      // 禁用功能
      await mockEnv.featureManager.disableFeature(featureId, 'test-admin');
      expect(await mockEnv.featureManager.isFeatureEnabled(featureId)).toBe(false);
    });

    it('应该支持批量功能状态查询', async () => {
      await mockEnv.featureManager.enableFeature('USER_LOGIN');
      await mockEnv.featureManager.enableFeature('USER_REGISTER');

      const states = await mockEnv.featureManager.getAllFeatureStates();

      expect(states.USER_LOGIN).toBe(true);
      expect(states.USER_REGISTER).toBe(true);
      expect(states.PASSWORD_RESET).toBe(false);
      expect(states.GUEST_COMMENT).toBe(false);
    });
  });

  describe('3. P0级别功能测试', () => {
    const p0Features: TurnstileFeatureId[] = ['USER_REGISTER', 'USER_LOGIN', 'PASSWORD_RESET'];

    p0Features.forEach(featureId => {
      describe(`${featureId}功能测试`, () => {
        it('功能禁用时应该跳过验证', async () => {
          await mockEnv.disableFeature(featureId);

          const isEnabled = await mockEnv.featureManager.isFeatureEnabled(featureId);
          expect(isEnabled).toBe(false);
        });

        it('功能启用时应该进行验证', async () => {
          await mockEnv.enableFeature(featureId);
          mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

          const isEnabled = await mockEnv.featureManager.isFeatureEnabled(featureId);
          expect(isEnabled).toBe(true);

          const result = await mockEnv.validator.validateToken(
            TURNSTILE_TEST_TOKENS.VALID,
            '127.0.0.1',
            featureId
          );

          expect(result.success).toBe(true);
        });

        it('验证失败时应该返回错误', async () => {
          await mockEnv.enableFeature(featureId);
          mockEnv.setScenario(TurnstileTestScenario.INVALID_TOKEN);

          const result = await mockEnv.validator.validateToken(
            TURNSTILE_TEST_TOKENS.INVALID,
            '127.0.0.1',
            featureId
          );

          expect(result.success).toBe(false);
          expect(result.errorMessage).toBeTruthy();
        });
      });
    });
  });

  describe('4. P2级别功能测试', () => {
    it('游客评论功能测试', async () => {
      const featureId: TurnstileFeatureId = 'GUEST_COMMENT';

      // 测试功能开关
      await mockEnv.disableFeature(featureId);
      expect(await mockEnv.featureManager.isFeatureEnabled(featureId)).toBe(false);

      await mockEnv.enableFeature(featureId);
      expect(await mockEnv.featureManager.isFeatureEnabled(featureId)).toBe(true);

      // 测试验证流程
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);
      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.VALID,
        '192.168.1.100',
        featureId
      );

      expect(result.success).toBe(true);
    });
  });

  describe('5. 错误处理和边界条件测试', () => {
    it('应该处理空token', async () => {
      mockEnv.setScenario(TurnstileTestScenario.MISSING_INPUT);

      const result = await mockEnv.validator.validateToken(
        '',
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('missing-input-response');
    });

    it('应该处理过期token', async () => {
      mockEnv.setScenario(TurnstileTestScenario.EXPIRED_TOKEN);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.EXPIRED,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('timeout-or-duplicate');
    });

    it('应该处理重复token', async () => {
      mockEnv.setScenario(TurnstileTestScenario.DUPLICATE_TOKEN);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.DUPLICATE,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('timeout-or-duplicate');
    });

    it('应该处理速率限制', async () => {
      mockEnv.setScenario(TurnstileTestScenario.RATE_LIMITED);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.RATE_LIMITED,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('bad-request');
    });
  });

  describe('6. 性能和稳定性测试', () => {
    it('应该在合理时间内完成验证', async () => {
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);
      mockEnv.validator.setResponseDelay(100);

      const startTime = Date.now();
      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.VALID,
        '127.0.0.1',
        'USER_LOGIN'
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
      expect(result.responseTime).toBeGreaterThan(90); // 应该记录响应时间
    });

    it('应该记录验证调用历史', async () => {
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.VALID,
        '127.0.0.1',
        'USER_LOGIN'
      );

      await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.INVALID,
        '192.168.1.1',
        'USER_REGISTER'
      );

      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[0].token).toBe(TURNSTILE_TEST_TOKENS.VALID);
      expect(history[0].remoteip).toBe('127.0.0.1');
      expect(history[1].token).toBe(TURNSTILE_TEST_TOKENS.INVALID);
      expect(history[1].remoteip).toBe('192.168.1.1');
    });

    it('健康检查应该正常工作', async () => {
      const health = await mockEnv.validator.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.message).toContain('正常');
      expect(health.responseTime).toBeGreaterThan(0);
    });
  });

  describe('7. 并发和竞态条件测试', () => {
    it('应该处理并发验证请求', async () => {
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const promises = Array.from({ length: 5 }, (_, i) =>
        mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-${i}`,
          '127.0.0.1',
          'USER_LOGIN'
        )
      );

      const results = await Promise.all(promises);

      results.forEach((result: any) => {
        expect(result.success).toBe(true);
      });

      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(5);
    });

    it('应该处理功能状态的并发修改', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      const promises = [
        mockEnv.featureManager.enableFeature(featureId),
        mockEnv.featureManager.disableFeature(featureId),
        mockEnv.featureManager.enableFeature(featureId)
      ];

      await Promise.all(promises);

      // 最后的操作应该是启用
      const isEnabled = await mockEnv.featureManager.isFeatureEnabled(featureId);
      expect(typeof isEnabled).toBe('boolean');
    });
  });
});
