/**
 * @fileoverview 罐头系统工具函数
 * @description 包含错误处理、消息生成等工具函数
 */

import { TRPCError } from "@trpc/server";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";

/**
 * 罐头系统友好错误信息映射
 */
export const FRIENDLY_ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接不稳定，请检查网络后重试。如果问题持续，请联系守馆员获取帮助。',
  DATABASE_ERROR: '系统繁忙，请稍后重试。我们正在努力为您提供更好的服务！',
  INSUFFICIENT_BALANCE: '罐头余额不足，请先通过签到或完成任务获得更多罐头。每日签到和任务都有丰厚奖励哦！',
  PERMISSION_DENIED: '权限不足，请确认您的账户状态。如有疑问，请联系守馆员协助处理。',
  RATE_LIMIT_EXCEEDED: '操作过于频繁，请稍后再试。适当休息一下，保护您的账户安全～',
  INVALID_INPUT: '输入信息有误，请检查后重新提交。如需帮助，请查看操作指南或联系守馆员。',
} as const;

/**
 * 创建友好的错误信息
 */
export function createFriendlyError(code: keyof typeof FRIENDLY_ERROR_MESSAGES, customMessage?: string): TRPCError {
  return TRPCErrorHandler.validationError();
}

/**
 * 任务配置定义
 */
export function getTaskConfig(config: any) {
  return {
    'LIKE': {
      limit: config.dailyLikeLimit,
      reward: config.likeCans,
      name: '点赞',
    },
    'COMMENT': {
      limit: config.dailyCommentLimit,
      reward: config.commentCans,
      name: '评论',
    },
    'SHARE': {
      limit: config.dailyShareLimit,
      reward: config.shareCans,
      name: '分享',
    },
    'PUBLISH_MOMENT': {
      limit: config.dailyMomentLimit,
      reward: config.publishMomentCans,
      name: '发布动态',
    },
    'PUBLISH_POST': {
      limit: config.dailyPostLimit,
      reward: config.publishPostCans,
      name: '发布作品',
    },
  };
}

/**
 * 任务定义列表
 */
export function getTaskDefinitions(config: any) {
  return [
    {
      type: 'LIKE' as const,
      name: '点赞内容',
      description: '为喜欢的内容点赞，支持创作者',
      icon: 'heart',
      category: 'interaction',
      difficulty: 'easy',
      cansReward: config.likeCans,
      dailyLimit: config.dailyLikeLimit,
      experienceReward: config.likeCans * config.cansToExperienceRatio,
    },
    {
      type: 'COMMENT' as const,
      name: '发表评论',
      description: '为内容发表有意义的评论，促进交流',
      icon: 'message-circle',
      category: 'interaction',
      difficulty: 'medium',
      cansReward: config.commentCans,
      dailyLimit: config.dailyCommentLimit,
      experienceReward: config.commentCans * config.cansToExperienceRatio,
    },
    {
      type: 'SHARE' as const,
      name: '分享内容',
      description: '分享优质内容给朋友，扩大影响力',
      icon: 'share-2',
      category: 'interaction',
      difficulty: 'medium',
      cansReward: config.shareCans,
      dailyLimit: config.dailyShareLimit,
      experienceReward: config.shareCans * config.cansToExperienceRatio,
    },
    {
      type: 'PUBLISH_MOMENT' as const,
      name: '发布动态',
      description: '分享日常生活动态，记录美好时光',
      icon: 'pen-tool',
      category: 'creation',
      difficulty: 'medium',
      cansReward: config.publishMomentCans,
      dailyLimit: config.dailyMomentLimit,
      experienceReward: config.publishMomentCans * config.cansToExperienceRatio,
    },
    {
      type: 'PUBLISH_POST' as const,
      name: '发布作品',
      description: '发布高质量的cosplay作品，展示才华',
      icon: 'camera',
      category: 'creation',
      difficulty: 'hard',
      cansReward: config.publishPostCans,
      dailyLimit: config.dailyPostLimit,
      experienceReward: config.publishPostCans * config.cansToExperienceRatio,
    },
  ];
}

/**
 * 默认配置映射
 */
export const DEFAULT_CONFIGS = {
  'GUEST': {
    dailySigninCans: 0,
    consecutiveBonus: JSON.stringify({}),
    likeCans: 0,
    commentCans: 0,
    shareCans: 0,
    publishMomentCans: 0,
    publishPostCans: 0,
    dailyLikeLimit: 0,
    dailyCommentLimit: 0,
    dailyShareLimit: 0,
    dailyMomentLimit: 0,
    dailyPostLimit: 0,
    beLikedCans: 0,
    beCommentedCans: 0,
    beSharedCans: 0,
    dailyExperienceLimit: 0,
    cansToExperienceRatio: 0,
  },
  'USER': {
    dailySigninCans: 10,
    consecutiveBonus: JSON.stringify({ "3": 5, "7": 15, "15": 30, "30": 50 }),
    likeCans: 1,
    commentCans: 2,
    shareCans: 3,
    publishMomentCans: 10,
    publishPostCans: 20,
    dailyLikeLimit: 10,
    dailyCommentLimit: 5,
    dailyShareLimit: 3,
    dailyMomentLimit: 2,
    dailyPostLimit: 1,
    beLikedCans: 1,
    beCommentedCans: 2,
    beSharedCans: 3,
    dailyExperienceLimit: 50,
    cansToExperienceRatio: 1.0,
  },
  'VIP': {
    dailySigninCans: 15,
    consecutiveBonus: JSON.stringify({ "3": 8, "7": 20, "15": 40, "30": 70 }),
    likeCans: 2,
    commentCans: 3,
    shareCans: 5,
    publishMomentCans: 15,
    publishPostCans: 30,
    dailyLikeLimit: 20,
    dailyCommentLimit: 10,
    dailyShareLimit: 5,
    dailyMomentLimit: 3,
    dailyPostLimit: 2,
    beLikedCans: 2,
    beCommentedCans: 3,
    beSharedCans: 5,
    dailyExperienceLimit: 100,
    cansToExperienceRatio: 1.2,
  },
  'CREATOR': {
    dailySigninCans: 20,
    consecutiveBonus: JSON.stringify({ "3": 10, "7": 25, "15": 50, "30": 100 }),
    likeCans: 3,
    commentCans: 5,
    shareCans: 8,
    publishMomentCans: 20,
    publishPostCans: 50,
    dailyLikeLimit: 50,
    dailyCommentLimit: 20,
    dailyShareLimit: 10,
    dailyMomentLimit: 5,
    dailyPostLimit: 3,
    beLikedCans: 3,
    beCommentedCans: 5,
    beSharedCans: 8,
    dailyExperienceLimit: 200,
    cansToExperienceRatio: 1.5,
  },
  'ADMIN': {
    dailySigninCans: 50,
    consecutiveBonus: JSON.stringify({ "3": 20, "7": 50, "15": 100, "30": 200 }),
    likeCans: 5,
    commentCans: 10,
    shareCans: 15,
    publishMomentCans: 50,
    publishPostCans: 100,
    dailyLikeLimit: 100,
    dailyCommentLimit: 50,
    dailyShareLimit: 20,
    dailyMomentLimit: 10,
    dailyPostLimit: 5,
    beLikedCans: 5,
    beCommentedCans: 10,
    beSharedCans: 15,
    dailyExperienceLimit: 500,
    cansToExperienceRatio: 2.0,
  },
};

/**
 * 计算连续签到奖励
 */
export function calculateConsecutiveBonus(consecutiveDays: number): number {
  let bonusCans = 0;

  if (consecutiveDays >= 30) bonusCans = 50;
  else if (consecutiveDays >= 15) bonusCans = 30;
  else if (consecutiveDays >= 7) bonusCans = 15;
  else if (consecutiveDays >= 3) bonusCans = 5;

  return bonusCans;
}

/**
 * 获取今日日期（零点时间）
 */
export function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * 获取昨日日期（零点时间）
 */
export function getYesterdayDate(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
}
