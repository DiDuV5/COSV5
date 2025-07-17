/**
 * @fileoverview 上传统计分析模块
 * @description 处理用户上传数据的统计和分析
 * @author Augment AI
 * @date 2025-07-03
 */

import { UserLevel } from '@/types/user-level';
import { UserConfigQueries } from '../queries/user-config-queries';

/**
 * 上传统计分析器类
 */
export class UploadStatistics {

  /**
   * 获取用户上传统计
   */
  static async getUserUploadStats(userId: string): Promise<{
    totalUploads: number;
    totalSize: number;
    todayUploads: number;
    thisMonthUploads: number;
    averageFileSize: number;
  }> {
    try {
      console.log(`📊 获取用户上传统计: ${userId}`);

      const stats = await UserConfigQueries.getUserUploadStatsData(userId);

      console.log(`✅ 用户上传统计获取完成: ${userId}`);
      return stats;

    } catch (error) {
      console.error('获取用户上传统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详细上传统计
   */
  static async getDetailedUploadStats(userId: string): Promise<{
    basic: {
      totalUploads: number;
      totalSize: number;
      todayUploads: number;
      thisMonthUploads: number;
      averageFileSize: number;
    };
    byType: Array<{
      mimeType: string;
      count: number;
      totalSize: number;
      averageSize: number;
    }>;
    byMonth: Array<{
      month: string;
      uploads: number;
      totalSize: number;
    }>;
    trends: {
      uploadTrend: 'increasing' | 'decreasing' | 'stable';
      sizeTrend: 'increasing' | 'decreasing' | 'stable';
    };
  }> {
    try {
      console.log(`📈 获取用户详细上传统计: ${userId}`);

      const { prisma } = await import('@/lib/prisma');

      // 获取基础统计
      const basic = await this.getUserUploadStats(userId);

      // 按文件类型统计
      const byTypeStats = await prisma.postMedia.groupBy({
        by: ['mimeType'],
        where: {
          post: { authorId: userId }
        },
        _count: { id: true },
        _sum: { fileSize: true },
        _avg: { fileSize: true }
      });

      const byType = byTypeStats.map(stat => ({
        mimeType: stat.mimeType || 'unknown',
        count: stat._count?.id || 0,
        totalSize: stat._sum?.fileSize || 0,
        averageSize: stat._avg?.fileSize || 0
      }));

      // 按月份统计（最近12个月）
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const byMonthStats = await prisma.postMedia.groupBy({
        by: ['createdAt'],
        where: {
          post: { authorId: userId },
          createdAt: { gte: twelveMonthsAgo }
        },
        _count: { id: true },
        _sum: { fileSize: true }
      });

      // 处理月份数据
      const monthlyData = new Map<string, { uploads: number; totalSize: number }>();

      byMonthStats.forEach(stat => {
        const month = stat.createdAt.toISOString().substring(0, 7); // YYYY-MM
        const existing = monthlyData.get(month) || { uploads: 0, totalSize: 0 };
        monthlyData.set(month, {
          uploads: existing.uploads + (stat._count?.id || 0),
          totalSize: existing.totalSize + (stat._sum?.fileSize || 0)
        });
      });

      const byMonth = Array.from(monthlyData.entries()).map(([month, data]) => ({
        month,
        uploads: data.uploads,
        totalSize: data.totalSize
      })).sort((a, b) => a.month.localeCompare(b.month));

      // 计算趋势
      const trends = this.calculateTrends(byMonth);

      console.log(`✅ 用户详细上传统计获取完成: ${userId}`);

      return {
        basic,
        byType,
        byMonth,
        trends
      };

    } catch (error) {
      console.error('获取用户详细上传统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统级上传统计
   */
  static async getSystemUploadStats(): Promise<{
    totalUsers: number;
    totalUploads: number;
    totalSize: number;
    todayUploads: number;
    thisMonthUploads: number;
    averageFileSize: number;
    topUploaders: Array<{
      userId: string;
      username: string;
      uploads: number;
      totalSize: number;
    }>;
    popularTypes: Array<{
      mimeType: string;
      count: number;
      percentage: number;
    }>;
  }> {
    try {
      console.log(`🌐 获取系统级上传统计`);

      const { prisma } = await import('@/lib/prisma');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // 基础统计
      const [totalStats, todayCount, monthCount, userCount] = await Promise.all([
        prisma.postMedia.aggregate({
          _count: { id: true },
          _sum: { fileSize: true },
          _avg: { fileSize: true }
        }),

        prisma.postMedia.count({
          where: { createdAt: { gte: today } }
        }),

        prisma.postMedia.count({
          where: { createdAt: { gte: thisMonth } }
        }),

        prisma.user.count()
      ]);

      // 热门上传者（前10名）
      const topUploadersData = await prisma.postMedia.groupBy({
        by: ['postId'],
        _count: { id: true },
        _sum: { fileSize: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      });

      // 获取用户信息
      const topUploaders = await Promise.all(
        topUploadersData.map(async (data) => {
          try {
            const post = await prisma.post.findUnique({
              where: { id: data.postId as string },
              include: { author: { select: { id: true, username: true } } }
            });

            return {
              userId: (post as any)?.author?.id || '',
              username: (post as any)?.author?.username || 'Unknown',
              uploads: data._count?.id || 0,
              totalSize: data._sum?.fileSize || 0
            };
          } catch (error) {
            return {
              userId: '',
              username: 'Unknown',
              uploads: data._count?.id || 0,
              totalSize: data._sum?.fileSize || 0
            };
          }
        })
      );

      // 热门文件类型
      const typeStats = await prisma.postMedia.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      });

      const totalFiles = totalStats._count?.id || 1;
      const popularTypes = typeStats.map(stat => ({
        mimeType: stat.mimeType || 'unknown',
        count: stat._count?.id || 0,
        percentage: ((stat._count?.id || 0) / totalFiles) * 100
      }));

      console.log(`✅ 系统级上传统计获取完成`);

      return {
        totalUsers: userCount,
        totalUploads: totalStats._count?.id || 0,
        totalSize: totalStats._sum?.fileSize || 0,
        todayUploads: todayCount,
        thisMonthUploads: monthCount,
        averageFileSize: totalStats._avg?.fileSize || 0,
        topUploaders,
        popularTypes
      };

    } catch (error) {
      console.error('获取系统级上传统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户级别统计
   */
  static async getUserLevelStats(): Promise<Array<{
    userLevel: UserLevel;
    userCount: number;
    totalUploads: number;
    totalSize: number;
    averageUploadsPerUser: number;
    averageSizePerUser: number;
  }>> {
    try {
      console.log(`👥 获取用户级别统计`);

      const { prisma } = await import('@/lib/prisma');

      const userLevels: UserLevel[] = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];

      const stats = await Promise.all(
        userLevels.map(async (level) => {
          const [userCount, uploadStats] = await Promise.all([
            prisma.user.count({
              where: { userLevel: level }
            }),

            prisma.postMedia.aggregate({
              where: {
                post: {
                  author: { userLevel: level }
                }
              },
              _count: { id: true },
              _sum: { fileSize: true }
            })
          ]);

          const totalUploads = uploadStats._count?.id || 0;
          const totalSize = uploadStats._sum?.fileSize || 0;

          return {
            userLevel: level,
            userCount,
            totalUploads,
            totalSize,
            averageUploadsPerUser: userCount > 0 ? totalUploads / userCount : 0,
            averageSizePerUser: userCount > 0 ? totalSize / userCount : 0
          };
        })
      );

      console.log(`✅ 用户级别统计获取完成`);
      return stats;

    } catch (error) {
      console.error('获取用户级别统计失败:', error);
      throw error;
    }
  }

  /**
   * 计算趋势
   */
  private static calculateTrends(monthlyData: Array<{
    month: string;
    uploads: number;
    totalSize: number;
  }>): {
    uploadTrend: 'increasing' | 'decreasing' | 'stable';
    sizeTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (monthlyData.length < 2) {
      return { uploadTrend: 'stable', sizeTrend: 'stable' };
    }

    // 取最近3个月的数据计算趋势
    const recentData = monthlyData.slice(-3);

    // 计算上传数量趋势
    const uploadTrend = this.calculateSingleTrend(
      recentData.map(d => d.uploads)
    );

    // 计算文件大小趋势
    const sizeTrend = this.calculateSingleTrend(
      recentData.map(d => d.totalSize)
    );

    return { uploadTrend, sizeTrend };
  }

  /**
   * 计算单一指标趋势
   */
  private static calculateSingleTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    let increases = 0;
    let decreases = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        increases++;
      } else if (values[i] < values[i - 1]) {
        decreases++;
      }
    }

    if (increases > decreases) {
      return 'increasing';
    } else if (decreases > increases) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化百分比
   */
  static formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}
