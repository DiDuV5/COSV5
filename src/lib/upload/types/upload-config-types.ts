/**
 * @fileoverview 上传配置类型定义
 * @description 定义上传配置相关的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

import { UserLevel } from '@/types/user-level';

/**
 * 环境类型
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * 上传策略类型
 */
export type UploadStrategy = 'direct' | 'stream' | 'memory-safe';

/**
 * 统一上传配置接口
 */
export interface UnifiedUploadConfig {
  // 环境配置
  environment: Environment;
  
  // 文件限制
  maxFileSize: number;
  maxFilesPerUpload: number;
  maxDailyUploads: number;
  allowedMimeTypes: string[];
  
  // 分片配置
  chunkSize: number;
  maxConcurrentChunks: number;
  streamThreshold: number;        // 超过此大小使用流式上传
  memorySafeThreshold: number;    // 超过此大小使用内存安全策略
  
  // 内存管理
  maxMemoryUsage: number;
  memoryWarningThreshold: number;
  memoryCriticalThreshold: number;
  enableAutoGC: boolean;
  
  // 存储配置
  storageProvider: 'cloudflare-r2';
  cdnDomain: string;
  cdnBackupDomain?: string;
  
  // 安全配置
  enableVirusScan: boolean;
  enableContentValidation: boolean;
  enableWatermark: boolean;
  
  // 性能配置
  enableCompression: boolean;
  compressionQuality: number;
  enableThumbnailGeneration: boolean;
  thumbnailSizes: number[];
  
  // 监控配置
  enableMetrics: boolean;
  enableDetailedLogging: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  
  // 重试配置
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
}

/**
 * 用户级别配置接口（从数据库获取）
 */
export interface UserLevelConfig {
  maxFileSize: number;
  maxFilesPerUpload: number;
  maxDailyUploads: number;
  allowedMimeTypes: string[];
  enableAdvancedFeatures: boolean;
  enablePriorityUpload: boolean;
  enableBatchUpload: boolean;
  enableStreamUpload: boolean;
  maxConcurrentUploads: number;
  storageQuota: number;
  bandwidthQuota: number;
}

/**
 * 配置缓存接口
 */
export interface ConfigCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * 配置健康检查结果接口
 */
export interface ConfigHealthCheck {
  healthy: boolean;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    suggestion?: string;
  }>;
  performance: {
    memoryUsage: number;
    cacheHitRate: number;
    configLoadTime: number;
  };
  lastCheck: Date;
}

/**
 * 配置更新事件接口
 */
export interface ConfigUpdateEvent {
  type: 'CONFIG_UPDATED' | 'CONFIG_RELOADED' | 'CONFIG_VALIDATED';
  timestamp: Date;
  source: 'ENVIRONMENT' | 'DATABASE' | 'CACHE' | 'DEFAULT';
  changes?: Record<string, { old: any; new: any }>;
}

/**
 * 配置加载选项接口
 */
export interface ConfigLoadOptions {
  useCache: boolean;
  validateConfig: boolean;
  fallbackToDefaults: boolean;
  enableHotReload: boolean;
  cacheTimeout?: number;
}

/**
 * 用户配置查询选项接口
 */
export interface UserConfigQueryOptions {
  userLevel: UserLevel;
  userId?: string;
  includeQuotas: boolean;
  includePermissions: boolean;
  useCache: boolean;
}

/**
 * 配置源类型
 */
export type ConfigSource = 'environment' | 'database' | 'cache' | 'default';

/**
 * 配置优先级
 */
export enum ConfigPriority {
  ENVIRONMENT = 1,
  DATABASE = 2,
  CACHE = 3,
  DEFAULT = 4
}

/**
 * 配置变更类型
 */
export enum ConfigChangeType {
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  REMOVED = 'REMOVED'
}

/**
 * 配置监听器接口
 */
export interface ConfigListener {
  id: string;
  callback: (event: ConfigUpdateEvent) => void;
  filter?: (event: ConfigUpdateEvent) => boolean;
}

/**
 * 配置备份接口
 */
export interface ConfigBackup {
  id: string;
  config: UnifiedUploadConfig;
  timestamp: Date;
  source: ConfigSource;
  checksum: string;
  description?: string;
}

/**
 * 配置差异接口
 */
export interface ConfigDiff {
  added: Record<string, any>;
  modified: Record<string, { old: any; new: any }>;
  removed: Record<string, any>;
}

/**
 * 配置统计接口
 */
export interface ConfigStatistics {
  totalConfigs: number;
  cacheHits: number;
  cacheMisses: number;
  validationErrors: number;
  lastUpdate: Date;
  averageLoadTime: number;
  memoryUsage: number;
}

/**
 * 配置导出选项接口
 */
export interface ConfigExportOptions {
  format: 'json' | 'yaml' | 'env';
  includeSecrets: boolean;
  includeMetadata: boolean;
  minify: boolean;
}

/**
 * 配置导入选项接口
 */
export interface ConfigImportOptions {
  source: ConfigSource;
  validate: boolean;
  backup: boolean;
  overwrite: boolean;
  dryRun: boolean;
}

/**
 * 配置同步状态接口
 */
export interface ConfigSyncStatus {
  inSync: boolean;
  lastSyncTime: Date;
  pendingChanges: number;
  conflicts: Array<{
    key: string;
    localValue: any;
    remoteValue: any;
  }>;
}

/**
 * 配置性能指标接口
 */
export interface ConfigPerformanceMetrics {
  loadTime: number;
  validationTime: number;
  cacheOperationTime: number;
  memoryFootprint: number;
  cpuUsage: number;
}

/**
 * 配置安全设置接口
 */
export interface ConfigSecuritySettings {
  encryptSensitiveData: boolean;
  enableAccessLogging: boolean;
  requireAuthentication: boolean;
  allowedOrigins: string[];
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * 默认配置常量
 */
export const DEFAULT_UPLOAD_CONFIG: UnifiedUploadConfig = {
  environment: 'development',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxFilesPerUpload: 10,
  maxDailyUploads: 100,
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ],
  chunkSize: 5 * 1024 * 1024, // 5MB
  maxConcurrentChunks: 3,
  streamThreshold: 50 * 1024 * 1024, // 50MB
  memorySafeThreshold: 200 * 1024 * 1024, // 200MB
  maxMemoryUsage: 500 * 1024 * 1024, // 500MB
  memoryWarningThreshold: 0.8,
  memoryCriticalThreshold: 0.95,
  enableAutoGC: true,
  storageProvider: 'cloudflare-r2',
  cdnDomain: process.env.COSEREEDEN_CDN_DOMAIN || '',
  enableVirusScan: false,
  enableContentValidation: true,
  enableWatermark: false,
  enableCompression: true,
  compressionQuality: 85,
  enableThumbnailGeneration: true,
  thumbnailSizes: [150, 300, 600],
  enableMetrics: true,
  enableDetailedLogging: false,
  logLevel: 'info',
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
};

/**
 * 用户级别默认配置
 */
export const DEFAULT_USER_LEVEL_CONFIGS: Record<UserLevel, UserLevelConfig> = {
  GUEST: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilesPerUpload: 1,
    maxDailyUploads: 5,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    enableAdvancedFeatures: false,
    enablePriorityUpload: false,
    enableBatchUpload: false,
    enableStreamUpload: false,
    maxConcurrentUploads: 1,
    storageQuota: 100 * 1024 * 1024, // 100MB
    bandwidthQuota: 500 * 1024 * 1024 // 500MB
  },
  USER: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFilesPerUpload: 5,
    maxDailyUploads: 20,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    enableAdvancedFeatures: false,
    enablePriorityUpload: false,
    enableBatchUpload: true,
    enableStreamUpload: false,
    maxConcurrentUploads: 2,
    storageQuota: 1024 * 1024 * 1024, // 1GB
    bandwidthQuota: 2 * 1024 * 1024 * 1024 // 2GB
  },
  VIP: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    maxFilesPerUpload: 10,
    maxDailyUploads: 50,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
    enableAdvancedFeatures: true,
    enablePriorityUpload: true,
    enableBatchUpload: true,
    enableStreamUpload: true,
    maxConcurrentUploads: 3,
    storageQuota: 5 * 1024 * 1024 * 1024, // 5GB
    bandwidthQuota: 10 * 1024 * 1024 * 1024 // 10GB
  },
  CREATOR: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxFilesPerUpload: 20,
    maxDailyUploads: 100,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'],
    enableAdvancedFeatures: true,
    enablePriorityUpload: true,
    enableBatchUpload: true,
    enableStreamUpload: true,
    maxConcurrentUploads: 5,
    storageQuota: 20 * 1024 * 1024 * 1024, // 20GB
    bandwidthQuota: 50 * 1024 * 1024 * 1024 // 50GB
  },
  ADMIN: {
    maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
    maxFilesPerUpload: 50,
    maxDailyUploads: 500,
    allowedMimeTypes: ['*'], // 所有类型
    enableAdvancedFeatures: true,
    enablePriorityUpload: true,
    enableBatchUpload: true,
    enableStreamUpload: true,
    maxConcurrentUploads: 10,
    storageQuota: 100 * 1024 * 1024 * 1024, // 100GB
    bandwidthQuota: 200 * 1024 * 1024 * 1024 // 200GB
  },
  SUPER_ADMIN: {
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
    maxFilesPerUpload: 100,
    maxDailyUploads: 1000,
    allowedMimeTypes: ['*'], // 所有类型
    enableAdvancedFeatures: true,
    enablePriorityUpload: true,
    enableBatchUpload: true,
    enableStreamUpload: true,
    maxConcurrentUploads: 20,
    storageQuota: -1, // 无限制
    bandwidthQuota: -1 // 无限制
  }
};
