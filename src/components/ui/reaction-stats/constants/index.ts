/**
 * @fileoverview 表情反应统计组件常量配置
 * @description 包含尺寸配置、错误类型、性能参数等常量定义
 */
"use client";


import type {
  SizeConfig,
  ReactionHandlerConfig,
  AnimationConfig,
  AccessibilityConfig
} from '../types';
import { getNumberEnv, getBooleanEnv } from '@/lib/config/env-compatibility';

/**
 * 尺寸配置映射
 */
export const SIZE_CONFIGS: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: {
    emoji: 'text-sm',
    count: 'text-xs',
    avatar: 'w-5 h-5',
    spacing: 'gap-1',
    padding: 'px-2 py-1'
  },
  md: {
    emoji: 'text-base',
    count: 'text-sm',
    avatar: 'w-6 h-6',
    spacing: 'gap-2',
    padding: 'px-3 py-2'
  },
  lg: {
    emoji: 'text-lg',
    count: 'text-base',
    avatar: 'w-8 h-8',
    spacing: 'gap-3',
    padding: 'px-4 py-3'
  },
};

/**
 * 简化版尺寸配置
 */
export const SIMPLE_SIZE_CONFIGS: Record<'sm' | 'md' | 'lg', { emoji: string; count: string }> = {
  sm: { emoji: 'text-xs', count: 'text-xs' },
  md: { emoji: 'text-sm', count: 'text-xs' },
  lg: { emoji: 'text-base', count: 'text-sm' },
};

/**
 * 默认反应处理器配置（从环境变量获取）
 */
export const DEFAULT_REACTION_HANDLER_CONFIG: ReactionHandlerConfig = {
  /** 防抖延迟时间（毫秒） */
  debounceDelay: getNumberEnv('COSEREEDEN_REACTION_DEBOUNCE_DELAY', 500),
  /** 最大重试次数 */
  maxRetryCount: getNumberEnv('COSEREEDEN_REACTION_MAX_RETRY_COUNT', 3),
  /** 重试延迟时间（毫秒） */
  retryDelay: getNumberEnv('COSEREEDEN_REACTION_RETRY_DELAY', 1000),
};

/**
 * 错误消息映射
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接异常，请检查网络后重试',
  PERMISSION_DENIED: '权限不足，无法进行此操作',
  INVALID_TARGET: '目标内容不存在，请刷新页面重试',
  USER_NOT_FOUND: '用户不存在',
  RATE_LIMITED: '操作过于频繁，请稍后再试',
  UNKNOWN_ERROR: '操作失败，请重试',
  CONFIG_ERROR: '配置错误',
  VALIDATION_ERROR: '参数验证失败',
  FEATURE_DISABLED: '功能未启用',
  LOGIN_REQUIRED: '请先登录',
} as const;

/**
 * 成功消息映射
 */
export const SUCCESS_MESSAGES = {
  REACTION_ADDED: '已添加表情反应',
  REACTION_REMOVED: '已取消表情反应',
  REACTION_UPDATED: '反应已更新',
} as const;

/**
 * 动画配置（从环境变量获取）
 */
export const ANIMATION_CONFIG: AnimationConfig = {
  enabled: getBooleanEnv('COSEREEDEN_REACTION_ANIMATION_ENABLED', true),
  duration: getNumberEnv('COSEREEDEN_REACTION_ANIMATION_DURATION', 200),
  easing: 'ease-out',
  staggerDelay: getNumberEnv('COSEREEDEN_REACTION_ANIMATION_STAGGER_DELAY', 0.1),
};

/**
 * 无障碍配置
 */
export const ACCESSIBILITY_CONFIG: AccessibilityConfig = {
  enableKeyboardNavigation: true,
  enableScreenReader: true,
  highContrastMode: false,
  reducedMotion: false,
};

/**
 * 性能配置
 */
export const PERFORMANCE_CONFIG = {
  /** 最大显示用户数量（用户列表） */
  maxDisplayUsers: 100,
  /** 虚拟化阈值 */
  virtualizationThreshold: 50,
  /** 防抖延迟 */
  debounceDelay: 300,
  /** 节流延迟 */
  throttleDelay: 100,
} as const;

/**
 * 网络配置
 */
export const NETWORK_CONFIG = {
  /** 网络检查间隔（毫秒） */
  checkInterval: 5000,
  /** 超时时间（毫秒） */
  timeout: 10000,
  /** 重试间隔（毫秒） */
  retryInterval: 2000,
} as const;

/**
 * 验证规则
 */
export const VALIDATION_RULES = {
  /** 最大显示数量范围 */
  maxDisplay: {
    min: 1,
    max: 20,
  },
  /** 总数量范围 */
  totalCount: {
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
  },
  /** 目标ID最大长度 */
  targetIdMaxLength: 255,
  /** 用户等级有效值 */
  validUserLevels: ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'],
} as const;

/**
 * CSS类名常量
 */
export const CSS_CLASSES = {
  // 基础样式
  container: 'flex items-center',
  bubble: 'flex items-center gap-1 rounded-full transition-all duration-200',

  // 状态样式
  clickable: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105 cursor-pointer',
  nonClickable: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  selected: 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500/50',
  disabled: 'opacity-50 cursor-not-allowed',
  loading: 'opacity-75',

  // 错误状态
  error: 'bg-red-50 border border-red-200 rounded text-red-700',
  warning: 'bg-yellow-50 border border-yellow-200 rounded text-yellow-700',
  offline: 'bg-gray-50 border border-gray-200 rounded text-gray-600',

  // 焦点样式
  focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',

  // 用户列表
  userItem: 'flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800',
  userInfo: 'flex-1 min-w-0',
  userName: 'font-medium text-sm truncate',
  userHandle: 'text-xs text-gray-500 truncate',

  // 对话框
  dialogContent: 'max-w-md',
  dialogHeader: 'flex items-center gap-2',
  dialogBody: 'max-h-96 overflow-y-auto',

  // 图标
  loadingIcon: 'w-3 h-3 animate-spin',
  errorIcon: 'w-4 h-4',
  userIcon: 'w-2 h-2',

} as const;

/**
 * ARIA标签常量
 */
export const ARIA_LABELS = {
  reactionBubble: (emoji: string, count: number, isSelected: boolean, enableQuick: boolean) =>
    enableQuick
      ? `${emoji}反应，当前${count}个，${isSelected ? '已选中' : '点击选择'}`
      : `查看${emoji}反应用户列表，共${count}个用户`,

  moreButton: (hiddenCount: number) => `显示更多${hiddenCount}个反应`,

  totalCount: (count: number) => `总共${count}个反应`,

  userListDialog: (emoji: string, count: number) => `${emoji}反应用户列表，共${count}个用户`,

  loadingState: '正在处理反应',

  errorState: (message: string) => `错误：${message}`,

  offlineState: '网络连接已断开',

} as const;

/**
 * 键盘快捷键
 */
export const KEYBOARD_SHORTCUTS = {
  /** 确认/选择 */
  confirm: ['Enter', ' '] as const,
  /** 取消/关闭 */
  cancel: ['Escape'] as const,
  /** 上下文菜单 */
  contextMenu: ['ContextMenu'] as const,
  /** 导航 */
  navigation: {
    next: ['ArrowRight', 'Tab'],
    previous: ['ArrowLeft', 'Shift+Tab'],
    first: ['Home'],
    last: ['End'],
  },
} as const;

/**
 * 测试ID常量
 */
export const TEST_IDS = {
  reactionBubble: 'reaction-bubble',
  reactionStats: 'reaction-stats',
  userListDialog: 'user-list-dialog',
  moreButton: 'more-reactions-button',
  totalCount: 'total-reaction-count',
  loadingSpinner: 'loading-spinner',
  errorMessage: 'error-message',
  userItem: 'user-list-item',
} as const;

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

/**
 * 默认属性值
 */
export const DEFAULT_PROPS = {
  size: 'md' as const,
  showUserList: true,
  maxDisplay: 5,
  enableQuickReaction: false,
  targetType: 'post' as const,
  userLevel: 'GUEST',
} as const;

/**
 * 环境配置
 */
export const ENV_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  enableDebugLogs: process.env.NODE_ENV === 'development',
} as const;

/**
 * 特性标志
 */
export const FEATURE_FLAGS = {
  enableAnimations: true,
  enableVirtualization: true,
  enablePerformanceMonitoring: ENV_CONFIG.isDevelopment,
  enableErrorBoundary: true,
  enableAccessibilityFeatures: true,
  enableKeyboardShortcuts: true,
} as const;
