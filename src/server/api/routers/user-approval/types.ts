/**
 * @fileoverview 用户审批系统类型定义和常量
 * @description 定义用户审批相关的类型、接口和常量
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 增强版本，添加更多类型定义和常量
 */

// ===== 常量定义 =====

/**
 * 审批操作常量
 */
export const APPROVAL_ACTIONS = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  PENDING: 'PENDING',
  RESUBMIT: 'RESUBMIT',
} as const;

/**
 * 审批状态常量
 */
export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

/**
 * 排序字段常量
 */
export const SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  USERNAME: 'username',
  EMAIL: 'email',
} as const;

/**
 * 排序顺序常量
 */
export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

/**
 * 增强审批操作类型常量
 */
export const ENHANCED_APPROVAL_ACTIONS = {
  APPROVE_USER: 'APPROVE_USER',
  REJECT_USER: 'REJECT_USER',
  BATCH_APPROVE: 'BATCH_APPROVE',
  BATCH_REJECT: 'BATCH_REJECT',
  AUTO_APPROVE: 'AUTO_APPROVE',
  AUTO_REJECT: 'AUTO_REJECT',
  TIMEOUT_REJECT: 'TIMEOUT_REJECT',
  REVERT_APPROVAL: 'REVERT_APPROVAL',
  VIEW_APPROVAL_QUEUE: 'VIEW_APPROVAL_QUEUE',
} as const;

/**
 * 错误类型常量
 */
export const APPROVAL_ERROR_TYPES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  BATCH_LIMIT_EXCEEDED: 'BATCH_LIMIT_EXCEEDED',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

/**
 * 默认配置常量
 */
export const DEFAULT_APPROVAL_CONFIG = {
  BATCH_SIZE_LIMIT: 50,
  TIMEOUT_HOURS: 72,
  MAX_REASON_LENGTH: 500,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ===== 类型定义 =====

/**
 * 审批状态类型
 */
export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS];

/**
 * 审批操作类型
 */
export type ApprovalAction = typeof APPROVAL_ACTIONS[keyof typeof APPROVAL_ACTIONS];

/**
 * 增强审批操作类型
 */
export type EnhancedApprovalAction = typeof ENHANCED_APPROVAL_ACTIONS[keyof typeof ENHANCED_APPROVAL_ACTIONS];

/**
 * 排序字段类型
 */
export type SortField = typeof SORT_FIELDS[keyof typeof SORT_FIELDS];

/**
 * 排序顺序类型
 */
export type SortOrder = typeof SORT_ORDERS[keyof typeof SORT_ORDERS];

/**
 * 错误类型
 */
export type ApprovalErrorType = typeof APPROVAL_ERROR_TYPES[keyof typeof APPROVAL_ERROR_TYPES];

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
 * 配置完整性检查结果
 */
export interface ConfigIntegrity {
  valid: boolean;
  missingKeys: string[];
  invalidValues: string[];
}

/**
 * 增强配置响应
 */
export interface EnhancedConfigResponse {
  config: ApprovalConfig;
  integrity: ConfigIntegrity;
}

/**
 * 审批历史查询参数
 */
export interface ApprovalHistoryQuery {
  userId?: string;
  adminId?: string;
  action?: EnhancedApprovalAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * 审批统计查询参数
 */
export interface ApprovalStatisticsQuery {
  startDate?: Date;
  endDate?: Date;
}

/**
 * 超时处理结果
 */
export interface TimeoutProcessingResult {
  processedCount: number;
  autoRejectedCount: number;
  notifiedCount: number;
  errors: string[];
}

/**
 * 审批操作上下文
 */
export interface ApprovalContext {
  adminId: string;
  adminLevel: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * 错误恢复操作
 */
export interface ErrorRecoveryActions {
  actions: string[];
  context?: Record<string, any>;
}

/**
 * 用户基本信息
 */
export interface UserBasicInfo {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  userLevel: string;
  approvalStatus: ApprovalStatus;

  createdAt: Date;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
}

/**
 * 审批日志条目
 */
export interface ApprovalLogEntry {
  id: string;
  userId: string;
  adminId: string;
  action: ApprovalAction;
  previousStatus: ApprovalStatus;
  newStatus: ApprovalStatus;
  reason: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string | null;
  };
  admin: {
    id: string;
    username: string;
    displayName: string | null;
  };
}

/**
 * 审批统计信息
 */
export interface ApprovalStats {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalCount: number;
  todayApprovals: number;
  todayRejections: number;
  averageProcessingTime: number;
}

/**
 * 审批配置
 */
export interface ApprovalConfig {
  registrationApprovalEnabled: boolean;
  notificationEnabled: boolean;
  autoApproveAdmin: boolean;
}

/**
 * 通知用户信息
 */
export interface NotificationUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;

}

/**
 * 批量通知结果
 */
export interface BatchNotificationResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * 审批操作结果
 */
export interface ApprovalResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    approvalStatus: ApprovalStatus;
    approvedAt: Date | null;
    rejectedAt: Date | null;
  };
  message: string;
}

/**
 * 批量审批结果
 */
export interface BatchApprovalResult {
  success: boolean;
  processedCount: number;
  skippedCount: number;
  message: string;
  summary: string;
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalPages?: number;
}

/**
 * 待审核用户查询结果
 */
export type PendingUsersResult = PaginatedResult<UserBasicInfo>;

/**
 * 审批日志查询结果
 */
export type ApprovalLogsResult = PaginatedResult<ApprovalLogEntry>;

/**
 * 系统设置项
 */
export interface SystemSetting {
  key: string;
  value: string;
  category: string;
  isPublic: boolean;
}

/**
 * 审批操作上下文
 */
export interface ApprovalContext {
  adminId: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * 安全事件类型
 */
export type SecurityEventType =
  | 'BATCH_APPROVAL_OPERATION'
  | 'APPROVAL_RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_APPROVAL_ATTEMPT';

/**
 * 安全事件数据
 */
export interface SecurityEventData {
  action?: ApprovalAction;
  userCount?: number;
  requestedCount?: number;
  reason?: string;
  [key: string]: unknown;
}
