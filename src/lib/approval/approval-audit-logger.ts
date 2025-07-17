/**
 * @fileoverview 审批审计日志管理器 - 重构版本
 * @description 提供审批审计日志的统一管理接口
 * @author Augment AI
 * @date 2025-07-03
 * @version 3.0.0 - 重构版（模块化架构）
 */

// 导入重构后的模块
import {
  ApprovalAuditAction,
  ApprovalAuditLog,
  ApprovalHistory,
  ApprovalStatistics,
  AuditLogQueryParams,
  AuditLogAnalysis,
  AuditOperationResult,
  AuditBatchResult
} from './types/audit-types';

import { AuditLogger } from './loggers/audit-logger';
import { AuditQuery } from './queries/audit-query';
import { AuditAnalytics } from './analytics/audit-analytics';

/**
 * 审批审计日志管理器主类 - 重构版
 */
export class ApprovalAuditLogger {

  /**
   * 记录审批操作
   */
  static async logApprovalAction(params: {
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
  }): Promise<AuditOperationResult> {
    try {
      console.log(`📝 记录审批操作: ${params.action} by ${params.adminName}`);

      return await AuditLogger.logApprovalAction({
        action: params.action,
        adminId: params.adminId,
        adminName: params.adminName,
        targetUserId: params.targetUserId,
        targetUserIds: params.targetUserIds,
        reason: params.reason,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        batchId: params.batchId
      });

    } catch (error) {
      console.error('❌ 记录审批操作失败:', error);
      return {
        success: false,
        message: `记录审批操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }

  /**
   * 记录用户操作
   */
  static async logUserAction(
    userId: string,
    action: ApprovalAuditAction,
    adminId: string,
    details: Record<string, any> = {}
  ): Promise<AuditOperationResult> {
    try {
      return await AuditLogger.logUserAction(userId, action, adminId, details);
    } catch (error) {
      console.error('❌ 记录用户操作失败:', error);
      return {
        success: false,
        message: `记录用户操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }

  /**
   * 批量记录审批操作
   */
  static async logBatchApprovalAction(
    userIds: string[],
    action: ApprovalAuditAction,
    adminId: string,
    reason?: string,
    batchId?: string
  ): Promise<AuditBatchResult> {
    try {
      console.log(`📦 批量记录审批操作: ${action} for ${userIds.length} users`);

      return await AuditLogger.logBatchApprovalAction(userIds, action, adminId, reason, batchId);

    } catch (error) {
      console.error('❌ 批量记录审批操作失败:', error);

      const startTime = new Date();
      return {
        batchId: batchId || `batch_${Date.now()}`,
        totalItems: userIds.length,
        successfulItems: 0,
        failedItems: userIds.length,
        errors: [{
          item: 'batch_operation',
          error: error instanceof Error ? error.message : '未知错误'
        }],
        duration: 0,
        startTime,
        endTime: new Date()
      };
    }
  }

  /**
   * 获取审批历史记录
   */
  static async getApprovalHistory(params: AuditLogQueryParams = {}): Promise<{
    logs: ApprovalAuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log(`🔍 查询审批历史记录`);

      return await AuditQuery.getApprovalHistory(params);

    } catch (error) {
      console.error('❌ 获取审批历史失败:', error);
      return {
        logs: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * 获取用户审批历史
   */
  static async getUserApprovalHistory(userId: string, limit: number = 20): Promise<ApprovalHistory[]> {
    try {
      console.log(`👤 查询用户审批历史: ${userId}`);

      return await AuditQuery.getUserApprovalHistory(userId, limit);

    } catch (error) {
      console.error('❌ 获取用户审批历史失败:', error);
      return [];
    }
  }

  /**
   * 获取审批统计信息
   */
  static async getApprovalStatistics(params: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<ApprovalStatistics> {
    try {
      console.log(`📊 生成审批统计信息`);

      return await AuditAnalytics.getApprovalStatistics(params);

    } catch (error) {
      console.error('❌ 获取审批统计失败:', error);

      // 返回默认统计信息
      return {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        todayApproved: 0,
        todayRejected: 0,
        averageProcessingTime: 0,
        approvalRate: 0,
        rejectionRate: 0,
        timeoutRate: 0,
        timeoutCount: 0,
        adminActivity: []
      };
    }
  }

  /**
   * 生成审计分析报告
   */
  static async generateAuditAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<AuditLogAnalysis> {
    try {
      console.log(`📈 生成审计分析报告`);

      return await AuditAnalytics.generateAuditAnalysis(startDate, endDate);

    } catch (error) {
      console.error('❌ 生成审计分析失败:', error);
      throw error;
    }
  }

  /**
   * 获取管理员操作历史
   */
  static async getAdminActionHistory(
    adminId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`👨‍💼 查询管理员操作历史: ${adminId}`);

      return await AuditQuery.getAdminActionHistory(adminId, startDate, endDate, limit);

    } catch (error) {
      console.error('❌ 获取管理员操作历史失败:', error);
      return [];
    }
  }

  /**
   * 获取批量操作记录
   */
  static async getBatchOperations(
    batchId?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`📦 查询批量操作记录`);

      return await AuditQuery.getBatchOperations(batchId, startDate, endDate, limit);

    } catch (error) {
      console.error('❌ 获取批量操作记录失败:', error);
      return [];
    }
  }

  /**
   * 搜索审计日志
   */
  static async searchAuditLogs(
    searchTerm: string,
    searchFields: ('adminName' | 'reason' | 'details')[] = ['adminName', 'reason'],
    limit: number = 50
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`🔍 搜索审计日志: "${searchTerm}"`);

      return await AuditQuery.searchAuditLogs(searchTerm, searchFields, limit);

    } catch (error) {
      console.error('❌ 搜索审计日志失败:', error);
      return [];
    }
  }

  /**
   * 获取最近的审计活动
   */
  static async getRecentActivity(hours: number = 24, limit: number = 20): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`⏰ 获取最近 ${hours} 小时的审计活动`);

      return await AuditQuery.getRecentActivity(hours, limit);

    } catch (error) {
      console.error('❌ 获取最近活动失败:', error);
      return [];
    }
  }

  /**
   * 获取可疑活动
   */
  static async getSuspiciousActivity(
    timeWindow: number = 24,
    threshold: number = 10
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`🚨 查询可疑活动`);

      return await AuditQuery.getSuspiciousActivity(timeWindow, threshold);

    } catch (error) {
      console.error('❌ 获取可疑活动失败:', error);
      return [];
    }
  }

  /**
   * 清理过期的审计日志
   */
  static async cleanupOldLogs(retentionDays: number = 90): Promise<{
    deletedCount: number;
  }> {
    try {
      console.log(`🧹 清理 ${retentionDays} 天前的审计日志`);

      // 这里应该调用维护模块，但为了简化，直接实现
      const { prisma } = await import('@/lib/prisma');
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const deleteResult = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`✅ 清理完成: 删除了 ${deleteResult.count} 条过期日志`);

      return {
        deletedCount: deleteResult.count
      };

    } catch (error) {
      console.error('❌ 清理过期日志失败:', error);
      return {
        deletedCount: 0
      };
    }
  }

  /**
   * 获取审计日志统计
   */
  static async getAuditLogStats(days: number = 30): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByAdmin: Record<string, number>;
    dailyActivity: Array<{ date: string; count: number }>;
  }> {
    try {
      console.log(`📊 获取审计日志统计 (${days} 天)`);

      return await AuditQuery.getAuditLogStats(days);

    } catch (error) {
      console.error('❌ 获取审计日志统计失败:', error);
      return {
        totalLogs: 0,
        logsByAction: {},
        logsByAdmin: {},
        dailyActivity: []
      };
    }
  }

  /**
   * 记录系统操作
   */
  static async logSystemAction(
    action: ApprovalAuditAction,
    details: Record<string, any> = {}
  ): Promise<AuditOperationResult> {
    try {
      return await AuditLogger.logSystemAction(action, details);
    } catch (error) {
      console.error('❌ 记录系统操作失败:', error);
      return {
        success: false,
        message: `记录系统操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }
}

// 重新导出类型以保持向后兼容
export type {
  ApprovalAuditAction,
  ApprovalAuditLog,
  ApprovalHistory,
  ApprovalStatistics,
  AuditLogQueryParams,
  AuditLogAnalysis,
  AuditOperationResult,
  AuditBatchResult
} from './types/audit-types';
