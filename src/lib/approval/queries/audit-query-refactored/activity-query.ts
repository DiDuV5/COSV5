/**
 * @fileoverview 活动监控查询器
 * @description 提供最近活动和可疑活动监控功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始audit-query.ts文件中提取活动监控功能
 * - 确保100%向后兼容性
 */

import { prisma } from '@/lib/prisma';
import { BaseAuditQuery } from './base-query';
import {
  ApprovalAuditLog,
  AuditLogQueryParams,
  RecentActivityParams,
  SuspiciousActivityParams
} from './types';

/**
 * 活动监控查询器
 */
export class ActivityQuery extends BaseAuditQuery {
  /**
   * 获取最近的审计活动
   * @param params 最近活动查询参数
   */
  static async getRecentActivity(params: RecentActivityParams = {}): Promise<ApprovalAuditLog[]> {
    try {
      const { hours = 24, limit = 20 } = params;
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const queryParams: AuditLogQueryParams = {
        startDate,
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const result = await this.getApprovalHistory(queryParams);
      return result.logs;

    } catch (error) {
      console.error('❌ 获取最近活动失败:', error);
      throw error;
    }
  }

  /**
   * 获取可疑活动
   * @param params 可疑活动查询参数
   */
  static async getSuspiciousActivity(params: SuspiciousActivityParams = {}): Promise<ApprovalAuditLog[]> {
    try {
      const { timeWindow = 24, threshold = 10 } = params;
      console.log(`🚨 查询可疑活动: ${timeWindow}小时内超过${threshold}次操作`);

      const startDate = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

      // 查询高频操作的管理员
      const adminActivity = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: {
          id: true
        },
        having: {
          id: {
            _count: {
              gt: threshold
            }
          }
        }
      });

      if (adminActivity.length === 0) {
        return [];
      }

      const suspiciousAdminIds = adminActivity.map(activity => activity.userId);

      // 获取这些管理员的详细操作记录
      const queryParams: AuditLogQueryParams = {
        startDate,
        limit: 100,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const result = await this.getApprovalHistory(queryParams);

      // 过滤出可疑管理员的操作
      const suspiciousLogs = result.logs.filter(log =>
        suspiciousAdminIds.includes(log.adminId)
      );

      console.log(`✅ 发现 ${suspiciousLogs.length} 条可疑活动记录`);
      return suspiciousLogs;

    } catch (error) {
      console.error('❌ 查询可疑活动失败:', error);
      throw error;
    }
  }
}
