/**
 * @fileoverview 转码相关类型定义和验证
 * @description 定义转码任务的类型、状态和验证规则
 */

import { z } from 'zod';

/**
 * 转码任务状态枚举
 */
export const TranscodingStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type TranscodingStatusType = typeof TranscodingStatus[keyof typeof TranscodingStatus];

/**
 * 转码任务类型枚举
 */
export const TaskType = {
  TRANSCODE: 'TRANSCODE',
  THUMBNAIL: 'THUMBNAIL',
  COMPRESS: 'COMPRESS',
  CONVERT: 'CONVERT',
} as const;

export type TaskTypeType = typeof TaskType[keyof typeof TaskType];

/**
 * 转码任务状态查询输入验证
 */
export const GetTaskStatusInputSchema = z.object({
  mediaId: z.string().min(1, '媒体ID不能为空'),
});

/**
 * 媒体处理任务查询输入验证
 */
export const GetMediaProcessingTasksInputSchema = z.object({
  mediaId: z.string().min(1, '媒体ID不能为空'),
});

/**
 * 重试任务输入验证
 */
export const RetryTaskInputSchema = z.object({
  taskId: z.string().min(1, '任务ID不能为空'),
});

/**
 * 取消任务输入验证
 */
export const CancelTaskInputSchema = z.object({
  taskId: z.string().min(1, '任务ID不能为空'),
});

/**
 * 清理旧任务输入验证
 */
export const CleanupOldTasksInputSchema = z.object({
  daysOld: z.number().min(1, '天数必须大于0').max(365, '天数不能超过365天').optional().default(30),
});

/**
 * 转码任务状态响应类型
 */
export interface TranscodingTaskStatus {
  status: TranscodingStatusType;
  progress: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  duration?: number | null;
  errorMessage?: string | null;
  inputPath?: string | null;
  outputPath?: string | null;
}

/**
 * 媒体处理任务响应类型
 */
export interface MediaProcessingTask {
  id: string;
  taskType: TaskTypeType;
  status: TranscodingStatusType;
  progress: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  duration?: number | null;
  errorMessage?: string | null;
  options?: any;
}

/**
 * 转码统计信息类型
 */
export interface TranscodingStats {
  totalTasks: number;
  statusBreakdown: Record<string, number>;
  averageDuration?: number | null;
  recentTasks: RecentTask[];
}

/**
 * 最近任务类型
 */
export interface RecentTask {
  id: string;
  status: TranscodingStatusType;
  progress: number;
  duration?: number | null;
  createdAt: Date;
  completedAt?: Date | null;
  errorMessage?: string | null;
  media?: {
    filename: string;
    originalName?: string | null;
    fileSize: number;
  } | null;
}

/**
 * 任务操作响应类型
 */
export interface TaskOperationResponse {
  success: boolean;
  message: string;
}

/**
 * 清理任务响应类型
 */
export interface CleanupTasksResponse extends TaskOperationResponse {
  deletedCount: number;
}

/**
 * 转码任务验证工具
 */
export class TranscodingValidator {
  /**
   * 验证任务状态是否可以重试
   */
  static canRetryTask(status: TranscodingStatusType): boolean {
    return status === TranscodingStatus.FAILED;
  }

  /**
   * 验证任务状态是否可以取消
   */
  static canCancelTask(status: TranscodingStatusType): boolean {
    return status === TranscodingStatus.PROCESSING || status === TranscodingStatus.PENDING;
  }

  /**
   * 验证任务状态是否已完成
   */
  static isTaskCompleted(status: TranscodingStatusType): boolean {
    return status === TranscodingStatus.COMPLETED || 
           status === TranscodingStatus.FAILED || 
           status === TranscodingStatus.CANCELLED;
  }

  /**
   * 计算任务持续时间
   */
  static calculateDuration(startedAt: Date | null, completedAt: Date | null): number | null {
    if (!startedAt || !completedAt) {
      return null;
    }
    return Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);
  }

  /**
   * 格式化任务进度
   */
  static formatProgress(progress: number): string {
    return `${Math.round(progress)}%`;
  }

  /**
   * 获取任务状态显示文本
   */
  static getStatusDisplayText(status: TranscodingStatusType): string {
    const statusMap = {
      [TranscodingStatus.PENDING]: '等待中',
      [TranscodingStatus.PROCESSING]: '处理中',
      [TranscodingStatus.COMPLETED]: '已完成',
      [TranscodingStatus.FAILED]: '失败',
      [TranscodingStatus.CANCELLED]: '已取消',
    };
    return statusMap[status] || '未知状态';
  }
}

/**
 * 转码任务常量
 */
export const TRANSCODING_CONSTANTS = {
  // 默认查询限制
  DEFAULT_RECENT_TASKS_LIMIT: 10,
  
  // 最大清理天数
  MAX_CLEANUP_DAYS: 365,
  
  // 默认清理天数
  DEFAULT_CLEANUP_DAYS: 30,
  
  // 进度更新间隔（毫秒）
  PROGRESS_UPDATE_INTERVAL: 1000,
  
  // 任务超时时间（秒）
  TASK_TIMEOUT: 3600, // 1小时
} as const;
