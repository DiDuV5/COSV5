/**
 * @fileoverview 历史记录查询器
 * @description 提供用户和管理员历史记录查询功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始audit-query.ts文件中提取历史记录查询功能
 * - 确保100%向后兼容性
 */

import { prisma } from '@/lib/prisma';
import { BaseAuditQuery } from './base-query';
import {
  ApprovalHistory,
  ApprovalAuditLog,
  AuditLogQueryParams,
  ApprovalAuditAction,
  AdminActionParams,
  BatchOperationParams
} from './types';

/**
 * 历史记录查询器
 */
export class HistoryQuery extends BaseAuditQuery {
  /**
   * 获取用户审批历史
   * @param userId 用户ID
   * @param limit 限制数量
   */
  static async getUserApprovalHistory(userId: string, limit: number = 20): Promise<ApprovalHistory[]> {
    try {
      console.log(`👤 查询用户审批历史: ${userId}`);

      const histories = await prisma.approvalHistory.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: {
          user: {
            select: { username: true, email: true }
          },
          admin: {
            select: { username: true, displayName: true }
          }
        }
      });

      const formattedHistories: ApprovalHistory[] = histories.map(history => ({
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
      }));

      console.log(`✅ 用户历史查询完成: ${formattedHistories.length} 条记录`);
      return formattedHistories;

    } catch (error) {
      console.error('❌ 查询用户审批历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取管理员操作历史
   * @param params 管理员操作查询参数
   */
  static async getAdminActionHistory(params: AdminActionParams): Promise<ApprovalAuditLog[]> {
    try {
      const { adminId, startDate, endDate, limit = 50 } = params;
      console.log(`👨‍💼 查询管理员操作历史: ${adminId}`);

      const queryParams: AuditLogQueryParams = {
        adminId,
        startDate,
        endDate,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const result = await this.getApprovalHistory(queryParams);
      return result.logs;

    } catch (error) {
      console.error('❌ 查询管理员操作历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取批量操作记录
   * @param params 批量操作查询参数
   */
  static async getBatchOperations(params: BatchOperationParams): Promise<ApprovalAuditLog[]> {
    try {
      const { batchId, startDate, endDate, limit = 50 } = params;
      console.log(`📦 查询批量操作记录: ${batchId || 'all'}`);

      const actions: ApprovalAuditAction[] = ['BATCH_APPROVE', 'BATCH_REJECT', 'BULK_OPERATION'];

      const queryParams: AuditLogQueryParams = {
        actions,
        batchId,
        startDate,
        endDate,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const result = await this.getApprovalHistory(queryParams);
      return result.logs;

    } catch (error) {
      console.error('❌ 查询批量操作记录失败:', error);
      throw error;
    }
  }
}
