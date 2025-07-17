/**
 * @fileoverview Post相关的输入验证模式
 * @description 包含所有Post路由的输入验证schema
 */

import { z } from "zod";

// 查询相关的schema
export const getPostsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().optional(),
  authorId: z.string().optional(),
  postType: z.string().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const getAllInputSchema = z.object({
  limit: z.number().min(1).max(100).default(12),
  cursor: z.string().optional(),
  sortBy: z.enum(['latest', 'popular', 'trending']).default('latest'),
});

export const getByTagInputSchema = z.object({
  tag: z.string(),
  limit: z.number().min(1).max(100).default(12),
  cursor: z.string().optional(),
  sortBy: z.enum(['latest', 'popular', 'trending']).default('latest'),
});

export const getByIdInputSchema = z.object({
  id: z.string(),
});

export const getUserPostsInputSchema = z.object({
  userId: z.string(),
  contentType: z.enum(["all", "POST", "MOMENT"]).default("all"),
  filter: z.enum(["all", "images", "videos", "text"]).default("all"),
  sort: z.enum(["latest", "popular", "oldest"]).default("latest"),
  limit: z.number().min(1).max(50).default(12),
  cursor: z.string().optional(),
});

export const getUserLikedPostsInputSchema = z.object({
  userId: z.string(),
  limit: z.number().min(1).max(50).default(12),
  cursor: z.string().optional(),
});

export const getRecommendedInputSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  cursor: z.string().optional(),
}).optional().default({});

export const getFollowingInputSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  cursor: z.string().optional(),
});

export const getTrendingInputSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  period: z.enum(["today", "week", "month", "all"]).default("today"),
  cursor: z.string().optional(),
});

export const getLatestInputSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  cursor: z.string().optional(),
  type: z.enum(["all", "POST", "MOMENT"]).default("all"),
});

export const getTrendingStatsInputSchema = z.object({
  period: z.enum(["today", "week", "month", "all"]).default("today"),
});

export const searchInputSchema = z.object({
  query: z.string().min(1),
  type: z.enum(["posts", "users", "tags"]).optional(),
  limit: z.number().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const getInfiniteInputSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  cursor: z.string().optional(),
  type: z.enum(["all", "POST", "MOMENT"]).default("all"),
  sortBy: z.enum(["latest", "popular", "trending"]).default("latest"),
});

// 创建相关的schema
export const createPostInputSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(255, "标题最多255个字符"),
  content: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY', 'PREMIUM_ONLY']).default('PUBLIC'),
  isPublic: z.boolean().default(true),
  isPremium: z.boolean().default(false),
  isDraft: z.boolean().default(true),
  contentType: z.enum(['POST', 'MOMENT']).default('POST'),
  mediaIds: z.array(z.string()).optional(),
  downloadLinks: z.array(z.object({
    platform: z.string(),
    url: z.string(),
    extractCode: z.string().optional(),
    cansPrice: z.number().min(0).max(10000),
    title: z.string(),
    description: z.string().optional(),
    sortOrder: z.number(),
  })).optional(),
});

export const createMomentInputSchema = z.object({
  content: z.string().min(1, "动态内容不能为空").max(2000, "动态内容不能超过2000字符"),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY']).default('PUBLIC'),
  mediaIds: z.array(z.string()).optional(),
});

// 互动相关的schema
export const reactInputSchema = z.object({
  postId: z.string(),
  reactionType: z.string().nullable(), // null表示取消反应
});

export const likeInputSchema = z.object({
  postId: z.string(),
});

export const unlikeInputSchema = z.object({
  postId: z.string(),
});

export const getLikeStatusInputSchema = z.object({
  postIds: z.array(z.string()),
});

export const getReactionStatsInputSchema = z.object({
  postId: z.string(),
  includeUsers: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(20),
});

// 管理相关的schema
export const deletePostInputSchema = z.object({
  id: z.string().min(1, "帖子ID不能为空"),
  reason: z.string().optional(),
});

export const updatePostInputSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'FOLLOWERS_ONLY', 'PREMIUM_ONLY']).optional(),
  isPublic: z.boolean().optional(),
  isPremium: z.boolean().optional(),
  contentType: z.string().optional(),
  likeCount: z.number().optional(),
  viewCount: z.number().optional(),
  mediaIds: z.array(z.string()).optional(), // 添加媒体文件ID支持
});
