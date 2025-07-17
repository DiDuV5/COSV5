/**
 * @fileoverview 企业级清理服务类型定义
 * @description 定义清理服务相关的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 清理任务类型枚举
 */
export enum CleanupTaskType {
  ORPHAN_FILES = 'ORPHAN_FILES',
  EXPIRED_TRANSACTIONS = 'EXPIRED_TRANSACTIONS',
  TEMP_FILES = 'TEMP_FILES',
  OLD_LOGS = 'OLD_LOGS',
  CACHE_CLEANUP = 'CACHE_CLEANUP',
  DATABASE_OPTIMIZATION = 'DATABASE_OPTIMIZATION',
  STORAGE_CLEANUP = 'STORAGE_CLEANUP',
  SESSION_CLEANUP = 'SESSION_CLEANUP'
}

/**
 * 清理状态枚举
 */
export enum CleanupStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * 清理优先级枚举
 */
export enum CleanupPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 清理任务配置接口
 */
export interface CleanupTaskConfig {
  type: CleanupTaskType;
  enabled: boolean;
  priority: CleanupPriority;
  schedule?: string; // cron表达式
  maxRetries: number;
  timeoutMs: number;
  options: Record<string, any>;
}

/**
 * 清理配置接口
 */
export interface CleanupConfig {
  enabled: boolean;
  tasks: Record<CleanupTaskType, CleanupTaskConfig>;
  storage: {
    region: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };
  database: {
    connectionString: string;
    maxConnections: number;
  };
  globalSettings: {
    maxConcurrentTasks: number;
    defaultTimeoutMs: number;
    retryDelayMs: number;
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * 清理结果接口
 */
export interface CleanupResult {
  taskType: CleanupTaskType;
  status: CleanupStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  itemsProcessed: number;
  itemsDeleted: number;
  bytesFreed: number;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
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
    totalItemsDeleted: number;
    totalBytesFreed: number;
    totalDuration: number;
  };
  taskResults: CleanupResult[];
  recommendations: string[];
  nextScheduledTasks: Array<{
    taskType: CleanupTaskType;
    scheduledTime: Date;
  }>;
}

/**
 * 清理执行器接口
 */
export interface ICleanupExecutor {
  executeTask(taskType: CleanupTaskType, options?: any): Promise<CleanupResult>;
  executeBatch(taskTypes: CleanupTaskType[]): Promise<CleanupResult[]>;
  cancelTask(taskType: CleanupTaskType): Promise<boolean>;
  getRunningTasks(): CleanupTaskType[];
  getTaskHistory(limit?: number): CleanupResult[];
}

/**
 * 清理器基类接口
 */
export interface ICleanupHandler {
  readonly taskType: CleanupTaskType;
  readonly priority: CleanupPriority;
  
  execute(options?: any): Promise<CleanupResult>;
  validate(options?: any): Promise<boolean>;
  estimateImpact(options?: any): Promise<{
    estimatedItems: number;
    estimatedBytes: number;
    estimatedDuration: number;
  }>;
}

/**
 * 任务进度接口
 */
export interface TaskProgress {
  taskType: CleanupTaskType;
  status: CleanupStatus;
  progress: number; // 0-100
  currentStep: string;
  itemsProcessed: number;
  estimatedTotal: number;
  startTime: Date;
  estimatedEndTime?: Date;
}

/**
 * 清理统计接口
 */
export interface CleanupStats {
  totalTasksExecuted: number;
  successRate: number;
  averageDuration: number;
  totalBytesFreed: number;
  mostFrequentTask: CleanupTaskType;
  lastExecutionTime: Date;
  uptime: number;
}

/**
 * 存储统计接口
 */
export interface StorageStats {
  totalSize: number;
  usedSize: number;
  freeSize: number;
  orphanFiles: number;
  tempFiles: number;
  oldFiles: number;
}

/**
 * 数据库统计接口
 */
export interface DatabaseStats {
  totalTables: number;
  totalRecords: number;
  orphanRecords: number;
  expiredRecords: number;
  indexSize: number;
  dataSize: number;
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  totalKeys: number;
  expiredKeys: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
}

/**
 * 日志统计接口
 */
export interface LogStats {
  totalLogFiles: number;
  totalLogSize: number;
  oldLogFiles: number;
  errorLogCount: number;
  warningLogCount: number;
}

/**
 * 系统健康状态接口
 */
export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  storage: StorageStats;
  database: DatabaseStats;
  cache: CacheStats;
  logs: LogStats;
  recommendations: string[];
  lastCheckTime: Date;
}

/**
 * 清理事件接口
 */
export interface CleanupEvent {
  type: 'taskStarted' | 'taskCompleted' | 'taskFailed' | 'taskCancelled' | 'progressUpdate';
  taskType: CleanupTaskType;
  timestamp: Date;
  data: any;
}

/**
 * 调度配置接口
 */
export interface ScheduleConfig {
  enabled: boolean;
  timezone: string;
  tasks: Array<{
    taskType: CleanupTaskType;
    cron: string;
    enabled: boolean;
    options?: any;
  }>;
}

/**
 * 监控配置接口
 */
export interface MonitoringConfig {
  enabled: boolean;
  alertThresholds: {
    failureRate: number;
    executionTime: number;
    storageUsage: number;
    errorCount: number;
  };
  notifications: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
}

/**
 * 清理选项接口
 */
export interface CleanupOptions {
  dryRun?: boolean;
  force?: boolean;
  maxItems?: number;
  olderThan?: Date;
  pattern?: string;
  excludePatterns?: string[];
  batchSize?: number;
  parallelism?: number;
}

/**
 * 文件清理选项接口
 */
export interface FileCleanupOptions extends CleanupOptions {
  fileTypes?: string[];
  minSize?: number;
  maxSize?: number;
  recursive?: boolean;
  preserveStructure?: boolean;
}

/**
 * 数据库清理选项接口
 */
export interface DatabaseCleanupOptions extends CleanupOptions {
  tables?: string[];
  conditions?: Record<string, any>;
  cascadeDelete?: boolean;
  optimizeAfter?: boolean;
}

/**
 * 缓存清理选项接口
 */
export interface CacheCleanupOptions extends CleanupOptions {
  keyPatterns?: string[];
  namespaces?: string[];
  expiredOnly?: boolean;
  memoryThreshold?: number;
}

/**
 * 日志清理选项接口
 */
export interface LogCleanupOptions extends CleanupOptions {
  logLevels?: string[];
  logSources?: string[];
  compressOld?: boolean;
  archivePath?: string;
}
