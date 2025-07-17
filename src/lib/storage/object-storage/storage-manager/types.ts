/**
 * @fileoverview 存储管理器类型定义
 * @description 定义存储管理器相关的类型和接口
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { StorageConfig } from '../base-storage-provider';

/**
 * 存储管理器配置
 */
export interface StorageManagerConfig {
  /** 主要存储提供商 */
  primary: StorageConfig;
  /** 备用存储提供商 */
  fallback?: StorageConfig;
  /** 是否启用故障转移 */
  enableFailover?: boolean;
  /** 故障转移超时时间 */
  failoverTimeout?: number;
  /** 健康检查间隔 */
  healthCheckInterval?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
  /** 缓存TTL */
  cacheTtl?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟 */
  retryDelay?: number;
}

/**
 * 存储提供商状态
 */
export interface ProviderStatus {
  isHealthy: boolean;
  lastCheck: Date;
  errorCount: number;
  lastError?: Error;
}

/**
 * 缓存项
 */
export interface CacheItem<T> {
  data: T;
  expiresAt: Date;
}

/**
 * 存储统计信息
 */
export interface StorageStats {
  primary: ProviderStatus | undefined;
  fallback: ProviderStatus | undefined;
  cacheSize: number;
}

/**
 * 提供商状态变化事件
 */
export interface ProviderStatusChangedEvent {
  provider: string;
  status: ProviderStatus;
}

/**
 * 提供商错误事件
 */
export interface ProviderErrorEvent {
  provider: string;
  error: Error;
}

/**
 * 故障转移使用事件
 */
export interface FailoverUsedEvent {
  operation: string;
  provider: string;
}

/**
 * 缓存命中事件
 */
export interface CacheHitEvent {
  key: string;
  operation: string;
}

/**
 * 文件上传事件
 */
export interface FileUploadedEvent {
  provider: string;
  result: any;
}

/**
 * 文件下载事件
 */
export interface FileDownloadedEvent {
  provider: string;
  key: string;
}

/**
 * 文件删除事件
 */
export interface FileDeletedEvent {
  provider: string;
  key: string;
}

/**
 * 批量文件删除事件
 */
export interface FilesDeletedEvent {
  provider: string;
  keys: string[];
}

/**
 * 初始化完成事件
 */
export interface InitializedEvent {
  primary: string;
  fallback?: string;
}
