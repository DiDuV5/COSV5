/**
 * @fileoverview 清理服务类型定义
 * @description 定义清理服务相关的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 清理任务类型枚举
 */
export enum CleanupTaskType {
  ORPHAN_FILES = 'orphan_files',
  EXPIRED_TRANSACTIONS = 'expired_transactions',
  INCOMPLETE_UPLOADS = 'incomplete_uploads',
  TEMP_FILES = 'temp_files',
}

/**
 * 清理任务状态枚举
 */
export enum CleanupStatus {
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * 清理统计接口
 */
export interface CleanupStats {
  taskType: CleanupTaskType;
  processedCount: number;
  cleanedCount: number;
  failedCount: number;
  executionTimeMs: number;
  errors: string[];
}

/**
 * 清理配置接口
 */
export interface CleanupConfig {
  // 定时任务配置
  schedules: {
    daily: string;      // cron表达式
    weekly: string;     // cron表达式
    monthly: string;    // cron表达式
  };
  
  // 清理阈值配置
  thresholds: {
    transactionExpireDays: number;
    orphanFileRetentionDays: number;
    incompleteUploadDays: number;
    tempFileRetentionDays: number;
    logRetentionDays: number;
  };
  
  // 批处理配置
  batchSizes: {
    transactionBatch: number;
    fileBatch: number;
    uploadBatch: number;
  };
  
  // 安全配置
  safety: {
    enableDryRun: boolean;
    maxDeletesPerRun: number;
    requireConfirmation: boolean;
  };
}

/**
 * 清理任务结果接口
 */
export interface CleanupTaskResult {
  taskType: CleanupTaskType;
  success: boolean;
  stats: CleanupStats;
  startTime: Date;
  endTime: Date;
  duration: number;
  logId?: string;
}

/**
 * 孤儿文件信息接口
 */
export interface OrphanFileInfo {
  storageKey: string;
  size: number;
  lastModified: Date;
  isConfirmedOrphan: boolean;
  retentionDays: number;
  cleanupStatus: 'PENDING' | 'CLEANED' | 'FAILED';
}

/**
 * 过期事务信息接口
 */
export interface ExpiredTransactionInfo {
  transactionId: string;
  status: string;
  createdAt: Date;
  expiredDays: number;
  hasCompensation: boolean;
  compensationStatus?: string;
}

/**
 * 未完成上传信息接口
 */
export interface IncompleteUploadInfo {
  uploadId: string;
  key: string;
  initiated: Date;
  parts: number;
  totalSize: number;
  daysSinceInitiated: number;
}

/**
 * 临时文件信息接口
 */
export interface TempFileInfo {
  path: string;
  size: number;
  createdAt: Date;
  type: 'thumbnail' | 'preview' | 'cache' | 'temp';
  retentionDays: number;
}

/**
 * 清理服务状态接口
 */
export interface CleanupServiceStatus {
  isRunning: boolean;
  activeTasks: string[];
  lastRunTimes: Record<CleanupTaskType, Date | null>;
  nextRunTimes: Record<CleanupTaskType, Date | null>;
  totalRuns: Record<CleanupTaskType, number>;
  successRates: Record<CleanupTaskType, number>;
}

/**
 * 清理日志接口
 */
export interface CleanupLog {
  id: string;
  taskType: CleanupTaskType;
  status: CleanupStatus;
  startedAt: Date;
  completedAt?: Date;
  processedCount: number;
  cleanedCount: number;
  failedCount: number;
  executionTimeMs: number;
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * 清理报告接口
 */
export interface CleanupReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalItemsProcessed: number;
    totalItemsCleaned: number;
    totalSpaceFreed: number;
    totalExecutionTime: number;
  };
  taskBreakdown: Record<CleanupTaskType, {
    runs: number;
    successRate: number;
    avgExecutionTime: number;
    totalItemsCleaned: number;
    spaceFreed: number;
  }>;
  recommendations: string[];
}

/**
 * 清理策略接口
 */
export interface CleanupStrategy {
  taskType: CleanupTaskType;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high';
  schedule: string;
  batchSize: number;
  maxRetries: number;
  timeoutMs: number;
  conditions: {
    minAge?: number;
    maxSize?: number;
    pattern?: string;
    excludePatterns?: string[];
  };
}

/**
 * 清理操作接口
 */
export interface CleanupOperation {
  id: string;
  type: CleanupTaskType;
  target: string;
  action: 'delete' | 'archive' | 'move';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 清理验证结果接口
 */
export interface CleanupValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  estimatedImpact: {
    itemsToDelete: number;
    spaceToFree: number;
    estimatedTime: number;
  };
}

/**
 * 清理恢复信息接口
 */
export interface CleanupRecoveryInfo {
  operationId: string;
  taskType: CleanupTaskType;
  deletedItems: Array<{
    key: string;
    size: number;
    deletedAt: Date;
    recoverable: boolean;
  }>;
  recoveryDeadline: Date;
  recoveryInstructions: string;
}

/**
 * 清理监控指标接口
 */
export interface CleanupMetrics {
  timestamp: Date;
  performance: {
    avgExecutionTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    diskIO: number;
    networkIO: number;
  };
  impact: {
    totalSpaceFreed: number;
    totalItemsCleaned: number;
    costSavings: number;
  };
}

/**
 * 清理事件接口
 */
export interface CleanupEvent {
  id: string;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'item_deleted' | 'error_occurred';
  taskType: CleanupTaskType;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * 清理回调函数类型
 */
export interface CleanupCallbacks {
  onTaskStart?: (taskType: CleanupTaskType) => void;
  onTaskComplete?: (result: CleanupTaskResult) => void;
  onTaskFail?: (taskType: CleanupTaskType, error: Error) => void;
  onItemDeleted?: (item: { key: string; size: number }) => void;
  onProgress?: (taskType: CleanupTaskType, progress: number) => void;
}

/**
 * 清理选项接口
 */
export interface CleanupOptions {
  dryRun?: boolean;
  force?: boolean;
  batchSize?: number;
  maxItems?: number;
  timeout?: number;
  callbacks?: CleanupCallbacks;
  filters?: {
    olderThan?: Date;
    largerThan?: number;
    patterns?: string[];
    excludePatterns?: string[];
  };
}
