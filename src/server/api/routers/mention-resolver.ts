/**
 * @fileoverview 用户名解析器
 * @description 处理用户名解析和冲突处理
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import {
  type ResolveUsernameInput,
  type ResolveUsernameResult,
  // type UserMentionInfo
  MENTION_CONFIG,
  calculateHeatScore
} from './mention-types';

/**
 * 用户名解析器
 */
export class MentionResolver {
  constructor(private db: PrismaClient) {}

  /**
   * 智能用户名解析 - 处理用户名冲突
   */
  async resolveUsername(input: ResolveUsernameInput): Promise<ResolveUsernameResult> {
    const { username, contextUserId } = input;

    // 1. 首先尝试精确匹配username
    const exactUsernameMatch = await this.findExactUsernameMatch(username);

    // 2. 如果没有精确匹配，尝试displayName匹配
    let displayNameMatches: any[] = [];
    if (!exactUsernameMatch) {
      displayNameMatches = await this.findDisplayNameMatches(username);
    }

    // 3. 模糊搜索相似用户名
    const fuzzyMatches = await this.findFuzzyMatches(username, exactUsernameMatch?.id);

    // 4. 合并和排序建议
    const suggestions = this.mergeSuggestions(
      displayNameMatches,
      fuzzyMatches,
      contextUserId
    );

    return {
      exactMatch: exactUsernameMatch || undefined,
      suggestions,
      hasConflict: !exactUsernameMatch && suggestions.length > 0,
      totalMatches: (exactUsernameMatch ? 1 : 0) + suggestions.length,
    };
  }

  /**
   * 查找精确用户名匹配
   */
  private async findExactUsernameMatch(username: string): Promise<any | null> {
    const user = await this.db.user.findUnique({
      where: {
        username: username,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        userLevel: true,
        isVerified: true,
        // // lastActiveAt: true, // 字段不存在，已注释 // 字段不存在，已注释
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    if (!user) return null;

    // 获取提及统计
    const mentionStats = await this.db.userMentionStats.findUnique({
      where: { userId: user.id },
    });

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      userLevel: user.userLevel,
      isVerified: user.isVerified,
      followerCount: user._count?.followers || 0,
      mentionScore: mentionStats?.heatScore || 0,
      lastActiveAt: new Date(), // 使用当前时间替代不存在的lastActiveAt
    };
  }

  /**
   * 查找显示名称匹配
   */
  private async findDisplayNameMatches(username: string): Promise<any[]> {
    const users = await this.db.user.findMany({
      where: {
        displayName: {
          contains: username,
          mode: 'insensitive',
        },
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        userLevel: true,
        isVerified: true,
        // // lastActiveAt: true, // 字段不存在，已注释 // 字段不存在，已注释
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: MENTION_CONFIG.SUGGESTION_LIMIT,
    });

    return await this.enrichUsersWithMentionStats(users);
  }

  /**
   * 查找模糊匹配
   */
  private async findFuzzyMatches(
    username: string,
    excludeUserId?: string
  ): Promise<any[]> {
    const users = await this.db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                username: {
                  contains: username,
                  mode: 'insensitive',
                },
              },
              {
                username: {
                  startsWith: username,
                  mode: 'insensitive',
                },
              },
            ],
          },
          {
            isActive: true,
          },
          excludeUserId ? {
            id: {
              not: excludeUserId,
            },
          } : {},
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        userLevel: true,
        isVerified: true,
        // // lastActiveAt: true, // 字段不存在，已注释 // 字段不存在，已注释
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: MENTION_CONFIG.SUGGESTION_LIMIT,
    });

    return await this.enrichUsersWithMentionStats(users);
  }

  /**
   * 为用户添加提及统计信息
   */
  private async enrichUsersWithMentionStats(users: any[]): Promise<any[]> {
    const userIds = users.map(user => user.id);

    const mentionStats = await this.db.userMentionStats.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    const statsMap = new Map(mentionStats.map(stat => [stat.userId, stat]));

    return users.map(user => {
      const stats = statsMap.get(user.id);
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        userLevel: user.userLevel,
        isVerified: user.isVerified,
        followerCount: user._count.followers,
        mentionScore: stats?.heatScore || 0,
        lastActiveAt: user.lastActiveAt,
      };
    });
  }

  /**
   * 合并和排序建议
   */
  private mergeSuggestions(
    displayNameMatches: any[],
    fuzzyMatches: any[],
    contextUserId?: string
  ): any[] {
    // 合并所有建议，去重
    const allSuggestions = new Map<string, any>();

    [...displayNameMatches, ...fuzzyMatches].forEach(user => {
      if (!allSuggestions.has(user.id)) {
        allSuggestions.set(user.id, user);
      }
    });

    const suggestions = Array.from(allSuggestions.values());

    // 排序逻辑
    return suggestions.sort((a, b) => {
      // 1. 优先显示已验证用户
      if (a.isVerified !== b.isVerified) {
        return a.isVerified ? -1 : 1;
      }

      // 2. 按用户等级排序（假设等级越高越重要）
      const levelOrder = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];
      const aLevelIndex = levelOrder.indexOf(a.userLevel);
      const bLevelIndex = levelOrder.indexOf(b.userLevel);
      if (aLevelIndex !== bLevelIndex) {
        return bLevelIndex - aLevelIndex;
      }

      // 3. 按提及热度分数排序
      if (a.mentionScore !== b.mentionScore) {
        return b.mentionScore - a.mentionScore;
      }

      // 4. 按关注者数量排序
      if (a.followerCount !== b.followerCount) {
        return b.followerCount - a.followerCount;
      }

      // 5. 按最后活跃时间排序
      if (a.lastActiveAt && b.lastActiveAt) {
        return b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
      }

      // 6. 最后按用户名字母顺序排序
      return a.username.localeCompare(b.username);
    }).slice(0, MENTION_CONFIG.SUGGESTION_LIMIT);
  }

  /**
   * 批量解析用户名
   */
  async batchResolveUsernames(usernames: string[]): Promise<Map<string, any | null>> {
    const results = new Map<string, any | null>();

    // 批量查询所有用户名
    const users = await this.db.user.findMany({
      where: {
        username: {
          in: usernames,
        },
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        userLevel: true,
        isVerified: true,
        // // lastActiveAt: true, // 字段不存在，已注释 // 字段不存在，已注释
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    // 获取提及统计
    const userIds = users.map(user => user.id);
    const mentionStats = await this.db.userMentionStats.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    const statsMap = new Map(mentionStats.map(stat => [stat.userId, stat]));

    // 构建结果映射
    const userMap = new Map(users.map(user => [user.username, user]));

    usernames.forEach(username => {
      const user = userMap.get(username);
      if (user) {
        const stats = statsMap.get(user.id);
        results.set(username, {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          userLevel: user.userLevel,
          isVerified: user.isVerified,
          followerCount: user._count.followers,
          mentionScore: stats?.heatScore || 0,
          lastActiveAt: new Date(), // 使用当前时间替代不存在的lastActiveAt
        });
      } else {
        results.set(username, null);
      }
    });

    return results;
  }

  /**
   * 搜索用户（用于提及建议）
   */
  async searchUsers(query: string, limit: number = 10): Promise<any[]> {
    if (!query || query.length < 1) {
      return [];
    }

    const users = await this.db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                username: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                displayName: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
          {
            isActive: true,
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        userLevel: true,
        isVerified: true,
        // // lastActiveAt: true, // 字段不存在，已注释 // 字段不存在，已注释
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: limit,
      orderBy: [
        { isVerified: 'desc' },
        { lastActiveAt: 'desc' },
      ],
    });

    return await this.enrichUsersWithMentionStats(users);
  }
}
