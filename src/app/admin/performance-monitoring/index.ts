/**
 * @fileoverview 性能监控模块统一导出
 * @description 提供向后兼容的API和新的模块化接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0
 * @since 1.0.0
 */

// 导出所有类型定义
export * from './types';

// 导出常量和配置
export * from './constants';

// 导出工具函数
export { ReportUtils } from './utils/reportUtils';

// 导出Hooks
export { usePerformanceData } from './hooks/usePerformanceData';
export { usePerformanceActions } from './hooks/usePerformanceActions';

// 导出组件
export { PageHeader } from './components/PageHeader';
export { StatusBar } from './components/StatusBar';
export { OverviewTab } from './components/OverviewTab';
export { EnhancedTab } from './components/EnhancedTab';
export { SystemTab } from './components/SystemTab';
export { ChartsTab } from './components/ChartsTab';
export { ReportsTab } from './components/ReportsTab';
export { QueriesTab } from './components/QueriesTab';
export { PerformanceMonitoringPage } from './components/PerformanceMonitoringPage';

// 默认导出主页面组件
export { PerformanceMonitoringPage as default } from './components/PerformanceMonitoringPage';
