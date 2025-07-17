/**
 * @fileoverview Prisma性能监控中间件
 * @description 用于Prisma的性能监控中间件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { DatabasePerformanceMonitor } from '../monitoring/PerformanceMonitor';

/**
 * 创建Prisma性能监控中间件
 * @returns Prisma中间件函数
 */
export function createPerformanceMiddleware() {
  const monitor = DatabasePerformanceMonitor.getInstance();

  return async (params: any, next: any) => {
    const startTime = Date.now();
    const { model, action, args } = params;

    try {
      const result = await next(params);
      const duration = Date.now() - startTime;

      // 记录成功的查询
      monitor.recordQuery(model || 'unknown', action, duration, args);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 记录失败的查询
      monitor.recordQuery(model || 'unknown', action, duration, {
        ...args,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  };
}
