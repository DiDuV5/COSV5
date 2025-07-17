/**
 * @fileoverview 基础审计查询器
 * @description 提供审计查询的基础功能和通用方法
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始audit-query.ts文件中提取基础查询功能
 * - 确保100%向后兼容性
 */

import { prisma } from '@/lib/prisma';
import {
  ApprovalAuditLog,
  AuditLogQueryParams,
  ApprovalAuditAction,
  AuditHistoryResult
} from './types';

/**
 * 基础审计查询器
 */
export class BaseAuditQuery {
  /**
   * 构建查询条件
   * @param params 查询参数
   */
  protected static buildWhereConditions(params: AuditLogQueryParams): any {
    const {
      userId,
      adminId,
      action,
      actions,
      startDate,
      endDate,
      batchId,
      severity,
      ipAddress
    } = params;

    const whereConditions: any = {};

    if (userId) {
      whereConditions.OR = [
        { userId },
        { details: { contains: `"targetUserId":"${userId}"` } }
      ];
    }

    if (adminId) {
      whereConditions.userId = adminId;
    }

    if (action) {
      whereConditions.action = action;
    }

    if (actions && actions.length > 0) {
      whereConditions.action = { in: actions };
    }

    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) whereConditions.createdAt.gte = startDate;
      if (endDate) whereConditions.createdAt.lte = endDate;
    }

    if (batchId) {
      whereConditions.details = { contains: `"batchId":"${batchId}"` };
    }

    if (severity) {
      whereConditions.details = { contains: `"severity":"${severity}"` };
    }

    if (ipAddress) {
      whereConditions.ipAddress = ipAddress;
    }

    return whereConditions;
  }

  /**
   * 格式化审计日志数据
   * @param log 原始日志数据
   */
  protected static formatAuditLog(log: any): ApprovalAuditLog {
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
      adminName: ((details as any).adminName || log.user?.displayName || log.user?.username || 'Unknown') as string,
      targetUserId: (details as any).targetUserId as string | undefined,
      targetUserIds: (details as any).targetUserIds as string[] | undefined,
      reason: (details as any).reason as string | undefined,
      details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.createdAt,
      batchId: (details as any).batchId as string | undefined,
      sessionId: (details as any).sessionId as string | undefined,
      severity: ((details as any).severity || 'medium') as 'low' | 'medium' | 'high' | 'critical'
    };
  }

  /**
   * 获取审批历史记录（核心查询方法）
   * @param params 查询参数
   */
  static async getApprovalHistory(params: AuditLogQueryParams = {}): Promise<AuditHistoryResult> {
    try {
      const {
        limit = 50,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = params;

      console.log(`🔍 查询审批历史记录，参数:`, { 
        userId: params.userId, 
        adminId: params.adminId, 
        action: params.action, 
        limit, 
        offset 
      });

      // 构建查询条件
      const whereConditions = this.buildWhereConditions(params);

      // 执行查询
      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereConditions,
          orderBy: {
            [sortBy === 'timestamp' ? 'createdAt' : sortBy]: sortOrder
          },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                username: true,
                displayName: true
              }
            }
          }
        }),
        prisma.auditLog.count({
          where: whereConditions
        })
      ]);

      // 转换数据格式
      const formattedLogs: ApprovalAuditLog[] = logs.map(log => this.formatAuditLog(log));

      const hasMore = offset + limit < total;

      console.log(`✅ 查询完成: 返回 ${formattedLogs.length} 条记录，总计 ${total} 条`);

      return {
        logs: formattedLogs,
        total,
        hasMore
      };

    } catch (error) {
      console.error('❌ 查询审批历史失败:', error);
      throw error;
    }
  }
}
