/**
 * @fileoverview 数据库测试模块统一导出
 * @description 重构后的模块化数据库测试系统入口
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 (重构版本)
 */

// 导出类型定义
export * from './types';

// 导出常量
export * from './constants';

// 导出工具函数
export * from './utils/testUtils';
export * from './utils/formatUtils';

// 导出Hooks
export { useDatabaseTests } from './hooks/useDatabaseTests';
export { useDatabaseStats } from './hooks/useDatabaseStats';

// 导出组件
export { PageHeader } from './components/PageHeader';
export { TestListCard } from './components/TestListCard';
export { TestOverviewCard } from './components/TestOverviewCard';
export { DatabaseStatsCard } from './components/DatabaseStatsCard';
export { PerformanceCard } from './components/PerformanceCard';
export { DatabaseInfoCard } from './components/DatabaseInfoCard';
export { QuickLinksSection } from './components/QuickLinksSection';
export { DatabaseTestPage } from './components/DatabaseTestPage';

// 默认导出主页面组件
export { DatabaseTestPage as default } from './components/DatabaseTestPage';
