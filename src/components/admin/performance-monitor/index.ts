/**
 * @fileoverview 性能监控模块索引
 * @description 统一导出性能监控相关的组件、服务和类型
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出服务
export { 
  PerformanceService, 
  createPerformanceService 
} from './services/performance-service';

// 导出组件
export { 
  MetricsCards, 
  MetricsCardsSkeleton 
} from './components/MetricsCards';

export { 
  PerformanceOverview, 
  PerformanceOverviewSkeleton 
} from './components/PerformanceOverview';

// 导出类型
export type {
  PerformanceStatus,
  CacheMetrics,
  DatabaseMetrics,
  StorageMetrics,
  SystemMetrics,
  UploadMetrics,
  PerformanceMetrics,
  PerformanceThresholds,
} from './services/performance-service';

export type {
  MetricsCardsProps,
} from './components/MetricsCards';

export type {
  PerformanceOverviewProps,
} from './components/PerformanceOverview';
