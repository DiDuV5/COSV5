/**
 * @fileoverview 事务管理类型定义
 * @description 事务管理相关的类型定义和接口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { Prisma } from '@prisma/client';

/**
 * 事务执行结果接口
 */
export interface TransactionResult<T> {
  /** 执行是否成功 */
  success: boolean;
  /** 返回的数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 回滚原因 */
  rollbackReason?: string;
  /** 执行时间（毫秒） */
  executionTime?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 事务标识 */
  transactionId?: string;
}

/**
 * 事务配置选项接口
 */
export interface TransactionOptions {
  /** 最大等待时间（毫秒） */
  maxWait?: number;
  /** 事务超时时间（毫秒） */
  timeout?: number;
  /** 事务隔离级别 */
  isolationLevel?: Prisma.TransactionIsolationLevel;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 是否启用监控 */
  enableMonitoring?: boolean;
  /** 事务标识 */
  transactionId?: string;
}

/**
 * 事务指标接口
 */
export interface TransactionMetrics {
  /** 总事务数 */
  totalTransactions: number;
  /** 成功事务数 */
  successfulTransactions: number;
  /** 失败事务数 */
  failedTransactions: number;
  /** 重试事务数 */
  retriedTransactions: number;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 最长事务时间 */
  longestTransaction: number;
}

/**
 * 帖子和媒体创建结果
 */
export interface PostWithMediaResult {
  post: any;
  media: any[];
}

/**
 * 帖子和媒体删除结果
 */
export interface PostDeleteResult {
  post: any;
  deletedMedia: any[];
  deletedCounts?: {
    media: number;
    comments: number;
    likes: number;
  };
}

/**
 * 用户资料更新结果
 */
export interface UserProfileUpdateResult {
  user: any;
  avatar?: any;
}

/**
 * 用户注册结果
 */
export interface UserRegistrationResult {
  user: any;
  permissions?: any;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: string;
  timestamp: Date;
}

/**
 * 批量操作函数类型
 */
export type BatchOperation<T> = (tx: Prisma.TransactionClient) => Promise<T>;

/**
 * 事务操作函数类型
 */
export type TransactionOperation<T> = (tx: Prisma.TransactionClient) => Promise<T>;

/**
 * 默认事务配置
 */
export const DEFAULT_TRANSACTION_OPTIONS: Required<TransactionOptions> = {
  maxWait: 5000, // 5秒
  timeout: 10000, // 10秒
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxRetries: 3,
  retryDelay: 1000,
  enableMonitoring: true,
  transactionId: '',
};

/**
 * 可重试的错误类型
 */
export const RETRYABLE_ERRORS = [
  'timeout',
  'deadlock',
  'connection',
  'ECONNRESET',
  'ETIMEDOUT',
  'serialization failure',
] as const;

/**
 * 错误类型枚举
 */
export enum TransactionErrorType {
  TIMEOUT = 'timeout',
  DEADLOCK = 'deadlock',
  CONSTRAINT = 'constraint',
  CONNECTION = 'connection',
  UNKNOWN = 'unknown',
}

/**
 * 事务状态枚举
 */
export enum TransactionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
}
