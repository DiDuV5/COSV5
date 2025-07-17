/**
 * @fileoverview 帖子详情页面工具函数
 * @description 提供帖子详情页面相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { ReactionStatsValidation } from './types';

/**
 * 验证表情反应统计数据的完整性和有效性
 * @param data - API返回的原始数据
 * @returns 验证结果和处理后的数据
 */
export function validateReactionStatsData(data: any): ReactionStatsValidation {
  try {
    // 基础数据结构验证
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: '数据格式无效', data: null };
    }

    // 验证reactions数组
    if (!Array.isArray(data.reactions)) {
      return { isValid: false, error: 'reactions字段必须是数组', data: null };
    }

    // 验证totalCount
    const totalCount = typeof data.totalCount === 'number' ? data.totalCount : 0;

    // 验证和清理reactions数据
    const validReactions = data.reactions
      .filter((reaction: any) => {
        // 验证必需字段
        return reaction &&
               typeof reaction.type === 'string' &&
               typeof reaction.count === 'number' &&
               reaction.count >= 0 &&
               Array.isArray(reaction.users);
      })
      .map((reaction: any) => ({
        type: reaction.type,
        count: Math.max(0, reaction.count), // 确保count非负
        users: Array.isArray(reaction.users) ? reaction.users.filter((user: any) =>
          user && typeof user.id === 'string'
        ) : []
      }));

    return {
      isValid: true,
      error: null,
      data: {
        reactions: validReactions,
        totalCount: Math.max(0, totalCount)
      }
    };
  } catch (error) {
    console.error('ReactionStats数据验证失败:', error);
    return {
      isValid: false,
      error: '数据验证过程中发生错误',
      data: null
    };
  }
}

/**
 * 格式化时间
 * @param date - 日期对象
 * @returns 格式化后的时间字符串
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * 解析标签
 * @param tagsJson - JSON格式的标签字符串
 * @returns 标签数组
 */
export function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson) as string[];
  } catch {
    return [];
  }
}
