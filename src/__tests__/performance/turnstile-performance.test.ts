/**
 * @fileoverview Turnstile性能测试套件
 * @description 测试Turnstile系统的性能指标和负载能力
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

// 性能测试配置
const PERFORMANCE_THRESHOLDS = {
  RESPONSE_TIME_P50: 200,    // 50%响应时间 <200ms
  RESPONSE_TIME_P95: 500,    // 95%响应时间 <500ms
  RESPONSE_TIME_P99: 1000,   // 99%响应时间 <1000ms
  CONCURRENT_REQUESTS: 50,   // 并发请求数
  SUCCESS_RATE: 0.99,        // 成功率 >99%
  THROUGHPUT: 100            // 吞吐量 >100 req/s
};

describe('Turnstile性能测试套件', () => {
  let mockEnv: ReturnType<typeof createTurnstileMockEnvironment>;

  beforeEach(() => {
    mockEnv = createTurnstileMockEnvironment();
  });

  afterEach(() => {
    mockEnv.reset();
    jest.clearAllMocks();
  });

  describe('1. 响应时间测试', () => {
    it('单个验证请求响应时间应该在阈值内', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);
      mockEnv.validator.setResponseDelay(50); // 模拟50ms延迟

      const startTime = Date.now();
      const result = await mockEnv.validator.validateToken(
        TURNSTILE_TEST_TOKENS.VALID,
        '127.0.0.1',
        'USER_LOGIN'
      );
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME_P50);
      expect(result.responseTime).toBeGreaterThan(40); // 应该记录实际响应时间
    });

    it('批量验证请求的响应时间分布', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);
      mockEnv.validator.setResponseDelay(100);

      const requestCount = 20;
      const responseTimes: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        const result = await mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-${i}`,
          '127.0.0.1',
          'USER_LOGIN'
        );
        const endTime = Date.now();

        responseTimes.push(endTime - startTime);
        expect(result.success).toBe(true);
      }

      // 计算百分位数
      responseTimes.sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(requestCount * 0.5)];
      const p95 = responseTimes[Math.floor(requestCount * 0.95)];
      const p99 = responseTimes[Math.floor(requestCount * 0.99)];

      expect(p50).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME_P50);
      expect(p95).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME_P95);
      expect(p99).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME_P99);

      console.log(`性能指标 - P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
    });

    it('不同功能的响应时间对比', async () => {
      const features: TurnstileFeatureId[] = ['USER_LOGIN', 'USER_REGISTER', 'PASSWORD_RESET', 'GUEST_COMMENT'];
      const results: Record<string, number[]> = {};

      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);
      mockEnv.validator.setResponseDelay(80);

      for (const feature of features) {
        await mockEnv.enableFeature(feature);
        results[feature] = [];

        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          await mockEnv.validator.validateToken(
            `${TURNSTILE_TEST_TOKENS.VALID}-${feature}-${i}`,
            '127.0.0.1',
            feature
          );
          const endTime = Date.now();

          results[feature].push(endTime - startTime);
        }
      }

      // 验证所有功能的响应时间都在合理范围内
      for (const feature of features) {
        const avgTime = results[feature].reduce((a, b) => a + b, 0) / results[feature].length;
        expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME_P50);
        console.log(`${feature} 平均响应时间: ${avgTime.toFixed(2)}ms`);
      }
    });
  });

  describe('2. 并发性能测试', () => {
    it('应该处理并发验证请求', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);
      mockEnv.validator.setResponseDelay(100);

      const concurrentRequests = PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS;
      const startTime = Date.now();

      // 创建并发请求
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-concurrent-${i}`,
          '127.0.0.1',
          'USER_LOGIN'
        )
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const throughput = (concurrentRequests / totalTime) * 1000; // req/s

      // 验证所有请求都成功
      results.forEach((result: any) => {
        expect(result.success).toBe(true);
      });

      // 验证吞吐量
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.THROUGHPUT);

      // 验证并发请求的总时间合理
      expect(totalTime).toBeLessThan(concurrentRequests * 50); // 应该比串行快很多

      console.log(`并发性能 - ${concurrentRequests}个请求，总时间: ${totalTime}ms，吞吐量: ${throughput.toFixed(2)} req/s`);
    });

    it('高并发下的成功率测试', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const highConcurrency = 100;
      const promises = Array.from({ length: highConcurrency }, (_, i) =>
        mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-high-concurrent-${i}`,
          `192.168.1.${(i % 254) + 1}`, // 不同IP
          'USER_LOGIN'
        )
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r: any) => r.success).length;
      const successRate = successCount / highConcurrency;

      expect(successRate).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SUCCESS_RATE);
      console.log(`高并发成功率: ${(successRate * 100).toFixed(2)}% (${successCount}/${highConcurrency})`);
    });

    it('混合场景并发测试', async () => {
      // 启用所有功能
      const features: TurnstileFeatureId[] = ['USER_LOGIN', 'USER_REGISTER', 'PASSWORD_RESET', 'GUEST_COMMENT'];
      for (const feature of features) {
        await mockEnv.enableFeature(feature);
      }

      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const requestsPerFeature = 10;
      const allPromises: Promise<any>[] = [];

      // 为每个功能创建并发请求
      features.forEach((feature, featureIndex) => {
        for (let i = 0; i < requestsPerFeature; i++) {
          allPromises.push(
            mockEnv.validator.validateToken(
              `${TURNSTILE_TEST_TOKENS.VALID}-mixed-${feature}-${i}`,
              `10.0.${featureIndex}.${i + 1}`,
              feature
            )
          );
        }
      });

      const startTime = Date.now();
      const results = await Promise.all(allPromises);
      const endTime = Date.now();

      const totalRequests = features.length * requestsPerFeature;
      const successCount = results.filter((r: any) => r.success).length;
      const successRate = successCount / totalRequests;
      const totalTime = endTime - startTime;
      const throughput = (totalRequests / totalTime) * 1000;

      expect(successRate).toBeGreaterThan(PERFORMANCE_THRESHOLDS.SUCCESS_RATE);
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.THROUGHPUT / 2); // 混合场景可以稍低

      console.log(`混合场景 - 总请求: ${totalRequests}, 成功率: ${(successRate * 100).toFixed(2)}%, 吞吐量: ${throughput.toFixed(2)} req/s`);
    });
  });

  describe('3. 内存和资源使用测试', () => {
    it('长时间运行不应该出现内存泄漏', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      // 执行大量验证请求
      for (let i = 0; i < iterations; i++) {
        await mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-memory-${i}`,
          '127.0.0.1',
          'USER_LOGIN'
        );

        // 每100次请求检查一次内存
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage();
          const heapGrowth = currentMemory.heapUsed - initialMemory.heapUsed;

          // 内存增长不应该超过合理范围
          expect(heapGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
        }
      }

      const finalMemory = process.memoryUsage();
      const totalHeapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`内存使用 - 初始: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, 最终: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, 增长: ${(totalHeapGrowth / 1024 / 1024).toFixed(2)}MB`);

      // 总内存增长应该在合理范围内
      expect(totalHeapGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
    });

    it('验证历史记录的内存管理', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const requestCount = 500;

      // 生成大量验证记录
      for (let i = 0; i < requestCount; i++) {
        await mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-history-${i}`,
          '127.0.0.1',
          'USER_LOGIN'
        );
      }

      const history = mockEnv.validator.getCallHistory();
      expect(history).toHaveLength(requestCount);

      // 清理历史记录
      mockEnv.validator.clearHistory();
      const clearedHistory = mockEnv.validator.getCallHistory();
      expect(clearedHistory).toHaveLength(0);

      console.log(`历史记录管理 - 生成${requestCount}条记录，清理后剩余${clearedHistory.length}条`);
    });
  });

  describe('4. 功能管理器性能测试', () => {
    it('功能状态查询性能', async () => {
      await mockEnv.featureManager.initialize();

      const queryCount = 1000;
      const features: TurnstileFeatureId[] = ['USER_LOGIN', 'USER_REGISTER', 'PASSWORD_RESET', 'GUEST_COMMENT'];

      const startTime = Date.now();

      // 大量功能状态查询
      for (let i = 0; i < queryCount; i++) {
        const feature = features[i % features.length];
        await mockEnv.featureManager.isFeatureEnabled(feature);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / queryCount;

      expect(avgTime).toBeLessThan(1); // 平均每次查询 <1ms
      console.log(`功能状态查询 - ${queryCount}次查询，总时间: ${totalTime}ms，平均: ${avgTime.toFixed(3)}ms`);
    });

    it('功能状态修改性能', async () => {
      await mockEnv.featureManager.initialize();

      const modificationCount = 100;
      const features: TurnstileFeatureId[] = ['USER_LOGIN', 'USER_REGISTER', 'PASSWORD_RESET', 'GUEST_COMMENT'];

      const startTime = Date.now();

      // 大量功能状态修改
      for (let i = 0; i < modificationCount; i++) {
        const feature = features[i % features.length];
        const enable = i % 2 === 0;

        if (enable) {
          await mockEnv.featureManager.enableFeature(feature, `admin-${i}`);
        } else {
          await mockEnv.featureManager.disableFeature(feature, `admin-${i}`);
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / modificationCount;

      expect(avgTime).toBeLessThan(10); // 平均每次修改 <10ms
      console.log(`功能状态修改 - ${modificationCount}次修改，总时间: ${totalTime}ms，平均: ${avgTime.toFixed(3)}ms`);
    });

    it('批量功能状态查询性能', async () => {
      await mockEnv.featureManager.initialize();

      const batchCount = 100;
      const startTime = Date.now();

      // 批量查询所有功能状态
      for (let i = 0; i < batchCount; i++) {
        await mockEnv.featureManager.getAllFeatureStates();
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / batchCount;

      expect(avgTime).toBeLessThan(5); // 平均每次批量查询 <5ms
      console.log(`批量功能状态查询 - ${batchCount}次查询，总时间: ${totalTime}ms，平均: ${avgTime.toFixed(3)}ms`);
    });
  });

  describe('5. 错误场景性能测试', () => {
    it('验证失败场景的响应时间', async () => {
      await mockEnv.enableFeature('USER_LOGIN');

      const errorScenarios = [
        TurnstileTestScenario.INVALID_TOKEN,
        TurnstileTestScenario.TIMEOUT,
        TurnstileTestScenario.NETWORK_ERROR,
        TurnstileTestScenario.RATE_LIMITED
      ];

      for (const scenario of errorScenarios) {
        mockEnv.setScenario(scenario);

        const responseTimes: number[] = [];
        const requestCount = 10;

        for (let i = 0; i < requestCount; i++) {
          const startTime = Date.now();
          const result = await mockEnv.validator.validateToken(
            TURNSTILE_TEST_TOKENS.INVALID,
            '127.0.0.1',
            'USER_LOGIN'
          );
          const endTime = Date.now();

          responseTimes.push(endTime - startTime);
          expect(result.success).toBe(false);
        }

        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME_P50);

        console.log(`错误场景 ${scenario} - 平均响应时间: ${avgTime.toFixed(2)}ms`);
      }
    });

    it('混合成功失败场景的性能', async () => {
      await mockEnv.enableFeature('USER_LOGIN');

      const totalRequests = 100;
      const successRate = 0.8; // 80%成功率
      const successCount = Math.floor(totalRequests * successRate);
      const failureCount = totalRequests - successCount;

      const promises: Promise<any>[] = [];

      // 成功请求
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);
      for (let i = 0; i < successCount; i++) {
        promises.push(
          mockEnv.validator.validateToken(
            `${TURNSTILE_TEST_TOKENS.VALID}-mixed-${i}`,
            '127.0.0.1',
            'USER_LOGIN'
          )
        );
      }

      // 失败请求
      mockEnv.setScenario(TurnstileTestScenario.INVALID_TOKEN);
      for (let i = 0; i < failureCount; i++) {
        promises.push(
          mockEnv.validator.validateToken(
            `${TURNSTILE_TEST_TOKENS.INVALID}-mixed-${i}`,
            '127.0.0.1',
            'USER_LOGIN'
          )
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      const actualSuccessCount = results.filter(r => r.success).length;
      const actualSuccessRate = actualSuccessCount / totalRequests;
      const totalTime = endTime - startTime;
      const throughput = (totalRequests / totalTime) * 1000;

      expect(actualSuccessRate).toBeCloseTo(successRate, 1);
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.THROUGHPUT / 2);

      console.log(`混合场景性能 - 成功率: ${(actualSuccessRate * 100).toFixed(1)}%, 吞吐量: ${throughput.toFixed(2)} req/s`);
    });
  });

  describe('6. 压力测试', () => {
    it('极限并发压力测试', async () => {
      await mockEnv.enableFeature('USER_LOGIN');
      mockEnv.setScenario(TurnstileTestScenario.SUCCESS);

      const extremeConcurrency = 200;
      const startTime = Date.now();

      const promises = Array.from({ length: extremeConcurrency }, (_, i) =>
        mockEnv.validator.validateToken(
          `${TURNSTILE_TEST_TOKENS.VALID}-extreme-${i}`,
          `10.${Math.floor(i / 254)}.${Math.floor((i % 254) / 254)}.${(i % 254) + 1}`,
          'USER_LOGIN'
        )
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      const successCount = results.filter(r => r.success).length;
      const successRate = successCount / extremeConcurrency;
      const totalTime = endTime - startTime;
      const throughput = (extremeConcurrency / totalTime) * 1000;

      // 在极限压力下，成功率可能稍低，但应该保持在合理范围
      expect(successRate).toBeGreaterThan(0.95); // 95%

      console.log(`极限压力测试 - ${extremeConcurrency}并发，成功率: ${(successRate * 100).toFixed(2)}%, 吞吐量: ${throughput.toFixed(2)} req/s`);
    });
  });
});
