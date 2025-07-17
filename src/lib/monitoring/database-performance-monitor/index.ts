/**
 * @fileoverview 数据库性能监控模块统一导出
 * @description 重构后的模块化数据库性能监控系统入口
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 (重构版本)
 */

// 导出类型定义
export * from './types';

// 导出常量
export * from './constants';

// 导出工具函数
export * from './utils/queryUtils';
export * from './utils/sanitizeUtils';
export * from './utils/hashUtils';

// 导出核心类
export { MetricsCollector } from './core/MetricsCollector';
export { StatsCalculator } from './core/StatsCalculator';
export { QueryAnalyzer } from './core/QueryAnalyzer';
export { MockDataGenerator } from './core/MockDataGenerator';

// 导出监控器
export { DatabasePerformanceMonitor } from './monitoring/PerformanceMonitor';

// 导出中间件和装饰器
export { createPerformanceMiddleware } from './middleware/PrismaMiddleware';
export { withPerformanceMonitoring } from './decorators/PerformanceDecorator';

// 默认导出主监控器类
export { DatabasePerformanceMonitor as default } from './monitoring/PerformanceMonitor';
