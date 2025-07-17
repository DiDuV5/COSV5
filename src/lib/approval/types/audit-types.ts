/**
 * @fileoverview 审批审计类型定义
 * @description 定义审批审计相关的类型和接口
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 审批操作类型
 */
export type ApprovalAuditAction =
  | 'APPROVE_USER'
  | 'REJECT_USER'
  | 'BATCH_APPROVE'
  | 'BATCH_REJECT'
  | 'AUTO_APPROVE'
  | 'AUTO_REJECT'
  | 'TIMEOUT_REJECT'
  | 'REVERT_APPROVAL'
  | 'UPDATE_APPROVAL_CONFIG'
  | 'VIEW_APPROVAL_QUEUE'
  | 'USER_REGISTERED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'PERMISSION_CHANGED'
  | 'BULK_OPERATION'
  | 'SYSTEM_ACTION';

/**
 * 审批审计日志接口
 */
export interface ApprovalAuditLog {
  id: string;
  action: ApprovalAuditAction;
  adminId: string | null;
  adminName: string;
  targetUserId?: string;
  targetUserIds?: string[];
  reason?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  batchId?: string;
  sessionId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 审批历史记录接口
 */
export interface ApprovalHistory {
  id: string;
  userId: string;
  username: string;
  email: string | null;
  previousStatus: string;
  newStatus: string;
  action: ApprovalAuditAction;
  adminId: string;
  adminName: string;
  reason?: string | null;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * 审批统计接口
 */
export interface ApprovalStatistics {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  todayApproved: number;
  todayRejected: number;
  averageProcessingTime: number;
  approvalRate: number;
  rejectionRate: number;
  timeoutRate: number;
  timeoutCount: number;
  batchOperations?: number;
  adminActivity: Array<{
    adminId: string | null;
    adminName: string;
    approvals: number;
    rejections: number;
  }>;
}

/**
 * 审计日志查询参数接口
 */
export interface AuditLogQueryParams {
  userId?: string;
  adminId?: string;
  action?: ApprovalAuditAction;
  actions?: ApprovalAuditAction[];
  startDate?: Date;
  endDate?: Date;
  batchId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'adminName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 审计日志记录参数接口
 */
export interface AuditLogRecordParams {
  action: ApprovalAuditAction;
  adminId: string;
  adminName: string;
  targetUserId?: string;
  targetUserIds?: string[];
  reason?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  batchId?: string;
  sessionId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 审计日志分析结果接口
 */
export interface AuditLogAnalysis {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalActions: number;
    uniqueAdmins: number;
    uniqueUsers: number;
    mostCommonAction: ApprovalAuditAction;
    peakHour: number;
    peakDay: string;
  };
  trends: {
    dailyActions: Array<{
      date: string;
      count: number;
      approvals: number;
      rejections: number;
    }>;
    hourlyDistribution: Array<{
      hour: number;
      count: number;
    }>;
    actionDistribution: Array<{
      action: ApprovalAuditAction;
      count: number;
      percentage: number;
    }>;
  };
  adminPerformance: Array<{
    adminId: string | null;
    adminName: string;
    totalActions: number;
    approvals: number;
    rejections: number;
    averageResponseTime: number;
    efficiency: number;
  }>;
}

/**
 * 审计日志导出选项接口
 */
export interface AuditLogExportOptions {
  format: 'CSV' | 'JSON' | 'XLSX';
  includeDetails: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: AuditLogQueryParams;
  compression?: boolean;
  encryption?: boolean;
}

/**
 * 审计日志清理选项接口
 */
export interface AuditLogCleanupOptions {
  retentionDays: number;
  batchSize: number;
  dryRun: boolean;
  preserveCritical: boolean;
  archiveBeforeDelete: boolean;
  notifyAdmins: boolean;
}

/**
 * 审计日志清理结果接口
 */
export interface AuditLogCleanupResult {
  deletedCount: number;
  archivedCount: number;
  preservedCount: number;
  errors: string[];
  duration: number;
  spaceSaved: number;
}

/**
 * 审计事件接口
 */
export interface AuditEvent {
  id: string;
  type: 'LOG_CREATED' | 'LOG_UPDATED' | 'LOG_DELETED' | 'CLEANUP_PERFORMED';
  timestamp: Date;
  data: Record<string, any>;
  source: 'SYSTEM' | 'ADMIN' | 'API';
}

/**
 * 审计配置接口
 */
export interface AuditConfiguration {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed' | 'verbose';
  retentionDays: number;
  autoCleanup: boolean;
  cleanupInterval: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  realTimeNotifications: boolean;
  alertThresholds: {
    suspiciousActivity: number;
    bulkOperations: number;
    failedAttempts: number;
  };
}

/**
 * 审计报告接口
 */
export interface AuditReport {
  id: string;
  title: string;
  description: string;
  period: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  generatedBy: string;
  sections: Array<{
    title: string;
    type: 'summary' | 'chart' | 'table' | 'text';
    data: any;
  }>;
  metadata: {
    totalRecords: number;
    dataQuality: number;
    completeness: number;
  };
}

/**
 * 审计警报接口
 */
export interface AuditAlert {
  id: string;
  type: 'SUSPICIOUS_ACTIVITY' | 'BULK_OPERATION' | 'FAILED_ATTEMPTS' | 'SYSTEM_ERROR';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggeredAt: Date;
  triggeredBy: string;
  relatedLogs: string[];
  status: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * 审计指标接口
 */
export interface AuditMetrics {
  timestamp: Date;
  performance: {
    logWriteLatency: number;
    queryLatency: number;
    throughput: number;
    errorRate: number;
  };
  storage: {
    totalSize: number;
    growthRate: number;
    compressionRatio: number;
    indexSize: number;
  };
  activity: {
    logsPerHour: number;
    uniqueAdmins: number;
    peakConcurrency: number;
    averageSessionDuration: number;
  };
}

/**
 * 审计权限接口
 */
export interface AuditPermissions {
  canViewLogs: boolean;
  canExportLogs: boolean;
  canDeleteLogs: boolean;
  canConfigureAudit: boolean;
  canGenerateReports: boolean;
  canManageAlerts: boolean;
  restrictedActions?: ApprovalAuditAction[];
  dataAccessLevel: 'none' | 'own' | 'department' | 'all';
}

/**
 * 审计上下文接口
 */
export interface AuditContext {
  sessionId: string;
  requestId: string;
  userId: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  source: 'web' | 'api' | 'mobile' | 'system';
  environment: 'development' | 'staging' | 'production';
}

/**
 * 审计操作结果接口
 */
export interface AuditOperationResult {
  success: boolean;
  message: string;
  logId?: string;
  errors?: string[];
  warnings?: string[];
  metadata?: Record<string, any>;
}

/**
 * 审计批处理结果接口
 */
export interface AuditBatchResult {
  batchId: string;
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  errors: Array<{
    item: string;
    error: string;
  }>;
  duration: number;
  startTime: Date;
  endTime: Date;
}
