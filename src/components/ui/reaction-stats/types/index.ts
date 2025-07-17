/**
 * @fileoverview 表情反应统计组件类型定义
 * @description 包含表情反应统计相关的所有TypeScript类型定义
 */

import type { ReactionStats, ReactionType } from '@/lib/reaction-types';

// 重新导出以便其他模块使用
export type { ReactionStats, ReactionType };

/**
 * @interface ReactionStatsProps
 * @description ReactionStats组件的属性接口定义
 */
export interface ReactionStatsProps {
  /** 表情统计数据数组 */
  reactionStats: ReactionStats[];
  /** 总反应数量 */
  totalCount: number;
  /** 组件显示尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示用户列表功能 */
  showUserList?: boolean;
  /** 最大显示表情数量 */
  maxDisplay?: number;
  /** 自定义CSS类名 */
  className?: string;
  /** 是否启用快速反应功能 */
  enableQuickReaction?: boolean;
  /** 目标对象ID（快速反应必需） */
  targetId?: string;
  /** 目标对象类型 */
  targetType?: 'post' | 'comment';
  /** 当前用户的反应类型 */
  currentUserReaction?: string | null;
  /** 用户等级（权限控制） */
  userLevel?: string;
  /** 反应变化回调函数 */
  onReactionChange?: (reactionType: string | null) => void;
}

/**
 * @interface ComponentState
 * @description 组件内部状态管理接口
 */
export interface ComponentState {
  /** 当前选中的反应类型（用于用户列表显示） */
  selectedReaction: ReactionType | null;
  /** 是否显示所有反应 */
  showAllReactions: boolean;
  /** 当前正在处理的反应类型 */
  clickingReaction: ReactionType | null;
  /** 最后点击时间（防抖用） */
  lastClickTime: number;
  /** 网络连接状态 */
  isOnline: boolean;
  /** 错误状态 */
  error: string | null;
}

/**
 * @interface SizeConfig
 * @description 尺寸配置接口
 */
export interface SizeConfig {
  emoji: string;
  count: string;
  avatar: string;
  spacing: string;
  padding: string;
}

/**
 * @type ErrorType
 * @description 错误类型枚举
 */
export type ErrorType =
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVALID_TARGET'
  | 'USER_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

/**
 * @interface ErrorInfo
 * @description 错误信息接口
 */
export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  retryable: boolean;
}

/**
 * @interface ReactionBubbleProps
 * @description 表情气泡组件属性接口
 */
export interface ReactionBubbleProps {
  /** 表情统计数据 */
  stat: ReactionStats;
  /** 索引（用于动画延迟） */
  index: number;
  /** 尺寸配置 */
  sizeConfig: SizeConfig;
  /** 是否为当前用户反应 */
  isCurrentUserReaction: boolean;
  /** 是否可点击 */
  isClickable: boolean;
  /** 是否正在加载 */
  isPending: boolean;
  /** 是否在线 */
  isOnline: boolean;
  /** 是否启用快速反应 */
  enableQuickReaction: boolean;
  /** 目标ID */
  targetId?: string;
  /** 是否显示用户列表 */
  showUserList: boolean;
  /** 点击处理函数 */
  onReactionClick: (reactionType: ReactionType) => void;
  /** 显示用户列表处理函数 */
  onShowUserList: (reactionType: ReactionType) => void;
}

/**
 * @interface UserListDialogProps
 * @description 用户列表对话框组件属性接口
 */
export interface UserListDialogProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭处理函数 */
  onOpenChange: (open: boolean) => void;
  /** 选中的反应类型 */
  selectedReaction: ReactionType | null;
  /** 表情统计数据 */
  reactionStats: ReactionStats[];
}

/**
 * @interface SimpleReactionStatsProps
 * @description 简化版表情统计组件属性接口
 */
export interface SimpleReactionStatsProps {
  /** 表情统计数据数组 */
  reactionStats: ReactionStats[];
  /** 组件显示尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义CSS类名 */
  className?: string;
}

/**
 * @interface ValidationResult
 * @description 属性验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * @interface ReactionHandlerConfig
 * @description 反应处理器配置接口
 */
export interface ReactionHandlerConfig {
  /** 防抖延迟时间 */
  debounceDelay: number;
  /** 最大重试次数 */
  maxRetryCount: number;
  /** 重试延迟时间 */
  retryDelay: number;
}

/**
 * @interface ReactionHandlerState
 * @description 反应处理器状态接口
 */
export interface ReactionHandlerState {
  /** 当前正在处理的反应类型 */
  clickingReaction: ReactionType | null;
  /** 最后点击时间 */
  lastClickTime: number;
  /** 错误状态 */
  error: string | null;
  /** 网络连接状态 */
  isOnline: boolean;
}

/**
 * @interface ReactionHandlerActions
 * @description 反应处理器操作接口
 */
export interface ReactionHandlerActions {
  /** 处理反应点击 */
  handleReactionClick: (reactionType: ReactionType) => void;
  /** 处理API错误 */
  handleApiError: (error: any, context: string) => void;
  /** 设置点击状态 */
  setClickingReaction: (reactionType: ReactionType | null) => void;
  /** 设置错误状态 */
  setError: (error: string | null) => void;
}

/**
 * @interface UseReactionHandlerReturn
 * @description useReactionHandler Hook返回值接口
 */
export interface UseReactionHandlerReturn extends ReactionHandlerState, ReactionHandlerActions {}

/**
 * @interface UseReactionHandlerProps
 * @description useReactionHandler Hook属性接口
 */
export interface UseReactionHandlerProps {
  /** 是否启用快速反应 */
  enableQuickReaction: boolean;
  /** 目标ID */
  targetId?: string;
  /** 目标类型 */
  targetType: 'post' | 'comment';
  /** 当前用户反应 */
  currentUserReaction?: string | null;
  /** 用户等级 */
  userLevel: string;
  /** 反应变化回调 */
  onReactionChange?: (reactionType: string | null) => void;
  /** 配置选项 */
  config?: Partial<ReactionHandlerConfig>;
}

/**
 * @interface MutationVariables
 * @description API变更操作变量接口
 */
export interface PostReactionVariables {
  postId: string;
  reactionType: string | null;
}

export interface CommentReactionVariables {
  commentId: string;
  reactionType: string | null;
}

/**
 * @interface MutationResult
 * @description API变更操作结果接口
 */
export interface ReactionMutationResult {
  reactionType: string | null;
  success: boolean;
  message?: string;
}

/**
 * @type ComponentSize
 * @description 组件尺寸类型
 */
export type ComponentSize = 'sm' | 'md' | 'lg';

/**
 * @type TargetType
 * @description 目标类型
 */
export type TargetType = 'post' | 'comment';

/**
 * @interface NetworkState
 * @description 网络状态接口
 */
export interface NetworkState {
  isOnline: boolean;
  lastOnlineTime?: Date;
  connectionQuality?: 'good' | 'poor' | 'offline';
}

/**
 * @interface PerformanceMetrics
 * @description 性能指标接口
 */
export interface PerformanceMetrics {
  renderTime: number;
  apiResponseTime: number;
  errorCount: number;
  successCount: number;
}

/**
 * @interface AccessibilityConfig
 * @description 无障碍配置接口
 */
export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReader: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
}

/**
 * @interface ThemeConfig
 * @description 主题配置接口
 */
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  borderRadius: string;
}

/**
 * @interface AnimationConfig
 * @description 动画配置接口
 */
export interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: string;
  staggerDelay: number;
}

/**
 * @interface DebugConfig
 * @description 调试配置接口
 */
export interface DebugConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  showPerformanceMetrics: boolean;
  enableErrorBoundary: boolean;
}
