/**
 * @fileoverview 审计日志记录器
 * @description 负责记录审批相关的审计日志
 * @author Augment AI
 * @date 2025-07-03
 */

import { prisma } from '@/lib/prisma';
import {
  ApprovalAuditAction,
  AuditLogRecordParams,
  AuditOperationResult,
  AuditBatchResult,
  AuditContext
} from '../types/audit-types';

/**
 * 审计日志记录器类
 */
export class AuditLogger {

  /**
   * 记录审批操作
   */
  static async logApprovalAction(params: AuditLogRecordParams): Promise<AuditOperationResult> {
    try {
      console.log(`📝 记录审批操作: ${params.action} by ${params.adminName}`);

      // 创建审计日志
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: params.adminId,
          action: params.action,
          level: 'INFO',
          message: `审批操作: ${params.action} by ${params.adminName}`,
          details: JSON.stringify({
            adminName: params.adminName,
            targetUserId: params.targetUserId,
            targetUserIds: params.targetUserIds,
            reason: params.reason,
            batchId: params.batchId,
            sessionId: params.sessionId,
            severity: params.severity || 'medium',
            ...params.details
          }),
          ipAddress: params.ipAddress || '',
          userAgent: params.userAgent || '',
        }
      });

      // 记录用户审批历史
      if (params.targetUserId) {
        await this.recordSingleUserHistory(params);
      } else if (params.targetUserIds && params.targetUserIds.length > 0) {
        await this.recordBatchUserHistory(params);
      }

      console.log(`✅ 审计日志记录成功: ${auditLog.id}`);

      return {
        success: true,
        message: '审计日志记录成功',
        logId: auditLog.id
      };

    } catch (error) {
      console.error('❌ 记录审计日志失败:', error);

      return {
        success: false,
        message: `记录审计日志失败: ${error instanceof Error ? error.message : '未知错误'}`,
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
      // 获取管理员信息
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { username: true, displayName: true }
      });

      const adminName = admin?.displayName || admin?.username || 'Unknown Admin';

      return await this.logApprovalAction({
        action,
        adminId,
        adminName,
        targetUserId: userId,
        details,
        severity: this.determineSeverity(action)
      });

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
    const startTime = new Date();
    const generatedBatchId = batchId || `batch_${Date.now()}`;

    const result: AuditBatchResult = {
      batchId: generatedBatchId,
      totalItems: userIds.length,
      successfulItems: 0,
      failedItems: 0,
      errors: [],
      duration: 0,
      startTime,
      endTime: new Date()
    };

    try {
      console.log(`📦 批量记录审批操作: ${action} for ${userIds.length} users`);

      // 获取管理员信息
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { username: true, displayName: true }
      });

      const adminName = admin?.displayName || admin?.username || 'Unknown Admin';

      // 记录主要的批量操作日志
      const mainLogResult = await this.logApprovalAction({
        action,
        adminId,
        adminName,
        targetUserIds: userIds,
        reason,
        batchId: generatedBatchId,
        severity: this.determineSeverity(action),
        details: {
          userCount: userIds.length,
          batchOperation: true
        }
      });

      if (mainLogResult.success) {
        result.successfulItems++;
      } else {
        result.failedItems++;
        result.errors.push({
          item: 'main_log',
          error: mainLogResult.message
        });
      }

      // 为每个用户记录单独的历史记录
      for (const userId of userIds) {
        try {
          await this.recordSingleUserHistory({
            action,
            adminId,
            adminName,
            targetUserId: userId,
            reason,
            batchId: generatedBatchId
          });

          result.successfulItems++;

        } catch (error) {
          result.failedItems++;
          result.errors.push({
            item: userId,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      }

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      console.log(`✅ 批量审计日志记录完成: ${result.successfulItems}/${result.totalItems} 成功`);

      return result;

    } catch (error) {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      result.failedItems = result.totalItems;

      console.error('❌ 批量记录审计日志失败:', error);

      result.errors.push({
        item: 'batch_operation',
        error: error instanceof Error ? error.message : '未知错误'
      });

      return result;
    }
  }

  /**
   * 记录系统操作
   */
  static async logSystemAction(
    action: ApprovalAuditAction,
    details: Record<string, any> = {},
    context?: AuditContext
  ): Promise<AuditOperationResult> {
    try {
      return await this.logApprovalAction({
        action,
        adminId: 'system',
        adminName: 'System',
        details: {
          ...details,
          systemOperation: true,
          context
        },
        severity: 'low',
        sessionId: context?.sessionId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      });

    } catch (error) {
      console.error('❌ 记录系统操作失败:', error);

      return {
        success: false,
        message: `记录系统操作失败: ${error instanceof Error ? error.message : '未知错误'}`,
        errors: [error instanceof Error ? error.message : '未知错误']
      };
    }
  }

  /**
   * 记录单个用户审批历史
   */
  private static async recordSingleUserHistory(params: AuditLogRecordParams): Promise<void> {
    if (!params.targetUserId) return;

    try {
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: params.targetUserId },
        select: {
          username: true,
          email: true,
          userLevel: true
        }
      });

      if (!user) {
        console.warn(`⚠️ 用户不存在: ${params.targetUserId}`);
        return;
      }

      // 确定状态变更
      const { previousStatus, newStatus } = this.determineStatusChange(params.action, user.userLevel);

      // 创建审批历史记录
      await prisma.approvalHistory.create({
        data: {
          userId: params.targetUserId,
          // 注意：ApprovalHistory模型没有username和email字段
          previousStatus,
          newStatus,
          action: params.action,
          adminId: params.adminId,
          reason: params.reason
          // 注意：ApprovalHistory模型没有adminName、batchId、metadata字段
        }
      });

    } catch (error) {
      console.error(`❌ 记录用户历史失败 ${params.targetUserId}:`, error);
      // 不抛出错误，避免影响主要流程
    }
  }

  /**
   * 记录批量用户审批历史
   */
  private static async recordBatchUserHistory(params: AuditLogRecordParams): Promise<void> {
    if (!params.targetUserIds || params.targetUserIds.length === 0) return;

    try {
      // 获取所有用户信息
      const users = await prisma.user.findMany({
        where: {
          id: { in: params.targetUserIds }
        },
        select: {
          id: true,
          username: true,
          email: true,
          userLevel: true
        }
      });

      // 为每个用户创建历史记录
      const historyRecords = users.map(user => {
        const { previousStatus, newStatus } = this.determineStatusChange(params.action, user.userLevel);

        return {
          userId: user.id,
          username: user.username,
          email: user.email,
          previousStatus,
          newStatus,
          action: params.action,
          adminId: params.adminId,
          adminName: params.adminName,
          reason: params.reason,
          batchId: params.batchId,
          metadata: JSON.stringify(params.details || {})
        };
      });

      // 批量创建历史记录
      await prisma.approvalHistory.createMany({
        data: historyRecords
      });

    } catch (error) {
      console.error('❌ 记录批量用户历史失败:', error);
      // 不抛出错误，避免影响主要流程
    }
  }

  /**
   * 确定操作严重性
   */
  private static determineSeverity(action: ApprovalAuditAction): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<ApprovalAuditAction, 'low' | 'medium' | 'high' | 'critical'> = {
      'APPROVE_USER': 'medium',
      'REJECT_USER': 'medium',
      'BATCH_APPROVE': 'high',
      'BATCH_REJECT': 'high',
      'AUTO_APPROVE': 'low',
      'AUTO_REJECT': 'medium',
      'TIMEOUT_REJECT': 'medium',
      'REVERT_APPROVAL': 'high',
      'UPDATE_APPROVAL_CONFIG': 'critical',
      'VIEW_APPROVAL_QUEUE': 'low',
      'USER_REGISTERED': 'low',
      'USER_ACTIVATED': 'medium',
      'USER_DEACTIVATED': 'high',
      'PERMISSION_CHANGED': 'high',
      'BULK_OPERATION': 'high',
      'SYSTEM_ACTION': 'low'
    };

    return severityMap[action] || 'medium';
  }

  /**
   * 确定状态变更
   */
  private static determineStatusChange(action: ApprovalAuditAction, currentStatus: string): {
    previousStatus: string;
    newStatus: string;
  } {
    const previousStatus = currentStatus;
    let newStatus = currentStatus;

    switch (action) {
      case 'APPROVE_USER':
      case 'AUTO_APPROVE':
        newStatus = 'USER';
        break;
      case 'REJECT_USER':
      case 'AUTO_REJECT':
      case 'TIMEOUT_REJECT':
        newStatus = 'REJECTED';
        break;
      case 'REVERT_APPROVAL':
        newStatus = 'GUEST';
        break;
      case 'USER_ACTIVATED':
        newStatus = 'USER';
        break;
      case 'USER_DEACTIVATED':
        newStatus = 'INACTIVE';
        break;
    }

    return { previousStatus, newStatus };
  }
}
