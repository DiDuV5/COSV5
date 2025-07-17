/**
 * @fileoverview 用户个人主页相关类型定义
 * @description 定义个人主页、访客记录、社交链接等相关类型
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - zod: ^3.22.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { z } from 'zod';

// 用户隐私设置类型
export const PrivacySettingsSchema = z.object({
  profileVisibility: z.enum(['PUBLIC', 'USERS_ONLY', 'FOLLOWERS_ONLY', 'PRIVATE']),
  showVisitorHistory: z.boolean(),
  showSocialLinks: z.boolean(),
  allowDirectMessages: z.enum(['EVERYONE', 'FOLLOWERS', 'NONE']),
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

// 社交平台类型
export const SocialPlatformSchema = z.enum([
  'WEIBO',
  'TWITTER',
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE',
  'BILIBILI',
  'GITHUB',
  'ZHIHU',
  'CUSTOM',
]);

export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

// 社交链接类型
export const SocialLinkSchema = z.object({
  id: z.string().optional(),
  platform: SocialPlatformSchema,
  username: z.string().min(1).max(100),
  url: z.string().url(),
  isPublic: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  // 自定义链接专用字段
  customTitle: z.string().max(50).optional(), // 自定义链接标题
  customIcon: z.string().optional(), // 自定义图标名称
});

export type SocialLink = z.infer<typeof SocialLinkSchema>;

// 访客类型
export const VisitorTypeSchema = z.enum(['GUEST', 'USER', 'FOLLOWER', 'FOLLOWING']);

export type VisitorType = z.infer<typeof VisitorTypeSchema>;

// 访客记录类型
export const ProfileVisitorSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  visitorId: z.string().nullable(),
  visitorIp: z.string().nullable(),
  userAgent: z.string().nullable(),
  visitedAt: z.date(),
  visitorType: VisitorTypeSchema,
  visitor: z
    .object({
      id: z.string(),
      username: z.string(),
      displayName: z.string().nullable(),
      avatarUrl: z.string().nullable(),
      userLevel: z.string(),
      isVerified: z.boolean(),
    })
    .nullable(),
});

export type ProfileVisitor = z.infer<typeof ProfileVisitorSchema>;

// 访客统计类型
export const VisitorStatsSchema = z.object({
  totalVisitors: z.number(),
  breakdown: z.object({
    guest: z.number(),
    user: z.number(),
    follower: z.number(),
    following: z.number(),
  }),
});

export type VisitorStats = z.infer<typeof VisitorStatsSchema>;

// 用户个人主页信息类型
export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  userLevel: z.string(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  postsCount: z.number(),
  followersCount: z.number(),
  followingCount: z.number(),
  likeCount: z.number(),
  points: z.number(),
  createdAt: z.date(),
  // 隐私设置
  profileVisibility: z.string(),
  showVisitorHistory: z.boolean(),
  showSocialLinks: z.boolean(),
  allowDirectMessages: z.string(),
  // 社交链接
  socialLinks: z.array(SocialLinkSchema).optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// 社交平台配置
export const SOCIAL_PLATFORMS = {
  WEIBO: {
    name: '微博',
    icon: 'weibo',
    color: '#e6162d',
    urlPattern: 'https://weibo.com/{username}',
    placeholder: '微博用户名',
  },
  TWITTER: {
    name: 'Twitter/X',
    icon: 'twitter',
    color: '#1da1f2',
    urlPattern: 'https://x.com/{username}',
    placeholder: '用户名（不含@）',
  },
  INSTAGRAM: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#e4405f',
    urlPattern: 'https://instagram.com/{username}',
    placeholder: '用户名（不含@）',
  },
  TIKTOK: {
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    urlPattern: 'https://tiktok.com/@{username}',
    placeholder: '用户名（不含@）',
  },
  YOUTUBE: {
    name: 'YouTube',
    icon: 'youtube',
    color: '#ff0000',
    urlPattern: 'https://youtube.com/@{username}',
    placeholder: '频道名称',
  },
  BILIBILI: {
    name: '哔哩哔哩',
    icon: 'bilibili',
    color: '#00a1d6',
    urlPattern: 'https://space.bilibili.com/{username}',
    placeholder: 'UID或用户名',
  },
  GITHUB: {
    name: 'GitHub',
    icon: 'github',
    color: '#333333',
    urlPattern: 'https://github.com/{username}',
    placeholder: 'GitHub用户名',
  },
  ZHIHU: {
    name: '知乎',
    icon: 'zhihu',
    color: '#0084ff',
    urlPattern: 'https://zhihu.com/people/{username}',
    placeholder: '知乎用户名',
  },
  CUSTOM: {
    name: '自定义链接',
    icon: 'link',
    color: '#6b7280',
    urlPattern: '{url}',
    placeholder: '完整URL地址',
  },
} as const;

// 用户等级配置 - CoserEden 6级权限体系
export const USER_LEVELS = {
  GUEST: {
    name: '访客',
    color: '#6b7280',
    permissions: ['view_public'],
  },
  USER: {
    name: '入馆',
    color: '#3b82f6',
    permissions: ['view_public', 'interact', 'comment'],
  },
  VIP: {
    name: 'VIP',
    color: '#10b981',
    permissions: ['view_public', 'view_premium', 'interact', 'comment'],
  },
  CREATOR: {
    name: '荣誉',
    color: '#8b5cf6',
    permissions: ['view_public', 'view_premium', 'interact', 'comment', 'publish'],
  },
  ADMIN: {
    name: '守馆',
    color: '#ef4444',
    permissions: ['all'],
  },
  SUPER_ADMIN: {
    name: '超级管理员',
    color: '#dc2626',
    permissions: ['all'],
  },
} as const;

// 隐私级别配置
export const PRIVACY_LEVELS = {
  PUBLIC: {
    name: '公开',
    description: '所有人都可以查看',
    icon: 'globe',
  },
  USERS_ONLY: {
    name: '仅用户',
    description: '仅登录用户可以查看',
    icon: 'users',
  },
  FOLLOWERS_ONLY: {
    name: '仅关注者',
    description: '仅关注我的用户可以查看',
    icon: 'user-check',
  },
  PRIVATE: {
    name: '私密',
    description: '仅自己可以查看',
    icon: 'lock',
  },
} as const;

// 访客类型配置
export const VISITOR_TYPES = {
  GUEST: {
    name: '游客',
    color: '#6b7280',
    icon: 'user',
  },
  USER: {
    name: '用户',
    color: '#3b82f6',
    icon: 'user',
  },
  FOLLOWER: {
    name: '粉丝',
    color: '#10b981',
    icon: 'heart',
  },
  FOLLOWING: {
    name: '关注',
    color: '#f59e0b',
    icon: 'user-plus',
  },
} as const;
