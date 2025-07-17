/**
 * @fileoverview 提及管理器
 * @description 处理提及的查询、标记已读、删除等管理操作
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import type {
  GetUserMentionsInput,
  UserMentionsResult,
  // UserMentionDetail,
  MarkAsReadInput,
  DeleteMentionInput
} from './mention-types';

/**
 * 提及管理器
 */
export class MentionManager {
  constructor(private db: PrismaClient) {}

  /**
   * 获取用户收到的提及
   */
  async getUserMentions(
    input: GetUserMentionsInput,
    userId: string
  ): Promise<UserMentionsResult> {
    const { limit, cursor, isRead, mentionType } = input;

    const mentions = await this.db.userMention.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        mentionedId: userId,
        ...(isRead !== undefined && { isRead }),
        ...(mentionType && { mentionType }),
      },
      include: {
        mentioner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = mentions.length > limit;
    const items = hasMore ? mentions.slice(0, -1) : mentions;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    // 获取总数
    const totalCount = await this.db.userMention.count({
      where: {
        mentionedId: userId,
        ...(isRead !== undefined && { isRead }),
        ...(mentionType && { mentionType }),
      },
    });

    const mentionDetails: any[] = items.map((mention: any) => ({
      id: mention.id,
      mentioner: {
        id: mention.mentioner.id,
        username: mention.mentioner.username,
        displayName: mention.mentioner.displayName,
        avatarUrl: mention.mentioner.avatarUrl,
      },
      post: mention.post ? {
        id: mention.post.id,
        title: mention.post.title,
        content: mention.post.content,
      } : undefined,
      comment: mention.comment ? {
        id: mention.comment.id,
        content: mention.comment.content,
      } : undefined,
      mentionType: mention.mentionType as any,
      isRead: mention.isRead,
      createdAt: mention.createdAt,
    }));

    return {
      mentions: mentionDetails,
      nextCursor,
      hasMore,
      totalCount,
    };
  }

  /**
   * 标记提及为已读
   */
  async markAsRead(input: MarkAsReadInput, userId: string): Promise<number> {
    const { mentionIds, markAll } = input;

    if (markAll) {
      // 标记所有未读提及为已读
      const result = await this.db.userMention.updateMany({
        where: {
          mentionedId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return result.count;
    } else if (mentionIds && mentionIds.length > 0) {
      // 标记指定的提及为已读
      const result = await this.db.userMention.updateMany({
        where: {
          id: {
            in: mentionIds,
          },
          mentionedId: userId, // 确保只能标记自己的提及
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return result.count;
    }

    return 0;
  }

  /**
   * 获取未读提及数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.db.userMention.count({
      where: {
        mentionedId: userId,
        isRead: false,
      },
    });
  }

  /**
   * 删除提及记录
   */
  async deleteMention(input: DeleteMentionInput, userId: string): Promise<boolean> {
    const { mentionId } = input;

    // 只能删除自己收到的提及
    const mention = await this.db.userMention.findFirst({
      where: {
        id: mentionId,
        mentionedId: userId,
      },
    });

    if (!mention) {
      throw new Error('提及记录不存在或无权限删除');
    }

    await this.db.userMention.delete({
      where: { id: mentionId },
    });

    return true;
  }

  /**
   * 批量删除提及
   */
  async batchDeleteMentions(mentionIds: string[], userId: string): Promise<number> {
    // 验证所有提及都属于当前用户
    const validMentions = await this.db.userMention.findMany({
      where: {
        id: {
          in: mentionIds,
        },
        mentionedId: userId,
      },
      select: { id: true },
    });

    const validIds = validMentions.map(m => m.id);

    if (validIds.length === 0) {
      return 0;
    }

    const result = await this.db.userMention.deleteMany({
      where: {
        id: {
          in: validIds,
        },
      },
    });

    return result.count;
  }

  /**
   * 获取提及统计信息
   */
  async getMentionSummary(userId: string): Promise<{
    totalReceived: number;
    unreadCount: number;
    todayReceived: number;
    weeklyReceived: number;
    monthlyReceived: number;
    topMentioners: Array<{
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      count: number;
    }>;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 并行查询各种统计
    const [
      totalReceived,
      unreadCount,
      todayReceived,
      weeklyReceived,
      monthlyReceived,
      topMentionersData
    ] = await Promise.all([
      // 总接收数
      this.db.userMention.count({
        where: { mentionedId: userId },
      }),

      // 未读数
      this.db.userMention.count({
        where: {
          mentionedId: userId,
          isRead: false,
        },
      }),

      // 今日接收数
      this.db.userMention.count({
        where: {
          mentionedId: userId,
          createdAt: { gte: todayStart },
        },
      }),

      // 本周接收数
      this.db.userMention.count({
        where: {
          mentionedId: userId,
          createdAt: { gte: weekStart },
        },
      }),

      // 本月接收数
      this.db.userMention.count({
        where: {
          mentionedId: userId,
          createdAt: { gte: monthStart },
        },
      }),

      // 顶级提及者
      this.db.userMention.groupBy({
        by: ['mentionerId'],
        where: { mentionedId: userId },
        _count: { mentionerId: true },
        orderBy: { _count: { mentionerId: 'desc' } },
        take: 5,
      }),
    ]);

    // 获取顶级提及者的详细信息
    const mentionerIds = topMentionersData.map(item => item.mentionerId);
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

    const topMentioners = topMentionersData.map(item => {
      const mentioner = mentionerMap.get(item.mentionerId);
      return {
        id: item.mentionerId,
        username: mentioner?.username || 'unknown',
        displayName: mentioner?.displayName || null,
        avatarUrl: mentioner?.avatarUrl || null,
        count: item._count.mentionerId,
      };
    });

    return {
      totalReceived,
      unreadCount,
      todayReceived,
      weeklyReceived,
      monthlyReceived,
      topMentioners,
    };
  }

  /**
   * 清理过期的已读提及
   */
  async cleanupOldMentions(userId: string, daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.db.userMention.deleteMany({
      where: {
        mentionedId: userId,
        isRead: true,
        readAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * 搜索提及
   */
  async searchMentions(
    userId: string,
    query: string,
    limit: number = 20
  ): Promise<any[]> {
    const mentions = await this.db.userMention.findMany({
      where: {
        mentionedId: userId,
        OR: [
          {
            mentioner: {
              username: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            mentioner: {
              displayName: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            post: {
              content: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
          {
            comment: {
              content: {
                contains: query,
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      include: {
        mentioner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            content: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return mentions.map(mention => ({
      id: mention.id,
      mentioner: {
        id: mention.mentioner.id,
        username: mention.mentioner.username,
        displayName: mention.mentioner.displayName,
        avatarUrl: mention.mentioner.avatarUrl,
      },
      post: mention.post ? {
        id: mention.post.id,
        title: mention.post.title,
        content: mention.post.content,
      } : undefined,
      comment: mention.comment ? {
        id: mention.comment.id,
        content: mention.comment.content,
      } : undefined,
      mentionType: mention.mentionType as any,
      isRead: mention.isRead,
      createdAt: mention.createdAt,
    }));
  }
}
