/**
 * @fileoverview 存储监控服务类型定义
 * @description 定义存储监控相关的类型和接口
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 磁盘空间信息
 */
export interface DiskSpaceInfo {
  path: string;
  total: number;
  used: number;
  free: number;
  usage: number; // 使用率百分比
  timestamp: Date;
}

/**
 * 目录空间使用情况
 */
export interface DirectorySpaceInfo {
  path: string;
  size: number;
  fileCount: number;
  lastModified: Date;
  timestamp: Date;
}

/**
 * 预警级别
 */
export enum AlertLevel {
  WARNING = 'WARNING',   // 75%
  CRITICAL = 'CRITICAL', // 85%
  EMERGENCY = 'EMERGENCY' // 95%
}

/**
 * 预警信息
 */
export interface StorageAlert {
  level: AlertLevel;
  message: string;
  diskInfo: DiskSpaceInfo;
  directoryInfo: DirectorySpaceInfo[];
  timestamp: Date;
  resolved: boolean;
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  checkInterval: number; // 检查间隔（毫秒）
  warningThreshold: number; // 警告阈值（百分比）
  criticalThreshold: number; // 严重阈值（百分比）
  emergencyThreshold: number; // 紧急阈值（百分比）
  alertCooldown: number; // 预警冷却时间（毫秒）
  enableEmailNotification: boolean;
  enableWebhookNotification: boolean;
  webhookUrl?: string;
  adminEmails: string[];
}

/**
 * 存储状态
 */
export interface StorageStatus {
  diskInfo: DiskSpaceInfo;
  directoryInfos: DirectorySpaceInfo[];
  alerts: StorageAlert[];
}

/**
 * 服务状态
 */
export interface ServiceStatus {
  isMonitoring: boolean;
  config: MonitorConfig;
  lastCheck?: Date;
}

/**
 * 监控检查结果
 */
export interface MonitoringCheckResult {
  diskInfo: DiskSpaceInfo;
  directoryInfos: DirectorySpaceInfo[];
}

/**
 * 邮件通知数据
 */
export interface EmailNotificationData {
  to: string[];
  subject: string;
  message: string;
}

/**
 * Webhook通知数据
 */
export interface WebhookNotificationData {
  type: string;
  level: AlertLevel;
  message: string;
  data: {
    diskInfo: DiskSpaceInfo;
    directoryInfo: DirectorySpaceInfo[];
  };
  timestamp: string;
}

/**
 * 文件扫描选项
 */
export interface FileScanOptions {
  includeHidden?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
}

/**
 * 磁盘空间查询选项
 */
export interface DiskSpaceQueryOptions {
  path?: string;
  useSystemCommand?: boolean;
  fallbackData?: Partial<DiskSpaceInfo>;
}

/**
 * 预警查询选项
 */
export interface AlertQueryOptions {
  resolved?: boolean;
  level?: AlertLevel;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 存储趋势数据点
 */
export interface StorageTrendPoint {
  timestamp: Date;
  usage: number;
  total: number;
  used: number;
  free: number;
  path: string; // 添加path字段以匹配DiskSpaceInfo
}

/**
 * 目录统计信息
 */
export interface DirectoryStats {
  totalSize: number;
  totalFiles: number;
  largestFile: {
    path: string;
    size: number;
  } | null;
  oldestFile: {
    path: string;
    modified: Date;
  } | null;
  newestFile: {
    path: string;
    modified: Date;
  } | null;
}

/**
 * 清理建议
 */
export interface CleanupSuggestion {
  type: 'old_files' | 'large_files' | 'temp_files' | 'duplicates';
  description: string;
  estimatedSpace: number;
  files: string[];
  priority: 'low' | 'medium' | 'high';
}

/**
 * 监控事件类型
 */
export type MonitoringEventType = 
  | 'monitoringCheck'
  | 'alert'
  | 'error'
  | 'configUpdate'
  | 'alertResolved';

/**
 * 监控事件数据
 */
export interface MonitoringEventData {
  type: MonitoringEventType;
  timestamp: Date;
  data: any;
}

/**
 * 默认配置值
 */
export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  checkInterval: 5 * 60 * 1000, // 5分钟
  warningThreshold: 75,
  criticalThreshold: 85,
  emergencyThreshold: 95,
  alertCooldown: 30 * 60 * 1000, // 30分钟
  enableEmailNotification: true,
  enableWebhookNotification: false,
  adminEmails: [],
};

/**
 * 预警级别阈值映射
 */
export const ALERT_THRESHOLDS = {
  [AlertLevel.WARNING]: 75,
  [AlertLevel.CRITICAL]: 85,
  [AlertLevel.EMERGENCY]: 95,
} as const;

/**
 * 预警级别优先级
 */
export const ALERT_PRIORITY = {
  [AlertLevel.WARNING]: 1,
  [AlertLevel.CRITICAL]: 2,
  [AlertLevel.EMERGENCY]: 3,
} as const;
