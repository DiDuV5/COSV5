/**
 * @fileoverview 审计查询类型定义
 * @description 审计查询系统相关的所有类型、接口和枚举定义
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始audit-query.ts文件中提取类型定义
 * - 确保100%向后兼容性
 */

import {
  ApprovalAuditLog,
  ApprovalHistory,
  AuditLogQueryParams,
  ApprovalAuditAction
} from '../../types/audit-types';

// 重新导出核心类型以保持兼容性
export type {
  ApprovalAuditLog,
  ApprovalHistory,
  AuditLogQueryParams,
  ApprovalAuditAction
} from '../../types/audit-types';

/**
 * 查询结果接口
 */
export interface QueryResult<T> {
  data: T;
  total: number;
  hasMore: boolean;
}

/**
 * 审计历史查询结果接口
 */
export interface AuditHistoryResult {
  logs: ApprovalAuditLog[];
  total: number;
  hasMore: boolean;
}

/**
 * 统计查询结果接口
 */
export interface AuditStatsResult {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByAdmin: Record<string, number>;
  dailyActivity: Array<{ date: string; count: number }>;
}

/**
 * 搜索字段类型
 */
export type SearchField = 'adminName' | 'reason' | 'details';

/**
 * 可疑活动查询参数接口
 */
export interface SuspiciousActivityParams {
  timeWindow?: number;
  threshold?: number;
}

/**
 * 批量操作查询参数接口
 */
export interface BatchOperationParams {
  batchId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * 管理员操作历史查询参数接口
 */
export interface AdminActionParams {
  adminId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

/**
 * 最近活动查询参数接口
 */
export interface RecentActivityParams {
  hours?: number;
  limit?: number;
}
