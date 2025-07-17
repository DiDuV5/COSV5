/**
 * @fileoverview 用户等级配置常量和类型定义
 * @description 定义用户等级的配置信息和权限类型
 */

import { z } from 'zod';

/**
 * 用户等级配置
 */
export const USER_LEVEL_CONFIGS = [
  {
    value: 'GUEST',
    label: '游客',
    color: '#9CA3AF',
    icon: 'Users',
    description: '未注册用户，权限最低',
    defaultMediaAccess: 20,
  },
  {
    value: 'USER',
    label: '注册用户',
    color: '#3B82F6',
    icon: 'User',
    description: '已注册用户，基础权限',
    defaultMediaAccess: 60,
  },
  {
    value: 'VIP',
    label: 'VIP用户',
    color: '#F59E0B',
    icon: 'Star',
    description: 'VIP用户，增强权限',
    defaultMediaAccess: 80,
  },
  {
    value: 'CREATOR',
    label: '创作者',
    color: '#10B981',
    icon: 'Crown',
    description: '内容创作者，高级权限',
    defaultMediaAccess: 100,
  },
  {
    value: 'ADMIN',
    label: '管理员',
    color: '#8B5CF6',
    icon: 'Shield',
    description: '系统管理员，完全权限',
    defaultMediaAccess: 100,
  },
  {
    value: 'SUPER_ADMIN',
    label: '超级管理员',
    color: '#EF4444',
    icon: 'Crown',
    description: '超级管理员，最高权限',
    defaultMediaAccess: 100,
  },
] as const;

/**
 * 用户等级类型
 */
export type UserLevel = typeof USER_LEVEL_CONFIGS[number]['value'];

/**
 * 媒体权限配置项Schema
 */
export const MediaPermissionConfigSchema = z.object({
  userLevel: z.enum(['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN']),
  mediaAccessPercentage: z.number().min(0).max(100),
  canPlayVideos: z.boolean(),
  canViewRestrictedPreview: z.boolean(),
  canDownloadImages: z.boolean(),
});

/**
 * 媒体权限表单Schema
 */
export const MediaPermissionFormSchema = z.object({
  configs: z.array(MediaPermissionConfigSchema),
  reason: z.string().min(1, '请填写操作原因'),
});

/**
 * 媒体权限配置项类型
 */
export type MediaPermissionConfig = z.infer<typeof MediaPermissionConfigSchema>;

/**
 * 媒体权限表单类型
 */
export type MediaPermissionForm = z.infer<typeof MediaPermissionFormSchema>;

/**
 * 权限概览数据类型
 */
export interface PermissionOverview {
  userLevel: UserLevel;
  mediaAccessPercentage: number;
  canPlayVideos: boolean;
  canViewRestrictedPreview: boolean;
  canDownloadImages: boolean;
  userCount: number;
}

/**
 * 获取用户等级配置
 */
export function getUserLevelConfig(userLevel: UserLevel) {
  return USER_LEVEL_CONFIGS.find(config => config.value === userLevel);
}

/**
 * 获取默认权限配置
 */
export function getDefaultPermissionConfig(userLevel: UserLevel): MediaPermissionConfig {
  const levelConfig = getUserLevelConfig(userLevel);
  
  return {
    userLevel,
    mediaAccessPercentage: levelConfig?.defaultMediaAccess ?? 0,
    canPlayVideos: true,
    canViewRestrictedPreview: userLevel !== 'GUEST',
    canDownloadImages: userLevel !== 'GUEST',
  };
}

/**
 * 获取所有默认权限配置
 */
export function getAllDefaultPermissionConfigs(): MediaPermissionConfig[] {
  return USER_LEVEL_CONFIGS.map(config => getDefaultPermissionConfig(config.value));
}

/**
 * 权限级别比较
 */
export function comparePermissionLevel(level1: UserLevel, level2: UserLevel): number {
  const index1 = USER_LEVEL_CONFIGS.findIndex(config => config.value === level1);
  const index2 = USER_LEVEL_CONFIGS.findIndex(config => config.value === level2);
  
  return index1 - index2;
}

/**
 * 检查权限级别是否足够
 */
export function hasPermissionLevel(userLevel: UserLevel, requiredLevel: UserLevel): boolean {
  return comparePermissionLevel(userLevel, requiredLevel) >= 0;
}

/**
 * 权限配置验证规则
 */
export const PERMISSION_VALIDATION_RULES = {
  mediaAccessPercentage: {
    min: 0,
    max: 100,
    step: 5,
  },
  reasonMinLength: 1,
  reasonMaxLength: 500,
} as const;
