/**
 * @fileoverview 活动查询类
 * @description 审计活动分析的专门查询类
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { prisma } from '@/lib/prisma';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { BaseAuditQuery } from './BaseAuditQuery';
import { ApprovalAuditLog, AuditLogQueryParams } from '../../types/audit-types';
import { ActivityAnalysisResult } from '../types';
import { CACHE_CONFIG, DEFAULT_QUERY_CONFIG } from '../constants';

/**
 * 活动查询类
 */
export class ActivityQuery extends BaseAuditQuery {
  /**
   * 获取最近的审计活动
   * @param hours 时间范围（小时）
   * @param limit 限制数量
   * @returns 最近的审计活动
   */
  async getRecentActivity(
    hours: number = DEFAULT_QUERY_CONFIG.RECENT_ACTIVITY_HOURS,
    limit: number = 20
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`⏰ 获取最近活动: ${hours}小时内的${limit}条记录`);

      const cacheKey = this.generateCacheKey('recent-activity', { hours, limit });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

          const queryParams: AuditLogQueryParams = {
            startDate,
            limit,
            sortBy: 'timestamp',
            sortOrder: 'desc'
          };

          const result = await this.getAuditLogs(queryParams);
          return Array.isArray(result.data) ? result.data : [result.data];
        },
        CACHE_CONFIG.RECENT_ACTIVITY_TTL
      );

    } catch (error) {
      console.error('❌ 获取最近活动失败:', error);
      throw TRPCErrorHandler.internalError('获取最近活动失败');
    }
  }

  /**
   * 获取可疑活动
   * @param timeWindow 时间窗口（小时）
   * @param threshold 阈值
   * @returns 可疑活动记录
   */
  async getSuspiciousActivity(
    timeWindow: number = 24,
    threshold: number = DEFAULT_QUERY_CONFIG.SUSPICIOUS_ACTIVITY_THRESHOLD
  ): Promise<ApprovalAuditLog[]> {
    try {
      console.log(`🚨 查询可疑活动: ${timeWindow}小时内超过${threshold}次操作`);

      const cacheKey = this.generateCacheKey('suspicious-activity', { timeWindow, threshold });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

          // 查询高频操作的管理员
          const adminActivity = await prisma.userApprovalLog.groupBy({
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

          const result = await this.getAuditLogs(queryParams);

          // 过滤出可疑管理员的操作
          const dataArray = Array.isArray(result.data) ? result.data : [result.data];
          const suspiciousLogs = dataArray.filter((log: any) =>
            suspiciousAdminIds.includes(log.adminId)
          );

          console.log(`✅ 发现 ${suspiciousLogs.length} 条可疑活动记录`);
          return suspiciousLogs;
        },
        CACHE_CONFIG.RECENT_ACTIVITY_TTL
      );

    } catch (error) {
      console.error('❌ 查询可疑活动失败:', error);
      throw TRPCErrorHandler.internalError('查询可疑活动失败');
    }
  }

  /**
   * 获取异常活动模式
   * @param days 分析天数
   * @returns 异常活动分析结果
   */
  async getAnomalousActivityPatterns(days: number = 7): Promise<{
    unusualTimeActivity: Array<{ hour: number; count: number; isUnusual: boolean }>;
    bulkOperations: Array<{ adminId: string; count: number; timespan: number }>;
    rapidSuccessiveActions: Array<{ adminId: string; actions: number; timespan: number }>;
  }> {
    try {
      console.log(`🔍 分析异常活动模式: ${days}天`);

      const cacheKey = this.generateCacheKey('anomalous-patterns', { days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          // 分析非正常时间的活动
          const hourlyActivity = await prisma.$queryRaw`
            SELECT EXTRACT(HOUR FROM createdAt) as hour, COUNT(*) as count
            FROM UserApprovalLog
            WHERE createdAt >= ${startDate}
            GROUP BY EXTRACT(HOUR FROM createdAt)
            ORDER BY hour
          ` as any[];

          const avgHourlyCount = hourlyActivity.reduce((sum, h) => sum + Number(h.count), 0) / 24;
          const unusualTimeActivity = hourlyActivity.map(h => ({
            hour: Number(h.hour),
            count: Number(h.count),
            isUnusual: Number(h.count) > avgHourlyCount * 2 || (Number(h.hour) >= 22 || Number(h.hour) <= 6) && Number(h.count) > 0
          }));

          // 分析批量操作
          const bulkOperations = await prisma.$queryRaw`
            SELECT userId as adminId, COUNT(*) as count,
                   EXTRACT(EPOCH FROM (MAX(createdAt) - MIN(createdAt)))/60 as timespan
            FROM UserApprovalLog
            WHERE createdAt >= ${startDate}
              AND action IN ('BATCH_APPROVE', 'BATCH_REJECT', 'BULK_OPERATION')
            GROUP BY userId
            HAVING COUNT(*) > 5
            ORDER BY count DESC
          ` as any[];

          // 分析快速连续操作
          const rapidSuccessiveActions = await prisma.$queryRaw`
            SELECT userId as adminId, COUNT(*) as actions,
                   EXTRACT(EPOCH FROM (MAX(createdAt) - MIN(createdAt)))/60 as timespan
            FROM UserApprovalLog
            WHERE createdAt >= ${startDate}
            GROUP BY userId
            HAVING COUNT(*) > 10 AND EXTRACT(EPOCH FROM (MAX(createdAt) - MIN(createdAt)))/60 < 60
            ORDER BY actions DESC
          ` as any[];

          return {
            unusualTimeActivity,
            bulkOperations: bulkOperations.map(op => ({
              adminId: op.adminId,
              count: Number(op.count),
              timespan: Number(op.timespan)
            })),
            rapidSuccessiveActions: rapidSuccessiveActions.map(action => ({
              adminId: action.adminId,
              actions: Number(action.actions),
              timespan: Number(action.timespan)
            }))
          };
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 分析异常活动模式失败:', error);
      throw TRPCErrorHandler.internalError('分析异常活动模式失败');
    }
  }

  /**
   * 获取活动热力图数据
   * @param days 分析天数
   * @returns 活动热力图数据
   */
  async getActivityHeatmapData(days: number = 30): Promise<Array<{
    date: string;
    hour: number;
    count: number;
    intensity: number;
  }>> {
    try {
      console.log(`🔥 获取活动热力图数据: ${days}天`);

      const cacheKey = this.generateCacheKey('heatmap-data', { days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const heatmapData = await prisma.$queryRaw`
            SELECT DATE(createdAt) as date,
                   EXTRACT(HOUR FROM createdAt) as hour,
                   COUNT(*) as count
            FROM UserApprovalLog
            WHERE createdAt >= ${startDate}
            GROUP BY DATE(createdAt), EXTRACT(HOUR FROM createdAt)
            ORDER BY date, hour
          ` as any[];

          const maxCount = Math.max(...heatmapData.map(d => Number(d.count)));

          return heatmapData.map(data => ({
            date: data.date,
            hour: Number(data.hour),
            count: Number(data.count),
            intensity: maxCount > 0 ? Number(data.count) / maxCount : 0
          }));
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 获取活动热力图数据失败:', error);
      throw TRPCErrorHandler.internalError('获取活动热力图数据失败');
    }
  }

  /**
   * 获取管理员活动对比
   * @param adminIds 管理员ID列表
   * @param days 对比天数
   * @returns 管理员活动对比数据
   */
  async getAdminActivityComparison(adminIds: string[], days: number = 30): Promise<Array<{
    adminId: string;
    totalActions: number;
    approvals: number;
    rejections: number;
    averagePerDay: number;
    peakHour: number;
    efficiency: number;
  }>> {
    try {
      console.log(`📊 获取管理员活动对比: ${adminIds.length}个管理员`);

      const cacheKey = this.generateCacheKey('admin-comparison', { adminIds, days });

      return await this.getCachedResult(
        cacheKey,
        async () => {
          const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

          const adminStats = await Promise.all(
            adminIds.map(async (adminId) => {
              const [totalActions, actionBreakdown, hourlyActivity] = await Promise.all([
                // 总操作数
                prisma.userApprovalLog.count({
                  where: {
                    userId: adminId,
                    createdAt: { gte: startDate }
                  }
                }),

                // 操作类型分解
                prisma.userApprovalLog.groupBy({
                  by: ['action'],
                  where: {
                    userId: adminId,
                    createdAt: { gte: startDate }
                  },
                  _count: { id: true }
                }),

                // 每小时活动
                prisma.$queryRaw`
                  SELECT EXTRACT(HOUR FROM createdAt) as hour, COUNT(*) as count
                  FROM UserApprovalLog
                  WHERE userId = ${adminId} AND createdAt >= ${startDate}
                  GROUP BY EXTRACT(HOUR FROM createdAt)
                  ORDER BY count DESC
                  LIMIT 1
                `
              ]);

              const approvals = actionBreakdown.find(a => a.action === 'APPROVE')?._count.id || 0;
              const rejections = actionBreakdown.find(a => a.action === 'REJECT')?._count.id || 0;
              const averagePerDay = totalActions / Math.max(days, 1);
              const peakHour = (hourlyActivity as any[])[0]?.hour || 0;
              const efficiency = totalActions > 0 ? approvals / totalActions : 0;

              return {
                adminId,
                totalActions,
                approvals,
                rejections,
                averagePerDay: Math.round(averagePerDay * 100) / 100,
                peakHour: Number(peakHour),
                efficiency: Math.round(efficiency * 10000) / 100
              };
            })
          );

          return adminStats.sort((a, b) => b.totalActions - a.totalActions);
        },
        CACHE_CONFIG.STATS_TTL
      );

    } catch (error) {
      console.error('❌ 获取管理员活动对比失败:', error);
      throw TRPCErrorHandler.internalError('获取管理员活动对比失败');
    }
  }
}
