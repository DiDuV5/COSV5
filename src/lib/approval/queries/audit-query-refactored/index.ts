/**
 * @fileoverview 审计查询器统一导出
 * @description 提供向后兼容的统一导出接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 重构为模块化结构
 * - 保持100%向后兼容性
 * - 文件大小从521行减少到<100行
 */

// 导出所有类型定义
export * from './types';

// 导出核心功能模块
export { BaseAuditQuery } from './base-query';
export { HistoryQuery } from './history-query';
export { SearchQuery } from './search-query';
export { ActivityQuery } from './activity-query';
export { StatsQuery } from './stats-query';

// 导入依赖以创建向后兼容的主类
import { BaseAuditQuery } from './base-query';
import { HistoryQuery } from './history-query';
import { SearchQuery } from './search-query';
import { ActivityQuery } from './activity-query';
import { StatsQuery } from './stats-query';
import {
  ApprovalAuditLog,
  ApprovalHistory,
  AuditLogQueryParams,
  AuditHistoryResult,
  AuditStatsResult,
  SearchField,
  AdminActionParams,
  BatchOperationParams,
  RecentActivityParams,
  SuspiciousActivityParams
} from './types';

/**
 * 审计查询器（重构后的向后兼容版本）
 * 提供所有审计查询功能的统一接口
 */
export class AuditQuery {
  /**
   * 获取审批历史记录
   * @param params 查询参数
   */
  static async getApprovalHistory(params: AuditLogQueryParams = {}): Promise<AuditHistoryResult> {
    return BaseAuditQuery.getApprovalHistory(params);
  }

  /**
   * 获取用户审批历史
   * @param userId 用户ID
   * @param limit 限制数量
   */
  static async getUserApprovalHistory(userId: string, limit: number = 20): Promise<ApprovalHistory[]> {
    return HistoryQuery.getUserApprovalHistory(userId, limit);
  }

  /**
   * 获取管理员操作历史
   * @param adminId 管理员ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param limit 限制数量
   */
  static async getAdminActionHistory(
    adminId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    return HistoryQuery.getAdminActionHistory({ adminId, startDate, endDate, limit });
  }

  /**
   * 获取批量操作记录
   * @param batchId 批次ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param limit 限制数量
   */
  static async getBatchOperations(
    batchId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    return HistoryQuery.getBatchOperations({ batchId, startDate, endDate, limit });
  }

  /**
   * 搜索审计日志（安全版本）
   * @param searchTerm 搜索词
   * @param searchFields 搜索字段
   * @param limit 限制数量
   */
  static async searchAuditLogs(
    searchTerm: string,
    searchFields: SearchField[] = ['adminName', 'reason'],
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    return SearchQuery.searchAuditLogs(searchTerm, searchFields, limit);
  }

  /**
   * 获取最近的审计活动
   * @param hours 小时数
   * @param limit 限制数量
   */
  static async getRecentActivity(hours: number = 24, limit: number = 20): Promise<ApprovalAuditLog[]> {
    return ActivityQuery.getRecentActivity({ hours, limit });
  }

  /**
   * 获取可疑活动
   * @param timeWindow 时间窗口（小时）
   * @param threshold 阈值
   */
  static async getSuspiciousActivity(
    timeWindow: number = 24,
    threshold: number = 10
  ): Promise<ApprovalAuditLog[]> {
    return ActivityQuery.getSuspiciousActivity({ timeWindow, threshold });
  }

  /**
   * 获取审计日志统计
   * @param days 统计天数
   */
  static async getAuditLogStats(days: number = 30): Promise<AuditStatsResult> {
    return StatsQuery.getAuditLogStats(days);
  }
}
