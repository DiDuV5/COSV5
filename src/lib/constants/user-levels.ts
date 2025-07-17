/**
 * @fileoverview 用户等级常量定义
 * @description Tu平台用户组系统的统一配置文件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { USER_LEVELS, getUserLevelIcon } from '@/lib/constants/user-levels'
 *
 * @dependencies
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，重命名用户组系统
 */

import React from "react";
import {
  User,
  Users,
  Crown,
  Star,
  Shield,
  UserCheck,
  Eye
} from "lucide-react";

// 用户等级枚举值 - CoserEden 6级权限体系
export const USER_LEVEL_VALUES = {
  VISITOR: "GUEST",      // 访客
  USER: "USER",          // 入馆
  VIP: "VIP",            // VIP会员
  HONORARY: "CREATOR",   // 荣誉创作者
  CURATOR: "ADMIN",      // 守馆管理员
  SUPER_CURATOR: "SUPER_ADMIN", // 超级管理员
} as const;

// 用户等级配置
export const USER_LEVELS = {
  [USER_LEVEL_VALUES.VISITOR]: {
    name: "访客",
    color: "#6B7280",
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
    description: "未注册的访问用户",
    permissions: ["view_public"],
    icon: Eye,
  },
  [USER_LEVEL_VALUES.USER]: {
    name: "入馆",
    color: "#3B82F6",
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    description: "已注册的普通用户",
    permissions: ["view_public", "interact", "comment"],
    icon: User,
  },
  [USER_LEVEL_VALUES.VIP]: {
    name: "VIP",
    color: "#10B981",
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    description: "VIP会员用户",
    permissions: ["view_public", "view_premium", "interact", "comment"],
    icon: UserCheck,
  },
  [USER_LEVEL_VALUES.HONORARY]: {
    name: "荣誉",
    color: "#8B5CF6",
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
    description: "认证的创作者",
    permissions: ["view_public", "view_premium", "interact", "comment", "publish"],
    icon: Star,
  },
  [USER_LEVEL_VALUES.CURATOR]: {
    name: "守馆",
    color: "#EF4444",
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    description: "系统管理员",
    permissions: ["all"],
    icon: Crown,
  },
  [USER_LEVEL_VALUES.SUPER_CURATOR]: {
    name: "超级管理员",
    color: "#DC2626",
    bgColor: "bg-red-200",
    textColor: "text-red-900",
    description: "超级管理员，最高权限",
    permissions: ["all"],
    icon: Shield,
  },
} as const;

// 用户等级数组（用于下拉选择等）
export const USER_LEVEL_OPTIONS = [
  { value: USER_LEVEL_VALUES.VISITOR, label: "访客", color: "#6B7280" },
  { value: USER_LEVEL_VALUES.USER, label: "入馆", color: "#3B82F6" },
  { value: USER_LEVEL_VALUES.VIP, label: "VIP", color: "#10B981" },
  { value: USER_LEVEL_VALUES.HONORARY, label: "荣誉", color: "#8B5CF6" },
  { value: USER_LEVEL_VALUES.CURATOR, label: "守馆", color: "#EF4444" },
  { value: USER_LEVEL_VALUES.SUPER_CURATOR, label: "超级管理员", color: "#DC2626" },
];

// 用户等级详细配置（用于管理界面）
export const USER_LEVEL_CONFIGS = [
  {
    value: USER_LEVEL_VALUES.VISITOR,
    label: "访客",
    description: "未注册的访问用户",
    color: "bg-gray-100 text-gray-800"
  },
  {
    value: USER_LEVEL_VALUES.USER,
    label: "入馆",
    description: "已注册的普通用户",
    color: "bg-blue-100 text-blue-800"
  },
  {
    value: USER_LEVEL_VALUES.VIP,
    label: "VIP",
    description: "VIP会员用户",
    color: "bg-green-100 text-green-800"
  },
  {
    value: USER_LEVEL_VALUES.HONORARY,
    label: "荣誉",
    description: "认证的创作者",
    color: "bg-purple-100 text-purple-800"
  },
  {
    value: USER_LEVEL_VALUES.CURATOR,
    label: "守馆",
    description: "系统管理员",
    color: "bg-red-100 text-red-800"
  },
  {
    value: USER_LEVEL_VALUES.SUPER_CURATOR,
    label: "超级管理员",
    description: "超级管理员，最高权限",
    color: "bg-red-200 text-red-900"
  },
];

// 获取用户等级图标组件
export function getUserLevelIconComponent(userLevel: string) {
  const level = USER_LEVELS[userLevel as keyof typeof USER_LEVELS];
  if (!level) return null;

  return level.icon;
}

// 获取用户等级图标（JSX版本，仅在React组件中使用）
export function getUserLevelIcon(userLevel: string) {
  const IconComponent = getUserLevelIconComponent(userLevel);
  if (!IconComponent) return null;

  return React.createElement(IconComponent, { className: "h-3 w-3" });
}

// 获取用户等级信息
export function getUserLevelInfo(userLevel: string) {
  return USER_LEVELS[userLevel as keyof typeof USER_LEVELS] || USER_LEVELS[USER_LEVEL_VALUES.USER];
}

// 检查用户等级是否有效
export function isValidUserLevel(userLevel: string): boolean {
  return userLevel in USER_LEVELS;
}

// 用户等级类型
export type UserLevelType = keyof typeof USER_LEVELS;
export type UserLevelValue = typeof USER_LEVEL_VALUES[keyof typeof USER_LEVEL_VALUES];
