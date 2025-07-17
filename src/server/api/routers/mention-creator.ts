/**
 * @fileoverview 提及创建器
 * @description 创建用户提及记录和发送通知
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import {
  type CreateMentionsInput,
  type CreateMentionsResult,
  // type MentionRecord,
  // type FailedMention,
  type MentionType,
  MentionErrorCode
} from './mention-types';
import { MentionValidator } from './mention-validator';

/**
 * 提及创建器
 */
export class MentionCreator {
  private validator: MentionValidator;

  constructor(private db: PrismaClient) {
    this.validator = new MentionValidator(db);
  }

  /**
   * 创建用户提及记录
   */
  async createMentions(
    input: CreateMentionsInput,
    mentionerId: string
  ): Promise<CreateMentionsResult> {
    const { text, postId, commentId, mentionType } = input;

    // 验证提及
    const validationResult = await this.validator.validateMentions({
      text,
      authorId: mentionerId,
    });

    const createdMentions: any[] = [];
    const failedMentions: any[] = [];
    let notificationsSent = 0;

    // 处理有效的提及
    for (const mention of validationResult.validMentions) {
      if (!mention.canMention) {
        failedMentions.push({
          username: mention.username,
          reason: mention.reason || '无法提及该用户',
          errorCode: this.getErrorCode(mention.reason),
        });
        continue;
      }

      try {
        // 检查是否已存在相同的提及记录
        const existingMention = await this.findExistingMention(
          mentionerId,
          mention.userId,
          postId,
          commentId,
          mentionType
        );

        if (existingMention) {
          // 如果已存在，更新时间
          const updatedMention = await this.db.userMention.update({
            where: { id: existingMention.id },
            data: {
              createdAt: new Date(),
              isRead: false, // 重新标记为未读
            },
          });

          createdMentions.push({
            id: updatedMention.id,
            mentionerId,
            mentionedId: mention.userId,
            postId,
            commentId,
            mentionType,
            isRead: false,
            createdAt: updatedMention.createdAt,
          });
        } else {
          // 创建新的提及记录
          const newMention = await this.db.userMention.create({
            data: {
              mentionerId,
              mentionedId: mention.userId,
              postId,
              commentId,
              mentionType,
              isRead: false,
            },
          });

          createdMentions.push({
            id: newMention.id,
            mentionerId,
            mentionedId: mention.userId,
            postId,
            commentId,
            mentionType,
            isRead: false,
            createdAt: newMention.createdAt,
          });
        }

        // 发送通知
        const notificationSent = await this.sendMentionNotification(
          mentionerId,
          mention.userId,
          mentionType,
          text,
          postId,
          commentId
        );

        if (notificationSent) {
          notificationsSent++;
        }

        // 更新提及统计
        await this.updateMentionStats(mentionerId, mention.userId);
      } catch (error) {
        console.error(`创建提及失败: ${mention.username}`, error);
        failedMentions.push({
          username: mention.username,
          reason: error instanceof Error ? error.message : '创建失败',
          errorCode: MentionErrorCode.RATE_LIMITED,
        });
      }
    }

    // 处理无效的提及
    for (const invalidUsername of validationResult.invalidMentions) {
      failedMentions.push({
        username: invalidUsername,
        reason: '用户不存在',
        errorCode: MentionErrorCode.USER_NOT_FOUND,
      });
    }

    return {
      createdMentions,
      failedMentions,
      totalCreated: createdMentions.length,
      notificationsSent,
    };
  }

  /**
   * 查找已存在的提及记录
   */
  private async findExistingMention(
    mentionerId: string,
    mentionedId: string,
    postId?: string,
    commentId?: string,
    mentionType?: MentionType
  ) {
    return await this.db.userMention.findFirst({
      where: {
        mentionerId,
        mentionedId,
        postId,
        commentId,
        mentionType,
      },
    });
  }

  /**
   * 发送提及通知
   */
  private async sendMentionNotification(
    mentionerId: string,
    mentionedId: string,
    mentionType: MentionType,
    text: string,
    postId?: string,
    commentId?: string
  ): Promise<boolean> {
    try {
      // 获取提及者信息
      const mentioner = await this.db.user.findUnique({
        where: { id: mentionerId },
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      if (!mentioner) {
        return false;
      }

      // 获取被提及者的通知设置
      const mentionedUser = await this.db.user.findUnique({
        where: { id: mentionedId },
        select: {
          notificationSettings: true,
        },
      });

      // 检查是否允许提及通知
      if (mentionedUser?.notificationSettings) {
        const settings = JSON.parse(mentionedUser.notificationSettings);
        if (!settings.mentions) {
          return false;
        }
      }

      // 生成通知内容
      const notificationContent = this.validator.generateMentionNotificationContent(
        mentioner.displayName || mentioner.username,
        mentionType,
        text
      );

      // 创建通知记录
      await this.db.notification.create({
        data: {
          userId: mentionedId,
          type: 'MENTION',
          title: '有人提及了您',
          content: notificationContent,
          data: JSON.stringify({
            mentionerId,
            mentionerUsername: mentioner.username,
            mentionerDisplayName: mentioner.displayName,
            mentionerAvatarUrl: mentioner.avatarUrl,
            mentionType,
            postId,
            commentId,
          }),
          isRead: false,
        },
      });

      return true;
    } catch (error) {
      console.error('发送提及通知失败:', error);
      return false;
    }
  }

  /**
   * 更新提及统计
   */
  private async updateMentionStats(mentionerId: string, mentionedId: string): Promise<void> {
    try {
      // 更新被提及者的统计
      await this.db.userMentionStats.upsert({
        where: { userId: mentionedId },
        update: {
          totalMentions: { increment: 1 },
          weeklyMentions: { increment: 1 },
          monthlyMentions: { increment: 1 },
          lastMentionAt: new Date(),
        },
        create: {
          userId: mentionedId,
          totalMentions: 1,
          weeklyMentions: 1,
          monthlyMentions: 1,
          heatScore: 1,
          averagePosition: 0,
          lastMentionAt: new Date(),
        },
      });

      // 更新提及者的统计
      await this.db.userMentionStats.upsert({
        where: { userId: mentionerId },
        update: {
          totalMentions: { increment: 1 },
        },
        create: {
          userId: mentionerId,
          totalMentions: 1,
          weeklyMentions: 0,
          monthlyMentions: 0,
          heatScore: 0,
          averagePosition: 0,
        },
      });

      // 重新计算热度分数
      await this.recalculateHeatScore(mentionedId);
    } catch (error) {
      console.error('更新提及统计失败:', error);
    }
  }

  /**
   * 重新计算热度分数
   */
  private async recalculateHeatScore(userId: string): Promise<void> {
    const stats = await this.db.userMentionStats.findUnique({
      where: { userId },
    });

    if (!stats) return;

    // 使用类型文件中的计算函数
    const { calculateHeatScore } = await import('./mention-types');

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
   * 获取错误代码
   */
  private getErrorCode(reason?: string): string {
    if (!reason) return MentionErrorCode.INVALID_USERNAME;

    if (reason.includes('不存在')) return MentionErrorCode.USER_NOT_FOUND;
    if (reason.includes('自己')) return MentionErrorCode.CANNOT_MENTION_SELF;
    if (reason.includes('阻止')) return MentionErrorCode.USER_BLOCKED;
    if (reason.includes('隐私') || reason.includes('关注者'))
      return MentionErrorCode.PRIVACY_RESTRICTED;
    if (reason.includes('频率')) return MentionErrorCode.RATE_LIMITED;
    if (reason.includes('限制')) return MentionErrorCode.MENTION_LIMIT_EXCEEDED;

    return MentionErrorCode.INVALID_USERNAME;
  }

  /**
   * 批量创建提及（用于导入等场景）
   */
  async batchCreateMentions(
    mentions: Array<{
      text: string;
      mentionerId: string;
      postId?: string;
      commentId?: string;
      mentionType: MentionType;
    }>
  ): Promise<CreateMentionsResult[]> {
    const results: CreateMentionsResult[] = [];

    for (const mention of mentions) {
      try {
        const result = await this.createMentions(
          {
            text: mention.text,
            postId: mention.postId,
            commentId: mention.commentId,
            mentionType: mention.mentionType,
          },
          mention.mentionerId
        );
        results.push(result);
      } catch (error) {
        console.error('批量创建提及失败:', error);
        results.push({
          createdMentions: [],
          failedMentions: [
            {
              username: 'unknown',
              reason: error instanceof Error ? error.message : '创建失败',
              errorCode: MentionErrorCode.RATE_LIMITED,
            },
          ],
          totalCreated: 0,
          notificationsSent: 0,
        });
      }
    }

    return results;
  }
}
