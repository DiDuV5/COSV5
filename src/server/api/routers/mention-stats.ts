/**
 * @fileoverview 提及统计器
 * @description 处理提及统计、排行榜和历史记录
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import {
  type RecordMentionStatsInput,
  type GetUserMentionStatsInput,
  type UserMentionStatsResult,
  type GetTopMentionedUsersInput,
  type TopMentionedUsersResult,
  type GetUserMentionHistoryInput,
  type UserMentionHistoryResult,
  // type TopMentioner,
  // type TopMentionedUser,
  // type MentionHistoryItem,
  type TimePeriod,
  type MentionType,
  // type ResolvedBy,
  calculateHeatScore
} from './mention-types';

/**
 * 提及统计器
 */
export class MentionStats {
  constructor(private db: PrismaClient) {}

  /**
   * 记录用户提及统计
   */
  async recordMentionStats(input: RecordMentionStatsInput, mentionerUserId: string): Promise<void> {
    const { mentionedUserId, contentType, contentId, mentionText, resolvedBy, position } = input;

    try {
      // 1. 记录提及
      const mentionRecord = await this.db.mentionRecord.create({
        data: {
          mentionerUserId,
          mentionedUserId,
          contentType,
          contentId,
          mentionText,
          resolvedBy,
          position,
        },
      });

      // 2. 更新用户提及统计
      await this.updateUserMentionStats(mentionedUserId, mentionerUserId);

      // 3. 更新热度分数
      await this.updateHeatScore(mentionedUserId);

      console.log(`✅ 记录提及统计成功: ${mentionRecord.id}`);
    } catch (error) {
      console.error('❌ 记录提及统计失败:', error);
      throw new Error(`记录提及统计失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取用户提及统计
   */
  async getUserMentionStats(input: GetUserMentionStatsInput): Promise<UserMentionStatsResult> {
    const { userId } = input;

    const stats = await this.db.userMentionStats.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!stats) {
      // 如果没有统计记录，返回默认值
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      return {
        userId,
        totalMentions: 0,
        weeklyMentions: 0,
        monthlyMentions: 0,
        heatScore: 0,
        averagePosition: 0,
        topMentioners: [],
        user: {
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
      };
    }

    // 获取顶级提及者
    const topMentioners = await this.getTopMentioners(userId);

    return {
      userId: stats.userId,
      totalMentions: stats.totalMentions,
      weeklyMentions: stats.weeklyMentions,
      monthlyMentions: stats.monthlyMentions,
      heatScore: stats.heatScore,
      averagePosition: stats.averagePosition,
      topMentioners,
      user: {
        username: stats.user.username,
        displayName: stats.user.displayName,
        avatarUrl: stats.user.avatarUrl,
      },
    };
  }

  /**
   * 获取热门被提及用户排行榜
   */
  async getTopMentionedUsers(input: GetTopMentionedUsersInput): Promise<TopMentionedUsersResult> {
    const { period, limit } = input;

    let orderBy: any = { heatScore: 'desc' };

    if (period === 'week') {
      orderBy = { weeklyMentions: 'desc' };
    } else if (period === 'month') {
      orderBy = { monthlyMentions: 'desc' };
    }

    const stats = await this.db.userMentionStats.findMany({
      where: {
        // 只显示有被提及记录的用户
        totalMentions: { gt: 0 },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            userLevel: true,
          },
        },
      },
      orderBy,
      take: limit,
    });

    const users: any[] = stats.map((stat: any, index: any) => ({
      id: stat.user.id,
      username: stat.user.username,
      displayName: stat.user.displayName,
      avatarUrl: stat.user.avatarUrl,
      userLevel: stat.user.userLevel,
      totalMentions: stat.totalMentions,
      weeklyMentions: stat.weeklyMentions,
      monthlyMentions: stat.monthlyMentions,
      heatScore: stat.heatScore,
      rank: index + 1,
    }));

    return {
      users,
      period,
      totalUsers: users.length,
    };
  }

  /**
   * 获取用户提及历史
   */
  async getUserMentionHistory(
    input: GetUserMentionHistoryInput
  ): Promise<UserMentionHistoryResult> {
    const { userId, limit, cursor } = input;

    const mentions = await this.db.mentionRecord.findMany({
      where: { mentionedUserId: userId },
      include: {
        mentioner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const hasMore = mentions.length > limit;
    const items = hasMore ? mentions.slice(0, -1) : mentions;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    // 获取总数
    const totalCount = await this.db.mentionRecord.count({
      where: { mentionedUserId: userId },
    });

    const mentionHistory: any[] = items.map((mention: any) => ({
      id: mention.id,
      mentioner: {
        id: mention.mentioner?.id,
        username: mention.mentioner?.username,
        displayName: mention.mentioner?.displayName,
        avatarUrl: mention.mentioner?.avatarUrl,
      },
      contentType: mention.contentType as MentionType,
      contentId: mention.contentId,
      mentionText: mention.mentionText,
      resolvedBy: mention.resolvedBy as any,
      position: mention.position,
      createdAt: mention.createdAt,
    }));

    return {
      mentions: mentionHistory,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * 更新用户提及统计
   */
  private async updateUserMentionStats(
    mentionedUserId: string,
    mentionerUserId: string
  ): Promise<void> {
    // 更新被提及者统计
    await this.db.userMentionStats.upsert({
      where: { userId: mentionedUserId },
      update: {
        totalMentions: { increment: 1 },
        weeklyMentions: { increment: 1 },
        monthlyMentions: { increment: 1 },
        lastMentionAt: new Date(),
      },
      create: {
        userId: mentionedUserId,
        totalMentions: 1,
        weeklyMentions: 1,
        monthlyMentions: 1,
        heatScore: 1,
        averagePosition: 0,
        lastMentionAt: new Date(),
      },
    });

    // 更新提及者统计
    await this.db.userMentionStats.upsert({
      where: { userId: mentionerUserId },
      update: {
        totalMentions: { increment: 1 },
      },
      create: {
        userId: mentionerUserId,
        totalMentions: 1,
        weeklyMentions: 0,
        monthlyMentions: 0,
        heatScore: 0,
        averagePosition: 0,
      },
    });
  }

  /**
   * 更新热度分数
   */
  private async updateHeatScore(userId: string): Promise<void> {
    const stats = await this.db.userMentionStats.findUnique({
      where: { userId },
    });

    if (!stats) return;

    const newHeatScore = calculateHeatScore(
      stats.totalMentions,
      stats.weeklyMentions,
      stats.monthlyMentions,
      stats.lastMentionAt || undefined
    );

    await this.db.userMentionStats.update({
      where: { userId },
      data: { heatScore: newHeatScore },
    });
  }

  /**
   * 获取顶级提及者
   */
  private async getTopMentioners(userId: string): Promise<any[]> {
    const topMentioners = await this.db.mentionRecord.groupBy({
      by: ['mentionerUserId'],
      where: { mentionedUserId: userId },
      _count: { mentionerUserId: true },
      orderBy: { _count: { mentionerUserId: 'desc' } },
      take: 5,
    });

    const mentionerIds = topMentioners.map((item: any) => item.mentionerUserId).filter((id: any) => id !== null);
    const mentioners = await this.db.user.findMany({
      where: { id: { in: mentionerIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const mentionerMap = new Map(mentioners.map(m => [m.id, m]));

    return topMentioners.map((item: any) => {
      const mentioner = mentionerMap.get(item.mentionerUserId || '');
      return {
        id: item.mentionerUserId || '',
        username: mentioner?.username || 'unknown',
        displayName: mentioner?.displayName || null,
        avatarUrl: mentioner?.avatarUrl || null,
        mentionCount: item._count.mentionerUserId,
      };
    });
  }

  /**
   * 重置周统计（定时任务）
   */
  async resetWeeklyStats(): Promise<number> {
    const result = await this.db.userMentionStats.updateMany({
      data: { weeklyMentions: 0 },
    });

    console.log(`🔄 重置周统计: ${result.count} 条记录`);
    return result.count;
  }

  /**
   * 重置月统计（定时任务）
   */
  async resetMonthlyStats(): Promise<number> {
    const result = await this.db.userMentionStats.updateMany({
      data: { monthlyMentions: 0 },
    });

    console.log(`🔄 重置月统计: ${result.count} 条记录`);
    return result.count;
  }

  /**
   * 批量更新热度分数（定时任务）
   */
  async batchUpdateHeatScores(): Promise<number> {
    const allStats = await this.db.userMentionStats.findMany();
    let updated = 0;

    for (const stats of allStats) {
      const newHeatScore = calculateHeatScore(
        stats.totalMentions,
        stats.weeklyMentions,
        stats.monthlyMentions,
        stats.lastMentionAt || undefined
      );

      if (newHeatScore !== stats.heatScore) {
        await this.db.userMentionStats.update({
          where: { userId: stats.userId },
          data: { heatScore: newHeatScore },
        });
        updated++;
      }
    }

    console.log(`🔄 批量更新热度分数: ${updated} 条记录`);
    return updated;
  }

  /**
   * 获取提及趋势数据
   */
  async getMentionTrends(
    userId: string,
    days: number = 30
  ): Promise<Array<{ date: string; mentions: number }>> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const mentions = await this.db.mentionRecord.findMany({
      where: {
        mentionedUserId: userId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // 按日期分组统计
    const trendMap = new Map<string, number>();

    // 初始化所有日期为0
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      trendMap.set(dateStr, 0);
    }

    // 统计实际提及数
    mentions.forEach(mention => {
      const dateStr = mention.createdAt.toISOString().split('T')[0];
      const current = trendMap.get(dateStr) || 0;
      trendMap.set(dateStr, current + 1);
    });

    // 转换为数组格式
    return Array.from(trendMap.entries()).map(([date, mentions]) => ({
      date,
      mentions,
    }));
  }

  /**
   * 获取提及类型分布
   */
  async getMentionTypeDistribution(userId: string): Promise<
    Array<{
      type: MentionType;
      count: number;
      percentage: number;
    }>
  > {
    const distribution = await this.db.mentionRecord.groupBy({
      by: ['contentType'],
      where: { mentionedUserId: userId },
      _count: { contentType: true },
    });

    const total = distribution.reduce((sum, item) => sum + item._count.contentType, 0);

    return distribution.map(item => ({
      type: item.contentType as MentionType,
      count: item._count.contentType,
      percentage: total > 0 ? Math.round((item._count.contentType / total) * 100) : 0,
    }));
  }

  /**
   * 清理过期的提及记录
   */
  async cleanupOldMentionRecords(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.db.mentionRecord.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`🧹 清理过期提及记录: ${result.count} 条记录`);
    return result.count;
  }
}
