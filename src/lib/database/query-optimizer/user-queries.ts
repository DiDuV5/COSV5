/**
 * @fileoverview 用户查询优化器
 * @description 提供用户相关的优化查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { QueryCacheManager } from './cache';
import { OPTIMIZED_USER_SELECT, CACHE_KEYS, CACHE_TAGS, CACHE_TTL } from './types';

/**
 * 用户查询优化器
 */
export class UserQueryOptimizer {
  private db: PrismaClient;
  private cache: QueryCacheManager;

  constructor(db: PrismaClient, cache: QueryCacheManager) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * 优化的用户信息查询
   */
  async getUserInfo(userId: string): Promise<any | null> {
    // 尝试从缓存获取
    const cached = await this.cache.getUserInfoCache(userId);
    if (cached) {
      return cached;
    }

    // 从数据库查询
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: OPTIMIZED_USER_SELECT,
    });

    if (user) {
      // 缓存结果
      await this.cache.cacheUserInfo(userId, user);
    }

    return user;
  }

  /**
   * 优化的用户权限查询
   */
  async getUserPermissions(userId: string): Promise<any | null> {
    // 尝试从缓存获取
    const cached = await this.cache.getUserPermissionsCache(userId);
    if (cached) {
      return cached;
    }

    // 从数据库查询用户等级
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { userLevel: true },
    });

    if (!user) {
      return null;
    }

    // 查询权限配置
    const permissions = await this.db.userPermissionConfig.findUnique({
      where: { userLevel: user.userLevel },
    });

    if (permissions) {
      // 缓存结果
      await this.cache.cacheUserPermissions(userId, permissions);
    }

    return permissions;
  }

  /**
   * 批量获取用户信息（优化N+1查询）
   */
  async getBatchUserInfo(userIds: string[]): Promise<Map<string, any>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const userMap = new Map<string, any>();
    const uncachedUserIds: string[] = [];

    // 先从缓存中获取
    for (const userId of userIds) {
      const cached = await this.cache.getUserInfoCache(userId);
      if (cached) {
        userMap.set(userId, cached);
      } else {
        uncachedUserIds.push(userId);
      }
    }

    // 批量查询未缓存的用户
    if (uncachedUserIds.length > 0) {
      const users = await this.db.user.findMany({
        where: {
          id: { in: uncachedUserIds },
        },
        select: OPTIMIZED_USER_SELECT,
      });

      // 添加到结果Map并缓存
      for (const user of users) {
        userMap.set(user.id, user);
        await this.cache.cacheUserInfo(user.id, user);
      }
    }

    return userMap;
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(userId: string): Promise<any | null> {
    const cacheKey = `user:stats:${userId}`;

    // 尝试从缓存获取
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 从数据库查询
    const stats = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (stats) {
      // 缓存结果（较短的TTL，因为统计数据变化频繁）
      await this.cache.set(cacheKey, stats, {
        ttl: CACHE_TTL.SHORT,
        tags: [CACHE_TAGS.USER],
      });
    }

    return stats;
  }

  /**
   * 获取用户关注列表
   */
  async getUserFollowing(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{
    following: any[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const cacheKey = `user:following:${userId}:${limit}:${cursor || 'start'}`;

    // 尝试从缓存获取
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return (cached as any) || { following: [], hasMore: false };
    }

    // 从数据库查询
    const following = await this.db.follow.findMany({
      where: { followerId: userId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        following: {
          select: OPTIMIZED_USER_SELECT,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 处理分页
    let nextCursor: string | undefined;
    if (following.length > limit) {
      const nextItem = following.pop();
      nextCursor = nextItem!.id;
    }

    const result = {
      following: following.map(f => f.following),
      nextCursor,
      hasMore: !!nextCursor,
    };

    // 缓存结果
    await this.cache.set(cacheKey, result, {
      ttl: CACHE_TTL.USER_INFO,
      tags: [CACHE_TAGS.USER],
    });

    return result;
  }

  /**
   * 获取用户粉丝列表
   */
  async getUserFollowers(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{
    followers: any[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const cacheKey = `user:followers:${userId}:${limit}:${cursor || 'start'}`;

    // 尝试从缓存获取
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return (cached as any) || { followers: [], hasMore: false };
    }

    // 从数据库查询
    const followers = await this.db.follow.findMany({
      where: { followingId: userId },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        follower: {
          select: OPTIMIZED_USER_SELECT,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 处理分页
    let nextCursor: string | undefined;
    if (followers.length > limit) {
      const nextItem = followers.pop();
      nextCursor = nextItem!.id;
    }

    const result = {
      followers: followers.map(f => f.follower),
      nextCursor,
      hasMore: !!nextCursor,
    };

    // 缓存结果
    await this.cache.set(cacheKey, result, {
      ttl: CACHE_TTL.USER_INFO,
      tags: [CACHE_TAGS.USER],
    });

    return result;
  }

  /**
   * 检查用户关注关系
   */
  async checkFollowRelation(followerId: string, followingId: string): Promise<boolean> {
    const cacheKey = `follow:${followerId}:${followingId}`;

    // 尝试从缓存获取
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // 从数据库查询
    const follow = await this.db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    const isFollowing = !!follow;

    // 缓存结果
    await this.cache.set(cacheKey, isFollowing, {
      ttl: CACHE_TTL.USER_INFO,
      tags: [CACHE_TAGS.USER],
    });

    return isFollowing;
  }

  /**
   * 搜索用户
   */
  async searchUsers(
    query: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{
    users: any[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    // 搜索结果通常不缓存，因为查询条件变化很大
    const users = await this.db.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      select: OPTIMIZED_USER_SELECT,
      orderBy: [
        { isVerified: 'desc' },
        { userLevel: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // 处理分页
    let nextCursor: string | undefined;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem!.id;
    }

    return {
      users,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  /**
   * 清理用户缓存
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.invalidateUserCache(userId);
  }
}
