/**
 * @fileoverview 存储管理器类型定义
 * @description 定义存储管理器相关的所有类型和接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { R2Config } from '../providers/r2-storage-provider';
import type { LocalConfig } from '../providers/local-storage-provider';

/**
 * 存储提供商配置接口
 */
export interface StorageProviderConfig {
  name: string;
  type: 'r2' | 'local' | 's3' | 'azure';
  config: R2Config | LocalConfig | any;
  priority: number;
  enabled: boolean;
}

/**
 * 故障转移状态接口
 */
export interface FailoverState {
  provider: string;
  failureCount: number;
  lastFailure?: Date;
  isBlacklisted: boolean;
  blacklistUntil?: Date;
}

/**
 * 上传统计接口
 */
export interface UploadStats {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalSize: number;
  averageUploadTime: number;
  providerStats: Record<string, ProviderStats>;
}

/**
 * 提供商统计接口
 */
export interface ProviderStats {
  uploads: number;
  successes: number;
  failures: number;
  totalSize: number;
  averageUploadTime: number;
}

/**
 * 存储管理器初始化选项
 */
export interface StorageManagerOptions {
  enableHealthCheck?: boolean;
  healthCheckInterval?: number;
  failoverThreshold?: number;
  blacklistDuration?: number;
}

/**
 * 上传选项
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  tags?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

/**
 * 扩展的上传结果
 */
export interface ExtendedUploadResult {
  success: boolean;
  url?: string;
  cdnUrl?: string;
  key?: string;
  size?: number;
  contentType?: string;
  provider: string;
  uploadTime: number;
  error?: string;
}
