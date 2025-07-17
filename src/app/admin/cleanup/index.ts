/**
 * @fileoverview 清理页面模块索引
 * @description 统一导出清理页面相关的组件、服务和类型
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出服务
export { 
  CleanupService, 
  CleanupTaskType,
  createCleanupService 
} from './services/cleanup-service';

// 导出组件
export { 
  CleanupTasks, 
  CleanupTasksSkeleton 
} from './components/CleanupTasks';

export { 
  CleanupStats, 
  CleanupStatsSkeleton 
} from './components/CleanupStats';

// 导出类型
export type {
  CleanupStatus,
  DeduplicationStats,
  CleanupResult,
  TaskConfig,
} from './services/cleanup-service';

export type {
  CleanupTasksProps,
} from './components/CleanupTasks';

export type {
  CleanupStatsProps,
} from './components/CleanupStats';
