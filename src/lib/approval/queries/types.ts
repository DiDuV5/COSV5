/**
 * @fileoverview 审计查询类型定义
 * @description 审计查询系统相关的接口和类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { ApprovalAuditAction } from '../types/audit-types';

/**
 * 查询结果包装接口
 */
export interface QueryResult<T> {
  data: T;
  total: number;
  hasMore: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

/**
 * 排序参数接口
 */
export interface SortParams {
  sortBy?: 'timestamp' | 'action' | 'adminName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 时间范围参数接口
 */
export interface TimeRangeParams {
  startDate?: Date;
  endDate?: Date;
  hours?: number;
  days?: number;
}

/**
 * 过滤参数接口
 */
export interface FilterParams {
  userId?: string;
  adminId?: string;
  action?: ApprovalAuditAction;
  actions?: ApprovalAuditAction[];
  batchId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
}

/**
 * 搜索参数接口
 */
export interface SearchParams {
  searchTerm: string;
  searchFields?: ('adminName' | 'reason' | 'details')[];
  caseSensitive?: boolean;
}

/**
 * 完整查询参数接口
 */
export interface AuditQueryParams extends 
  PaginationParams, 
  SortParams, 
  TimeRangeParams, 
  FilterParams, 
  Partial<SearchParams> {}

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
 * 活动分析结果接口
 */
export interface ActivityAnalysisResult {
  suspiciousAdmins: string[];
  highFrequencyOperations: Array<{
    adminId: string;
    count: number;
    timeWindow: number;
  }>;
  recentActivity: any[];
}

/**
 * 查询条件构建器接口
 */
export interface QueryConditionBuilder {
  buildWhereConditions(params: AuditQueryParams): any;
  buildOrderByConditions(params: SortParams): any;
  buildSearchConditions(params: SearchParams): any;
}

/**
 * 数据格式化器接口
 */
export interface DataFormatter {
  formatAuditLog(log: any): any;
  formatApprovalHistory(history: any): any;
  formatStatsResult(stats: any): AuditStatsResult;
}

/**
 * 查询验证器接口
 */
export interface QueryValidator {
  validateQueryParams(params: AuditQueryParams): AuditQueryParams;
  validateSearchFields(fields: string[]): string[];
  validateTimeRange(params: TimeRangeParams): TimeRangeParams;
  validatePagination(params: PaginationParams): PaginationParams;
}
