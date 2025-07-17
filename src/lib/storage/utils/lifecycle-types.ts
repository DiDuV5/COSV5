/**
 * @fileoverview 文件生命周期管理类型定义
 * @description 生命周期管理相关的类型定义和接口
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 清理规则
 */
export interface CleanupRule {
  /** 规则名称 */
  name: string;
  /** 文件路径模式 */
  pattern: string;
  /** 最大文件年龄（毫秒） */
  maxAge?: number;
  /** 最大文件大小（字节） */
  maxSize?: number;
  /** 最大文件数量 */
  maxCount?: number;
  /** 执行动作 */
  action: 'delete' | 'archive' | 'compress';
  /** 是否启用 */
  enabled: boolean;
  /** 排除模式 */
  excludePatterns?: string[];
  /** 定时表达式 */
  schedule?: string;
  /** 优先级 */
  priority?: number;
}

/**
 * 清理结果
 */
export interface CleanupResult {
  /** 规则名称 */
  ruleName: string;
  /** 扫描的文件数量 */
  scannedFiles: number;
  /** 处理的文件数量 */
  processedFiles: number;
  /** 删除的文件数量 */
  deletedFiles: number;
  /** 归档的文件数量 */
  archivedFiles: number;
  /** 压缩的文件数量 */
  compressedFiles: number;
  /** 释放的空间（字节） */
  freedSpace: bigint;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 错误信息 */
  errors: string[];
}

/**
 * 归档配置
 */
export interface ArchiveConfig {
  /** 归档存储提供商 */
  provider: 'local' | 'cloudflare-r2' | 's3';
  /** 归档路径前缀 */
  pathPrefix: string;
  /** 是否压缩 */
  compress: boolean;
  /** 压缩格式 */
  compressionFormat?: 'gzip' | 'brotli' | 'deflate';
  /** 归档后是否删除原文件 */
  deleteOriginal: boolean;
}

/**
 * 文件处理选项
 */
export interface FileProcessingOptions {
  /** 是否并行处理 */
  parallel?: boolean;
  /** 并行数量 */
  concurrency?: number;
  /** 是否跳过错误 */
  skipErrors?: boolean;
  /** 进度回调 */
  onProgress?: (processed: number, total: number) => void;
  /** 错误回调 */
  onError?: (error: Error, file: string) => void;
}

/**
 * 生命周期管理器状态
 */
export interface LifecycleManagerStatus {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 活动规则数量 */
  activeRules: number;
  /** 定时任务数量 */
  scheduledJobs: number;
  /** 最后执行时间 */
  lastExecutionTime?: Date;
  /** 总处理文件数 */
  totalProcessedFiles: number;
  /** 总释放空间 */
  totalFreedSpace: number;
}

/**
 * 清理统计信息
 */
export interface CleanupStats {
  /** 规则名称 */
  ruleName: string;
  /** 执行次数 */
  executionCount: number;
  /** 总处理文件数 */
  totalProcessedFiles: number;
  /** 总释放空间 */
  totalFreedSpace: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime: number;
  /** 最后执行时间 */
  lastExecutionTime: Date;
  /** 成功率 */
  successRate: number;
}

/**
 * 文件匹配结果
 */
export interface FileMatchResult {
  /** 文件路径 */
  filePath: string;
  /** 是否匹配 */
  matches: boolean;
  /** 匹配的规则 */
  matchedRule?: string;
  /** 排除原因 */
  excludeReason?: string;
}

/**
 * 定时任务配置
 */
export interface ScheduleConfig {
  /** 规则名称 */
  ruleName: string;
  /** 定时表达式 */
  schedule: string;
  /** 是否启用 */
  enabled: boolean;
  /** 下次执行时间 */
  nextExecution?: Date;
  /** 任务ID */
  jobId?: string;
}

/**
 * 清理动作类型
 */
export type CleanupAction = 'delete' | 'archive' | 'compress';

/**
 * 存储提供商类型
 */
export type StorageProvider = 'local' | 'cloudflare-r2' | 's3';

/**
 * 压缩格式类型
 */
export type CompressionFormat = 'gzip' | 'brotli' | 'deflate';

/**
 * 定时表达式预设
 */
export const SCHEDULE_PRESETS = {
  HOURLY: '@hourly',
  DAILY: '@daily',
  WEEKLY: '@weekly',
  MONTHLY: '@monthly',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  MIDNIGHT: '0 0 * * *',
  NOON: '0 12 * * *'
} as const;

/**
 * 默认清理规则配置
 */
export const DEFAULT_CLEANUP_RULES = {
  TEMP_FILES: {
    name: 'temp-files',
    pattern: 'temp/**',
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    action: 'delete' as CleanupAction,
    enabled: true,
    schedule: SCHEDULE_PRESETS.HOURLY
  },
  OLD_LOGS: {
    name: 'old-logs',
    pattern: 'logs/**/*.log',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    action: 'archive' as CleanupAction,
    enabled: true,
    schedule: SCHEDULE_PRESETS.DAILY
  },
  LARGE_FILES: {
    name: 'large-files',
    pattern: 'uploads/**',
    maxSize: 100 * 1024 * 1024, // 100MB
    action: 'compress' as CleanupAction,
    enabled: false,
    schedule: SCHEDULE_PRESETS.WEEKLY
  }
} as const;

/**
 * 文件大小单位
 */
export const FILE_SIZE_UNITS = {
  BYTE: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024
} as const;

/**
 * 时间单位（毫秒）
 */
export const TIME_UNITS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
} as const;
