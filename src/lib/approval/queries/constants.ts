/**
 * @fileoverview 审计查询常量和配置
 * @description 审计查询系统使用的常量定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { ApprovalAuditAction } from '../types/audit-types';

/**
 * 默认查询配置
 */
export const DEFAULT_QUERY_CONFIG = {
  LIMIT: 50,
  MAX_LIMIT: 100,
  OFFSET: 0,
  SORT_BY: 'timestamp' as const,
  SORT_ORDER: 'desc' as const,
  RECENT_ACTIVITY_HOURS: 24,
  SUSPICIOUS_ACTIVITY_THRESHOLD: 10,
  STATS_DEFAULT_DAYS: 30,
} as const;

/**
 * 允许的搜索字段
 */
export const ALLOWED_SEARCH_FIELDS = [
  'adminName',
  'reason', 
  'details'
] as const;

/**
 * 允许的排序字段
 */
export const ALLOWED_SORT_FIELDS = [
  'timestamp',
  'action',
  'adminName'
] as const;

/**
 * 批量操作相关的审计动作
 */
export const BATCH_OPERATION_ACTIONS: ApprovalAuditAction[] = [
  'BATCH_APPROVE',
  'BATCH_REJECT', 
  'BULK_OPERATION'
];

/**
 * 严重程度级别
 */
export const SEVERITY_LEVELS = [
  'low',
  'medium',
  'high',
  'critical'
] as const;

/**
 * 查询限制配置
 */
export const QUERY_LIMITS = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 50,
  MAX_SEARCH_TERM_LENGTH: 100,
  MAX_TIME_RANGE_DAYS: 365,
} as const;

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  STATS_TTL: 300, // 5分钟
  RECENT_ACTIVITY_TTL: 60, // 1分钟
  SEARCH_RESULTS_TTL: 180, // 3分钟
} as const;
