/**
 * @fileoverview 用户提及类型定义
 * @description 提及系统相关的类型定义和验证规则
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { z } from 'zod';

/**
 * 提及类型枚举
 */
export const MentionType = z.enum(['POST', 'COMMENT', 'MOMENT']);
export type MentionType = z.infer<typeof MentionType>;

/**
 * 解析方式枚举
 */
export const ResolvedBy = z.enum(['username', 'displayName']);
export type ResolvedBy = z.infer<typeof ResolvedBy>;

/**
 * 时间周期枚举
 */
export const TimePeriod = z.enum(['week', 'month', 'all']);
export type TimePeriod = z.infer<typeof TimePeriod>;

/**
 * 用户名解析输入
 */
export const ResolveUsernameInput = z.object({
  username: z.string().min(1).max(50),
  contextUserId: z.string().optional(),
});
export type ResolveUsernameInput = z.infer<typeof ResolveUsernameInput>;

/**
 * 用户名解析结果
 */
export interface ResolveUsernameResult {
  exactMatch?: UserMentionInfo;
  suggestions: UserMentionInfo[];
  hasConflict: boolean;
  totalMatches: number;
}

/**
 * 用户提及信息
 */
export interface UserMentionInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  userLevel: string;
  isVerified: boolean;
  followerCount: number;
  mentionScore: number;
  lastActiveAt: Date | null;
}

/**
 * 提及验证输入
 */
export const ValidateMentionsInput = z.object({
  text: z.string().max(10000),
  authorId: z.string().optional(),
});
export type ValidateMentionsInput = z.infer<typeof ValidateMentionsInput>;

/**
 * 提及验证结果
 */
export interface ValidateMentionsResult {
  validMentions: ValidMentionInfo[];
  invalidMentions: string[];
  totalMentions: number;
  processedText: string;
}

/**
 * 有效提及信息
 */
export interface ValidMentionInfo {
  username: string;
  userId: string;
  displayName: string | null;
  canMention: boolean;
  reason?: string;
}

/**
 * 创建提及输入
 */
export const CreateMentionsInput = z.object({
  text: z.string().max(10000),
  postId: z.string().optional(),
  commentId: z.string().optional(),
  mentionType: MentionType,
});
export type CreateMentionsInput = z.infer<typeof CreateMentionsInput>;

/**
 * 创建提及结果
 */
export interface CreateMentionsResult {
  createdMentions: MentionRecord[];
  failedMentions: FailedMention[];
  totalCreated: number;
  notificationsSent: number;
}

/**
 * 提及记录
 */
export interface MentionRecord {
  id: string;
  mentionerId: string;
  mentionedId: string;
  postId?: string;
  commentId?: string;
  mentionType: MentionType;
  isRead: boolean;
  createdAt: Date;
}

/**
 * 失败的提及
 */
export interface FailedMention {
  username: string;
  reason: string;
  errorCode: string;
}

/**
 * 获取用户提及输入
 */
export const GetUserMentionsInput = z.object({
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
  isRead: z.boolean().optional(),
  mentionType: MentionType.optional(),
});
export type GetUserMentionsInput = z.infer<typeof GetUserMentionsInput>;

/**
 * 用户提及列表结果
 */
export interface UserMentionsResult {
  mentions: UserMentionDetail[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
}

/**
 * 用户提及详情
 */
export interface UserMentionDetail {
  id: string;
  mentioner: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  post?: {
    id: string;
    title: string | null;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
  };
  mentionType: MentionType;
  isRead: boolean;
  createdAt: Date;
}

/**
 * 标记已读输入
 */
export const MarkAsReadInput = z.object({
  mentionIds: z.array(z.string()).optional(),
  markAll: z.boolean().default(false),
});
export type MarkAsReadInput = z.infer<typeof MarkAsReadInput>;

/**
 * 删除提及输入
 */
export const DeleteMentionInput = z.object({
  mentionId: z.string(),
});
export type DeleteMentionInput = z.infer<typeof DeleteMentionInput>;

/**
 * 记录提及统计输入
 */
export const RecordMentionStatsInput = z.object({
  mentionedUserId: z.string(),
  contentType: MentionType,
  contentId: z.string(),
  mentionText: z.string().max(100),
  resolvedBy: ResolvedBy,
  position: z.number().min(0).default(0),
});
export type RecordMentionStatsInput = z.infer<typeof RecordMentionStatsInput>;

/**
 * 用户提及统计输入
 */
export const GetUserMentionStatsInput = z.object({
  userId: z.string(),
});
export type GetUserMentionStatsInput = z.infer<typeof GetUserMentionStatsInput>;

/**
 * 用户提及统计结果
 */
export interface UserMentionStatsResult {
  userId: string;
  totalMentions: number;
  weeklyMentions: number;
  monthlyMentions: number;
  heatScore: number;
  averagePosition: number;
  topMentioners: TopMentioner[];
  user: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

/**
 * 顶级提及者
 */
export interface TopMentioner {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  mentionCount: number;
}

/**
 * 热门被提及用户输入
 */
export const GetTopMentionedUsersInput = z.object({
  period: TimePeriod.default('week'),
  limit: z.number().min(1).max(50).default(10),
});
export type GetTopMentionedUsersInput = z.infer<typeof GetTopMentionedUsersInput>;

/**
 * 热门被提及用户结果
 */
export interface TopMentionedUsersResult {
  users: TopMentionedUser[];
  period: TimePeriod;
  totalUsers: number;
}

/**
 * 热门被提及用户
 */
export interface TopMentionedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  userLevel: string;
  totalMentions: number;
  weeklyMentions: number;
  monthlyMentions: number;
  heatScore: number;
  rank: number;
}

/**
 * 用户提及历史输入
 */
export const GetUserMentionHistoryInput = z.object({
  userId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type GetUserMentionHistoryInput = z.infer<typeof GetUserMentionHistoryInput>;

/**
 * 用户提及历史结果
 */
export interface UserMentionHistoryResult {
  mentions: MentionHistoryItem[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
}

/**
 * 提及历史项
 */
export interface MentionHistoryItem {
  id: string;
  mentioner: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  contentType: MentionType;
  contentId: string;
  mentionText: string;
  resolvedBy: ResolvedBy;
  position: number;
  createdAt: Date;
}

/**
 * 提及错误代码
 */
export enum MentionErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CANNOT_MENTION_SELF = 'CANNOT_MENTION_SELF',
  USER_BLOCKED = 'USER_BLOCKED',
  PRIVACY_RESTRICTED = 'PRIVACY_RESTRICTED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_USERNAME = 'INVALID_USERNAME',
  MENTION_LIMIT_EXCEEDED = 'MENTION_LIMIT_EXCEEDED',
}

/**
 * 提及配置常量
 */
export const MENTION_CONFIG = {
  MAX_MENTIONS_PER_TEXT: 10,
  MAX_USERNAME_LENGTH: 50,
  MIN_USERNAME_LENGTH: 1,
  MENTION_PATTERN: /@([a-zA-Z0-9_\u4e00-\u9fa5]+)/g,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1分钟
  RATE_LIMIT_MAX_MENTIONS: 50,
  SUGGESTION_LIMIT: 10,
  HEAT_SCORE_DECAY: 0.95, // 每天衰减5%
  TOP_MENTIONERS_LIMIT: 5,
} as const;

/**
 * 验证用户名格式
 */
export function validateUsername(username: string): boolean {
  if (!username || username.length < MENTION_CONFIG.MIN_USERNAME_LENGTH) {
    return false;
  }
  if (username.length > MENTION_CONFIG.MAX_USERNAME_LENGTH) {
    return false;
  }
  // 允许字母、数字、下划线和中文字符
  const usernamePattern = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
  return usernamePattern.test(username);
}

/**
 * 计算提及热度分数
 */
export function calculateHeatScore(
  totalMentions: number,
  weeklyMentions: number,
  monthlyMentions: number,
  lastMentionAt?: Date
): number {
  const baseScore = totalMentions * 0.1;
  const weeklyBonus = weeklyMentions * 2;
  const monthlyBonus = monthlyMentions * 0.5;

  let timeDecay = 1;
  if (lastMentionAt) {
    const daysSinceLastMention = (Date.now() - lastMentionAt.getTime()) / (1000 * 60 * 60 * 24);
    timeDecay = Math.pow(MENTION_CONFIG.HEAT_SCORE_DECAY, daysSinceLastMention);
  }

  return Math.round((baseScore + weeklyBonus + monthlyBonus) * timeDecay);
}
