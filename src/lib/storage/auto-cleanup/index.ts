/**
 * @fileoverview 自动清理服务模块导出
 * @description 统一导出自动清理服务的所有组件和类型
 */

// 主服务类
export { AutoCleanupService, autoCleanupService } from '../auto-cleanup-service';
import type { CleanupStrategy } from './types';
import { AutoCleanupService } from '../auto-cleanup-service';
import { CleanupStrategyManager, DEFAULT_CLEANUP_STRATEGY } from './strategies/cleanup-strategy';
import { FileLockManager } from './utils/file-lock-manager';
import { FileScanner } from './utils/file-scanner';
import { ReportManager } from './utils/report-manager';

// 类型定义
export type {
  CleanupStrategy,
  CleanupTaskResult,
  CleanupReport,
  CleanupTaskContext,
  CleanupTaskConfig,
  FileInfo,
  FileLock,
  ServiceStatus,
  CleanupEventType,
  CleanupEventData,
  CleanupStatistics,
  CleanupResultDetail,
  ICleanupTask,
  IFileLockManager,
  IReportManager,
  BackupConfig,
  SafetyCheckConfig,
  ScanOptions,
  FileType,
  CleanupMode,
  CleanupTaskPriority,
  CleanupTaskStatus,
} from './types';

// 策略管理
export { 
  CleanupStrategyManager, 
  DEFAULT_CLEANUP_STRATEGY, 
  PRESET_STRATEGIES 
} from './strategies/cleanup-strategy';

// 工具类
export { FileLockManager } from './utils/file-lock-manager';
export { FileScanner } from './utils/file-scanner';
export { ReportManager } from './utils/report-manager';

// 任务类
export { BaseCleanupTask } from './tasks/base-cleanup-task';
export { 
  ChunkFilesCleanupTask,
  OrphanFilesCleanupTask,
  LogFilesCleanupTask,
  BackupFilesCleanupTask,
  FailedUploadsCleanupTask,
  TempProcessingFilesCleanupTask,
  CleanupTaskFactory
} from './tasks/cleanup-tasks';

/**
 * 便捷的工厂函数
 */
export const createAutoCleanupService = (strategy?: Partial<CleanupStrategy>) => {
  return AutoCleanupService.getInstance(strategy);
};

/**
 * 获取默认清理策略
 */
export const getDefaultCleanupStrategy = (): CleanupStrategy => {
  return { ...DEFAULT_CLEANUP_STRATEGY };
};

/**
 * 创建文件锁管理器实例
 */
export const createFileLockManager = () => {
  return FileLockManager.getInstance();
};

/**
 * 创建报告管理器实例
 */
export const createReportManager = () => {
  return ReportManager.getInstance();
};

/**
 * 创建文件扫描器实例
 */
export const createFileScanner = () => {
  return FileScanner.getInstance();
};

/**
 * 创建策略管理器
 */
export const createStrategyManager = (strategy?: Partial<CleanupStrategy>) => {
  return new CleanupStrategyManager(strategy);
};
