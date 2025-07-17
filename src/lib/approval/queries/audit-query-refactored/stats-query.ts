/**
 * @fileoverview 统计分析查询器
 * @description 提供审计日志的统计分析功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 从原始audit-query.ts文件中提取统计分析功能
 * - 确保100%向后兼容性
 */

import { prisma } from '@/lib/prisma';
import { AuditStatsResult } from './types';

/**
 * 统计分析查询器
 */
export class StatsQuery {
  /**
   * 获取审计日志统计
   * @param days 统计天数
   */
  static async getAuditLogStats(days: number = 30): Promise<AuditStatsResult> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [totalLogs, actionStats, adminStats, dailyStats] = await Promise.all([
        // 总日志数
        prisma.auditLog.count({
          where: { createdAt: { gte: startDate } }
        }),

        // 按操作类型统计
        prisma.auditLog.groupBy({
          by: ['action'],
          where: { createdAt: { gte: startDate } },
          _count: { id: true }
        }),

        // 按管理员统计
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: startDate } },
          _count: { id: true }
        }),

        // 按日期统计
        prisma.$queryRaw`
          SELECT DATE(createdAt) as date, COUNT(*) as count
          FROM AuditLog
          WHERE createdAt >= ${startDate}
          GROUP BY DATE(createdAt)
          ORDER BY date
        `
      ]);

      const logsByAction: Record<string, number> = {};
      actionStats.forEach(stat => {
        logsByAction[stat.action] = stat._count.id;
      });

      const logsByAdmin: Record<string, number> = {};
      adminStats.forEach(stat => {
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

    } catch (error) {
      console.error('❌ 获取审计日志统计失败:', error);
      throw error;
    }
  }
}
