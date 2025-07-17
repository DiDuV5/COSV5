/**
 * @fileoverview 用户批量查询服务
 * @description 优化用户相关的批量查询，解决N+1问题
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

/**
 * 用户批量查询服务
 */
export class UserBatchService {
  constructor(private db: PrismaClient) {}

  /**
   * 批量获取用户详细信息（包含统计数据）
   */
  async getBatchUserDetails(userIds: string[]): Promise<Map<string, any>> {
    if (userIds.length === 0) {
      return new Map();
    }

    // 去重
    const uniqueUserIds = [...new Set(userIds)];

    // 批量查询用户基本信息
    const users = await this.db.user.findMany({
      where: {
        id: { in: uniqueUserIds },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        userLevel: true,
        isVerified: true,
        isActive: true,
        postsCount: true,
        followersCount: true,
        followingCount: true,
        likeCount: true,
        points: true,
        createdAt: true,
        updatedAt: true,
        // 包含统计信息
        _count: {
          select: {
            posts: {
              where: {
                publishedAt: { not: null },
                isPublic: true,
              },
            },
            following: true,
            followers: true,
            likes: true,
          },
        },
      },
    });

    // 转换为Map
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, {
        ...user,
        // 合并计数字段和_count字段
        actualPostsCount: user._count.posts,
        actualFollowersCount: user._count.followers,
        actualFollowingCount: user._count.following,
        actualLikeCount: user._count.likes,
      });
    });

    return userMap;
  }

  /**
   * 批量获取用户关注状态
   */
  async getBatchFollowStatus(
    currentUserId: string,
    targetUserIds: string[]
  ): Promise<Map<string, boolean>> {
    if (!currentUserId || targetUserIds.length === 0) {
      return new Map();
    }

    const follows = await this.db.follow.findMany({
      where: {
        followerId: currentUserId,
        followingId: { in: targetUserIds },
      },
      select: {
        followingId: true,
      },
    });

    const followMap = new Map();
    targetUserIds.forEach(id => {
      followMap.set(id, false);
    });
    follows.forEach(follow => {
      followMap.set(follow.followingId, true);
    });

    return followMap;
  }

  /**
   * 批量获取用户最新帖子
   */
  async getBatchUserLatestPosts(
    userIds: string[],
    limit: number = 3
  ): Promise<Map<string, any[]>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const posts = await this.db.post.findMany({
      where: {
        authorId: { in: userIds },
        isPublic: true,
        publishedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        coverImage: true,
        contentType: true,
        authorId: true,
        publishedAt: true,
        likeCount: true,
        viewCount: true,
        commentCount: true,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: userIds.length * limit,
    });

    // 按用户分组
    const postsByUser = new Map<string, any[]>();
    userIds.forEach(userId => {
      postsByUser.set(userId, []);
    });

    posts.forEach(post => {
      const userPosts = postsByUser.get(post.authorId) || [];
      if (userPosts.length < limit) {
        userPosts.push(post);
        postsByUser.set(post.authorId, userPosts);
      }
    });

    return postsByUser;
  }

  /**
   * 批量获取用户社交链接
   */
  async getBatchUserSocialLinks(userIds: string[]): Promise<Map<string, any[]>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const socialLinks = await this.db.userSocialLink.findMany({
      where: {
        userId: { in: userIds },
      },
      select: {
        id: true,
        userId: true,
        platform: true,
        url: true,
        isPublic: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 按用户分组
    const linksByUser = new Map<string, any[]>();
    userIds.forEach(userId => {
      linksByUser.set(userId, []);
    });

    socialLinks.forEach(link => {
      const userLinks = linksByUser.get(link.userId) || [];
      userLinks.push(link);
      linksByUser.set(link.userId, userLinks);
    });

    return linksByUser;
  }

  /**
   * 优化的用户列表查询（解决N+1问题）
   */
  async getOptimizedUserList(params: {
    limit: number;
    cursor?: string;
    search?: string;
    userLevel?: string;
    includeStats?: boolean;
    includeLatestPosts?: boolean;
    currentUserId?: string;
  }): Promise<{
    users: any[];
    nextCursor?: string;
  }> {
    const { limit, cursor, search, userLevel, includeStats, includeLatestPosts, currentUserId } = params;

    // 基础查询
    const users = await this.db.user.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        isActive: true,
        ...(search && {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(userLevel && { userLevel }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        userLevel: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 处理分页
    let nextCursor: string | undefined;
    if (users.length > limit) {
      const nextItem = users.pop();
      nextCursor = nextItem!.id;
    }

    const userIds = users.map(user => user.id);

    // 并行获取额外数据
    const [
      userDetailsMap,
      followStatusMap,
      latestPostsMap,
    ] = await Promise.all([
      includeStats ? this.getBatchUserDetails(userIds) : Promise.resolve(new Map()),
      currentUserId ? this.getBatchFollowStatus(currentUserId, userIds) : Promise.resolve(new Map()),
      includeLatestPosts ? this.getBatchUserLatestPosts(userIds, 3) : Promise.resolve(new Map()),
    ]);

    // 组装最终结果
    const enrichedUsers = users.map(user => ({
      ...user,
      ...(includeStats && userDetailsMap.has(user.id) ? {
        postsCount: userDetailsMap.get(user.id).actualPostsCount,
        followersCount: userDetailsMap.get(user.id).actualFollowersCount,
        followingCount: userDetailsMap.get(user.id).actualFollowingCount,
        likeCount: userDetailsMap.get(user.id).actualLikeCount,
      } : {}),
      ...(currentUserId ? {
        isFollowing: followStatusMap.get(user.id) || false,
      } : {}),
      ...(includeLatestPosts ? {
        latestPosts: latestPostsMap.get(user.id) || [],
      } : {}),
    }));

    return {
      users: enrichedUsers,
      nextCursor,
    };
  }
}
