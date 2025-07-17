/**
 * @fileoverview 统计查询类
 * @description 审计日志的统计分析专门查询类
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { BaseAuditQuery } from './BaseAuditQuery';
import { AuditStatsResult } from '../types';
import { FormatUtils } from '../utils/formatUtils';
import { CACHE_CONFIG, DEFAULT_QUERY_CONFIG } from '../constants';

/**
 * 统计查询类
 */
export class StatsQuery extends BaseAuditQuery {
  /**
   * 获取审计日志统计
   * @param days 统计天数
   * @returns 统计结果
   */
  async getAuditLogStats(days: number = DEFAULT_QUERY_CONFIG.STATS_DEFAULT_DAYS): Promise<AuditStatsResult> {
    try {
      console.log(`📊 获取审计日志统计: ${days}天`);

      const cacheKey = this.generateCacheKey('stats', { days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const [totalLogs, actionStats, adminStats, dailyStats] = await Promise.all([
            // 总日志数
            prisma.userApprovalLog.count({
              where: { createdAt: { gte: startDate } }
            }),

            // 按操作类型统计
            prisma.userApprovalLog.groupBy({
              by: ['action'],
              where: { createdAt: { gte: startDate } },
              _count: { id: true }
            }),

            // 按管理员统计
            prisma.userApprovalLog.groupBy({
              by: ['userId'],
              where: { createdAt: { gte: startDate } },
              _count: { id: true }
            }),

            // 按日期统计
            prisma.$queryRaw`
              SELECT DATE(createdAt) as date, COUNT(*) as count
              FROM UserApprovalLog
              WHERE createdAt >= ${startDate}
              GROUP BY DATE(createdAt)
              ORDER BY date
            `
          ]);

          return this.formatter.formatStatsResult({
            totalLogs,
            actionStats,
            adminStats,
            dailyStats
          });
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 获取审计日志统计失败:', error);
      throw TRPCErrorHandler.internalError('获取审计日志统计失败');
    }
  }

  /**
   * 获取管理员活动统计
   * @param adminId 管理员ID
   * @param days 统计天数
   * @returns 管理员活动统计
   */
  async getAdminActivityStats(adminId: string, days: number = 30): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    dailyActivity: Array<{ date: string; count: number }>;
    averageActionsPerDay: number;
  }> {
    try {
      console.log(`👨‍💼 获取管理员活动统计: ${adminId}`);

      const cacheKey = this.generateCacheKey('admin-stats', { adminId, days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const [totalActions, actionStats, dailyStats] = await Promise.all([
            // 总操作数
            prisma.userApprovalLog.count({
              where: { 
                userId: adminId,
                createdAt: { gte: startDate } 
              }
            }),

            // 按操作类型统计
            prisma.userApprovalLog.groupBy({
              by: ['action'],
              where: { 
                userId: adminId,
                createdAt: { gte: startDate } 
              },
              _count: { id: true }
            }),

            // 按日期统计
            prisma.$queryRaw`
              SELECT DATE(createdAt) as date, COUNT(*) as count
              FROM UserApprovalLog
              WHERE userId = ${adminId} AND createdAt >= ${startDate}
              GROUP BY DATE(createdAt)
              ORDER BY date
            `
          ]);

          const actionsByType: Record<string, number> = {};
          actionStats.forEach(stat => {
            actionsByType[stat.action] = stat._count.id;
          });

          const dailyActivity = (dailyStats as any[]).map(stat => ({
            date: stat.date,
            count: FormatUtils.formatNumber(stat.count)
          }));

          const averageActionsPerDay = totalActions / Math.max(days, 1);

          return {
            totalActions,
            actionsByType,
            dailyActivity,
            averageActionsPerDay: Math.round(averageActionsPerDay * 100) / 100
          };
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 获取管理员活动统计失败:', error);
      throw TRPCErrorHandler.internalError('获取管理员活动统计失败');
    }
  }

  /**
   * 获取操作类型分布统计
   * @param days 统计天数
   * @returns 操作类型分布
   */
  async getActionTypeDistribution(days: number = 30): Promise<Array<{
    action: string;
    count: number;
    percentage: number;
  }>> {
    try {
      console.log(`📈 获取操作类型分布: ${days}天`);

      const cacheKey = this.generateCacheKey('action-distribution', { days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const [totalCount, actionStats] = await Promise.all([
            prisma.userApprovalLog.count({
              where: { createdAt: { gte: startDate } }
            }),
            prisma.userApprovalLog.groupBy({
              by: ['action'],
              where: { createdAt: { gte: startDate } },
              _count: { id: true },
              orderBy: { _count: { id: 'desc' } }
            })
          ]);

          return actionStats.map(stat => ({
            action: stat.action,
            count: stat._count.id,
            percentage: totalCount > 0 ? Math.round((stat._count.id / totalCount) * 10000) / 100 : 0
          }));
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 获取操作类型分布失败:', error);
      throw TRPCErrorHandler.internalError('获取操作类型分布失败');
    }
  }

  /**
   * 获取时间段活动统计
   * @param days 统计天数
   * @returns 时间段活动统计
   */
  async getHourlyActivityStats(days: number = 7): Promise<Array<{
    hour: number;
    count: number;
    percentage: number;
  }>> {
    try {
      console.log(`⏰ 获取时间段活动统计: ${days}天`);

      const cacheKey = this.generateCacheKey('hourly-stats', { days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const hourlyStats = await prisma.$queryRaw`
            SELECT EXTRACT(HOUR FROM createdAt) as hour, COUNT(*) as count
            FROM UserApprovalLog
            WHERE createdAt >= ${startDate}
            GROUP BY EXTRACT(HOUR FROM createdAt)
            ORDER BY hour
          ` as any[];

          const totalCount = hourlyStats.reduce((sum, stat) => sum + FormatUtils.formatNumber(stat.count), 0);

          return hourlyStats.map(stat => ({
            hour: FormatUtils.formatNumber(stat.hour),
            count: FormatUtils.formatNumber(stat.count),
            percentage: totalCount > 0 ? Math.round((FormatUtils.formatNumber(stat.count) / totalCount) * 10000) / 100 : 0
          }));
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 获取时间段活动统计失败:', error);
      throw TRPCErrorHandler.internalError('获取时间段活动统计失败');
    }
  }

  /**
   * 获取审批效率统计
   * @param days 统计天数
   * @returns 审批效率统计
   */
  async getApprovalEfficiencyStats(days: number = 30): Promise<{
    totalApprovals: number;
    totalRejections: number;
    approvalRate: number;
    averageProcessingTime: number;
    topPerformers: Array<{
      adminId: string;
      adminName: string;
      totalActions: number;
      approvalRate: number;
    }>;
  }> {
    try {
      console.log(`⚡ 获取审批效率统计: ${days}天`);

      const cacheKey = this.generateCacheKey('efficiency-stats', { days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const [approvalStats, adminPerformance] = await Promise.all([
            // 审批统计
            prisma.userApprovalLog.groupBy({
              by: ['action'],
              where: { 
                createdAt: { gte: startDate },
                action: { in: ['APPROVE', 'REJECT'] }
              },
              _count: { id: true }
            }),

            // 管理员表现
            prisma.userApprovalLog.groupBy({
              by: ['userId', 'action'],
              where: { 
                createdAt: { gte: startDate },
                action: { in: ['APPROVE', 'REJECT'] }
              },
              _count: { id: true }
            })
          ]);

          const totalApprovals = approvalStats.find(s => s.action === 'APPROVE')?._count.id || 0;
          const totalRejections = approvalStats.find(s => s.action === 'REJECT')?._count.id || 0;
          const totalDecisions = totalApprovals + totalRejections;
          const approvalRate = totalDecisions > 0 ? Math.round((totalApprovals / totalDecisions) * 10000) / 100 : 0;

          // 计算管理员表现
          const adminStats = new Map<string, { approvals: number; rejections: number }>();
          adminPerformance.forEach(stat => {
            const adminId = stat.userId;
            if (!adminStats.has(adminId)) {
              adminStats.set(adminId, { approvals: 0, rejections: 0 });
            }
            const adminStat = adminStats.get(adminId)!;
            if (stat.action === 'APPROVE') {
              adminStat.approvals = stat._count.id;
            } else if (stat.action === 'REJECT') {
              adminStat.rejections = stat._count.id;
            }
          });

          const topPerformers = Array.from(adminStats.entries())
            .map(([adminId, stats]) => {
              const totalActions = stats.approvals + stats.rejections;
              const approvalRate = totalActions > 0 ? Math.round((stats.approvals / totalActions) * 10000) / 100 : 0;
              return {
                adminId,
                adminName: `Admin ${adminId}`, // 这里可以从用户表获取真实姓名
                totalActions,
                approvalRate
              };
            })
            .sort((a, b) => b.totalActions - a.totalActions)
            .slice(0, 10);

          return {
            totalApprovals,
            totalRejections,
            approvalRate,
            averageProcessingTime: 0, // 需要额外的时间计算逻辑
            topPerformers
          };
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 获取审批效率统计失败:', error);
      throw TRPCErrorHandler.internalError('获取审批效率统计失败');
    }
  }
}
