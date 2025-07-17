/**
 * @fileoverview 用户数据访问层
 * @description 提供用户相关的数据访问方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient, User, Prisma } from '@prisma/client';
import { BaseRepository, QueryOptions, PaginatedResult, PaginationParams } from './base-repository';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/cache-keys';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 用户创建输入类型
 */
export type UserCreateInput = Prisma.UserCreateInput;

/**
 * 用户更新输入类型
 */
export type UserUpdateInput = Prisma.UserUpdateInput;

/**
 * 用户查询条件类型
 */
export type UserWhereInput = Prisma.UserWhereInput;

/**
 * 用户选择字段类型
 */
export interface UserSelectOptions {
  includePrivate?: boolean;
  includeStats?: boolean;
  includeRelations?: boolean;
}

/**
 * 用户搜索参数
 */
export interface UserSearchParams {
  query?: string;
  userLevel?: string;
  isVerified?: boolean;
  isActive?: boolean;
  sortBy?: 'username' | 'createdAt' | 'postsCount' | 'followersCount';
  sortDirection?: 'asc' | 'desc';
}

/**
 * 用户统计信息
 */
export interface UserStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  likeCount: number;
  points: number;
}

/**
 * 用户Repository类
 */
export class UserRepository extends BaseRepository<User, UserCreateInput, UserUpdateInput, UserWhereInput> {
  constructor(db: PrismaClient) {
    super(db, 'user');
    this.defaultCacheTTL = CACHE_TTL.USER_PROFILE;
  }

  /**
   * 获取用户模型
   */
  protected getModel() {
    return this.db.user;
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string, options: QueryOptions = {}): Promise<User | null> {
    const cacheKey = CACHE_KEYS.USER.PROFILE(`username:${username}`);

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<User>(cacheKey);
      if (cached) return cached;
    }

    try {
      const user = await this.db.user.findUnique({
        where: { username },
      });

      // 设置缓存
      if (user && options.cache !== false) {
        await this.setCache(cacheKey, user, options.cacheTTL);
      }

      return user;
    } catch (error) {
      this.handleError(error, 'findByUsername');
      throw error;
    }
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string, options: QueryOptions = {}): Promise<User | null> {
    try {
      const user = await this.db.user.findFirst({
        where: { email },
      });

      return user;
    } catch (error) {
      this.handleError(error, 'findByEmail');
      throw error;
    }
  }

  /**
   * 获取用户详细信息（包含统计）
   */
  async findByIdWithStats(id: string, options: QueryOptions = {}): Promise<User & { stats: UserStats } | null> {
    const cacheKey = CACHE_KEYS.USER.STATS(id);

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<User & { stats: UserStats }>(cacheKey);
      if (cached) return cached;
    }

    try {
      const user = await this.db.user.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              posts: {
                where: {
                  publishedAt: { not: null },
                  isPublic: true,
                },
              },
              followers: true,
              following: true,
              likes: true,
            },
          },
        },
      });

      if (!user) return null;

      const result = {
        ...user,
        stats: {
          postsCount: user._count.posts,
          followersCount: user._count.followers,
          followingCount: user._count.following,
          likeCount: user._count.likes,
          points: user.points || 0,
        },
      };

      // 设置缓存
      if (options.cache !== false) {
        await this.setCache(cacheKey, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'findByIdWithStats');
      throw error;
    }
  }

  /**
   * 搜索用户
   */
  async searchUsers(
    params: UserSearchParams,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<User>> {
    const { query, userLevel, isVerified, isActive, sortBy = 'createdAt', sortDirection = 'desc' } = params;

    // 构建查询条件
    const where: UserWhereInput = {
      isActive: isActive !== undefined ? isActive : true,
      ...(isVerified !== undefined && { isVerified }),
      ...(userLevel && { userLevel }),
      ...(query && {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      }),
    };

    // 构建排序条件
    const orderBy: any = {};
    orderBy[sortBy] = sortDirection;

    return this.findManyPaginated(where, pagination, {
      ...options,
      orderBy,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        userLevel: true,
        isVerified: true,
        isActive: true,
        postsCount: true,
        followersCount: true,
        followingCount: true,
        createdAt: true,
      },
    });
  }

  /**
   * 获取用户关注列表
   */
  async getFollowing(
    userId: string,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<User>> {
    const cacheKey = CACHE_KEYS.USER.FOLLOWING(userId);

    try {
      const follows = await this.db.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              userLevel: true,
              isVerified: true,
              isActive: true,
              followersCount: true,
              postsCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: (pagination.limit || 20) + 1,
        skip: pagination.cursor ? 1 : ((pagination.page || 1) - 1) * (pagination.limit || 20),
        ...(pagination.cursor && { cursor: { id: pagination.cursor } }),
      });

      const hasMore = follows.length > (pagination.limit || 20);
      if (hasMore) follows.pop();

      const items = follows.map(follow => follow.following);
      const nextCursor = hasMore && follows.length > 0 ? follows[follows.length - 1].id : undefined;

      return {
        items: items as any,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'getFollowing');
      throw error;
    }
  }

  /**
   * 获取用户粉丝列表
   */
  async getFollowers(
    userId: string,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<User>> {
    try {
      const follows = await this.db.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              userLevel: true,
              isVerified: true,
              isActive: true,
              followersCount: true,
              postsCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: (pagination.limit || 20) + 1,
        skip: pagination.cursor ? 1 : ((pagination.page || 1) - 1) * (pagination.limit || 20),
        ...(pagination.cursor && { cursor: { id: pagination.cursor } }),
      });

      const hasMore = follows.length > (pagination.limit || 20);
      if (hasMore) follows.pop();

      const items = follows.map(follow => follow.follower);
      const nextCursor = hasMore && follows.length > 0 ? follows[follows.length - 1].id : undefined;

      return {
        items: items as any,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'getFollowers');
      throw error;
    }
  }

  /**
   * 检查用户是否关注另一个用户
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await this.db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      return !!follow;
    } catch (error) {
      this.handleError(error, 'isFollowing');
      throw error;
    }
  }

  /**
   * 更新用户统计信息
   */
  async updateStats(userId: string, stats: Partial<UserStats>): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id: userId },
        data: {
          ...stats,
          updatedAt: new Date(),
        },
      });

      // 清除相关缓存
      await this.deleteCache(`user:*:${userId}`);

      return user;
    } catch (error) {
      this.handleError(error, 'updateStats');
      throw error;
    }
  }

  /**
   * 批量获取用户信息
   */
  async findManyByIds(ids: string[], options: QueryOptions = {}): Promise<User[]> {
    if (ids.length === 0) return [];

    try {
      const users = await this.db.user.findMany({
        where: {
          id: { in: ids },
          isActive: true,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          userLevel: true,
          isVerified: true,
          isActive: true,
        },
        orderBy: { username: 'asc' },
      });

      return users as any;
    } catch (error) {
      this.handleError(error, 'findManyByIds');
      throw error;
    }
  }

  /**
   * 获取推荐用户
   */
  async getRecommendedUsers(
    currentUserId?: string,
    limit: number = 10,
    options: QueryOptions = {}
  ): Promise<User[]> {
    const cacheKey = CACHE_KEYS.RECOMMENDATION.USERS(currentUserId || 'anonymous');

    // 尝试从缓存获取
    if (options.cache !== false) {
      const cached = await this.getFromCache<User[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      // 获取活跃且已验证的用户，按关注者数量排序
      const users = await this.db.user.findMany({
        where: {
          isActive: true,
          isVerified: true,
          ...(currentUserId && { id: { not: currentUserId } }),
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          userLevel: true,
          isVerified: true,
          followersCount: true,
          postsCount: true,
        },
        orderBy: [
          { followersCount: 'desc' },
          { postsCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      // 设置缓存
      if (options.cache !== false) {
        await this.setCache(cacheKey, users, CACHE_TTL.RECOMMENDATIONS);
      }

      return users as any;
    } catch (error) {
      this.handleError(error, 'getRecommendedUsers');
      throw error;
    }
  }
}
