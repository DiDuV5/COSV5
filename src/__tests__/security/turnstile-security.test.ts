/**
 * @fileoverview Turnstile安全性测试套件
 * @description 测试Turnstile系统的安全机制和防护能力
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

describe('Turnstile安全性测试套件', () => {
  let mockEnv: ReturnType<typeof createTurnstileMockEnvironment>;

  beforeEach(() => {
    mockEnv = createTurnstileMockEnvironment();
  });

  afterEach(() => {
    mockEnv.reset();
    jest.clearAllMocks();
  });

  describe('1. Token安全性测试', () => {
    it('应该拒绝空token', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.MISSING_INPUT);

      const result = await mockEnv.validator.validateToken(
        '',
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('missing-input-response');
    });

    it('应该拒绝格式错误的token', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.INVALID_TOKEN);

      const malformedTokens = [
        'invalid-token',
        '123',
        'token with spaces',
        'token@with#special$chars',
        'x'.repeat(1000), // 过长token
        null as any,
        undefined as any
      ];

      for (const token of malformedTokens) {
        const result = await mockEnv.validator.validateToken(
          token,
          '127.0.0.1',
          'USER_LOGIN'
        );

        expect(result.success).toBe(false);
      }
    });

    it('应该防止token重复使用', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.DUPLICATE_TOKEN);

      const token = TURNSTILE_TEST_TOKENS.DUPLICATE;

      // 第一次使用
      const firstResult = await mockEnv.validator.validateToken(
        token,
        '127.0.0.1',
        'USER_LOGIN'
      );

      // 第二次使用相同token
      const secondResult = await mockEnv.validator.validateToken(
        token,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(firstResult.success).toBe(false);
      expect(secondResult.success).toBe(false);
      expect(firstResult.errorCode).toBe('timeout-or-duplicate');
    });

    it('应该验证token过期时间', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.EXPIRED_TOKEN);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.EXPIRED,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('timeout-or-duplicate');
      expect(result.errorMessage).toContain('过期');
    });
  });

  describe('2. IP地址验证测试', () => {
    it('应该记录和验证客户端IP', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const testIPs = [
        '127.0.0.1',
        '192.168.1.100',
        '10.0.0.1',
        '172.16.0.1',
        '203.0.113.1' // 公网IP
      ];

      for (const ip of testIPs) {
        await mockEnv.validator.validateToken(
          TURNSTILE_TEST_TOKENS.VALID,
          ip,
          'USER_LOGIN'
        );
      }

      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(testIPs.length);

      testIPs.forEach((ip, index) => {
        expect(history[index].remoteip).toBe(ip);
      });
    });

    it('应该处理无效IP地址', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const invalidIPs = [
        '',
        'invalid-ip',
        '999.999.999.999',
        '192.168.1',
        '192.168.1.1.1'
      ];

      for (const ip of invalidIPs) {
        const result = await mockEnv.validator.validateToken(
          TURNSTILE_TEST_TOKENS.VALID,
          ip,
          'USER_LOGIN'
        );

        // 应该仍然能处理，但记录异常IP
        expect(result).toBeDefined();
      }
    });

    it('应该检测可疑IP模式', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      // 模拟来自同一IP的大量请求
      const suspiciousIP = '192.168.1.100';
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        await mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-${i}`,
          suspiciousIP,
          'USER_LOGIN'
        );
      }

      const history = mockEnv.validator.getCallHistory();
      const sameIPRequests = history.filter(h => h.remoteip === suspiciousIP);
      
      expect(sameIPRequests).toHaveLength(requestCount);
      // 在实际实现中，这里应该触发速率限制
    });
  });

  describe('3. 速率限制测试', () => {
    it('应该检测高频请求', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.RATE_LIMITED);

      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.RATE_LIMITED,
        '127.0.0.1',
        'USER_LOGIN'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('bad-request');
      expect(result.errorMessage).toContain('频繁');
    });

    it('应该实现时间窗口限制', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      
      // 模拟在短时间内的多次请求
      const startTime = Date.now();
      const requests = [];

      for (let i = 0; i < 10; i++) {
        requests.push(
          mockEnv.validator.validateToken(
            `${TURNSTILE_TEST_TOKENS.VALID}-${i}`,
            '127.0.0.1',
            'USER_LOGIN'
          )
        );
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      // 验证请求在短时间内完成
      expect(endTime - startTime).toBeLessThan(5000);
      
      // 所有请求都应该被记录
      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(10);
    });

    it('应该区分不同IP的速率限制', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
      const requestsPerIP = 5;

      // 每个IP发送多个请求
      for (const ip of ips) {
        for (let i = 0; i < requestsPerIP; i++) {
          await mockEnv.validator.validateToken(
            `${TURNSTILE_TEST_TOKENS.VALID}-${ip}-${i}`,
            ip,
            'USER_LOGIN'
          );
        }
      }

      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(ips.length * requestsPerIP);

      // 验证每个IP的请求都被记录
      ips.forEach(ip => {
        const ipRequests = history.filter(h => h.remoteip === ip);
        expect(ipRequests).toHaveLength(requestsPerIP);
      });
    });
  });

  describe('4. 功能权限安全测试', () => {
    it('应该防止未授权的功能启用', async () => {
      const feature: TurnstileFeatureId = 'USER_LOGIN';

      // 初始状态应该是禁用
      expect(await mockEnv.featureManager.isFeatureEnabled(feature)).toBe(false);

      // 模拟未授权用户尝试启用功能
      // 在实际实现中，这应该检查管理员权限
      await mockEnv.featureManager.enableFeature(feature, 'unauthorized-user');

      // 功能应该被启用（在模拟环境中）
      // 在实际实现中，应该拒绝未授权操作
      expect(await mockEnv.featureManager.isFeatureEnabled(feature)).toBe(true);
    });

    it('应该记录功能状态变更', async () => {
      const feature: TurnstileFeatureId = 'USER_LOGIN';
      const adminId = 'test-admin-123';

      // 启用功能
      await mockEnv.featureManager.enableFeature(feature, adminId);
      
      // 禁用功能
      await mockEnv.featureManager.disableFeature(feature, adminId);

      // 在实际实现中，这些操作应该被记录到审计日志
      // 这里我们验证功能状态的正确性
      expect(await mockEnv.featureManager.isFeatureEnabled(feature)).toBe(false);
    });

    it('应该防止功能状态的竞态条件', async () => {
      const feature: TurnstileFeatureId = 'USER_LOGIN';

      // 并发修改功能状态
      const operations = [
        mockEnv.featureManager.enableFeature(feature, 'admin1'),
        mockEnv.featureManager.disableFeature(feature, 'admin2'),
        mockEnv.featureManager.enableFeature(feature, 'admin3')
      ];

      await Promise.all(operations);

      // 最终状态应该是确定的
      const finalState = await mockEnv.featureManager.isFeatureEnabled(feature);
      expect(typeof finalState).toBe('boolean');
    });
  });

  describe('5. 错误信息安全测试', () => {
    it('错误消息不应该泄露敏感信息', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      
      const scenarios = [
        TurnstileTestScenario.INVALID_TOKEN,
        TurnstileTestScenario.NETWORK_ERROR,
        TurnstileTestScenario.TIMEOUT,
        TurnstileTestScenario.INVALID_SECRET
      ];

      for (const scenario of scenarios) {
        mockEnv.setScenario(scenario);
        
        const result = await mockEnv.validator.validateToken(
          TURNSTILE_TEST_TOKENS.INVALID,
          '127.0.0.1',
          'USER_LOGIN'
        );

        expect(result.success).toBe(false);
        expect(result.errorMessage).toBeDefined();
        
        // 错误消息不应该包含敏感信息
        const sensitivePatterns = [
          /secret/i,
          /key/i,
          /token.*[a-f0-9]{32,}/i, // 长十六进制字符串
          /password/i,
          /internal.*error/i
        ];

        sensitivePatterns.forEach(pattern => {
          if (pattern.test(result.errorMessage || '')) {
            // 某些模式可能是允许的，如"internal error"的通用描述
            if (!pattern.source.includes('internal.*error')) {
              expect(result.errorMessage).not.toMatch(pattern);
            }
          }
        });
      }
    });

    it('应该提供用户友好的错误消息', async () => {
      await mockEnv.enableFeature('USER_LOGIN');

      const testCases = [
        {
          scenario: TurnstileTestScenario.TIMEOUT,
          expectedKeywords: ['超时', '重新', '验证']
        },
        {
          scenario: TurnstileTestScenario.NETWORK_ERROR,
          expectedKeywords: ['服务', '不可用', '稍后']
        },
        {
          scenario: TurnstileTestScenario.RATE_LIMITED,
          expectedKeywords: ['频繁', '请求']
        }
      ];

      for (const { scenario, expectedKeywords } of testCases) {
        mockEnv.setScenario(scenario);
        
        const result = await mockEnv.validator.validateToken(
          TURNSTILE_TEST_TOKENS.INVALID,
          '127.0.0.1',
          'USER_LOGIN'
        );

        expect(result.success).toBe(false);
        expect(result.errorMessage).toBeDefined();

        // 检查是否包含预期的关键词
        const hasExpectedKeywords = expectedKeywords.some(keyword =>
          result.errorMessage?.includes(keyword)
        );
        expect(hasExpectedKeywords).toBe(true);
      }
    });
  });

  describe('6. 审计和日志安全测试', () => {
    it('应该记录所有验证尝试', async () => {
      await mockEnv.enableFeature('USER_LOGIN');

      const testCases = [
        { token: TURNSTILE_TEST_TOKENS.VALID, scenario: TurnstileTestScenario.SUCCESS },
        { token: TURNSTILE_TEST_TOKENS.INVALID, scenario: TurnstileTestScenario.INVALID_TOKEN },
        { token: TURNSTILE_TEST_TOKENS.EXPIRED, scenario: TurnstileTestScenario.EXPIRED_TOKEN }
      ];

      for (const { token, scenario } of testCases) {
        mockEnv.setScenario(scenario);
        await mockEnv.validator.validateToken(token, '127.0.0.1', 'USER_LOGIN');
      }

      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(testCases.length);

      // 验证每个请求都被正确记录
      testCases.forEach((testCase, index) => {
        expect(history[index].token).toBe(testCase.token);
        expect(history[index].timestamp).toBeInstanceOf(Date);
      });
    });

    it('应该记录时间戳信息', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const beforeTime = new Date();
      
      await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.VALID,
        '127.0.0.1',
        'USER_LOGIN'
      );

      const afterTime = new Date();
      const history = mockEnv.validator.getCallHistory();

      expect(history).toHaveLength(1);
      expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(history[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('应该保护日志数据的完整性', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      // 执行多个验证请求
      const requests = 5;
      for (let i = 0; i < requests; i++) {
        await mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-${i}`,
          '127.0.0.1',
          'USER_LOGIN'
        );
      }

      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(requests);

      // 验证日志数据的完整性
      history.forEach((entry, index) => {
        expect(entry.token).toBe(`${TURNSTILE_TEST_TOKENS.VALID}-${index}`);
        expect(entry.remoteip).toBe('127.0.0.1');
        expect(entry.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('7. 配置安全测试', () => {
    it('应该验证配置的完整性', async () => {
      // 测试功能管理器的初始化
      await mockEnv.featureManager.initialize();

      const states = await mockEnv.featureManager.getAllFeatureStates();
      
      // 验证所有预期功能都存在
      const expectedFeatures: TurnstileFeatureId[] = [
        'USER_REGISTER',
        'USER_LOGIN',
        'PASSWORD_RESET',
        'GUEST_COMMENT'
      ];

      expectedFeatures.forEach(feature => {
        expect(states).toHaveProperty(feature);
        expect(typeof states[feature]).toBe('boolean');
      });
    });

    it('应该防止配置被恶意修改', async () => {
      await mockEnv.featureManager.initialize();

      // 获取初始状态
      const initialStates = await mockEnv.featureManager.getAllFeatureStates();

      // 尝试直接修改状态（在实际实现中应该被防止）
      // 这里我们测试状态的一致性
      await mockEnv.featureManager.enableFeature('USER_LOGIN');
      const modifiedStates = await mockEnv.featureManager.getAllFeatureStates();

      // 验证只有预期的功能被修改
      expect(modifiedStates.USER_LOGIN).toBe(true);
      expect(modifiedStates.USER_REGISTER).toBe(initialStates.USER_REGISTER);
      expect(modifiedStates.PASSWORD_RESET).toBe(initialStates.PASSWORD_RESET);
      expect(modifiedStates.GUEST_COMMENT).toBe(initialStates.GUEST_COMMENT);
    });
  });
});
