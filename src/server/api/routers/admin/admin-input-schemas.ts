/**
 * @fileoverview 管理员路由输入验证模式
 * @description 包含管理员功能的所有输入验证schema
 */

import { z } from "zod";

// 系统设置相关
export const getSettingsSchema = z.object({
  category: z.string().optional(),
});

export const updateSettingsSchema = z.object({
  settings: z.array(z.object({
    key: z.string(),
    value: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    isPublic: z.boolean().optional(),
  })),
});

// 用户管理相关
export const getUsersSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  search: z.string().optional(),
  userLevel: z.string().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'username', 'postsCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const getUserByIdSchema = z.object({
  userId: z.string(),
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  displayName: z.string().max(50).optional(),
  userLevel: z.enum(['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN']).default('USER'),
  isVerified: z.boolean().default(false),
  canPublish: z.boolean().default(false),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export const createUsersBatchSchema = z.object({
  users: z.array(
    z.object({
      username: z.string().min(3).max(20),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
      displayName: z.string().max(50).optional(),
      userLevel: z.enum(['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN']).default('USER'),
      isVerified: z.boolean().default(false),
      canPublish: z.boolean().default(false),
      bio: z.string().max(500).optional(),
    })
  ).min(1).max(50),
  sendWelcomeEmail: z.boolean().default(false),
});

export const updateUserSchema = z.object({
  userId: z.string(),
  username: z.string().min(3).max(20).optional(),
  email: z.string().email().optional(),
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  userLevel: z.enum(['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN']).optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  canPublish: z.boolean().optional(),
  avatarUrl: z.string().url().optional(),
});

export const resetUserPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(6),
});

export const deleteUserSchema = z.object({
  userId: z.string(),
  reason: z.string().optional(),
});

// 权限管理相关
export const updateUserLevelSchema = z.object({
  userId: z.string(),
  userLevel: z.string(),
  canPublish: z.boolean().optional(),
  reason: z.string().optional(),
});

export const batchUpdateUserLevelSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
  userLevel: z.enum(['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN']),
  reason: z.string().optional(),
});

// 内容审核相关
export const getPendingCommentsSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const moderateCommentSchema = z.object({
  commentId: z.string(),
  action: z.enum(["approve", "reject", "hide"]),
  reason: z.string().optional(),
});

// 审计日志相关
export const getAuditLogsSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
});

// 访客统计相关
export const getUserVisitorStatsSchema = z.object({
  userId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// 上传设置相关
export const getUploadSettingsSchema = z.object({
  category: z.enum(['storage', 'limits', 'security', 'all']).default('all'),
});

export const updateUploadSettingsSchema = z.object({
  storageProvider: z.enum(['local', 'cloudflare-r2', 's3']).optional(),
  enableDeduplication: z.boolean().optional(),
  imageQuality: z.number().min(1).max(100).optional(),
  maxFileSize: z.number().min(1).optional(), // 字节
  allowedTypes: z.array(z.string()).optional(),
  enableThumbnails: z.boolean().optional(),
  maxFilesPerPost: z.number().min(1).max(50).optional(),
  cdnUrl: z.string().url().optional(),
});

// 访客统计相关
export const getVisitorStatsSchema = z.object({
  timeRange: z.enum(['day', 'week', 'month']).default('week'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const getRegistrationStatsSchema = z.object({
  timeRange: z.enum(['day', 'week', 'month']).default('week'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// 上传统计相关
export const getUploadStatsSchema = z.object({
  timeRange: z.enum(['day', 'week', 'month']).default('week'),
  fileType: z.enum(['image', 'video', 'all']).default('all'),
});
