/**
 * @fileoverview Dashboard组件类型定义
 * @description 个人中心相关的TypeScript类型定义
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @changelog
 * - 2024-01-XX: 从dashboard-client.tsx提取类型定义
 */

import type { User } from 'next-auth';

/**
 * 用户统计数据接口
 */
export interface UserStats {
  followersCount: number;
  followingCount: number;
  likeCount: number;
  visitorsCount: number;
  momentsCount: number;
  postsCount: number;
}

/**
 * 社交媒体链接接口
 */
export interface SocialLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  customIcon?: string | null;
}

/**
 * 罐头账户信息接口
 */
export interface CansAccount {
  availableCans: number;
  totalEarned?: number;
  totalSpent?: number;
}

/**
 * 签到状态接口
 */
export interface CheckinStatus {
  hasCheckedInToday: boolean;
  consecutiveCheckins: number;
  lastCheckinDate?: Date | null;
}

/**
 * 任务状态枚举
 */
export type TaskStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'DISABLED';

/**
 * 任务类型枚举
 */
export type TaskType =
  | 'DAILY_LOGIN'
  | 'DAILY_CHECKIN'
  | 'POST_CREATION'
  | 'COMMENT_CREATION'
  | 'LIKE_CREATION'
  | 'FOLLOW_USER';

/**
 * 每日任务接口 - 修正版本
 */
export interface DailyTask {
  /** 任务唯一标识 */
  id?: string;
  /** 任务名称（用于显示） */
  name: string;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description: string;
  /** 罐头奖励数量 */
  cansReward: number;
  /** 剩余可完成次数 */
  remaining: number;
  /** 已完成次数 */
  completed: number;
  /** 完成进度百分比 (0-100) */
  progress: number;
  /** 任务状态 */
  status: TaskStatus;
  /** 是否启用 */
  isEnabled: boolean;
  /** 总奖励（cansReward * dailyLimit） */
  totalReward: number;
  /** 任务类型 */
  type: TaskType;
  /** 每日限制次数 */
  dailyLimit: number;
}

/**
 * 签到结果接口
 */
export interface CheckinResult {
  cansEarned: number;
  bonusCans: number;
  consecutiveDays: number;
  message?: string;
}

/**
 * Dashboard数据Hook返回类型
 */
export interface DashboardData {
  userStats?: UserStats;
  socialLinks?: SocialLink[];
  cansAccount?: CansAccount;
  checkinStatus?: CheckinStatus;
  availableTasks?: DailyTask[];
  availableTasksCount: number;
  canCheckin: boolean;
  isPending: boolean;
}

/**
 * Dashboard操作Hook返回类型
 */
export interface DashboardActions {
  handleCheckin: () => Promise<void>;
  refetchCansAccount: () => void;
  refetchCheckinStatus: () => void;
  isChecking: boolean;
}

/**
 * 个人资料卡片Props
 */
export interface PersonalProfileCardProps {
  user: User;
  userStats?: UserStats;
  socialLinks?: SocialLink[];
}

/**
 * 罐头系统卡片Props
 */
export interface CansSystemCardProps {
  cansAccount?: CansAccount;
  checkinStatus?: CheckinStatus;
  availableTasksCount: number;
  canCheckin: boolean;
  onCheckin: () => Promise<void>;
  isChecking: boolean;
}

/**
 * 统计概览Props
 */
export interface StatsOverviewProps {
  userStats?: UserStats;
}

/**
 * 快捷操作Props
 */
export interface QuickActionsProps {
  // 暂时不需要特殊props，使用默认的React.ComponentProps
}

/**
 * 用户级别显示文本映射 - CoserEden 6级权限体系
 */
export const USER_LEVEL_LABELS = {
  ADMIN: '管理员',
  CREATOR: '创作者',
  USER: '注册用户',
  VIP: 'VIP用户',
  GUEST: '游客',
  SUPER_ADMIN: '超级管理员',
} as const;

/**
 * 用户级别类型
 */
export type UserLevel = keyof typeof USER_LEVEL_LABELS;
