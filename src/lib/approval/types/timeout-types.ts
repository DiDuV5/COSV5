/**
 * @fileoverview 审批超时类型定义
 * @description 定义审批超时相关的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 超时用户信息接口
 */
export interface TimeoutUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
  hoursOverdue: number;
}

/**
 * 超时处理结果接口
 */
export interface TimeoutProcessingResult {
  processedCount: number;
  autoRejectedCount: number;
  notifiedCount: number;
  errors: string[];
}

/**
 * 超时检测配置接口
 */
export interface TimeoutDetectionConfig {
  timeoutHours: number;
  reminderHours: number;
  enableAutoRejection: boolean;
  enableNotifications: boolean;
  batchSize: number;
}

/**
 * 超时通知类型枚举
 */
export enum TimeoutNotificationType {
  TIMEOUT_REMINDER = 'TIMEOUT_REMINDER',
  ADMIN_REMINDER = 'ADMIN_REMINDER',
  AUTO_REJECTION = 'AUTO_REJECTION',
  UPCOMING_TIMEOUT = 'UPCOMING_TIMEOUT'
}

/**
 * 超时通知记录接口
 */
export interface TimeoutNotificationRecord {
  id: string;
  userId: string;
  type: TimeoutNotificationType;
  sentAt: Date;
  success: boolean;
  error?: string;
}

/**
 * 超时统计接口
 */
export interface TimeoutStatistics {
  totalTimeoutUsers: number;
  autoRejectedUsers: number;
  notifiedUsers: number;
  upcomingTimeoutUsers: number;
  averageProcessingTime: number;
  successRate: number;
}

/**
 * 超时处理选项接口
 */
export interface TimeoutProcessingOptions {
  dryRun?: boolean;
  batchSize?: number;
  enableAutoRejection?: boolean;
  enableNotifications?: boolean;
  customReason?: string;
}

/**
 * 超时提醒配置接口
 */
export interface TimeoutReminderConfig {
  enabled: boolean;
  reminderHours: number;
  maxReminders: number;
  reminderInterval: number;
  emailTemplate: string;
  adminNotificationEnabled: boolean;
}

/**
 * 管理员提醒数据接口
 */
export interface AdminReminderData {
  timeoutUsers: TimeoutUser[];
  upcomingTimeoutUsers: TimeoutUser[];
  totalPendingApprovals: number;
  oldestPendingDays: number;
  reminderSentAt: Date;
}

/**
 * 超时处理日志接口
 */
export interface TimeoutProcessingLog {
  id: string;
  batchId: string;
  processedAt: Date;
  processedCount: number;
  autoRejectedCount: number;
  notifiedCount: number;
  errors: string[];
  processingTimeMs: number;
  triggeredBy: 'SCHEDULED' | 'MANUAL' | 'API';
}

/**
 * 超时用户查询选项接口
 */
export interface TimeoutUserQueryOptions {
  timeoutHours: number;
  includeAlreadyNotified?: boolean;
  includeRecentlyProcessed?: boolean;
  sortBy?: 'createdAt' | 'hoursOverdue' | 'username';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * 超时处理状态枚举
 */
export enum TimeoutProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * 超时处理任务接口
 */
export interface TimeoutProcessingTask {
  id: string;
  status: TimeoutProcessingStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  userIds: string[];
  options: TimeoutProcessingOptions;
  result?: TimeoutProcessingResult;
  error?: string;
}

/**
 * 超时调度配置接口
 */
export interface TimeoutScheduleConfig {
  enabled: boolean;
  checkInterval: number; // 分钟
  processingInterval: number; // 分钟
  reminderInterval: number; // 分钟
  cleanupInterval: number; // 小时
  timezone: string;
}

/**
 * 超时事件接口
 */
export interface TimeoutEvent {
  type: 'USER_TIMEOUT' | 'AUTO_REJECTION' | 'REMINDER_SENT' | 'ADMIN_NOTIFIED';
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

/**
 * 超时处理回调接口
 */
export interface TimeoutProcessingCallbacks {
  onUserTimeout?: (user: TimeoutUser) => void;
  onAutoRejection?: (user: TimeoutUser) => void;
  onReminderSent?: (user: TimeoutUser) => void;
  onAdminNotified?: (data: AdminReminderData) => void;
  onError?: (error: Error, context: string) => void;
}

/**
 * 超时清理选项接口
 */
export interface TimeoutCleanupOptions {
  retentionDays: number;
  cleanupNotifications: boolean;
  cleanupLogs: boolean;
  cleanupTasks: boolean;
  dryRun?: boolean;
}

/**
 * 超时清理结果接口
 */
export interface TimeoutCleanupResult {
  notificationsDeleted: number;
  logsDeleted: number;
  tasksDeleted: number;
  totalDeleted: number;
  errors: string[];
}

/**
 * 超时健康检查结果接口
 */
export interface TimeoutHealthCheck {
  healthy: boolean;
  issues: string[];
  statistics: {
    pendingTimeouts: number;
    processingTasks: number;
    failedTasks: number;
    lastProcessingTime: Date | null;
  };
  recommendations: string[];
}

/**
 * 超时配置验证结果接口
 */
export interface TimeoutConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * 超时批处理结果接口
 */
export interface TimeoutBatchResult {
  batchId: string;
  totalUsers: number;
  processedUsers: number;
  successfulUsers: number;
  failedUsers: number;
  skippedUsers: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
  processingTime: number;
}

/**
 * 超时用户详情接口
 */
export interface TimeoutUserDetails extends TimeoutUser {
  registrationSource: string;
  lastLoginAt?: Date;
  profileCompleteness: number;
  hasRecentActivity: boolean;
  notificationHistory: TimeoutNotificationRecord[];
  riskScore: number;
}

/**
 * 超时处理策略接口
 */
export interface TimeoutProcessingStrategy {
  name: string;
  description: string;
  conditions: {
    minHoursOverdue: number;
    maxHoursOverdue?: number;
    userLevelRestrictions?: string[];
    excludeRecentActivity?: boolean;
  };
  actions: {
    autoReject: boolean;
    sendReminder: boolean;
    notifyAdmin: boolean;
    customAction?: string;
  };
  priority: number;
}

/**
 * 超时监控指标接口
 */
export interface TimeoutMonitoringMetrics {
  timestamp: Date;
  pendingApprovals: number;
  timeoutUsers: number;
  autoRejections: number;
  remindersSent: number;
  averageApprovalTime: number;
  timeoutRate: number;
  processingLatency: number;
}
