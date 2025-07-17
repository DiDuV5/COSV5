/**
 * @fileoverview 表情反应类型定义和配置
 * @description 定义Tu Cosplay平台支持的所有表情类型、权限配置和相关工具函数
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - TypeScript 5.0+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持基础表情类型
 */

// 表情类型枚举
export const REACTION_TYPES = {
  HEART: 'HEART',           // ❤️ 爱心 - 基础表情，所有用户可用
  THUMBS_UP: 'THUMBS_UP',   // 👍 点赞 - 基础表情，所有用户可用
  LOVE_EYES: 'LOVE_EYES',   // 😍 爱心眼 - 入馆及以上用户可用
  FIRE: 'FIRE',             // 🔥 火焰 - 赞助及以上用户可用
  HUNDRED: 'HUNDRED',       // 💯 满分 - 荣誉及以上用户可用
  CLAP: 'CLAP',             // 👏 鼓掌 - 守馆员可用
  STAR: 'STAR',             // ⭐ 星星 - 守馆员可用
  ROCKET: 'ROCKET',         // 🚀 火箭 - 守馆员可用
} as const;

export type ReactionType = typeof REACTION_TYPES[keyof typeof REACTION_TYPES];

// 表情配置接口
export interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
  description: string;
  requiredLevel: string[];
  color: string;
  animationClass?: string;
}

// 表情配置映射
export const REACTION_CONFIGS: Record<ReactionType, ReactionConfig> = {
  [REACTION_TYPES.HEART]: {
    type: REACTION_TYPES.HEART,
    emoji: '❤️',
    label: '爱心',
    description: '表达喜爱之情',
    requiredLevel: ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'],
    color: '#ef4444',
    animationClass: 'animate-pulse',
  },
  [REACTION_TYPES.THUMBS_UP]: {
    type: REACTION_TYPES.THUMBS_UP,
    emoji: '👍',
    label: '点赞',
    description: '表示赞同和支持',
    requiredLevel: ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'],
    color: '#3b82f6',
  },
  [REACTION_TYPES.LOVE_EYES]: {
    type: REACTION_TYPES.LOVE_EYES,
    emoji: '😍',
    label: '爱心眼',
    description: '表达强烈的喜爱',
    requiredLevel: ['USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'],
    color: '#f59e0b',
  },
  [REACTION_TYPES.FIRE]: {
    type: REACTION_TYPES.FIRE,
    emoji: '🔥',
    label: '火焰',
    description: '表示内容很火很棒',
    requiredLevel: ['PATRON', 'HONORARY', 'CURATOR', 'ADMIN'],
    color: '#f97316',
    animationClass: 'animate-bounce',
  },
  [REACTION_TYPES.HUNDRED]: {
    type: REACTION_TYPES.HUNDRED,
    emoji: '💯',
    label: '满分',
    description: '表示完美无缺',
    requiredLevel: ['HONORARY', 'CURATOR', 'ADMIN'],
    color: '#8b5cf6',
  },
  [REACTION_TYPES.CLAP]: {
    type: REACTION_TYPES.CLAP,
    emoji: '👏',
    label: '鼓掌',
    description: '表示赞赏和鼓励',
    requiredLevel: ['CURATOR', 'ADMIN'],
    color: '#10b981',
  },
  [REACTION_TYPES.STAR]: {
    type: REACTION_TYPES.STAR,
    emoji: '⭐',
    label: '星星',
    description: '表示优秀和出色',
    requiredLevel: ['CURATOR', 'ADMIN'],
    color: '#fbbf24',
    animationClass: 'animate-spin',
  },
  [REACTION_TYPES.ROCKET]: {
    type: REACTION_TYPES.ROCKET,
    emoji: '🚀',
    label: '火箭',
    description: '表示惊艳和突破',
    requiredLevel: ['CURATOR', 'ADMIN'],
    color: '#6366f1',
  },
};

// 默认表情权限配置
export const DEFAULT_REACTION_PERMISSIONS: Record<string, ReactionType[]> = {
  GUEST: [REACTION_TYPES.HEART, REACTION_TYPES.THUMBS_UP],
  USER: [REACTION_TYPES.HEART, REACTION_TYPES.THUMBS_UP, REACTION_TYPES.LOVE_EYES],
  VIP: [REACTION_TYPES.HEART, REACTION_TYPES.THUMBS_UP, REACTION_TYPES.LOVE_EYES, REACTION_TYPES.FIRE],
  CREATOR: [REACTION_TYPES.HEART, REACTION_TYPES.THUMBS_UP, REACTION_TYPES.LOVE_EYES, REACTION_TYPES.FIRE, REACTION_TYPES.HUNDRED],
  ADMIN: Object.values(REACTION_TYPES),
  SUPER_ADMIN: Object.values(REACTION_TYPES), // 超级管理员拥有所有表情权限
};

// 工具函数：检查用户是否有权限使用某个表情
export function canUseReaction(userLevel: string, reactionType: ReactionType): boolean {
  const config = REACTION_CONFIGS[reactionType];
  return config.requiredLevel.includes(userLevel);
}

// 工具函数：获取用户可用的表情列表
export function getAvailableReactions(userLevel: string): ReactionConfig[] {
  return Object.values(REACTION_CONFIGS).filter(config =>
    canUseReaction(userLevel, config.type)
  );
}

// 工具函数：解析JSON格式的表情权限配置
export function parseReactionPermissions(jsonString: string): ReactionType[] {
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed.filter(type =>
      Object.values(REACTION_TYPES).includes(type)
    ) : [];
  } catch {
    return [REACTION_TYPES.HEART, REACTION_TYPES.THUMBS_UP];
  }
}

// 工具函数：将表情权限配置转换为JSON字符串
export function stringifyReactionPermissions(reactions: ReactionType[]): string {
  return JSON.stringify(reactions);
}

// 工具函数：获取表情的显示颜色
export function getReactionColor(reactionType: ReactionType): string {
  return REACTION_CONFIGS[reactionType]?.color || '#6b7280';
}

// 工具函数：获取表情的动画类名
export function getReactionAnimation(reactionType: ReactionType): string {
  return REACTION_CONFIGS[reactionType]?.animationClass || '';
}

// 表情统计接口
export interface ReactionStats {
  type: ReactionType;
  count: number;
  users: Array<{
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  }>;
}

// 表情选择器配置
export interface ReactionPickerConfig {
  maxRecentReactions: number;
  showLabels: boolean;
  showCounts: boolean;
  enableLongPress: boolean;
  longPressDuration: number;
}

export const DEFAULT_PICKER_CONFIG: ReactionPickerConfig = {
  maxRecentReactions: 6,
  showLabels: true,
  showCounts: true,
  enableLongPress: true,
  longPressDuration: 500,
};
