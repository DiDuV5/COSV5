/**
 * @fileoverview 审计查询模块统一导出
 * @description 重构后的模块化审计查询系统入口
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 (重构版本，保持向后兼容)
 */

// 导出所有类型定义
export * from './types';

// 导出常量
export * from './constants';

// 导出工具函数
export { QueryConditionBuilderImpl, QueryValidatorImpl } from './utils/queryUtils';
export { DataFormatterImpl, FormatUtils } from './utils/formatUtils';

// 导出查询类
export { BaseAuditQuery } from './queries/BaseAuditQuery';
export { HistoryQuery } from './queries/HistoryQuery';
export { SearchQuery } from './queries/SearchQuery';
export { StatsQuery } from './queries/StatsQuery';
export { ActivityQuery } from './queries/ActivityQuery';

// 导入依赖
import { BaseAuditQuery } from './queries/BaseAuditQuery';
import { HistoryQuery } from './queries/HistoryQuery';
import { SearchQuery } from './queries/SearchQuery';
import { StatsQuery } from './queries/StatsQuery';
import { ActivityQuery } from './queries/ActivityQuery';
import {
  ApprovalAuditLog,
  ApprovalHistory,
  AuditLogQueryParams
} from '../types/audit-types';
import { QueryResult } from './types';

/**
 * 向后兼容的审计查询类
 *
 * 这是为了保持向后兼容性而提供的包装类
 * 内部使用重构后的模块化架构
 */
export class AuditQuery {
  private static historyQuery = new HistoryQuery();
  private static searchQuery = new SearchQuery();
  private static statsQuery = new StatsQuery();
  private static activityQuery = new ActivityQuery();

  /**
   * 获取审批历史记录 (向后兼容方法)
   */
  static async getApprovalHistory(params: AuditLogQueryParams = {}): Promise<{
    logs: ApprovalAuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await this.historyQuery.getApprovalHistory(params);
    return {
      logs: Array.isArray(result.data) ? result.data : [result.data],
      total: result.total,
      hasMore: result.hasMore
    };
  }

  /**
   * 获取用户审批历史 (向后兼容方法)
   */
  static async getUserApprovalHistory(userId: string, limit: number = 20): Promise<ApprovalHistory[]> {
    return await this.historyQuery.getUserApprovalHistory(userId, limit);
  }

  /**
   * 获取管理员操作历史 (向后兼容方法)
   */
  static async getAdminActionHistory(
    adminId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    return await this.historyQuery.getAdminActionHistory(adminId, startDate, endDate, limit);
  }

  /**
   * 获取批量操作记录 (向后兼容方法)
   */
  static async getBatchOperations(
    batchId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    return await this.historyQuery.getBatchOperations(batchId, startDate, endDate, limit);
  }

  /**
   * 搜索审计日志 (向后兼容方法)
   */
  static async searchAuditLogs(
    searchTerm: string,
    searchFields: ('adminName' | 'reason' | 'details')[] = ['adminName', 'reason'],
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    return await this.searchQuery.searchAuditLogs(searchTerm, searchFields, limit);
  }

  /**
   * 获取最近的审计活动 (向后兼容方法)
   */
  static async getRecentActivity(hours: number = 24, limit: number = 20): Promise<ApprovalAuditLog[]> {
    return await this.activityQuery.getRecentActivity(hours, limit);
  }

  /**
   * 获取可疑活动 (向后兼容方法)
   */
  static async getSuspiciousActivity(
    timeWindow: number = 24,
    threshold: number = 10
  ): Promise<ApprovalAuditLog[]> {
    return await this.activityQuery.getSuspiciousActivity(timeWindow, threshold);
  }

  /**
   * 获取审计日志统计 (向后兼容方法)
   */
  static async getAuditLogStats(days: number = 30): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByAdmin: Record<string, number>;
    dailyActivity: Array<{ date: string; count: number }>;
  }> {
    return await this.statsQuery.getAuditLogStats(days);
  }
}

/**
 * 新的模块化查询接口 - 推荐使用
 */
export class ModularAuditQuery {
  /**
   * 历史记录查询
   */
  static get history() {
    return new HistoryQuery();
  }

  /**
   * 搜索查询
   */
  static get search() {
    return new SearchQuery();
  }

  /**
   * 统计查询
   */
  static get stats() {
    return new StatsQuery();
  }

  /**
   * 活动查询
   */
  static get activity() {
    return new ActivityQuery();
  }

  /**
   * 基础查询
   */
  static get base() {
    return new BaseAuditQuery();
  }
}

/**
 * 快速创建函数 - 新增便利方法
 */
export const createHistoryQuery = () => new HistoryQuery();
export const createSearchQuery = () => new SearchQuery();
export const createStatsQuery = () => new StatsQuery();
export const createActivityQuery = () => new ActivityQuery();
export const createBaseQuery = () => new BaseAuditQuery();

// 默认导出
export default AuditQuery;
