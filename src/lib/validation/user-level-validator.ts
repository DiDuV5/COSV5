/**
 * @fileoverview 用户权限等级验证器
 * @description 确保用户权限系统的一致性和有效性
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * CoserEden 6级权限体系常量
 */
export const VALID_USER_LEVELS = [
  'GUEST',
  'USER',
  'VIP',
  'CREATOR',
  'ADMIN',
  'SUPER_ADMIN'
] as const;

/**
 * 用户等级类型
 */
export type ValidUserLevel = typeof VALID_USER_LEVELS[number];

/**
 * 用户等级验证Schema
 */
export const UserLevelSchema = z.enum(VALID_USER_LEVELS, {
  errorMap: (issue, ctx) => {
    return {
      message: `无效的用户等级: ${ctx.data}. 有效等级: ${VALID_USER_LEVELS.join(', ')}`
    };
  }
});

/**
 * 用户等级权限映射
 */
export const USER_LEVEL_PERMISSIONS = {
  GUEST: {
    level: 0,
    name: '访客',
    permissions: ['view_public_content'],
    mediaAccessPercentage: 20,
    canUpload: false,
    canComment: false,
    canLike: false,
  },
  USER: {
    level: 1,
    name: '入馆用户',
    permissions: ['view_public_content', 'comment', 'like', 'follow'],
    mediaAccessPercentage: 60,
    canUpload: true,
    canComment: true,
    canLike: true,
  },
  VIP: {
    level: 2,
    name: 'VIP会员',
    permissions: ['view_public_content', 'comment', 'like', 'follow', 'view_vip_content'],
    mediaAccessPercentage: 80,
    canUpload: true,
    canComment: true,
    canLike: true,
  },
  CREATOR: {
    level: 3,
    name: '荣誉创作者',
    permissions: [
      'view_public_content', 'comment', 'like', 'follow', 'view_vip_content',
      'publish_content', 'manage_own_content', 'bulk_upload'
    ],
    mediaAccessPercentage: 100,
    canUpload: true,
    canComment: true,
    canLike: true,
  },
  ADMIN: {
    level: 4,
    name: '守馆管理员',
    permissions: [
      'view_public_content', 'comment', 'like', 'follow', 'view_vip_content',
      'publish_content', 'manage_own_content', 'bulk_upload',
      'manage_all_content', 'manage_users', 'view_admin_panel'
    ],
    mediaAccessPercentage: 100,
    canUpload: true,
    canComment: true,
    canLike: true,
  },
  SUPER_ADMIN: {
    level: 5,
    name: '超级管理员',
    permissions: [
      'view_public_content', 'comment', 'like', 'follow', 'view_vip_content',
      'publish_content', 'manage_own_content', 'bulk_upload',
      'manage_all_content', 'manage_users', 'view_admin_panel',
      'system_config', 'user_approval'
    ],
    mediaAccessPercentage: 100,
    canUpload: true,
    canComment: true,
    canLike: true,
  },
} as const;

/**
 * 验证用户等级是否有效
 */
export function isValidUserLevel(level: string): level is ValidUserLevel {
  return VALID_USER_LEVELS.includes(level as ValidUserLevel);
}

/**
 * 获取用户等级权限信息
 */
export function getUserLevelPermissions(level: ValidUserLevel) {
  return USER_LEVEL_PERMISSIONS[level];
}

/**
 * 检查用户是否有特定权限
 */
export function hasPermission(userLevel: ValidUserLevel, permission: string): boolean {
  const levelPermissions = USER_LEVEL_PERMISSIONS[userLevel];
  return levelPermissions.permissions.includes(permission as any);
}

/**
 * 检查用户等级是否高于指定等级
 */
export function isLevelHigherThan(userLevel: ValidUserLevel, compareLevel: ValidUserLevel): boolean {
  const userLevelNum = USER_LEVEL_PERMISSIONS[userLevel].level;
  const compareLevelNum = USER_LEVEL_PERMISSIONS[compareLevel].level;
  return userLevelNum > compareLevelNum;
}

/**
 * 检查用户等级是否为管理员级别
 */
export function isAdminLevel(level: ValidUserLevel): boolean {
  return level === 'ADMIN' || level === 'SUPER_ADMIN';
}

/**
 * 检查用户等级是否为创作者级别或以上
 */
export function isCreatorOrAbove(level: ValidUserLevel): boolean {
  return isLevelHigherThan(level, 'VIP') || level === 'CREATOR';
}

/**
 * 获取所有用户等级选项（用于下拉选择）
 */
export function getUserLevelOptions() {
  return VALID_USER_LEVELS.map(level => ({
    value: level,
    label: USER_LEVEL_PERMISSIONS[level].name,
    level: USER_LEVEL_PERMISSIONS[level].level,
    permissions: USER_LEVEL_PERMISSIONS[level].permissions,
  }));
}

/**
 * 验证并标准化用户等级
 * 处理历史数据中的MEMBER等级
 */
export function normalizeUserLevel(level: string): ValidUserLevel {
  // 处理历史数据中的MEMBER等级，映射到VIP
  // eslint-disable-next-line no-restricted-syntax
  if (level === 'MEMBER') {
    console.warn(`发现过时的用户等级 MEMBER，自动映射到 VIP`);
    return 'VIP';
  }

  // 验证等级有效性
  if (!isValidUserLevel(level)) {
    console.error(`无效的用户等级: ${level}，默认设置为 USER`);
    return 'USER';
  }

  return level;
}

/**
 * 批量验证用户等级数据
 */
export interface UserLevelValidationResult {
  isValid: boolean;
  invalidLevels: string[];
  suggestions: string[];
  totalUsers: number;
  validUsers: number;
}

export function validateUserLevelsData(userLevels: string[]): UserLevelValidationResult {
  const invalidLevels: string[] = [];
  const suggestions: string[] = [];

  userLevels.forEach(level => {
    if (!isValidUserLevel(level)) {
      invalidLevels.push(level);

      // eslint-disable-next-line no-restricted-syntax
      if (level === 'MEMBER') {
        suggestions.push(`将 MEMBER 等级迁移到 VIP 等级`);
      } else {
        suggestions.push(`将无效等级 ${level} 设置为 USER 等级`);
      }
    }
  });

  return {
    isValid: invalidLevels.length === 0,
    invalidLevels,
    suggestions,
    totalUsers: userLevels.length,
    validUsers: userLevels.length - invalidLevels.length,
  };
}
