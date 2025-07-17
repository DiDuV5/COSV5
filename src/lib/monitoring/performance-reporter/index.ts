/**
 * @fileoverview 性能报告器模块统一导出
 * @description 重构后的模块化性能报告系统入口
 * @author Augment AI
 * @date 2025-07-06
 * @version 3.0.0 (重构版本)
 */

// 导出类型定义
export * from './types';

// 导出常量
export * from './constants';

// 导出核心类
export { ReportGenerator } from './core/ReportGenerator';
export { AlertManager } from './core/AlertManager';

// 导出格式化器
export { MarkdownFormatter } from './formatters/MarkdownFormatter';
export { JsonFormatter } from './formatters/JsonFormatter';

// 导出分析器
export { RecommendationAnalyzer } from './analyzers/RecommendationAnalyzer';
export { MetricsAnalyzer } from './analyzers/MetricsAnalyzer';

// 导出服务
export { HealthCheckService } from './services/HealthCheckService';

// 导出主报告器类
export { PerformanceReporter, performanceReporter } from './PerformanceReporter';

// 默认导出主报告器类
export { PerformanceReporter as default } from './PerformanceReporter';
