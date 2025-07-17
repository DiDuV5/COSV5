/**
 * @fileoverview Comment相关的输入验证模式
 * @description 包含所有Comment路由的输入验证schema
 */

import { z } from "zod";

// 查询相关的schema
export const getCommentsInputSchema = z.object({
  contentId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  parentId: z.string().optional(),
  includeOwn: z.boolean().default(false), // 是否包含自己的待审核评论
  guestSessionId: z.string().optional(), // 游客会话ID，用于识别游客的评论
  sortBy: z.enum(["newest", "popular", "following"]).default("newest"), // 排序方式
});

export const getPendingCommentsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
});

export const getLatestCommentsInputSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  userLevel: z.string().optional(),
  includeGuests: z.boolean().default(true),
});

export const getHotCommentsInputSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  userLevel: z.string().optional(),
  includeGuests: z.boolean().default(true),
});

export const getMostDislikedCommentsInputSchema = z.object({
  limit: z.number().min(1).max(50).default(20),
  userLevel: z.string().optional(),
  includeGuests: z.boolean().default(true),
});

export const getUserCommentsInputSchema = z.object({
  userId: z.string().optional(),
  username: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// 创建相关的schema
export const createCommentInputSchema = z.object({
  contentId: z.string(),
  content: z.string().min(1, "评论内容不能为空").max(1000, "评论内容最多1000个字符"),
  parentId: z.string().optional(),
  guestName: z.string().min(1, "昵称不能为空").max(50, "昵称最多50个字符").optional(),
  guestContact: z.string().max(100, "联系方式最多100个字符").optional(),
  guestSessionId: z.string().optional(), // 游客会话ID
  images: z.array(z.string().url()).optional(),
  turnstileToken: z.string().optional(), // Turnstile验证token
});

// 管理相关的schema
export const moderateCommentInputSchema = z.object({
  commentId: z.string(),
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

export const batchModerateInputSchema = z.object({
  commentIds: z.array(z.string()).min(1, "至少选择一个评论"),
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

export const togglePinInputSchema = z.object({
  commentId: z.string(),
});

export const softDeleteInputSchema = z.object({
  commentId: z.string(),
  reason: z.string().optional(),
});

// 互动相关的schema
export const reactInputSchema = z.object({
  commentId: z.string(),
  reactionType: z.string().nullable(), // null表示取消反应
});

export const toggleReactionInputSchema = z.object({
  commentId: z.string(),
  reactionType: z.enum(['like', 'dislike']).optional(), // 如果为空则取消反应
});

export const toggleLikeInputSchema = z.object({
  commentId: z.string(),
});

export const getReactionStatusInputSchema = z.object({
  commentIds: z.array(z.string()),
});

export const getLikeStatusInputSchema = z.object({
  commentIds: z.array(z.string()),
});

export const getReactionStatsInputSchema = z.object({
  commentId: z.string(),
  includeUsers: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(20),
});

// 配置相关的schema
export const updateReactionConfigInputSchema = z.object({
  likeWeight: z.number().min(-10).max(10),
  dislikeWeight: z.number().min(-10).max(10),
  enableLike: z.boolean(),
  enableDislike: z.boolean(),
  showCounts: z.boolean(),
  description: z.string().optional(),
});
