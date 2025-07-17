/**
 * @fileoverview Turnstile监控系统测试
 * @description 测试Turnstile监控和告警功能
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import {
  TurnstileMonitor,
  AlertLevel,
  type AlertEvent
} from '@/lib/security/turnstile-monitoring';
import type { TurnstileFeatureId } from '@/types/turnstile';

describe('TurnstileMonitor', () => {
  let monitor: TurnstileMonitor;
  let alertEvents: AlertEvent[] = [];

  beforeEach(() => {
    // 重置单例实例
    (TurnstileMonitor as any).instance = undefined;
    monitor = TurnstileMonitor.getInstance();

    // 重置告警事件
    alertEvents = [];

    // 添加测试告警处理器
    monitor.addAlertHandler(async (event: AlertEvent) => {
      alertEvents.push(event);
    });

    // 重置指标
    monitor.resetMetrics();
  });

  describe('基本功能测试', () => {
    test('应该正确初始化监控器', () => {
      expect(monitor).toBeInstanceOf(TurnstileMonitor);
    });

    test('应该记录验证事件', () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      monitor.recordValidation(featureId, true, 1000, false);

      const metrics = monitor.getFeatureMetrics(featureId);
      expect(metrics).not.toBeNull();
      expect(metrics?.validations).toBe(1);
      expect(metrics?.successes).toBe(1);
      expect(metrics?.failures).toBe(0);
      expect(metrics?.fallbacks).toBe(0);
      expect(metrics?.averageResponseTime).toBe(1000);
    });

    test('应该正确计算平均响应时间', () => {
      const featureId: TurnstileFeatureId = 'USER_REGISTER';

      monitor.recordValidation(featureId, true, 1000, false);
      monitor.recordValidation(featureId, true, 2000, false);
      monitor.recordValidation(featureId, true, 3000, false);

      const metrics = monitor.getFeatureMetrics(featureId);
      expect(metrics?.averageResponseTime).toBe(2000);
    });
  });

  describe('全局指标测试', () => {
    test('应该正确更新全局指标', () => {
      const featureId: TurnstileFeatureId = 'GUEST_COMMENT';

      monitor.recordValidation(featureId, true, 500, false);
      monitor.recordValidation(featureId, false, 1500, false);
      monitor.recordValidation(featureId, true, 800, true);

      const globalMetrics = monitor.getGlobalMetrics();
      expect(globalMetrics.totalValidations).toBe(3);
      expect(globalMetrics.successfulValidations).toBe(2);
      expect(globalMetrics.failedValidations).toBe(1);
      expect(globalMetrics.fallbackUsages).toBe(1);
      expect(Math.round(globalMetrics.averageResponseTime * 100) / 100).toBe(933.33); // (500+1500+800)/3
    });

    test('应该正确重置指标', () => {
      const featureId: TurnstileFeatureId = 'CONTENT_PUBLISH';

      monitor.recordValidation(featureId, true, 1000, false);
      monitor.resetMetrics();

      const globalMetrics = monitor.getGlobalMetrics();
      expect(globalMetrics.totalValidations).toBe(0);

      const featureMetrics = monitor.getFeatureMetrics(featureId);
      expect(featureMetrics).toBeNull();
    });
  });

  describe('健康状态测试', () => {
    test('应该报告健康状态', () => {
      const featureId: TurnstileFeatureId = 'FILE_UPLOAD';

      // 记录成功的验证
      for (let i = 0; i < 10; i++) {
        monitor.recordValidation(featureId, true, 1000, false);
      }

      const health = monitor.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.details.successRate).toBe(1.0);
      expect(health.details.fallbackRate).toBe(0);
    });

    test('应该检测到降级状态', () => {
      const featureId: TurnstileFeatureId = 'PASSWORD_RESET';

      // 记录一些成功和降级的验证
      monitor.recordValidation(featureId, true, 1000, false);
      monitor.recordValidation(featureId, true, 1000, true);
      monitor.recordValidation(featureId, true, 1000, true);

      const health = monitor.getHealthStatus();
      expect(health.status).toBe('degraded');
      expect(health.details.fallbackRate).toBeGreaterThan(0.3);
    });

    test('应该检测到不健康状态', () => {
      const featureId: TurnstileFeatureId = 'ADMIN_OPERATIONS';

      // 记录大量失败
      for (let i = 0; i < 10; i++) {
        monitor.recordValidation(featureId, false, 5000, false);
      }

      const health = monitor.getHealthStatus();
      expect(health.status).toBe('unhealthy');
      expect(health.details.successRate).toBe(0);
    });
  });

  describe('告警系统测试', () => {
    test('应该在成功率过低时触发告警', async () => {
      const featureId: TurnstileFeatureId = 'USER_LOGIN';

      // 记录低成功率的验证（2成功8失败）
      monitor.recordValidation(featureId, true, 1000, false);
      monitor.recordValidation(featureId, true, 1000, false);
      for (let i = 0; i < 8; i++) {
        monitor.recordValidation(featureId, false, 2000, false);
      }

      // 等待告警处理
      await new Promise(resolve => setTimeout(resolve, 200));

      const successRateAlerts = alertEvents.filter(
        event => event.title.includes('成功率过低')
      );
      expect(successRateAlerts.length).toBeGreaterThan(0);
      expect(successRateAlerts[0].level).toBe(AlertLevel.WARNING);
    }, 15000);

    test('应该在降级使用率过高时触发告警', async () => {
      const featureId: TurnstileFeatureId = 'GUEST_COMMENT';

      // 记录高降级使用率（3正常2降级）
      monitor.recordValidation(featureId, true, 1000, false);
      monitor.recordValidation(featureId, true, 1000, false);
      monitor.recordValidation(featureId, true, 1000, false);
      monitor.recordValidation(featureId, true, 500, true);
      monitor.recordValidation(featureId, true, 500, true);

      // 等待告警处理
      await new Promise(resolve => setTimeout(resolve, 200));

      const fallbackAlerts = alertEvents.filter(
        event => event.title.includes('降级使用率过高')
      );
      expect(fallbackAlerts.length).toBeGreaterThan(0);
      expect(fallbackAlerts[0].level).toBe(AlertLevel.ERROR);
    }, 15000);

    test('应该在响应时间过长时触发告警', async () => {
      const featureId: TurnstileFeatureId = 'CONTENT_PUBLISH';

      // 记录长响应时间
      for (let i = 0; i < 5; i++) {
        monitor.recordValidation(featureId, true, 6000, false);
      }

      // 等待告警处理
      await new Promise(resolve => setTimeout(resolve, 200));

      const responseTimeAlerts = alertEvents.filter(
        event => event.title.includes('响应时间过长')
      );
      expect(responseTimeAlerts.length).toBeGreaterThan(0);
      expect(responseTimeAlerts[0].level).toBe(AlertLevel.WARNING);
    }, 15000);

    test('应该正确处理告警处理器异常', async () => {
      // 添加会抛出异常的告警处理器
      monitor.addAlertHandler(async () => {
        throw new Error('Handler error');
      });

      const featureId: TurnstileFeatureId = 'FILE_UPLOAD';

      // 触发告警条件
      for (let i = 0; i < 10; i++) {
        monitor.recordValidation(featureId, false, 1000, false);
      }

      // 不应该抛出未捕获的异常
      await new Promise(resolve => setTimeout(resolve, 200));

      // 其他告警处理器仍应正常工作
      expect(alertEvents.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('报告生成测试', () => {
    test('应该生成完整的监控报告', () => {
      const featureId: TurnstileFeatureId = 'PAYMENT_PROCESS';

      // 记录一些数据
      monitor.recordValidation(featureId, true, 1000, false);
      monitor.recordValidation(featureId, false, 2000, false);
      monitor.recordValidation(featureId, true, 800, true);

      const report = monitor.generateReport();

      expect(report.summary).toBeDefined();
      expect(report.features).toHaveLength(1);
      expect(report.health).toBeDefined();
      expect(report.fallbackStates).toBeDefined();

      expect(report.summary.totalValidations).toBe(3);
      expect(report.features[0].featureId).toBe(featureId);
      expect(report.health.status).toBeDefined();
    });

    test('应该返回所有功能的指标', () => {
      const features: TurnstileFeatureId[] = ['USER_LOGIN', 'USER_REGISTER', 'GUEST_COMMENT'];

      features.forEach((featureId, index) => {
        monitor.recordValidation(featureId, true, 1000 + index * 100, false);
      });

      const allMetrics = monitor.getAllFeatureMetrics();
      expect(allMetrics).toHaveLength(3);

      features.forEach(featureId => {
        const metrics = allMetrics.find(m => m.featureId === featureId);
        expect(metrics).toBeDefined();
      });
    });
  });

  describe('边界条件测试', () => {
    test('应该处理零验证的情况', () => {
      const health = monitor.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.details.successRate).toBe(1);
      expect(health.details.fallbackRate).toBe(0);
    });

    test('应该处理不存在的功能指标', () => {
      const nonExistentFeature = 'NON_EXISTENT' as TurnstileFeatureId;
      const metrics = monitor.getFeatureMetrics(nonExistentFeature);
      expect(metrics).toBeNull();
    });

    test('应该正确处理极端响应时间', () => {
      const featureId: TurnstileFeatureId = 'ADMIN_OPERATIONS';

      // 记录极端响应时间
      monitor.recordValidation(featureId, true, 0, false);
      monitor.recordValidation(featureId, true, 100000, false);

      const metrics = monitor.getFeatureMetrics(featureId);
      expect(metrics?.averageResponseTime).toBe(50000);
    });
  });

  describe('并发测试', () => {
    test('应该处理并发的验证记录', () => {
      const featureId: TurnstileFeatureId = 'CONTENT_PUBLISH';

      // 并发记录验证事件
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(monitor.recordValidation(featureId, i % 2 === 0, 1000, false))
      );

      return Promise.all(promises).then(() => {
        const metrics = monitor.getFeatureMetrics(featureId);
        expect(metrics?.validations).toBe(100);
        expect(metrics?.successes).toBe(50);
        expect(metrics?.failures).toBe(50);
      });
    });
  });
});
