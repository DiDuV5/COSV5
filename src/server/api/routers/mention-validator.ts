/**
 * @fileoverview 提及验证器
 * @description 验证和解析文本中的用户提及
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import {
  type ValidateMentionsInput,
  type ValidateMentionsResult,
  // type ValidMentionInfo
  MENTION_CONFIG,
  MentionErrorCode,
  validateUsername
} from './mention-types';
import { MentionResolver } from './mention-resolver';

/**
 * 提及验证器
 */
export class MentionValidator {
  private resolver: MentionResolver;

  constructor(private db: PrismaClient) {
    this.resolver = new MentionResolver(db);
  }

  /**
   * 验证并解析文本中的用户提及
   */
  async validateMentions(input: ValidateMentionsInput): Promise<ValidateMentionsResult> {
    const { text, authorId } = input;

    // 提取@提及
    const mentionUsernames = this.extractMentionsFromText(text);

    if (mentionUsernames.length === 0) {
      return {
        validMentions: [],
        invalidMentions: [],
        totalMentions: 0,
        processedText: text,
      };
    }

    // 检查提及数量限制
    if (mentionUsernames.length > MENTION_CONFIG.MAX_MENTIONS_PER_TEXT) {
      throw new Error(`单条内容最多只能提及 ${MENTION_CONFIG.MAX_MENTIONS_PER_TEXT} 个用户`);
    }

    // 去重
    const uniqueUsernames = Array.from(new Set(mentionUsernames));

    // 批量解析用户名
    const userMap = await this.resolver.batchResolveUsernames(uniqueUsernames);

    const validMentions: any[] = [];
    const invalidMentions: string[] = [];

    // 验证每个提及
    for (const username of uniqueUsernames) {
      const user = userMap.get(username);

      if (!user) {
        invalidMentions.push(username);
        continue;
      }

      // 检查是否可以提及该用户
      const canMentionResult = await this.canMentionUser(authorId, user.id);

      validMentions.push({
        username: user.username,
        userId: user.id,
        displayName: user.displayName,
        canMention: canMentionResult.canMention,
        reason: canMentionResult.reason,
      });
    }

    return {
      validMentions,
      invalidMentions,
      totalMentions: mentionUsernames.length,
      processedText: this.processTextWithMentions(text, validMentions),
    };
  }

  /**
   * 从文本中提取@提及
   */
  extractMentionsFromText(text: string): string[] {
    const mentions: string[] = [];
    const regex = new RegExp(MENTION_CONFIG.MENTION_PATTERN);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const username = match[1];
      if (validateUsername(username)) {
        mentions.push(username);
      }
    }

    return mentions;
  }

  /**
   * 检查是否可以提及用户
   */
  async canMentionUser(
    mentionerId?: string,
    mentionedId?: string
  ): Promise<{ canMention: boolean; reason?: string }> {
    // 如果没有提及者ID，允许提及（公开内容）
    if (!mentionerId) {
      return { canMention: true };
    }

    // 如果没有被提及者ID，不允许提及
    if (!mentionedId) {
      return { canMention: false, reason: '用户不存在' };
    }

    // 不能提及自己
    if (mentionerId === mentionedId) {
      return { canMention: false, reason: '不能提及自己' };
    }

    // 检查是否被阻止
    const isBlocked = await this.checkIfBlocked(mentionerId, mentionedId);
    if (isBlocked) {
      return { canMention: false, reason: '该用户已阻止您的提及' };
    }

    // 检查隐私设置
    const privacyCheck = await this.checkPrivacySettings(mentionerId, mentionedId);
    if (!privacyCheck.allowed) {
      return { canMention: false, reason: privacyCheck.reason };
    }

    // 检查频率限制
    const rateLimitCheck = await this.checkRateLimit(mentionerId);
    if (!rateLimitCheck.allowed) {
      return { canMention: false, reason: rateLimitCheck.reason };
    }

    return { canMention: true };
  }

  /**
   * 检查是否被阻止
   */
  private async checkIfBlocked(mentionerId: string, mentionedId: string): Promise<boolean> {
    // 暂时返回false，因为userBlock表不存在
    // const blockRecord = await this.db.userBlock.findFirst({
    //   where: {
    //     blockerId: mentionedId,
    //     blockedId: mentionerId,
    //   },
    // });

    return false; // 暂时返回false
  }

  /**
   * 检查隐私设置
   */
  private async checkPrivacySettings(
    mentionerId: string,
    mentionedId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const mentionedUser = await this.db.user.findUnique({
      where: { id: mentionedId },
      select: {
        mentionPrivacy: true,
        isActive: true,
      },
    });

    if (!mentionedUser || !mentionedUser.isActive) {
      return { allowed: false, reason: '用户不存在或已停用' };
    }

    // 如果隐私设置为仅关注者可提及
    if (mentionedUser.mentionPrivacy === 'FOLLOWERS_ONLY') {
      const isFollowing = await this.db.follow.findFirst({
        where: {
          followerId: mentionerId,
          followingId: mentionedId,
        },
      });

      if (!isFollowing) {
        return { allowed: false, reason: '该用户仅允许关注者提及' };
      }
    }

    // 如果隐私设置为禁止提及
    if (mentionedUser.mentionPrivacy === 'NONE') {
      return { allowed: false, reason: '该用户已禁用提及功能' };
    }

    return { allowed: true };
  }

  /**
   * 检查频率限制
   */
  private async checkRateLimit(
    mentionerId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - MENTION_CONFIG.RATE_LIMIT_WINDOW);

    const recentMentions = await this.db.userMention.count({
      where: {
        mentionerId,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (recentMentions >= MENTION_CONFIG.RATE_LIMIT_MAX_MENTIONS) {
      return {
        allowed: false,
        reason: `提及频率过高，请稍后再试（${MENTION_CONFIG.RATE_LIMIT_WINDOW / 1000}秒内最多${MENTION_CONFIG.RATE_LIMIT_MAX_MENTIONS}次）`
      };
    }

    return { allowed: true };
  }

  /**
   * 处理文本中的提及（添加链接等）
   */
  private processTextWithMentions(text: string, validMentions: any[]): string {
    let processedText = text;

    // 为有效的提及添加特殊标记或链接
    validMentions.forEach(mention => {
      if (mention.canMention) {
        const mentionPattern = new RegExp(`@${mention.username}\\b`, 'g');
        processedText = processedText.replace(
          mentionPattern,
          `[@${mention.username}](user:${mention.userId})`
        );
      }
    });

    return processedText;
  }

  /**
   * 验证单个用户名
   */
  async validateSingleMention(
    username: string,
    authorId?: string
  ): Promise<any | null> {
    if (!validateUsername(username)) {
      return null;
    }

    const userMap = await this.resolver.batchResolveUsernames([username]);
    const user = userMap.get(username);

    if (!user) {
      return null;
    }

    const canMentionResult = await this.canMentionUser(authorId, user.id);

    return {
      username: user.username,
      userId: user.id,
      displayName: user.displayName,
      canMention: canMentionResult.canMention,
      reason: canMentionResult.reason,
    };
  }

  /**
   * 格式化提及用于存储
   */
  formatMentionsForStorage(validMentions: any[]): string {
    const mentionData = validMentions
      .filter(mention => mention.canMention)
      .map(mention => ({
        username: mention.username,
        userId: mention.userId,
        displayName: mention.displayName,
      }));

    return JSON.stringify(mentionData);
  }

  /**
   * 生成提及通知内容
   */
  generateMentionNotificationContent(
    mentionerName: string,
    contentType: string,
    contentPreview: string
  ): string {
    const maxPreviewLength = 100;
    const truncatedPreview = contentPreview.length > maxPreviewLength
      ? contentPreview.substring(0, maxPreviewLength) + '...'
      : contentPreview;

    switch (contentType) {
      case 'POST':
        return `${mentionerName} 在作品中提及了您：${truncatedPreview}`;
      case 'COMMENT':
        return `${mentionerName} 在评论中提及了您：${truncatedPreview}`;
      case 'MOMENT':
        return `${mentionerName} 在动态中提及了您：${truncatedPreview}`;
      default:
        return `${mentionerName} 提及了您：${truncatedPreview}`;
    }
  }

  /**
   * 清理和标准化用户名
   */
  sanitizeUsername(username: string): string {
    // 移除@符号
    let cleaned = username.replace(/^@+/, '');

    // 移除特殊字符（保留字母、数字、下划线和中文）
    cleaned = cleaned.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '');

    // 限制长度
    if (cleaned.length > MENTION_CONFIG.MAX_USERNAME_LENGTH) {
      cleaned = cleaned.substring(0, MENTION_CONFIG.MAX_USERNAME_LENGTH);
    }

    return cleaned;
  }
}
