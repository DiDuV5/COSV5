/**
 * @fileoverview 审计分析器
 * @description 负责分析审批审计数据并生成统计报告
 * @author Augment AI
 * @date 2025-07-03
 */

import { prisma } from '@/lib/prisma';
import {
  ApprovalStatistics,
  AuditLogAnalysis,
  ApprovalAuditAction
} from '../types/audit-types';

/**
 * 审计分析器类
 */
export class AuditAnalytics {

  /**
   * 获取审批统计信息
   */
  static async getApprovalStatistics(params: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<ApprovalStatistics> {
    try {
      const now = new Date();
      const { startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), endDate = now } = params;
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      console.log(`📊 生成审批统计信息: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      // 并行查询各种统计数据
      const [
        totalPending,
        totalApproved,
        totalRejected,
        todayApproved,
        todayRejected,
        processingTimes,
        adminActivity
      ] = await Promise.all([
        // 待审批用户数
        prisma.user.count({
          where: { userLevel: 'GUEST' }
        }),

        // 总审批数
        prisma.auditLog.count({
          where: {
            action: { in: ['APPROVE_USER', 'AUTO_APPROVE', 'BATCH_APPROVE'] },
            createdAt: { gte: startDate, lte: endDate }
          }
        }),

        // 总拒绝数
        prisma.auditLog.count({
          where: {
            action: { in: ['REJECT_USER', 'AUTO_REJECT', 'TIMEOUT_REJECT', 'BATCH_REJECT'] },
            createdAt: { gte: startDate, lte: endDate }
          }
        }),

        // 今日审批数
        prisma.auditLog.count({
          where: {
            action: { in: ['APPROVE_USER', 'AUTO_APPROVE', 'BATCH_APPROVE'] },
            createdAt: { gte: todayStart }
          }
        }),

        // 今日拒绝数
        prisma.auditLog.count({
          where: {
            action: { in: ['REJECT_USER', 'AUTO_REJECT', 'TIMEOUT_REJECT', 'BATCH_REJECT'] },
            createdAt: { gte: todayStart }
          }
        }),

        // 处理时间统计
        this.calculateProcessingTimes(startDate, endDate),

        // 管理员活动统计
        this.getAdminActivityStats(startDate, endDate)
      ]);

      // 计算比率
      const totalProcessed = totalApproved + totalRejected;
      const approvalRate = totalProcessed > 0 ? totalApproved / totalProcessed : 0;
      const rejectionRate = totalProcessed > 0 ? totalRejected / totalProcessed : 0;
      const timeoutRate = await this.calculateTimeoutRate(startDate, endDate);

      // 计算超时数量
      const timeoutCount = await this.calculateTimeoutCount(startDate, endDate);

      const statistics: ApprovalStatistics = {
        totalPending,
        totalApproved,
        totalRejected,
        todayApproved,
        todayRejected,
        averageProcessingTime: processingTimes.average,
        approvalRate,
        rejectionRate,
        timeoutRate,
        timeoutCount,
        adminActivity
      };

      console.log(`✅ 审批统计生成完成: 待审批 ${totalPending}, 已审批 ${totalApproved}, 已拒绝 ${totalRejected}`);
      return statistics;

    } catch (error) {
      console.error('❌ 获取审批统计失败:', error);
      throw error;
    }
  }

  /**
   * 生成详细的审计分析报告
   */
  static async generateAuditAnalysis(
    startDate: Date,
    endDate: Date
  ): Promise<AuditLogAnalysis> {
    try {
      console.log(`📈 生成审计分析报告: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      const [
        summary,
        dailyActions,
        hourlyDistribution,
        actionDistribution,
        adminPerformance
      ] = await Promise.all([
        this.generateSummary(startDate, endDate),
        this.getDailyActionTrends(startDate, endDate),
        this.getHourlyDistribution(startDate, endDate),
        this.getActionDistribution(startDate, endDate),
        this.getAdminPerformanceAnalysis(startDate, endDate)
      ]);

      const analysis: AuditLogAnalysis = {
        period: { start: startDate, end: endDate },
        summary,
        trends: {
          dailyActions,
          hourlyDistribution,
          actionDistribution
        },
        adminPerformance
      };

      console.log(`✅ 审计分析报告生成完成`);
      return analysis;

    } catch (error) {
      console.error('❌ 生成审计分析失败:', error);
      throw error;
    }
  }

  /**
   * 计算处理时间统计
   */
  private static async calculateProcessingTimes(
    startDate: Date,
    endDate: Date
  ): Promise<{ average: number; median: number; min: number; max: number }> {
    try {
      // 查询用户注册到审批的时间差
      const approvedUsers = await prisma.$queryRaw<Array<{ processingTime: number }>>`
        SELECT
          EXTRACT(EPOCH FROM (al.createdAt - u.createdAt)) * 1000 as processingTime
        FROM AuditLog al
        JOIN User u ON JSON_EXTRACT(al.details, '$.targetUserId') = u.id
        WHERE al.action IN ('APPROVE_USER', 'REJECT_USER')
        AND al.createdAt BETWEEN ${startDate} AND ${endDate}
        AND JSON_EXTRACT(al.details, '$.targetUserId') IS NOT NULL
      `;

      if (approvedUsers.length === 0) {
        return { average: 0, median: 0, min: 0, max: 0 };
      }

      const times = approvedUsers.map(u => Number(u.processingTime)).filter(t => t > 0);

      if (times.length === 0) {
        return { average: 0, median: 0, min: 0, max: 0 };
      }

      times.sort((a, b) => a - b);

      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      const median = times[Math.floor(times.length / 2)];
      const min = times[0];
      const max = times[times.length - 1];

      return { average, median, min, max };

    } catch (error) {
      console.error('计算处理时间失败:', error);
      return { average: 0, median: 0, min: 0, max: 0 };
    }
  }

  /**
   * 计算超时率
   */
  private static async calculateTimeoutRate(startDate: Date, endDate: Date): Promise<number> {
    try {
      const [timeoutCount, totalCount] = await Promise.all([
        prisma.auditLog.count({
          where: {
            action: 'TIMEOUT_REJECT',
            createdAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.auditLog.count({
          where: {
            action: { in: ['APPROVE_USER', 'REJECT_USER', 'TIMEOUT_REJECT', 'AUTO_APPROVE', 'AUTO_REJECT'] },
            createdAt: { gte: startDate, lte: endDate }
          }
        })
      ]);

      return totalCount > 0 ? timeoutCount / totalCount : 0;

    } catch (error) {
      console.error('计算超时率失败:', error);
      return 0;
    }
  }

  /**
   * 获取管理员活动统计
   */
  private static async getAdminActivityStats(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    adminId: string | null;
    adminName: string;
    approvals: number;
    rejections: number;
  }>> {
    try {
      const adminStats = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          action: { in: ['APPROVE_USER', 'REJECT_USER', 'BATCH_APPROVE', 'BATCH_REJECT'] },
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { id: true }
      });

      const result: any[] = [];

      for (const stat of adminStats) {
        const [approvals, rejections, admin] = await Promise.all([
          prisma.auditLog.count({
            where: {
              userId: stat.userId,
              action: { in: ['APPROVE_USER', 'BATCH_APPROVE'] },
              createdAt: { gte: startDate, lte: endDate }
            }
          }),
          prisma.auditLog.count({
            where: {
              userId: stat.userId,
              action: { in: ['REJECT_USER', 'BATCH_REJECT'] },
              createdAt: { gte: startDate, lte: endDate }
            }
          }),
          stat.userId ? prisma.user.findUnique({
            where: { id: stat.userId },
            select: { username: true, displayName: true }
          }) : Promise.resolve(null)
        ]);

        result.push({
          adminId: stat.userId,
          adminName: admin?.displayName || admin?.username || 'Unknown',
          approvals,
          rejections
        });
      }

      return result;

    } catch (error) {
      console.error('获取管理员活动统计失败:', error);
      return [];
    }
  }

  /**
   * 生成摘要信息
   */
  private static async generateSummary(startDate: Date, endDate: Date) {
    const [totalActions, uniqueAdmins, uniqueUsers, actionStats] = await Promise.all([
      prisma.auditLog.count({
        where: { createdAt: { gte: startDate, lte: endDate } }
      }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { userId: true },
        distinct: ['userId']
      }),
      prisma.auditLog.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          details: { not: null }
        },
        select: { details: true }
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    // 提取唯一用户ID
    const uniqueUserIds = new Set<string>();
    uniqueUsers.forEach(log => {
      try {
        const details = JSON.parse(log.details || '{}');
        if (details.targetUserId) uniqueUserIds.add(details.targetUserId);
        if (details.targetUserIds) {
          details.targetUserIds.forEach((id: string) => uniqueUserIds.add(id));
        }
      } catch {
        // 忽略解析错误
      }
    });

    const mostCommonAction = actionStats[0]?.action as ApprovalAuditAction || 'VIEW_APPROVAL_QUEUE';

    // 计算峰值时间
    const hourlyStats = await this.getHourlyDistribution(startDate, endDate);
    const peakHour = hourlyStats.reduce((max, current) =>
      current.count > max.count ? current : max, { hour: 0, count: 0 }
    ).hour;

    return {
      totalActions,
      uniqueAdmins: uniqueAdmins.length,
      uniqueUsers: uniqueUserIds.size,
      mostCommonAction,
      peakHour,
      peakDay: 'Monday' // 简化处理，实际应该计算
    };
  }

  /**
   * 获取每日行动趋势
   */
  private static async getDailyActionTrends(startDate: Date, endDate: Date) {
    const dailyStats = await prisma.$queryRaw<Array<{
      date: string;
      total: number;
      approvals: number;
      rejections: number;
    }>>`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as total,
        SUM(CASE WHEN action IN ('APPROVE_USER', 'BATCH_APPROVE', 'AUTO_APPROVE') THEN 1 ELSE 0 END) as approvals,
        SUM(CASE WHEN action IN ('REJECT_USER', 'BATCH_REJECT', 'AUTO_REJECT', 'TIMEOUT_REJECT') THEN 1 ELSE 0 END) as rejections
      FROM AuditLog
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(createdAt)
      ORDER BY date
    `;

    return dailyStats.map(stat => ({
      date: stat.date,
      count: Number(stat.total),
      approvals: Number(stat.approvals),
      rejections: Number(stat.rejections)
    }));
  }

  /**
   * 获取小时分布
   */
  private static async getHourlyDistribution(startDate: Date, endDate: Date) {
    const hourlyStats = await prisma.$queryRaw<Array<{
      hour: number;
      count: number;
    }>>`
      SELECT
        EXTRACT(HOUR FROM createdAt) as hour,
        COUNT(*) as count
      FROM AuditLog
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
      GROUP BY EXTRACT(HOUR FROM createdAt)
      ORDER BY hour
    `;

    return hourlyStats.map(stat => ({
      hour: Number(stat.hour),
      count: Number(stat.count)
    }));
  }

  /**
   * 获取操作分布
   */
  private static async getActionDistribution(startDate: Date, endDate: Date) {
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _count: { id: true }
    });

    const total = actionStats.reduce((sum, stat) => sum + stat._count.id, 0);

    return actionStats.map(stat => ({
      action: stat.action as ApprovalAuditAction,
      count: stat._count.id,
      percentage: total > 0 ? (stat._count.id / total) * 100 : 0
    }));
  }

  /**
   * 获取管理员性能分析
   */
  private static async getAdminPerformanceAnalysis(startDate: Date, endDate: Date) {
    const adminStats = await this.getAdminActivityStats(startDate, endDate);

    return adminStats.map(admin => ({
      adminId: admin.adminId,
      adminName: admin.adminName,
      totalActions: admin.approvals + admin.rejections,
      approvals: admin.approvals,
      rejections: admin.rejections,
      averageResponseTime: 0, // 需要更复杂的计算
      efficiency: admin.approvals + admin.rejections > 0 ?
        admin.approvals / (admin.approvals + admin.rejections) : 0
    }));
  }

  /**
   * 计算超时数量
   */
  private static async calculateTimeoutCount(startDate: Date, endDate: Date): Promise<number> {
    try {
      // 查询超时相关的审计日志
      const timeoutCount = await prisma.auditLog.count({
        where: {
          action: 'TIMEOUT_REJECT',
          createdAt: { gte: startDate, lte: endDate }
        }
      });

      return timeoutCount;
    } catch (error) {
      console.error('计算超时数量失败:', error);
      return 0;
    }
  }
}
