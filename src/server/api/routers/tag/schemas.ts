/**
 * @fileoverview 标签路由输入验证模式
 * @description 包含所有标签相关API的Zod验证模式
 */

import { z } from "zod";

// 基础标签查询模式
export const getRelatedSchema = z.object({
  tag: z.string(),
  limit: z.number().min(1).max(50).default(20),
});

export const getStatsSchema = z.object({
  tag: z.string(),
});

export const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).default(20),
});

export const getTrendingSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  timeRange: z.enum(['day', 'week', 'month', 'all']).default('week'),
});

export const getPopularSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
});

export const getMultipleStatsSchema = z.object({
  tags: z.array(z.string()),
});

// 管理员查询模式
export const getAllForAdminSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'count', 'created', 'updated']).default('count'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['all', 'active', 'disabled', 'deleted']).default('all'),
});

export const getStatsForAdminSchema = z.object({
  timeRange: z.enum(['day', 'week', 'month', 'year', 'all']).default('month'),
  limit: z.number().min(1).max(50).default(20),
});

// 标签管理操作模式
export const mergeTagsSchema = z.object({
  sourceTagNames: z.array(z.string()).min(2, '至少需要选择2个标签进行合并'),
  targetTagName: z.string().min(1, '目标标签名称不能为空'),
  reason: z.string().optional(),
});

export const renameTagSchema = z.object({
  oldName: z.string().min(1, '原标签名称不能为空'),
  newName: z.string().min(1, '新标签名称不能为空'),
  reason: z.string().optional(),
});

export const deleteTagsSchema = z.object({
  tagNames: z.array(z.string()).min(1, '至少需要选择1个标签进行删除'),
  softDelete: z.boolean().default(true),
  reason: z.string().optional(),
});

export const restoreTagSchema = z.object({
  tagName: z.string().min(1, "标签名称不能为空"),
  reason: z.string().optional(),
});

export const batchRestoreTagsSchema = z.object({
  tagNames: z.array(z.string()).min(1, "至少选择一个标签"),
  reason: z.string().optional(),
});

// 标签统计类型定义
export type TagStats = {
  count: number;
  views: number;
  likes: number;
  comments: number;
};

export type TagWithStats = {
  name: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  heatScore: number;
};

export type AdminTagInfo = {
  name: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  firstUsed: Date;
  lastUsed: Date;
  status: 'active' | 'disabled' | 'deleted';
};

export type TrendingTag = TagWithStats;

export type PopularTag = {
  name: string;
  usageCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  heatScore: number;
};

// 时间范围计算常量
export const TIME_RANGES = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
} as const;

// 热度分数计算权重
export const HEAT_SCORE_WEIGHTS = {
  postCount: 10,
  viewWeight: 0.1,
  likeWeight: 2,
  commentWeight: 3,
} as const;
