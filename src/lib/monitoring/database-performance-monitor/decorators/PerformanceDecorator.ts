/**
 * @fileoverview 性能监控装饰器
 * @description 用于方法级别的性能监控装饰器
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { DatabasePerformanceMonitor } from '../monitoring/PerformanceMonitor';

/**
 * 性能监控装饰器
 * @param model 模型名称
 * @param action 操作类型
 * @returns 装饰器函数
 */
export function withPerformanceMonitoring(
  model: string,
  action: string
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const monitor = DatabasePerformanceMonitor.getInstance();

    descriptor.value = async function (this: any, ...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        monitor.recordQuery(model, action, duration, args[0]);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        monitor.recordQuery(model, action, duration, {
          args: args[0],
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        throw error;
      }
    };

    return descriptor;
  };
}
