/**
 * @fileoverview 访客数据查询模块 - CoserEden平台
 * @description 访客数据查询和数据库操作功能
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import type {
  UserInfo,
  QueryOptions,
  TimeRange
} from './admin-analytics-types';
import { calculateTimeRange, validateQueryOptions } from './admin-analytics-utils';

/**
 * 访客数据查询类
 * 负责所有与数据库相关的查询操作
 */
export class VisitorQuery {
  constructor(private db: PrismaClient) { }

  /**
   * 获取用户基本信息
   *
   * @param userId - 用户ID
   * @returns Promise<UserInfo | null> - 用户信息
   */
  public async getUserInfo(userId: string): Promise<UserInfo | null> {
    try {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          userLevel: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
          createdAt: true,
          lastLoginAt: true,
          isVerified: true,
        },
      });

      return user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 获取用户列表（分页）
   *
   * @param options - 查询选项
   * @returns Promise<{ users: UserInfo[], total: number }> - 用户列表和总数
   */
  public async getUserList(options: QueryOptions = {}): Promise<{ users: UserInfo[], total: number }> {
    const validated = validateQueryOptions(options);
    const { limit = 50, offset = 0 } = validated;

    try {
      const [users, total] = await Promise.all([
        this.db.user.findMany({
          select: {
            id: true,
            username: true,
            displayName: true,
            userLevel: true,
            postsCount: true,
            followersCount: true,
            createdAt: true,
            lastLoginAt: true,
            isVerified: true,
          },
          orderBy: { followersCount: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.db.user.count(),
      ]);

      return { users, total };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * 获取用户统计数据
   *
   * @param options - 查询选项
   * @returns Promise<UserStatsData> - 用户统计数据
   */
  public async getUserStats(options: QueryOptions = {}) {
    const { start, end } = calculateTimeRange(options.timeRange, options.startDate, options.endDate);

    try {
      const [
        totalUsers,
        newUsers,
        activeUsers,
        verifiedUsers,
      ] = await Promise.all([
        this.db.user.count(),
        this.db.user.count({
          where: {
            createdAt: { gte: start, lte: end },
          },
        }),
        this.db.user.count({
          where: {
            lastLoginAt: { gte: start },
          },
        }),
        this.db.user.count({
          where: {
            createdAt: { gte: start, lte: end },
            isVerified: true,
          },
        }),
      ]);

      return {
        totalUsers,
        newUsers,
        activeUsers,
        verifiedUsers,
        period: { start, end },
      };
    } catch (error) {
      console.error('获取用户统计失败:', error);
      return {
        totalUsers: 0,
        newUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        period: { start, end },
      };
    }
  }

  /**
   * 获取内容统计数据
   *
   * @param options - 查询选项
   * @returns Promise<ContentStatsData> - 内容统计数据
   */
  public async getContentStats(options: QueryOptions = {}) {
    const { start, end } = calculateTimeRange(options.timeRange, options.startDate, options.endDate);

    try {
      const [
        totalPosts,
        newPosts,
        totalComments,
        newComments,
        publicPosts,
      ] = await Promise.all([
        this.db.post.count(),
        this.db.post.count({
          where: {
            createdAt: { gte: start, lte: end },
          },
        }),
        this.db.comment.count(),
        this.db.comment.count({
          where: {
            createdAt: { gte: start, lte: end },
          },
        }),
        this.db.post.count({
          where: {
            isPublic: true,
            publishedAt: { not: null },
          },
        }),
      ]);

      return {
        totalPosts,
        newPosts,
        totalComments,
        newComments,
        publicPosts,
        period: { start, end },
      };
    } catch (error) {
      console.error('获取内容统计失败:', error);
      return {
        totalPosts: 0,
        newPosts: 0,
        totalComments: 0,
        newComments: 0,
        publicPosts: 0,
        period: { start, end },
      };
    }
  }

  /**
   * 获取注册数据详情
   *
   * @param options - 查询选项
   * @returns Promise<RegistrationData[]> - 注册数据列表
   */
  public async getRegistrationData(options: QueryOptions = {}) {
    const { start, end } = calculateTimeRange(options.timeRange, options.startDate, options.endDate);

    try {
      const registrationData = await this.db.user.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        select: {
          id: true,
          createdAt: true,
          userLevel: true,
          isVerified: true,
          lastLoginAt: true,
          postsCount: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return registrationData;
    } catch (error) {
      console.error('获取注册数据失败:', error);
      return [];
    }
  }

  /**
   * 获取按用户等级分组的注册数据
   *
   * @param options - 查询选项
   * @returns Promise<LevelGroupData[]> - 按等级分组的数据
   */
  public async getRegistrationsByLevel(options: QueryOptions = {}) {
    const { start, end } = calculateTimeRange(options.timeRange, options.startDate, options.endDate);

    try {
      const levelData = await this.db.user.groupBy({
        by: ['userLevel'],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: { id: true },
      });

      return levelData.map(item => ({
        level: item.userLevel,
        count: item._count.id,
      }));
    } catch (error) {
      console.error('获取等级分组数据失败:', error);
      return [];
    }
  }

  /**
   * 获取每日注册数据
   *
   * @param options - 查询选项
   * @returns Promise<DailyRegistrationData[]> - 每日注册数据
   */
  public async getDailyRegistrations(options: QueryOptions = {}) {
    const { start, end } = calculateTimeRange(options.timeRange, options.startDate, options.endDate);

    try {
      // 由于Prisma的groupBy限制，我们需要手动处理日期分组
      const registrations = await this.db.user.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        select: {
          createdAt: true,
          isVerified: true,
          lastLoginAt: true,
        },
      });

      // 按日期分组
      const dailyData: Record<string, { registrations: number; verifications: number; activations: number }> = {};

      registrations.forEach(user => {
        const dateKey = user.createdAt.toISOString().split('T')[0];

        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { registrations: 0, verifications: 0, activations: 0 };
        }

        dailyData[dateKey].registrations++;

        if (user.isVerified) {
          dailyData[dateKey].verifications++;
        }

        if (user.lastLoginAt && user.lastLoginAt > start) {
          dailyData[dateKey].activations++;
        }
      });

      return dailyData;
    } catch (error) {
      console.error('获取每日注册数据失败:', error);
      return {};
    }
  }

  /**
   * 获取热门内容
   *
   * @param options - 查询选项
   * @returns Promise<PopularContent[]> - 热门内容列表
   */
  public async getPopularContent(options: QueryOptions = {}) {
    const { start } = calculateTimeRange(options.timeRange, options.startDate, options.endDate);
    const { limit = 10 } = options;

    try {
      const popularPosts = await this.db.post.findMany({
        where: {
          isPublic: true,
          publishedAt: { not: null },
          createdAt: { gte: start },
        },
        orderBy: { likeCount: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          likeCount: true,
          author: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

      return popularPosts.map(post => ({
        id: post.id,
        title: post.title,
        author: post.author.displayName || post.author.username,
        likes: post.likeCount,
        estimatedViews: Math.floor(post.likeCount * 15), // 估算浏览量
      }));
    } catch (error) {
      console.error('获取热门内容失败:', error);
      return [];
    }
  }

  /**
   * 获取上一个时间段的数据（用于对比）
   *
   * @param options - 查询选项
   * @returns Promise<PreviousPeriodData> - 上一时间段数据
   */
  public async getPreviousPeriodData(options: QueryOptions = {}) {
    const { start, end } = calculateTimeRange(options.timeRange, options.startDate, options.endDate);
    const duration = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - duration);
    const previousEnd = start;

    try {
      const [
        previousUsers,
        previousPosts,
        previousComments,
      ] = await Promise.all([
        this.db.user.count({
          where: {
            createdAt: { gte: previousStart, lt: previousEnd },
          },
        }),
        this.db.post.count({
          where: {
            createdAt: { gte: previousStart, lt: previousEnd },
          },
        }),
        this.db.comment.count({
          where: {
            createdAt: { gte: previousStart, lt: previousEnd },
          },
        }),
      ]);

      return {
        users: previousUsers,
        posts: previousPosts,
        comments: previousComments,
        period: { start: previousStart, end: previousEnd },
      };
    } catch (error) {
      console.error('获取上一时间段数据失败:', error);
      return {
        users: 0,
        posts: 0,
        comments: 0,
        period: { start: previousStart, end: previousEnd },
      };
    }
  }

  /**
   * 检查数据库连接状态
   *
   * @returns Promise<boolean> - 连接是否正常
   */
  public async checkConnection(): Promise<boolean> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('数据库连接检查失败:', error);
      return false;
    }
  }
}
