/**
 * @fileoverview 业务指标监控服务
 * @description 专门处理业务相关的监控指标收集和分析
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import type { BusinessMetrics } from '../types/monitoring-types';

/**
 * 业务指标监控服务类
 */
export class BusinessMetricsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 收集业务相关指标
   */
  async collectBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // 并行收集各项指标
      const [
        activeUsers,
        dailyUploads,
        weeklyUploads,
        newUsers,
        totalUsers,
        totalPosts,
        storageGrowthData,
        engagementData
      ] = await Promise.all([
        this.getActiveUsers(yesterday),
        this.getDailyUploads(yesterday),
        this.getWeeklyUploads(lastWeek),
        this.getNewUsers(yesterday),
        this.getTotalUsers(),
        this.getTotalPosts(),
        this.getStorageGrowth(yesterday),
        this.getUserEngagement(yesterday)
      ]);

      return {
        activeUsers,
        dailyUploads,
        // weeklyUploads, // 暂时注释掉，属性不存在于 BusinessMetrics
        // newUsers, // 暂时注释掉，属性不存在于 BusinessMetrics
        // totalUsers, // 暂时注释掉，属性不存在于 BusinessMetrics
        // totalPosts, // 暂时注释掉，属性不存在于 BusinessMetrics
        storageGrowth: storageGrowthData,
        userEngagement: engagementData,
        // retentionRate: await this.calculateRetentionRate(), // 暂时注释掉，属性不存在于 BusinessMetrics
        // conversionRate: await this.calculateConversionRate(), // 暂时注释掉，属性不存在于 BusinessMetrics
      };
    } catch (error) {
      console.error('❌ 业务指标收集失败:', error);
      throw error;
    }
  }

  /**
   * 获取活跃用户数
   */
  private async getActiveUsers(since: Date): Promise<number> {
    return await this.prisma.user.count({
      where: {
        lastLoginAt: { gte: since },
      },
    });
  }

  /**
   * 获取每日上传数
   */
  private async getDailyUploads(since: Date): Promise<number> {
    return await this.prisma.postMedia.count({
      where: {
        createdAt: { gte: since },
      },
    });
  }

  /**
   * 获取每周上传数
   */
  private async getWeeklyUploads(since: Date): Promise<number> {
    return await this.prisma.postMedia.count({
      where: {
        createdAt: { gte: since },
      },
    });
  }

  /**
   * 获取新用户数
   */
  private async getNewUsers(since: Date): Promise<number> {
    return await this.prisma.user.count({
      where: {
        createdAt: { gte: since },
      },
    });
  }

  /**
   * 获取总用户数
   */
  private async getTotalUsers(): Promise<number> {
    return await this.prisma.user.count();
  }

  /**
   * 获取总帖子数
   */
  private async getTotalPosts(): Promise<number> {
    return await this.prisma.post.count();
  }

  /**
   * 获取存储增长数据
   */
  private async getStorageGrowth(since: Date): Promise<number> {
    try {
      // 计算最近24小时的存储增长
      const recentMedia = await this.prisma.postMedia.findMany({
        where: {
          createdAt: { gte: since },
        },
        select: {
          fileSize: true,
        },
      });

      const totalGrowthBytes = recentMedia.reduce((sum, media) => {
        return sum + (media.fileSize || 0);
      }, 0);

      // 转换为GB
      return Number((totalGrowthBytes / (1024 * 1024 * 1024)).toFixed(2));
    } catch (error) {
      console.error('存储增长计算失败:', error);
      return 0;
    }
  }

  /**
   * 获取用户参与度
   */
  private async getUserEngagement(since: Date): Promise<number> {
    try {
      const totalUsers = await this.getTotalUsers();
      if (totalUsers === 0) return 0;

      // 计算有活动的用户数（发帖、评论、点赞等）
      const [postsCount, commentsCount, likesCount] = await Promise.all([
        this.prisma.post.count({
          where: { createdAt: { gte: since } },
        }),
        this.prisma.comment.count({
          where: { createdAt: { gte: since } },
        }),
        this.prisma.like.count({
          where: { createdAt: { gte: since } },
        }),
      ]);

      // 获取有活动的唯一用户数
      const activeUsersWithActivity = await this.prisma.user.count({
        where: {
          OR: [
            { posts: { some: { createdAt: { gte: since } } } },
            { comments: { some: { createdAt: { gte: since } } } },
            { likes: { some: { createdAt: { gte: since } } } },
          ],
        },
      });

      // 计算参与度百分比
      const engagementRate = (activeUsersWithActivity / totalUsers) * 100;
      return Number(engagementRate.toFixed(1));
    } catch (error) {
      console.error('用户参与度计算失败:', error);
      return 0;
    }
  }

  /**
   * 计算用户留存率
   */
  private async calculateRetentionRate(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // 30天前注册的用户
      const usersRegistered30DaysAgo = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
            lt: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (usersRegistered30DaysAgo === 0) return 0;

      // 这些用户中在最近7天内有活动的
      const retainedUsers = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
            lt: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000),
          },
          lastLoginAt: { gte: sevenDaysAgo },
        },
      });

      const retentionRate = (retainedUsers / usersRegistered30DaysAgo) * 100;
      return Number(retentionRate.toFixed(1));
    } catch (error) {
      console.error('留存率计算失败:', error);
      return 0;
    }
  }

  /**
   * 计算转化率
   */
  private async calculateConversionRate(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // 最近30天注册的用户
      const newUsers = await this.prisma.user.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      });

      if (newUsers === 0) return 0;

      // 这些用户中发布过内容的
      const activeNewUsers = await this.prisma.user.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          posts: { some: {} },
        },
      });

      const conversionRate = (activeNewUsers / newUsers) * 100;
      return Number(conversionRate.toFixed(1));
    } catch (error) {
      console.error('转化率计算失败:', error);
      return 0;
    }
  }

  /**
   * 获取用户等级分布
   */
  async getUserLevelDistribution(): Promise<Record<string, number>> {
    try {
      const distribution = await this.prisma.user.groupBy({
        by: ['userLevel'],
        _count: { userLevel: true },
      });

      const result: Record<string, number> = {};
      distribution.forEach(item => {
        result[item.userLevel] = item._count.userLevel;
      });

      return result;
    } catch (error) {
      console.error('用户等级分布获取失败:', error);
      return {};
    }
  }

  /**
   * 获取内容类型分布
   */
  async getContentTypeDistribution(): Promise<Record<string, number>> {
    try {
      const distribution = await this.prisma.post.groupBy({
        by: ['contentType'],
        _count: { contentType: true },
      });

      const result: Record<string, number> = {};
      distribution.forEach(item => {
        result[item.contentType] = item._count.contentType;
      });

      return result;
    } catch (error) {
      console.error('内容类型分布获取失败:', error);
      return {};
    }
  }

  /**
   * 获取热门标签统计
   */
  async getPopularTags(limit: number = 10): Promise<Array<{ tag: string; count: number }>> {
    try {
      // 这里需要根据实际的标签存储方式来实现
      // 假设标签存储在Post表的tags字段中
      const posts = await this.prisma.post.findMany({
        select: { tags: true },
        where: { tags: { not: null } },
      });

      const tagCounts: Record<string, number> = {};

      posts.forEach(post => {
        if (post.tags) {
          try {
            const tags = JSON.parse(post.tags) as string[];
            tags.forEach(tag => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
          } catch {
            // 忽略JSON解析错误
          }
        }
      });

      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));
    } catch (error) {
      console.error('热门标签统计失败:', error);
      return [];
    }
  }
}

/**
 * 导出服务创建函数
 */
export const createBusinessMetricsService = (prisma: PrismaClient) =>
  new BusinessMetricsService(prisma);
