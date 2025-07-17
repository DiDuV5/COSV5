/**
 * @fileoverview 审批配置类型定义
 * @description 定义审批配置相关的类型和验证规则
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 审批配置接口
 */
export interface ApprovalConfig {
  registrationApprovalEnabled: boolean;
  notificationEnabled: boolean;
  autoApproveAdmin: boolean;
  timeoutHours: number;
  autoRejectTimeout: boolean;
  batchSizeLimit: number;
}

/**
 * 配置验证规则接口
 */
export interface ConfigValidationRule {
  key: string;
  type: 'boolean' | 'number' | 'string';
  min?: number;
  max?: number;
  required: boolean;
  defaultValue: any;
  description?: string;
  category?: string;
}

/**
 * 配置更新结果接口
 */
export interface ConfigUpdateResult {
  success: boolean;
  message: string;
  updatedKeys?: string[];
  errors?: string[];
}

/**
 * 配置验证结果接口
 */
export interface ConfigValidationResult {
  valid: boolean;
  missingKeys: string[];
  invalidValues: string[];
  warnings?: string[];
}

/**
 * 配置初始化结果接口
 */
export interface ConfigInitializationResult {
  success: boolean;
  initialized: string[];
  errors?: string[];
}

/**
 * 配置缓存项接口
 */
export interface ConfigCacheItem {
  data: ApprovalConfig;
  timestamp: number;
  ttl: number;
}

/**
 * 配置更新日志接口
 */
export interface ConfigUpdateLog {
  id: string;
  adminId: string;
  updates: Record<string, any>;
  previousValues: Record<string, any>;
  timestamp: Date;
  reason?: string;
}

/**
 * 配置监控事件接口
 */
export interface ConfigMonitorEvent {
  type: 'CONFIG_UPDATED' | 'CONFIG_VALIDATED' | 'CONFIG_CACHED' | 'CONFIG_ERROR';
  timestamp: Date;
  data: Record<string, any>;
  source: 'ADMIN' | 'SYSTEM' | 'HOT_RELOAD';
}

/**
 * 配置热重载选项接口
 */
export interface ConfigHotReloadOptions {
  enabled: boolean;
  interval: number; // 毫秒
  autoReload: boolean;
  notifyOnChange: boolean;
}

/**
 * 配置备份接口
 */
export interface ConfigBackup {
  id: string;
  config: ApprovalConfig;
  createdAt: Date;
  createdBy: string;
  description?: string;
  version: string;
}

/**
 * 配置比较结果接口
 */
export interface ConfigComparisonResult {
  hasChanges: boolean;
  changes: Array<{
    key: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'modified' | 'removed';
  }>;
}

/**
 * 配置验证规则定义
 */
export const CONFIG_VALIDATION_RULES: ConfigValidationRule[] = [
  {
    key: 'user_registration_approval_enabled',
    type: 'boolean',
    required: true,
    defaultValue: false,
    description: '是否启用用户注册审批',
    category: 'registration'
  },
  {
    key: 'user_approval_notification_enabled',
    type: 'boolean',
    required: true,
    defaultValue: true,
    description: '是否启用审批通知',
    category: 'notification'
  },
  {
    key: 'user_approval_auto_approve_admin',
    type: 'boolean',
    required: true,
    defaultValue: false,
    description: '是否自动审批管理员账户',
    category: 'registration'
  },
  {
    key: 'user_approval_timeout_hours',
    type: 'number',
    min: 1,
    max: 720, // 30天
    required: true,
    defaultValue: 72,
    description: '审批超时时间（小时）',
    category: 'timeout'
  },
  {
    key: 'user_approval_auto_reject_timeout',
    type: 'boolean',
    required: true,
    defaultValue: false,
    description: '是否自动拒绝超时申请',
    category: 'timeout'
  },
  {
    key: 'user_approval_batch_size_limit',
    type: 'number',
    min: 1,
    max: 1000,
    required: true,
    defaultValue: 50,
    description: '批量操作大小限制',
    category: 'performance'
  }
];

/**
 * 配置键映射
 */
export const CONFIG_KEY_MAPPING: Record<string, keyof ApprovalConfig> = {
  'user_registration_approval_enabled': 'registrationApprovalEnabled',
  'user_approval_notification_enabled': 'notificationEnabled',
  'user_approval_auto_approve_admin': 'autoApproveAdmin',
  'user_approval_timeout_hours': 'timeoutHours',
  'user_approval_auto_reject_timeout': 'autoRejectTimeout',
  'user_approval_batch_size_limit': 'batchSizeLimit'
};

/**
 * 默认配置
 */
export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  registrationApprovalEnabled: false,
  notificationEnabled: true,
  autoApproveAdmin: false,
  timeoutHours: 72,
  autoRejectTimeout: false,
  batchSizeLimit: 50
};

/**
 * 配置分类
 */
export const CONFIG_CATEGORIES = {
  REGISTRATION: 'registration',
  NOTIFICATION: 'notification',
  TIMEOUT: 'timeout',
  PERFORMANCE: 'performance',
  SECURITY: 'security'
} as const;

/**
 * 配置优先级
 */
export enum ConfigPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * 配置变更类型
 */
export enum ConfigChangeType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  RESTORED = 'RESTORED'
}

/**
 * 配置状态
 */
export enum ConfigStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  ERROR = 'ERROR'
}

/**
 * 配置环境
 */
export enum ConfigEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * 配置权限
 */
export interface ConfigPermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canBackup: boolean;
  canRestore: boolean;
}

/**
 * 配置审计信息
 */
export interface ConfigAuditInfo {
  createdBy: string;
  createdAt: Date;
  lastModifiedBy: string;
  lastModifiedAt: Date;
  version: number;
  checksum: string;
}

/**
 * 配置元数据
 */
export interface ConfigMetadata {
  version: string;
  environment: ConfigEnvironment;
  lastSync: Date;
  source: 'DATABASE' | 'FILE' | 'ENVIRONMENT';
  encrypted: boolean;
  compressed: boolean;
}

/**
 * 配置导入导出选项
 */
export interface ConfigImportExportOptions {
  includeMetadata: boolean;
  includeAuditInfo: boolean;
  format: 'JSON' | 'YAML' | 'ENV';
  encrypt: boolean;
  compress: boolean;
}

/**
 * 配置同步状态
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
 * 配置健康检查结果
 */
export interface ConfigHealthCheck {
  healthy: boolean;
  issues: Array<{
    severity: 'warning' | 'error' | 'critical';
    message: string;
    key?: string;
    suggestion?: string;
  }>;
  lastCheck: Date;
  nextCheck: Date;
}

/**
 * 配置性能指标
 */
export interface ConfigPerformanceMetrics {
  cacheHitRate: number;
  averageLoadTime: number;
  updateFrequency: number;
  memoryUsage: number;
  lastOptimization: Date;
}
