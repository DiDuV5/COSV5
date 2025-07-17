/**
 * @fileoverview 用户查询服务
 * @description 处理用户的查询操作，包括列表查询、详情查询等
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 用户查询参数接口
 */
export interface UserQueryParams {
  limit?: number;
  cursor?: string;
  search?: string;
  userLevel?: string;
  isActive?: boolean;
  isVerified?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 用户查询结果接口
 */
export interface UserQueryResult {
  users: any[];
  nextCursor?: string;
  totalCount?: number;
}

/**
 * 用户详情接口
 */
export interface UserDetail {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  userLevel: string;
  isActive: boolean;
  isVerified: boolean;
  canPublish: boolean;
  createdAt: Date;
  updatedAt: Date;
  posts: any[];
  socialLinks: any[];
  _count: {
    posts: number;
    comments: number;
    likes: number;
    following: number;
    followers: number;
  };
}

/**
 * 用户查询服务类
 */
export class UserQueryService {
  constructor(private db: PrismaClient) {}

  /**
   * 获取用户列表
   */
  async getUsers(params: UserQueryParams): Promise<UserQueryResult> {
    const {
      limit = 20,
      cursor,
      search,
      userLevel,
      isActive,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // 构建查询条件
    const where = this.buildWhereCondition({ search, userLevel, isActive, isVerified });

    // 构建排序条件
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const users = await this.db.user.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        userLevel: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
            following: true,
            followers: true,
          },
        },
      },
      orderBy,
    });

    return this.formatQueryResult(users, limit);
  }

  /**
   * 根据ID获取用户详情
   */
  async getUserById(userId: string): Promise<UserDetail> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            contentType: true,
            visibility: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        socialLinks: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
            following: true,
            followers: true,
          },
        },
      },
    });

    TRPCErrorHandler.requireResource(user, '用户', userId);

    return user as UserDetail;
  }

  /**
   * 搜索用户
   */
  async searchUsers(params: {
    query: string;
    limit?: number;
    userLevel?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const { query, limit = 20, userLevel, isActive } = params;

    const where: any = {
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (userLevel) {
      where.userLevel = userLevel;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.db.user.findMany({
      take: limit,
      where,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        userLevel: true,
        isActive: true,
        isVerified: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    usersByLevel: Record<string, number>;
  }> {
    const [totalUsers, activeUsers, verifiedUsers, usersByLevel] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { isActive: true } }),
      this.db.user.count({ where: { isVerified: true } }),
      this.db.user.groupBy({
        by: ['userLevel'],
        _count: { userLevel: true },
      }),
    ]);

    const levelStats: Record<string, number> = {};
    usersByLevel.forEach(stat => {
      levelStats[stat.userLevel] = stat._count.userLevel;
    });

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      usersByLevel: levelStats,
    };
  }

  /**
   * 获取用户活动统计
   */
  async getUserActivity(params: {
    userId: string;
    timeRange?: '7d' | '30d' | '90d';
  }): Promise<{
    postsCount: number;
    commentsCount: number;
    likesCount: number;
    lastActiveAt?: Date;
  }> {
    const { userId, timeRange = '30d' } = params;

    const now = new Date();
    const ranges = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    };

    const startDate = ranges[timeRange];

    const [postsCount, commentsCount, likesCount] = await Promise.all([
      this.db.post.count({
        where: {
          authorId: userId,
          createdAt: { gte: startDate },
        },
      }),
      this.db.comment.count({
        where: {
          authorId: userId,
          createdAt: { gte: startDate },
        },
      }),
      this.db.like.count({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // 获取最后活动时间（最近的Post、Comment或Like）
    const lastPost = await this.db.post.findFirst({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const lastComment = await this.db.comment.findFirst({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const lastLike = await this.db.like.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const lastActiveAt = [lastPost?.createdAt, lastComment?.createdAt, lastLike?.createdAt]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    return {
      postsCount,
      commentsCount,
      likesCount,
      lastActiveAt,
    };
  }

  /**
   * 构建查询条件
   */
  private buildWhereCondition(params: {
    search?: string;
    userLevel?: string;
    isActive?: boolean;
    isVerified?: boolean;
  }) {
    const { search, userLevel, isActive, isVerified } = params;
    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { displayName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (userLevel) {
      where.userLevel = userLevel;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    return where;
  }

  /**
   * 构建排序条件
   */
  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
    const validSortFields = ['createdAt', 'updatedAt', 'username', 'email', 'userLevel'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    return { [field]: sortOrder };
  }

  /**
   * 格式化查询结果
   */
  private formatQueryResult(users: any[], limit: number): UserQueryResult {
    let nextCursor: string | undefined = undefined;

    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem!.id;
    }

    return {
      users,
      nextCursor,
    };
  }
}

/**
 * 导出服务创建函数
 */
export const createUserQueryService = (db: PrismaClient) => new UserQueryService(db);
