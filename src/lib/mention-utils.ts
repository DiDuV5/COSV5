/**
 * @fileoverview 用户提及功能工具函数
 * @description 处理@用户提及的解析、验证和渲染功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { extractHashtags } from '@/lib/tag-utils';

export interface MentionData {
  id: string;
  username: string;
  displayName?: string;
  position: number;
  length: number;
}

export interface ParsedContent {
  text: string;
  mentions: MentionData[];
  hashtags: string[];
}

/**
 * 从文本中提取@用户提及
 * @param text 原始文本
 * @returns 提及的用户名数组（可能是displayName或username）
 */
export const extractMentionsFromText = (text: string): string[] => {
  // 支持中文、英文、数字、下划线，以及常见的中文用户名
  const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+)/g;
  const matches = text.match(mentionRegex);

  if (!matches) return [];

  return matches
    .map(match => match.slice(1)) // 移除 @ 符号
    .filter(name => name.length > 0 && name.length <= 50)
    .slice(0, 10); // 最多10个提及
};

/**
 * 从文本中提取hashtag标签
 * @param text 原始文本
 * @returns 标签数组
 * @deprecated 请使用 extractHashtags from '@/lib/tag-utils'
 */
export const extractHashtagsFromText = (text: string): string[] => {
  // 使用统一的标签提取函数
  return extractHashtags(text);
};

/**
 * 解析文本内容，提取提及和标签
 * @param text 原始文本
 * @returns 解析后的内容对象
 */
export const parseTextContent = (text: string): ParsedContent => {
  const mentions: MentionData[] = [];
  const hashtags = extractHashtagsFromText(text);

  // 提取@提及并记录位置
  const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      id: '', // 需要后续通过API查询用户ID
      username: match[1],
      position: match.index,
      length: match[0].length,
    });
  }

  return {
    text,
    mentions: mentions.slice(0, 10), // 最多10个提及
    hashtags,
  };
};

/**
 * 验证用户名格式
 * @param username 用户名
 * @returns 是否有效
 */
export const isValidUsername = (username: string): boolean => {
  // 用户名规则：3-30个字符，支持字母、数字、下划线、中文
  const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{3,30}$/;
  return usernameRegex.test(username);
};

/**
 * 清理文本中的@提及符号，保留用户名
 * @param text 原始文本
 * @returns 清理后的文本
 */
export const removeMentionSymbols = (text: string): string => {
  if (!text) return '';
  return text.replace(/@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g, '$1'); // 移除@符号，保留用户名
};

/**
 * 处理文本内容，分离纯文本、提及和标签
 * @param text 原始文本
 * @returns 处理后的内容对象
 */
export const processTextContent = (text: string): {
  cleanText: string;
  mentions: string[];
  hashtags: string[];
} => {
  const mentions = extractMentionsFromText(text);
  const hashtags = extractHashtagsFromText(text);

  // 移除@和#符号，保留纯文本
  const cleanText = text
    .replace(/@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g, '$1')
    .replace(/#([^\s#@]+)/g, '$1');

  return { cleanText, mentions, hashtags };
};

/**
 * 格式化提及数据为JSON字符串
 * @param mentions 提及数据数组
 * @returns JSON字符串
 */
export const formatMentionsForStorage = (mentions: MentionData[]): string => {
  return JSON.stringify(mentions.map(mention => ({
    id: mention.id,
    username: mention.username,
    displayName: mention.displayName,
  })));
};

/**
 * 从JSON字符串解析提及数据
 * @param mentionsJson JSON字符串
 * @returns 提及数据数组
 */
export const parseMentionsFromStorage = (mentionsJson: string | null): MentionData[] => {
  if (!mentionsJson) return [];

  try {
    const parsed = JSON.parse(mentionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('解析提及数据失败:', error);
    return [];
  }
};

/**
 * 检查文本中是否包含提及
 * @param text 文本内容
 * @returns 是否包含提及
 */
export const hasMentions = (text: string): boolean => {
  const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/;
  return mentionRegex.test(text);
};

/**
 * 获取提及的用户数量
 * @param text 文本内容
 * @returns 提及的用户数量
 */
export const getMentionCount = (text: string): number => {
  const mentions = extractMentionsFromText(text);
  return mentions.length;
};

/**
 * 替换文本中的@提及为链接格式
 * @param text 原始文本
 * @param mentions 已验证的提及数据
 * @returns 替换后的文本
 */
export const replaceMentionsWithLinks = (
  text: string,
  mentions: MentionData[]
): string => {
  let result = text;

  // 按位置倒序排列，避免替换时位置偏移
  const sortedMentions = [...mentions].sort((a, b) => b.position - a.position);

  sortedMentions.forEach(mention => {
    const mentionText = `@${mention.username}`;
    const linkText = `[@${mention.displayName || mention.username}](/users/${mention.username})`;

    result = result.substring(0, mention.position) +
             linkText +
             result.substring(mention.position + mention.length);
  });

  return result;
};

/**
 * 生成提及通知的内容
 * @param mentionerName 提及者名称
 * @param contentType 内容类型
 * @param contentTitle 内容标题
 * @returns 通知内容
 */
export const generateMentionNotificationContent = (
  mentionerName: string,
  contentType: 'POST' | 'COMMENT',
  contentTitle?: string
): string => {
  const typeText = contentType === 'POST' ? '作品' : '评论';
  const titleText = contentTitle ? `"${contentTitle}"` : '';

  return `${mentionerName} 在${typeText}${titleText}中提及了你`;
};

/**
 * 解析文本中的提及，支持displayName到username的映射
 * @param text 原始文本
 * @param userMap 用户映射表 {displayName: userData}
 * @returns 解析后的提及数据
 */
export const resolveMentionsWithUserMap = (
  text: string,
  userMap: Record<string, { id: string; username: string; displayName?: string }>
): MentionData[] => {
  const mentions: MentionData[] = [];
  const mentionRegex = /@([a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionText = match[1];

    // 首先尝试通过displayName查找
    const userData = Object.values(userMap).find(user =>
      user.displayName === mentionText || user.username === mentionText
    );

    if (userData) {
      mentions.push({
        id: userData.id,
        username: userData.username, // 存储时使用username
        displayName: userData.displayName,
        position: match.index,
        length: match[0].length,
      });
    }
  }

  return mentions.slice(0, 10); // 最多10个提及
};

/**
 * 将文本中的displayName提及转换为username提及（用于存储）
 * @param text 包含displayName提及的文本
 * @param userMap 用户映射表
 * @returns 转换后的文本（使用username）
 */
export const convertDisplayNamesToUsernames = (
  text: string,
  userMap: Record<string, { username: string; displayName?: string }>
): string => {
  let result = text;

  Object.values(userMap).forEach(user => {
    if (user.displayName && user.displayName !== user.username) {
      // 将 @displayName 替换为 @username
      const displayNameRegex = new RegExp(`@${escapeRegExp(user.displayName)}\\b`, 'g');
      result = result.replace(displayNameRegex, `@${user.username}`);
    }
  });

  return result;
};

/**
 * 将文本中的username提及转换为displayName提及（用于显示）
 * @param text 包含username提及的文本
 * @param userMap 用户映射表
 * @returns 转换后的文本（使用displayName）
 */
export const convertUsernamesToDisplayNames = (
  text: string,
  userMap: Record<string, { username: string; displayName?: string }>
): string => {
  let result = text;

  Object.values(userMap).forEach(user => {
    if (user.displayName && user.displayName !== user.username) {
      // 将 @username 替换为 @displayName
      const usernameRegex = new RegExp(`@${escapeRegExp(user.username)}\\b`, 'g');
      result = result.replace(usernameRegex, `@${user.displayName}`);
    }
  });

  return result;
};

/**
 * 转义正则表达式特殊字符
 * @param string 要转义的字符串
 * @returns 转义后的字符串
 */
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 验证提及权限
 * @param mentionerLevel 提及者用户等级
 * @param mentionedLevel 被提及者用户等级
 * @returns 是否允许提及
 */
export const canMentionUser = (
  mentionerLevel: string,
  mentionedLevel: string
): boolean => {
  // 基本规则：所有用户都可以提及其他用户
  // 可以根据需要添加更复杂的权限控制
  const allowedLevels = ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'];

  return allowedLevels.includes(mentionerLevel) && allowedLevels.includes(mentionedLevel);
};
