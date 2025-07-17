/**
 * @fileoverview Upload配置管理器类型定义
 * @description 定义上传配置相关的TypeScript类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

/**
 * 上传配置接口
 */
export interface UploadConfig {
  id: string;
  name: string;
  description?: string;
  maxFileSize: number;
  allowedTypes: string[];
  uploadPath: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 统一上传配置接口
 */
export interface UnifiedUploadConfig extends UploadConfig {
  userLevel?: string;
  environment?: string;
  strategy?: string;
  permissions?: string[];
  allowedMimeTypes?: string[];
  storageProvider?: string;
  memorySafeThreshold?: number;
  streamThreshold?: number;
  maxConcurrentChunks?: number;
  maxMemoryUsage?: number;
}

/**
 * 用户级别配置
 */
export interface UserLevelConfig {
  level: string;
  maxFileSize: number;
  allowedTypes: string[];
  allowedMimeTypes: string[];
  uploadQuota: number;
  permissions: string[];
  maxFilesPerUpload: number;
  enableAdvancedFeatures: boolean;
}

/**
 * 环境配置
 */
export interface Environment {
  name: string;
  description?: string;
  variables: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * 上传策略
 */
export interface UploadStrategy {
  name: string;
  type: 'local' | 'cloud' | 'cdn';
  config: Record<string, any>;
  isDefault: boolean;
}

/**
 * 上传策略类型
 */
export type UploadStrategyType = 'direct' | 'stream' | 'memory-safe';

/**
 * 默认上传配置
 */
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  id: 'default',
  name: '默认配置',
  description: '系统默认上传配置',
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
  uploadPath: '/uploads',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

/**
 * 配置加载选项
 */
export interface ConfigLoadOptions {
  includeInactive?: boolean;
  cacheTimeout?: number;
  forceRefresh?: boolean;
  useCache?: boolean;
  validateConfig?: boolean;
  fallbackToDefaults?: boolean;
}

/**
 * 用户配置查询选项
 */
export interface UserConfigQueryOptions {
  userId?: string;
  configType?: string;
  includeDefaults?: boolean;
  useCache?: boolean;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 配置更新选项
 */
export interface ConfigUpdateOptions {
  validateOnly?: boolean;
  skipBackup?: boolean;
  notifyUsers?: boolean;
}

/**
 * 配置备份信息
 */
export interface ConfigBackup {
  id: string;
  configId: string;
  backupData: any;
  createdAt: Date;
  createdBy: string;
}

/**
 * 配置历史记录
 */
export interface ConfigHistory {
  id: string;
  configId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  changes: any;
  performedBy: string;
  performedAt: Date;
}

/**
 * 配置服务选项
 */
export interface ConfigServiceOptions {
  enableCaching?: boolean;
  enableValidation?: boolean;
  enableHistory?: boolean;
  enableBackup?: boolean;
}

/**
 * 用户配置偏好
 */
export interface UserConfigPreferences {
  userId: string;
  preferences: Record<string, any>;
  lastUpdated: Date;
}

/**
 * 配置模板
 */
export interface ConfigTemplate {
  id: string;
  name: string;
  description?: string;
  template: any;
  category: string;
  isDefault: boolean;
}

/**
 * 配置导入/导出选项
 */
export interface ConfigImportExportOptions {
  format: 'json' | 'yaml' | 'xml';
  includeMetadata?: boolean;
  validateOnImport?: boolean;
}

/**
 * 配置同步选项
 */
export interface ConfigSyncOptions {
  source: string;
  target: string;
  syncMode: 'merge' | 'replace' | 'append';
  conflictResolution: 'source' | 'target' | 'manual';
}

/**
 * 配置监控指标
 */
export interface ConfigMetrics {
  totalConfigs: number;
  activeConfigs: number;
  lastUpdated: Date;
  errorCount: number;
  warningCount: number;
}

/**
 * 配置事件
 */
export interface ConfigEvent {
  type: 'CONFIG_CREATED' | 'CONFIG_UPDATED' | 'CONFIG_DELETED' | 'CONFIG_VALIDATED';
  configId: string;
  timestamp: Date;
  data: any;
}

/**
 * 配置权限
 */
export interface ConfigPermission {
  userId: string;
  configId: string;
  permissions: ('read' | 'write' | 'delete' | 'admin')[];
  grantedAt: Date;
  grantedBy: string;
}

/**
 * 配置缓存选项
 */
export interface ConfigCacheOptions {
  ttl?: number;
  maxSize?: number;
  enableCompression?: boolean;
}

/**
 * 配置查询过滤器
 */
export interface ConfigQueryFilter {
  name?: string;
  category?: string;
  isActive?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
}

/**
 * 配置分页选项
 */
export interface ConfigPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 配置搜索结果
 */
export interface ConfigSearchResult {
  configs: UploadConfig[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 配置操作结果
 */
export interface ConfigOperationResult {
  success: boolean;
  configId?: string;
  message?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * 配置批量操作选项
 */
export interface ConfigBatchOptions {
  configIds: string[];
  operation: 'activate' | 'deactivate' | 'delete' | 'backup';
  options?: any;
}

/**
 * 配置审计日志
 */
export interface ConfigAuditLog {
  id: string;
  configId: string;
  action: string;
  userId: string;
  timestamp: Date;
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 配置通知设置
 */
export interface ConfigNotificationSettings {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: string[];
  frequency: 'immediate' | 'daily' | 'weekly';
}

/**
 * 配置健康检查结果
 */
export interface ConfigHealthCheck {
  configId: string;
  status: 'healthy' | 'warning' | 'error';
  lastChecked: Date;
  issues: string[];
  recommendations: string[];
}

/**
 * 配置依赖关系
 */
export interface ConfigDependency {
  configId: string;
  dependsOn: string[];
  dependents: string[];
  circularDependencies: boolean;
}

/**
 * 配置版本信息
 */
export interface ConfigVersion {
  version: string;
  configId: string;
  changes: any;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

/**
 * 配置回滚选项
 */
export interface ConfigRollbackOptions {
  targetVersion: string;
  createBackup: boolean;
  validateBeforeRollback: boolean;
  notifyUsers: boolean;
}

/**
 * 配置迁移选项
 */
export interface ConfigMigrationOptions {
  fromVersion: string;
  toVersion: string;
  dryRun: boolean;
  backupBeforeMigration: boolean;
}

/**
 * 配置环境设置
 */
export interface ConfigEnvironment {
  name: string;
  description?: string;
  variables: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
}

/**
 * 配置部署选项
 */
export interface ConfigDeploymentOptions {
  environment: string;
  validateBeforeDeploy: boolean;
  rollbackOnFailure: boolean;
  notificationChannels: string[];
}
