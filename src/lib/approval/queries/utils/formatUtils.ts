/**
 * @fileoverview 数据格式化工具
 * @description 审计查询结果的格式化工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { 
  ApprovalAuditLog, 
  ApprovalHistory, 
  ApprovalAuditAction 
} from '../../types/audit-types';
import { DataFormatter, AuditStatsResult } from '../types';

/**
 * 数据格式化器实现
 */
export class DataFormatterImpl implements DataFormatter {
  /**
   * 格式化审计日志
   * @param log 原始日志数据
   * @returns 格式化后的审计日志
   */
  formatAuditLog(log: any): ApprovalAuditLog {
    let details = {};
    try {
      details = JSON.parse(log.details || '{}');
    } catch {
      details = {};
    }

    return {
      id: log.id,
      action: log.action as ApprovalAuditAction,
      adminId: log.userId,
      adminName: this.extractAdminName(details, log.user),
      targetUserId: (details as any).targetUserId as string | undefined,
      targetUserIds: (details as any).targetUserIds as string[] | undefined,
      reason: (details as any).reason as string | undefined,
      details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.createdAt,
      batchId: (details as any).batchId as string | undefined,
      sessionId: (details as any).sessionId as string | undefined,
      severity: this.extractSeverity(details)
    };
  }

  /**
   * 格式化审批历史
   * @param history 原始历史数据
   * @returns 格式化后的审批历史
   */
  formatApprovalHistory(history: any): ApprovalHistory {
    return {
      id: history.id,
      userId: history.userId,
      username: history.user.username,
      email: history.user.email,
      previousStatus: history.previousStatus,
      newStatus: history.newStatus,
      action: history.action as ApprovalAuditAction,
      adminId: history.adminId,
      adminName: history.admin.displayName || history.admin.username,
      reason: history.reason,
      timestamp: history.timestamp,
      metadata: {} // ApprovalHistory模型没有metadata字段
    };
  }

  /**
   * 格式化统计结果
   * @param stats 原始统计数据
   * @returns 格式化后的统计结果
   */
  formatStatsResult(stats: any): AuditStatsResult {
    const { totalLogs, actionStats, adminStats, dailyStats } = stats;

    const logsByAction: Record<string, number> = {};
    actionStats.forEach((stat: any) => {
      logsByAction[stat.action] = stat._count.id;
    });

    const logsByAdmin: Record<string, number> = {};
    adminStats.forEach((stat: any) => {
      if (stat.userId) {
        logsByAdmin[stat.userId] = stat._count.id;
      }
    });

    const dailyActivity = (dailyStats as any[]).map(stat => ({
      date: stat.date,
      count: Number(stat.count)
    }));

    return {
      totalLogs,
      logsByAction,
      logsByAdmin,
      dailyActivity
    };
  }

  /**
   * 提取管理员名称
   * @param details 详情对象
   * @param user 用户对象
   * @returns 管理员名称
   */
  private extractAdminName(details: any, user?: any): string {
    return (
      (details as any).adminName || 
      user?.displayName || 
      user?.username || 
      'Unknown'
    ) as string;
  }

  /**
   * 提取严重程度
   * @param details 详情对象
   * @returns 严重程度
   */
  private extractSeverity(details: any): 'low' | 'medium' | 'high' | 'critical' {
    const severity = (details as any).severity;
    if (['low', 'medium', 'high', 'critical'].includes(severity)) {
      return severity;
    }
    return 'medium'; // 默认值
  }
}

/**
 * 格式化工具函数
 */
export class FormatUtils {
  private static formatter = new DataFormatterImpl();

  /**
   * 批量格式化审计日志
   * @param logs 原始日志数组
   * @returns 格式化后的日志数组
   */
  static formatAuditLogs(logs: any[]): ApprovalAuditLog[] {
    return logs.map(log => this.formatter.formatAuditLog(log));
  }

  /**
   * 批量格式化审批历史
   * @param histories 原始历史数组
   * @returns 格式化后的历史数组
   */
  static formatApprovalHistories(histories: any[]): ApprovalHistory[] {
    return histories.map(history => this.formatter.formatApprovalHistory(history));
  }

  /**
   * 格式化查询结果
   * @param data 原始数据
   * @param total 总数
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 格式化后的查询结果
   */
  static formatQueryResult<T>(
    data: T[], 
    total: number, 
    limit: number, 
    offset: number
  ) {
    return {
      data,
      total,
      hasMore: offset + limit < total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit
    };
  }

  /**
   * 安全解析JSON
   * @param jsonString JSON字符串
   * @param defaultValue 默认值
   * @returns 解析后的对象
   */
  static safeParseJSON(jsonString: string, defaultValue: any = {}): any {
    try {
      return JSON.parse(jsonString || '{}');
    } catch {
      return defaultValue;
    }
  }

  /**
   * 格式化时间戳
   * @param timestamp 时间戳
   * @returns 格式化后的时间字符串
   */
  static formatTimestamp(timestamp: Date): string {
    return timestamp.toISOString();
  }

  /**
   * 格式化数字
   * @param value 数值
   * @param defaultValue 默认值
   * @returns 格式化后的数字
   */
  static formatNumber(value: any, defaultValue: number = 0): number {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }
}
