/**
 * @fileoverview 任务中心模块索引
 * @description 统一导出任务中心相关的组件、服务和类型
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出服务
export { TaskIconService, createTaskIconService } from './services/task-icon-service';
export { TaskDataService, createTaskDataService } from './services/task-data-service';

// 导出组件
export { TaskCard, CompactTaskCard, TaskCardSkeleton } from './components/TaskCard';
export { TaskFilter, SimpleTaskFilter } from './components/TaskFilter';

// 导出类型
export type {
  Task,
  TodayProgress,
  CategoryStats,
  TaskFilterOptions,
} from './services/task-data-service';

export type {
  TaskCardProps,
} from './components/TaskCard';

export type {
  TaskFilterProps,
} from './components/TaskFilter';
