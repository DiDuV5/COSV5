/**
 * @fileoverview 清理服务类型定义 - CoserEden平台
 * @description 企业级清理服务的所有类型定义和接口
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

/**
 * 清理任务类型枚举
 */
export enum CleanupTaskType {
  ORPHAN_FILES = 'orphan_files',
  EXPIRED_TRANSACTIONS = 'expired_transactions',
  INCOMPLETE_UPLOADS = 'incomplete_uploads',
  TEMP_FILES = 'temp_files',
  THUMBNAILS = 'thumbnails',
  FAILED_COMPENSATIONS = 'failed_compensations',
  DATABASE_CLEANUP = 'database_cleanup',
  CACHE_CLEANUP = 'cache_cleanup',
  LOG_CLEANUP = 'log_cleanup',
}

/**
 * 清理状态枚举
 */
export enum CleanupStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  SKIPPED = 'SKIPPED',
}

/**
 * 清理优先级枚举
 */
export enum CleanupPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * 清理统计接口
 */
export interface CleanupStats {
  taskType: CleanupTaskType;
  processedCount: number;
  cleanedCount: number;
  failedCount: number;
  skippedCount: number;
  executionTimeMs: number;
  errors: string[];
  metadata?: Record<string, any>;
}

/**
 * 清理任务配置
 */
export interface CleanupTaskConfig {
  type: CleanupTaskType;
  enabled: boolean;
  schedule: string; // cron表达式
  priority: CleanupPriority;
  retentionDays: number;
  batchSize: number;
  timeout: number;
  retryCount: number;
  dryRun: boolean;
}

/**
 * 清理结果
 */
export interface CleanupResult {
  taskType: CleanupTaskType;
  status: CleanupStatus;
  stats: CleanupStats;
  startTime: Date;
  endTime: Date;
  duration: number;
  logId?: string;
}

/**
 * 孤儿文件信息
 */
export interface OrphanFileInfo {
  key: string;
  size: number;
  lastModified: Date;
  isProtected: boolean;
  retentionExpiry: Date;
  metadata?: Record<string, any>;
}

/**
 * 清理日志条目
 */
export interface CleanupLogEntry {
  id: string;
  taskType: CleanupTaskType;
  status: CleanupStatus;
  startTime: Date;
  endTime?: Date;
  stats?: CleanupStats;
  errors?: string[];
  metadata?: Record<string, any>;
}

/**
 * 清理配置
 */
export interface CleanupConfig {
  enabled: boolean;
  tasks: Record<CleanupTaskType, CleanupTaskConfig>;
  globalSettings: {
    maxConcurrentTasks: number;
    defaultRetentionDays: number;
    logRetentionDays: number;
    enableNotifications: boolean;
    notificationChannels: string[];
  };
  storage: {
    bucketName: string;
    region: string;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

/**
 * 文件清理选项
 */
export interface FileCleanupOptions {
  retentionDays: number;
  batchSize: number;
  dryRun: boolean;
  includeProtected: boolean;
  filePatterns: string[];
  excludePatterns: string[];
}

/**
 * 数据库清理选项
 */
export interface DatabaseCleanupOptions {
  retentionDays: number;
  batchSize: number;
  tables: string[];
  conditions: Record<string, any>;
  cascadeDelete: boolean;
}

/**
 * 缓存清理选项
 */
export interface CacheCleanupOptions {
  patterns: string[];
  maxAge: number;
  clearAll: boolean;
  preserveActive: boolean;
}

/**
 * 日志清理选项
 */
export interface LogCleanupOptions {
  retentionDays: number;
  logLevels: string[];
  compressOld: boolean;
  archivePath?: string;
}

/**
 * 清理事件类型
 */
export type CleanupEventType = 
  | 'taskStarted'
  | 'taskCompleted'
  | 'taskFailed'
  | 'fileDeleted'
  | 'errorOccurred'
  | 'configUpdated';

/**
 * 清理事件数据
 */
export interface CleanupEvent {
  type: CleanupEventType;
  timestamp: Date;
  taskType?: CleanupTaskType;
  data: any;
  source: string;
}

/**
 * 清理报告
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
    totalFilesProcessed: number;
    totalFilesDeleted: number;
    totalSpaceFreed: number;
    totalExecutionTime: number;
  };
  taskResults: CleanupResult[];
  errors: string[];
  recommendations: string[];
}

/**
 * 清理调度器接口
 */
export interface ICleanupScheduler {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  scheduleTask(config: CleanupTaskConfig): void;
  unscheduleTask(taskType: CleanupTaskType): void;
  getScheduledTasks(): CleanupTaskConfig[];
}

/**
 * 文件清理器接口
 */
export interface IFileCleanup {
  cleanupOrphanFiles(options?: FileCleanupOptions): Promise<CleanupStats>;
  cleanupTempFiles(options?: FileCleanupOptions): Promise<CleanupStats>;
  cleanupIncompleteUploads(options?: FileCleanupOptions): Promise<CleanupStats>;
  listOrphanFiles(): Promise<OrphanFileInfo[]>;
  deleteFile(key: string): Promise<boolean>;
  isFileProtected(key: string): Promise<boolean>;
}

/**
 * 数据库清理器接口
 */
export interface IDatabaseCleanup {
  cleanupExpiredTransactions(options?: DatabaseCleanupOptions): Promise<CleanupStats>;
  cleanupFailedCompensations(options?: DatabaseCleanupOptions): Promise<CleanupStats>;
  cleanupOldLogs(options?: DatabaseCleanupOptions): Promise<CleanupStats>;
  cleanupOrphanRecords(options?: DatabaseCleanupOptions): Promise<CleanupStats>;
  optimizeTables(): Promise<CleanupStats>;
}

/**
 * 缓存清理器接口
 */
export interface ICacheCleanup {
  cleanupExpiredCache(options?: CacheCleanupOptions): Promise<CleanupStats>;
  cleanupSessionCache(options?: CacheCleanupOptions): Promise<CleanupStats>;
  cleanupThumbnailCache(options?: CacheCleanupOptions): Promise<CleanupStats>;
  clearAllCache(): Promise<CleanupStats>;
  getCacheStats(): Promise<Record<string, any>>;
}

/**
 * 日志清理器接口
 */
export interface ILogCleanup {
  cleanupOldLogs(options?: LogCleanupOptions): Promise<CleanupStats>;
  archiveLogs(options?: LogCleanupOptions): Promise<CleanupStats>;
  compressLogs(options?: LogCleanupOptions): Promise<CleanupStats>;
  getLogStats(): Promise<Record<string, any>>;
}

/**
 * 清理监控器接口
 */
export interface ICleanupMonitor {
  recordTaskStart(taskType: CleanupTaskType): Promise<string>;
  recordTaskComplete(logId: string, stats: CleanupStats): Promise<void>;
  recordTaskError(logId: string, error: Error): Promise<void>;
  getCleanupHistory(days?: number): Promise<CleanupLogEntry[]>;
  generateReport(period: { start: Date; end: Date }): Promise<CleanupReport>;
}

/**
 * 清理配置管理器接口
 */
export interface ICleanupConfigManager {
  getConfig(): CleanupConfig;
  updateConfig(config: Partial<CleanupConfig>): void;
  getTaskConfig(taskType: CleanupTaskType): CleanupTaskConfig;
  updateTaskConfig(taskType: CleanupTaskType, config: Partial<CleanupTaskConfig>): void;
  validateConfig(config: CleanupConfig): boolean;
  resetToDefaults(): void;
}

/**
 * 清理通知器接口
 */
export interface ICleanupNotifier {
  sendTaskStartNotification(taskType: CleanupTaskType): Promise<void>;
  sendTaskCompleteNotification(result: CleanupResult): Promise<void>;
  sendErrorNotification(taskType: CleanupTaskType, error: Error): Promise<void>;
  sendDailyReport(report: CleanupReport): Promise<void>;
}

/**
 * S3/R2 客户端配置
 */
export interface S3ClientConfig {
  region: string;
  endpoint: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  requestHandler?: {
    requestTimeout: number;
    connectionTimeout: number;
  };
}

/**
 * 清理上下文
 */
export interface CleanupContext {
  s3Client: S3Client;
  prisma: PrismaClient;
  config: CleanupConfig;
  logger: any;
}

/**
 * 清理任务执行器接口
 */
export interface ICleanupExecutor {
  executeTask(taskType: CleanupTaskType, options?: any): Promise<CleanupResult>;
  executeBatch(taskTypes: CleanupTaskType[]): Promise<CleanupResult[]>;
  cancelTask(taskType: CleanupTaskType): Promise<boolean>;
  getRunningTasks(): CleanupTaskType[];
}
