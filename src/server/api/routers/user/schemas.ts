/**
 * @fileoverview 用户路由输入验证模式
 * @description 包含所有用户相关API的Zod验证模式
 */

import { z } from 'zod';

// 基础分页模式
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().optional(),
});

// 用户查询模式
export const getUsersSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().optional(),
  search: z.string().optional(),
  userLevel: z.string().optional(),
});

export const getByUsernameSchema = z.object({
  username: z.string(),
});

export const getByIdSchema = z.object({
  id: z.string(),
});

export const getDetailedStatsSchema = z
  .object({
    username: z.string().optional(),
  })
  .optional()
  .default({});

// 关注系统模式
export const followUserSchema = z.object({
  userId: z.string(),
});

export const unfollowUserSchema = z.object({
  userId: z.string(),
});

export const getFollowingSchema = z.object({
  userId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const getFollowersSchema = z.object({
  userId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const isFollowingSchema = z.object({
  userId: z.string(),
});

// 推荐用户模式
export const getRecommendedSchema = z.object({
  limit: z.number().min(1).max(50).default(12),
  cursor: z.string().optional(),
});

// 隐私设置模式
export const updatePrivacySettingsSchema = z.object({
  profileVisibility: z.enum(['PUBLIC', 'USERS_ONLY', 'FOLLOWERS_ONLY', 'PRIVATE']).optional(),
  showVisitorHistory: z.boolean().optional(),
  showSocialLinks: z.boolean().optional(),
  allowDirectMessages: z.enum(['EVERYONE', 'FOLLOWERS', 'NONE']).optional(),
});

// 社交链接模式
export const socialLinkSchema = z.object({
  platform: z.enum([
    'TELEGRAM',
    'WEIBO',
    'TWITTER',
    'INSTAGRAM',
    'TIKTOK',
    'YOUTUBE',
    'BILIBILI',
    'GITHUB',
    'ZHIHU',
    'CUSTOM',
  ]),
  username: z.string().min(1).max(100),
  url: z.string().url(),
  isPublic: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  customTitle: z.string().max(50).optional(),
  customIcon: z.string().optional(),
});

export const updateSocialLinksSchema = z.object({
  links: z.array(socialLinkSchema),
});

export const getSocialLinksSchema = z.object({
  userId: z.string(),
});

// 用户资料更新模式
export const updateProfileSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  profileVisibility: z.enum(['PUBLIC', 'FOLLOWERS', 'FOLLOWING', 'PRIVATE']).optional(),
  showVisitorHistory: z.boolean().optional(),
  showSocialLinks: z.boolean().optional(),
  allowDirectMessages: z.enum(['EVERYONE', 'FOLLOWING', 'FOLLOWERS', 'NONE']).optional(),
});

// 头像更新模式
export const updateAvatarSchema = z.object({
  avatarData: z.string(), // base64 编码的图片数据
  filename: z.string(),
});

// 搜索和提及模式
export const searchForMentionSchema = z.object({
  query: z.string().min(1).max(50),
  limit: z.number().min(1).max(20).default(10),
  currentUserId: z.string().optional(),
});

export const getActiveForMentionSchema = z.object({
  limit: z.number().min(1).max(20).default(10),
  currentUserId: z.string().optional(),
});

// 用户选择字段模式
export const basicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  userLevel: true,
  isVerified: true,
  followersCount: true,
  followingCount: true,
  postsCount: true,
  createdAt: true,
} as const;

export const fullUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  location: true,
  website: true,
  userLevel: true,
  isVerified: true,
  isActive: true,
  canPublish: true,
  postsCount: true,
  followersCount: true,
  followingCount: true,
  likeCount: true,
  points: true,
  createdAt: true,
  profileVisibility: true,
  showVisitorHistory: true,
  showSocialLinks: true,
  allowDirectMessages: true,
} as const;

export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  bannerUrl: true,
  location: true,
  website: true,
  userLevel: true,
  isVerified: true,
  isActive: true,
  postsCount: true,
  followersCount: true,
  followingCount: true,
  likeCount: true,
  points: true,
  createdAt: true,
  profileVisibility: true,
  showVisitorHistory: true,
  showSocialLinks: true,
  allowDirectMessages: true,
  socialLinks: {
    where: { isPublic: true },
    select: {
      id: true,
      platform: true,
      username: true,
      url: true,
      isPublic: true,
      order: true,
      customTitle: true,
      customIcon: true,
    },
  },
} as const;

export const privacySettingsSelect = {
  profileVisibility: true,
  showVisitorHistory: true,
  showSocialLinks: true,
  allowDirectMessages: true,
} as const;

export const mentionUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  userLevel: true,
  isVerified: true,
  followersCount: true,
} as const;
