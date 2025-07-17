/**
 * @fileoverview 用户等级类型定义
 * @description 定义用户等级相关的类型和常量
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建
 */

/**
 * 用户等级枚举 - CoserEden 6级权限体系
 */
export const UserLevel = {
  GUEST: 'GUEST',           // 访客 - 基础权限
  USER: 'USER',             // 入馆 - 基本用户权限
  VIP: 'VIP',               // VIP - 会员权限
  CREATOR: 'CREATOR',       // 荣誉 - 创作者权限，支持大批量上传
  ADMIN: 'ADMIN',           // 守馆 - 管理员权限
  SUPER_ADMIN: 'SUPER_ADMIN', // 超级管理员 - 最高权限
} as const;

/**
 * 用户等级类型
 */
export type UserLevel = typeof UserLevel[keyof typeof UserLevel];

/**
 * 用户等级信息
 */
export interface UserLevelInfo {
  level: UserLevel;
  name: string;
  description: string;
  color: string;
  priority: number;
}

/**
 * 用户等级配置映射 - CoserEden 6级权限体系
 */
export const USER_LEVEL_INFO: Record<UserLevel, UserLevelInfo> = {
  [UserLevel.GUEST]: {
    level: UserLevel.GUEST,
    name: '访客',
    description: '基础权限，限制较多',
    color: 'bg-gray-500',
    priority: 1,
  },
  [UserLevel.USER]: {
    level: UserLevel.USER,
    name: '入馆',
    description: '基本用户权限',
    color: 'bg-blue-500',
    priority: 2,
  },
  [UserLevel.VIP]: {
    level: UserLevel.VIP,
    name: 'VIP',
    description: 'VIP会员权限，享受更多功能',
    color: 'bg-green-500',
    priority: 3,
  },
  [UserLevel.CREATOR]: {
    level: UserLevel.CREATOR,
    name: '荣誉',
    description: '创作者权限，支持大批量上传',
    color: 'bg-purple-500',
    priority: 4,
  },
  [UserLevel.ADMIN]: {
    level: UserLevel.ADMIN,
    name: '守馆',
    description: '管理员权限',
    color: 'bg-red-500',
    priority: 5,
  },
  [UserLevel.SUPER_ADMIN]: {
    level: UserLevel.SUPER_ADMIN,
    name: '超级管理员',
    description: '超级管理员权限，最高权限',
    color: 'bg-red-700',
    priority: 6,
  },
};

/**
 * 检查用户等级是否有效
 */
export function isValidUserLevel(level: string): level is UserLevel {
  return Object.values(UserLevel).includes(level as UserLevel);
}

/**
 * 获取用户等级信息
 */
export function getUserLevelInfo(level: UserLevel): UserLevelInfo {
  return USER_LEVEL_INFO[level];
}

/**
 * 检查用户等级是否为高级用户
 */
export function isAdvancedUser(level: UserLevel): boolean {
  return level === UserLevel.CREATOR || level === UserLevel.ADMIN;
}

/**
 * 检查用户等级是否为VIP用户
 */
export function isVIPUser(level: UserLevel): boolean {
  return isAdvancedUser(level);
}

/**
 * 比较用户等级优先级
 */
export function compareUserLevel(level1: UserLevel, level2: UserLevel): number {
  const info1 = getUserLevelInfo(level1);
  const info2 = getUserLevelInfo(level2);
  return info1.priority - info2.priority;
}

/**
 * 获取用户等级列表（按优先级排序）
 */
export function getUserLevelList(): UserLevelInfo[] {
  return Object.values(USER_LEVEL_INFO).sort((a, b) => a.priority - b.priority);
}
