/**
 * @fileoverview 超时检测器
 * @description 检测和识别超时的审批用户
 * @author Augment AI
 * @date 2025-07-03
 */

import { prisma } from '@/lib/prisma';
import {
  TimeoutUser,
  TimeoutUserQueryOptions,
  TimeoutUserDetails,
  TimeoutStatistics
} from '../types/timeout-types';

/**
 * 超时检测器类
 */
export class TimeoutDetector {

  /**
   * 获取超时的用户列表
   */
  static async getTimeoutUsers(timeoutHours: number): Promise<TimeoutUser[]> {
    try {
      const timeoutDate = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

      const users = await prisma.user.findMany({
        where: {
          userLevel: 'GUEST',
          createdAt: {
            lt: timeoutDate
          }
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return users.map(user => ({
        ...user,
        email: user.email || '',
        hoursOverdue: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60)) - timeoutHours
      }));

    } catch (error) {
      console.error('获取超时用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取即将超时的用户（提前提醒）
   */
  static async getUpcomingTimeoutUsers(
    timeoutHours: number,
    reminderHours: number = 24
  ): Promise<TimeoutUser[]> {
    try {
      const reminderDate = new Date(Date.now() - (timeoutHours - reminderHours) * 60 * 60 * 1000);
      const timeoutDate = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

      const users = await prisma.user.findMany({
        where: {
          userLevel: 'GUEST',
          createdAt: {
            lt: reminderDate,
            gte: timeoutDate
          }
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return users.map(user => {
        const hoursElapsed = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60));
        return {
          ...user,
          email: user.email || '',
          hoursOverdue: Math.max(0, hoursElapsed - timeoutHours)
        };
      });

    } catch (error) {
      console.error('获取即将超时用户失败:', error);
      throw error;
    }
  }

  /**
   * 高级查询超时用户
   */
  static async queryTimeoutUsers(options: TimeoutUserQueryOptions): Promise<TimeoutUser[]> {
    try {
      const {
        timeoutHours,
        includeAlreadyNotified = false,
        includeRecentlyProcessed = false,
        sortBy = 'createdAt',
        sortOrder = 'asc',
        limit,
        offset
      } = options;

      const timeoutDate = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

      // 构建查询条件
      const whereConditions: any = {
        userLevel: 'GUEST',
        createdAt: {
          lt: timeoutDate
        }
      };

      // 如果不包括已通知的用户
      if (!includeAlreadyNotified) {
        whereConditions.timeoutNotifications = {
          none: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
            }
          }
        };
      }

      // 如果不包括最近处理过的用户
      if (!includeRecentlyProcessed) {
        whereConditions.NOT = {
          timeoutProcessingLogs: {
            some: {
              processedAt: {
                gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6小时内
              }
            }
          }
        };
      }

      const users = await prisma.user.findMany({
        where: whereConditions,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          createdAt: true
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        take: limit,
        skip: offset
      });

      return users.map(user => ({
        ...user,
        email: user.email || '',
        hoursOverdue: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60)) - timeoutHours
      }));

    } catch (error) {
      console.error('查询超时用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取超时用户详情
   */
  static async getTimeoutUserDetails(userId: string): Promise<TimeoutUserDetails | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          timeoutNotifications: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!user) {
        return null;
      }

      // 计算用户详情
      const profileCompleteness = this.calculateProfileCompleteness(user);
      const hasRecentActivity = await this.checkRecentActivity(userId);
      const riskScore = this.calculateRiskScore(user, profileCompleteness, hasRecentActivity);

      const timeoutHours = 72; // 默认超时时间，实际应该从配置获取
      const hoursOverdue = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60)) - timeoutHours;

      return {
        id: user.id,
        username: user.username,
        email: user.email || '',
        displayName: user.displayName,
        createdAt: user.createdAt,
        hoursOverdue: Math.max(0, hoursOverdue),
        registrationSource: 'web', // 简化处理
        lastLoginAt: undefined,
        profileCompleteness,
        hasRecentActivity,
        notificationHistory: user.timeoutNotifications.map((n: any) => ({
          id: n.id,
          userId: n.userId,
          type: n.type as any,
          sentAt: n.createdAt,
          success: true,
          error: undefined
        })),
        riskScore
      };

    } catch (error) {
      console.error('获取超时用户详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取超时统计信息
   */
  static async getTimeoutStatistics(timeoutHours: number): Promise<TimeoutStatistics> {
    try {
      const timeoutDate = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [
        totalTimeoutUsers,
        autoRejectedUsers,
        notifiedUsers,
        upcomingTimeoutUsers,
        _processingLogsData
      ] = await Promise.all([
        // 总超时用户数
        prisma.user.count({
          where: {
            userLevel: 'GUEST',
            createdAt: { lt: timeoutDate }
          }
        }),

        // 自动拒绝用户数（过去24小时）
        prisma.user.count({
          where: {
            userLevel: 'REJECTED',
            rejectedAt: { gte: oneDayAgo },
            rejectionReason: { contains: 'timeout' }
          }
        }),

        // 已通知用户数（过去24小时）
        prisma.timeoutNotification.count({
          where: {
            createdAt: { gte: oneDayAgo },
            type: 'TIMEOUT_REMINDER'
          }
        }),

        // 即将超时用户数
        this.getUpcomingTimeoutUsers(timeoutHours, 24).then(users => users.length),

        // 处理日志（用于计算平均处理时间）- 暂时返回空数组
        Promise.resolve([])
      ]);

      // 简化统计计算
      const processingLogs: any[] = [];
      const averageProcessingTime = 0;
      const successRate = 1;

      return {
        totalTimeoutUsers,
        autoRejectedUsers,
        notifiedUsers,
        upcomingTimeoutUsers,
        averageProcessingTime,
        successRate
      };

    } catch (error) {
      console.error('获取超时统计失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否有最近的超时通知
   */
  static async hasRecentTimeoutNotification(userId: string): Promise<boolean> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const notification = await prisma.timeoutNotification.findFirst({
        where: {
          userId,
          createdAt: { gte: oneDayAgo }
        }
      });

      return !!notification;

    } catch (error) {
      console.error('检查超时通知失败:', error);
      return false;
    }
  }

  /**
   * 计算用户档案完整度
   */
  private static calculateProfileCompleteness(user: any): number {
    let completeness = 0;
    const fields = ['username', 'email', 'displayName', 'profile'];

    fields.forEach(field => {
      if (user[field]) {
        completeness += 25;
      }
    });

    return Math.min(100, completeness);
  }

  /**
   * 检查用户最近活动
   */
  private static async checkRecentActivity(userId: string): Promise<boolean> {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      // 检查最近登录
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastLoginAt: true }
      });

      if (user?.lastLoginAt && user.lastLoginAt > threeDaysAgo) {
        return true;
      }

      // 检查其他活动（如果有相关表）
      // 这里可以添加更多活动检查逻辑

      return false;

    } catch (error) {
      console.error('检查用户活动失败:', error);
      return false;
    }
  }

  /**
   * 计算风险评分
   */
  private static calculateRiskScore(
    user: any,
    profileCompleteness: number,
    hasRecentActivity: boolean
  ): number {
    let riskScore = 0;

    // 基于注册时间的风险
    const daysSinceRegistration = Math.floor((Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceRegistration > 7) riskScore += 30;
    if (daysSinceRegistration > 14) riskScore += 20;

    // 基于档案完整度的风险
    if (profileCompleteness < 50) riskScore += 25;
    if (profileCompleteness < 25) riskScore += 25;

    // 基于活动的风险
    if (!hasRecentActivity) riskScore += 30;

    // 基于邮箱验证状态的风险
    if (!user.emailVerified) riskScore += 20;

    return Math.min(100, riskScore);
  }
}
