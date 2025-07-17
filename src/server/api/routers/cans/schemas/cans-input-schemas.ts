/**
 * @fileoverview 罐头系统输入验证模式
 * @description 包含罐头系统所有输入验证schema
 */

import { z } from "zod";

// 交易记录查询
export const getTransactionsSchema = z.object({
  // 分页参数
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  // 游标分页（可选，用于无限滚动）
  cursor: z.string().optional(),
  // 筛选参数
  type: z.enum(['ALL', 'EARN', 'SPEND', 'TRANSFER']).default('ALL'),
  // 分页模式
  paginationMode: z.enum(['page', 'cursor']).default('page'),
});

// 签到历史查询
export const getCheckinHistorySchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

// 任务完成
export const completeTaskSchema = z.object({
  taskType: z.enum(['LIKE', 'COMMENT', 'SHARE', 'PUBLISH_MOMENT', 'PUBLISH_POST']),
  targetId: z.string().optional(),
  metadata: z.record(z.any()).optional(), // 额外的任务元数据
});

// 系统配置相关
export const getConfigSchema = z.object({
  userLevel: z.string(),
});

export const updateConfigSchema = z.object({
  userLevel: z.string(),
  dailySigninCans: z.number().min(0).max(1000),
  consecutiveBonus: z.string(),
  likeCans: z.number().min(0).max(100),
  commentCans: z.number().min(0).max(100),
  shareCans: z.number().min(0).max(100),
  publishMomentCans: z.number().min(0).max(200),
  publishPostCans: z.number().min(0).max(500),
  dailyLikeLimit: z.number().min(0).max(1000),
  dailyCommentLimit: z.number().min(0).max(500),
  dailyShareLimit: z.number().min(0).max(100),
  dailyMomentLimit: z.number().min(0).max(50),
  dailyPostLimit: z.number().min(0).max(20),
  beLikedCans: z.number().min(0).max(50),
  beCommentedCans: z.number().min(0).max(50),
  beSharedCans: z.number().min(0).max(100),
  dailyExperienceLimit: z.number().min(0).max(10000),
  cansToExperienceRatio: z.number().min(0).max(10),
  // 社交账号权限配置
  canUseSocialLinks: z.boolean().optional(),
  maxSocialLinks: z.number().min(0).max(50).optional(),
  canUseCustomLinks: z.boolean().optional(),
  reason: z.string().optional(),
});

export const batchUpdateConfigsSchema = z.object({
  configs: z.array(z.object({
    userLevel: z.string(),
    dailySigninCans: z.number().min(0).max(1000),
    consecutiveBonus: z.string(),
    likeCans: z.number().min(0).max(100),
    commentCans: z.number().min(0).max(100),
    shareCans: z.number().min(0).max(100),
    publishMomentCans: z.number().min(0).max(200),
    publishPostCans: z.number().min(0).max(500),
    dailyLikeLimit: z.number().min(0).max(1000),
    dailyCommentLimit: z.number().min(0).max(500),
    dailyShareLimit: z.number().min(0).max(100),
    dailyMomentLimit: z.number().min(0).max(50),
    dailyPostLimit: z.number().min(0).max(20),
    beLikedCans: z.number().min(0).max(50),
    beCommentedCans: z.number().min(0).max(50),
    beSharedCans: z.number().min(0).max(100),
    dailyExperienceLimit: z.number().min(0).max(10000),
    cansToExperienceRatio: z.number().min(0).max(10),
    // 社交账号权限配置
    canUseSocialLinks: z.boolean().optional(),
    maxSocialLinks: z.number().min(0).max(50).optional(),
    canUseCustomLinks: z.boolean().optional(),
  })),
  reason: z.string().optional(),
});

export const resetConfigSchema = z.object({
  userLevel: z.string(),
});

// 配置历史查询
export const getConfigHistorySchema = z.object({
  userLevel: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// 配置回滚
export const rollbackConfigSchema = z.object({
  historyId: z.string(),
  reason: z.string().optional(),
});

// 统计分析相关
export const getTransactionTrendsSchema = z.object({
  days: z.number().min(1).max(90).default(7),
});

export const getTransactionTypeDistributionSchema = z.object({
  days: z.number().min(1).max(90).default(7),
});

export const getRecentTransactionsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const getAnomalousTransactionsSchema = z.object({
  days: z.number().min(1).max(30).default(7),
  threshold: z.number().min(100).max(10000).default(1000),
});

// 经验值管理相关
export const resetUserExperienceSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
});

export const resetAllExperienceSchema = z.object({
  forceReset: z.boolean().default(false),
  reason: z.string().optional(),
});
