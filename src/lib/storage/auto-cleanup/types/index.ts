/**
 * @fileoverview 自动清理服务类型定义
 * @description 包含自动清理服务相关的所有TypeScript类型定义
 */

/**
 * 清理策略配置
 */
export interface CleanupStrategy {
  /** 分片上传临时文件 */
  chunkFiles: {
    /** 最大保留时间（小时） */
    maxAge: number;
    /** 是否启用 */
    enabled: boolean;
  };
  
  /** 孤儿文件 */
  orphanFiles: {
    /** 最大保留时间（小时） */
    maxAge: number;
    /** 是否启用 */
    enabled: boolean;
    /** 是否进行安全检查 */
    safetyCheck: boolean;
  };
  
  /** 日志文件 */
  logFiles: {
    /** 最大保留时间（天） */
    maxAge: number;
    /** 是否启用 */
    enabled: boolean;
    /** 保留最新的文件数量 */
    keepCount: number;
  };
  
  /** 备份文件 */
  backupFiles: {
    /** 最大保留时间（天） */
    maxAge: number;
    /** 是否启用 */
    enabled: boolean;
    /** 保留最新的备份数量 */
    keepCount: number;
  };
  
  /** 失败上传文件 */
  failedUploads: {
    /** 最大保留时间（小时） */
    maxAge: number;
    /** 是否启用 */
    enabled: boolean;
  };
  
  /** 临时处理文件 */
  tempProcessingFiles: {
    /** 最大保留时间（小时） */
    maxAge: number;
    /** 是否启用 */
    enabled: boolean;
  };
}

/**
 * 清理任务结果
 */
export interface CleanupTaskResult {
  /** 任务类型 */
  taskType: string;
  /** 是否成功 */
  success: boolean;
  /** 扫描的文件数量 */
  filesScanned: number;
  /** 删除的文件数量 */
  filesDeleted: number;
  /** 释放的空间（字节） */
  spaceFreed: number;
  /** 错误信息列表 */
  errors: string[];
  /** 执行时长（毫秒） */
  duration: number;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 清理报告
 */
export interface CleanupReport {
  /** 总扫描文件数 */
  totalFilesScanned: number;
  /** 总删除文件数 */
  totalFilesDeleted: number;
  /** 总释放空间 */
  totalSpaceFreed: number;
  /** 任务结果列表 */
  taskResults: CleanupTaskResult[];
  /** 总执行时长 */
  duration: number;
  /** 时间戳 */
  timestamp: Date;
  /** 是否成功 */
  success: boolean;
}

/**
 * 文件锁信息
 */
export interface FileLock {
  /** 文件路径 */
  filePath: string;
  /** 锁定时间 */
  lockTime: Date;
  /** 进程ID */
  processId: number;
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 文件路径 */
  path: string;
  /** 文件名 */
  name: string;
  /** 文件大小 */
  size: number;
  /** 修改时间 */
  mtime: Date;
  /** 创建时间 */
  ctime: Date;
  /** 是否为目录 */
  isDirectory: boolean;
}

/**
 * 扫描选项
 */
export interface ScanOptions {
  /** 是否递归扫描子目录 */
  recursive?: boolean;
  /** 文件过滤器 */
  fileFilter?: (file: FileInfo) => boolean;
  /** 目录过滤器 */
  dirFilter?: (dir: FileInfo) => boolean;
  /** 最大扫描深度 */
  maxDepth?: number;
  /** 是否包含隐藏文件 */
  includeHidden?: boolean;
}

/**
 * 清理任务配置
 */
export interface CleanupTaskConfig {
  /** 任务名称 */
  name: string;
  /** 任务类型 */
  type: string;
  /** 是否启用 */
  enabled: boolean;
  /** 最大保留时间（毫秒） */
  maxAge: number;
  /** 目标目录 */
  targetDir: string;
  /** 文件模式匹配 */
  patterns?: string[];
  /** 保留文件数量 */
  keepCount?: number;
  /** 是否进行安全检查 */
  safetyCheck?: boolean;
}

/**
 * 清理任务执行上下文
 */
export interface CleanupTaskContext {
  /** 是否为模拟运行 */
  dryRun: boolean;
  /** 清理策略 */
  strategy: CleanupStrategy;
  /** 文件锁管理器 */
  fileLockManager: any;
  /** 报告管理器 */
  reportManager: any;
}

/**
 * 服务状态
 */
export interface ServiceStatus {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 清理策略 */
  strategy: CleanupStrategy;
  /** 锁定的文件列表 */
  lockedFiles: string[];
  /** 最后执行时间 */
  lastExecutionTime?: Date;
  /** 下次执行时间 */
  nextExecutionTime?: Date;
}

/**
 * 清理事件类型
 */
export type CleanupEventType = 
  | 'cleanupStart'
  | 'cleanupComplete'
  | 'cleanupError'
  | 'taskStart'
  | 'taskComplete'
  | 'taskError'
  | 'fileDeleted'
  | 'fileLocked'
  | 'fileUnlocked';

/**
 * 清理事件数据
 */
export interface CleanupEventData {
  /** 事件类型 */
  type: CleanupEventType;
  /** 时间戳 */
  timestamp: Date;
  /** 相关数据 */
  data?: any;
  /** 错误信息 */
  error?: Error;
}

/**
 * 备份配置
 */
export interface BackupConfig {
  /** 是否启用备份 */
  enabled: boolean;
  /** 备份目录 */
  backupDir: string;
  /** 最小文件大小（字节） */
  minFileSize: number;
  /** 最大备份数量 */
  maxBackups: number;
  /** 备份文件命名模式 */
  namingPattern: string;
}

/**
 * 安全检查配置
 */
export interface SafetyCheckConfig {
  /** 是否启用安全检查 */
  enabled: boolean;
  /** 受保护的文件模式 */
  protectedPatterns: RegExp[];
  /** 受保护的目录 */
  protectedDirs: string[];
  /** 最小文件年龄（毫秒） */
  minFileAge: number;
}

/**
 * 清理统计信息
 */
export interface CleanupStatistics {
  /** 总执行次数 */
  totalExecutions: number;
  /** 成功执行次数 */
  successfulExecutions: number;
  /** 失败执行次数 */
  failedExecutions: number;
  /** 总扫描文件数 */
  totalFilesScanned: number;
  /** 总删除文件数 */
  totalFilesDeleted: number;
  /** 总释放空间 */
  totalSpaceFreed: number;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime?: Date;
  /** 最后成功执行时间 */
  lastSuccessfulExecution?: Date;
}

/**
 * 清理任务优先级
 */
export enum CleanupTaskPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * 清理任务状态
 */
export enum CleanupTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 文件类型枚举
 */
export enum FileType {
  CHUNK = 'chunk',
  ORPHAN = 'orphan',
  LOG = 'log',
  BACKUP = 'backup',
  FAILED_UPLOAD = 'failed_upload',
  TEMP_PROCESSING = 'temp_processing',
  UNKNOWN = 'unknown',
}

/**
 * 清理模式枚举
 */
export enum CleanupMode {
  /** 仅删除过期文件 */
  AGE_BASED = 'age_based',
  /** 保留指定数量的最新文件 */
  COUNT_BASED = 'count_based',
  /** 基于文件大小 */
  SIZE_BASED = 'size_based',
  /** 混合模式 */
  HYBRID = 'hybrid',
}

/**
 * 清理结果详情
 */
export interface CleanupResultDetail {
  /** 文件路径 */
  filePath: string;
  /** 操作类型 */
  operation: 'deleted' | 'skipped' | 'backed_up' | 'failed';
  /** 文件大小 */
  fileSize: number;
  /** 原因 */
  reason?: string;
  /** 错误信息 */
  error?: string;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * 清理任务接口
 */
export interface ICleanupTask {
  /** 任务名称 */
  readonly name: string;
  /** 任务类型 */
  readonly type: string;
  /** 执行清理任务 */
  execute(context: CleanupTaskContext): Promise<CleanupTaskResult>;
  /** 验证任务配置 */
  validate(config: CleanupTaskConfig): boolean;
  /** 获取任务描述 */
  getDescription(): string;
}

/**
 * 文件锁管理器接口
 */
export interface IFileLockManager {
  /** 锁定文件 */
  lockFile(filePath: string): void;
  /** 解锁文件 */
  unlockFile(filePath: string): void;
  /** 检查文件是否被锁定 */
  isFileLocked(filePath: string): boolean;
  /** 获取所有锁定的文件 */
  getLockedFiles(): string[];
  /** 清理过期的锁 */
  cleanupExpiredLocks(): void;
}

/**
 * 报告管理器接口
 */
export interface IReportManager {
  /** 保存清理报告 */
  saveReport(report: CleanupReport): Promise<void>;
  /** 获取清理历史 */
  getHistory(limit?: number): Promise<CleanupReport[]>;
  /** 获取统计信息 */
  getStatistics(): Promise<CleanupStatistics>;
  /** 生成报告摘要 */
  generateSummary(report: CleanupReport): string;
}
