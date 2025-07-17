/**
 * @fileoverview 导航组件类型定义
 * @description 底部导航栏和相关组件的TypeScript类型定义
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，从JavaScript迁移到TypeScript
 */

import { LucideIcon } from "lucide-react";

/**
 * 导航项配置接口
 */
export interface NavigationItem {
  /** 导航项唯一标识 */
  id: string;
  /** 图标组件 */
  icon: LucideIcon;
  /** 显示标签 */
  label: string;
  /** 路由路径 */
  href: string;
  /** 是否需要登录权限 */
  requireAuth: boolean;
  /** 是否为外部链接 */
  external?: boolean;
  /** 自定义点击处理 */
  onClick?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 通知数量 */
  badge?: number;
}

/**
 * 底部导航栏组件属性接口
 */
export interface BottomNavigationProps {
  /** 自定义导航项配置 */
  items?: NavigationItem[];
  /** 是否启用滚动自动隐藏 */
  autoHide?: boolean;
  /** 滚动阈值 */
  scrollThreshold?: number;
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示标签文字 */
  showLabels?: boolean;
  /** 主题模式 */
  theme?: "light" | "dark" | "auto";
  /** 自定义激活项ID */
  activeItemId?: string;
  /** 导航项点击回调 */
  onNavigate?: (item: NavigationItem) => void;
  /** 显示/隐藏状态变化回调 */
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * 导航状态接口
 */
export interface NavigationState {
  /** 当前激活的导航项ID */
  activeItemId: string;
  /** 是否可见 */
  isVisible: boolean;
  /** 是否正在滚动 */
  isScrolling: boolean;
  /** 上次滚动位置 */
  lastScrollY: number;
}

/**
 * 用户权限级别
 */
export type UserLevel = "GUEST" | "USER" | "PAID_USER" | "CREATOR" | "ADMIN";

/**
 * 导航权限配置接口
 */
export interface NavigationPermission {
  /** 最低权限级别 */
  minLevel: UserLevel;
  /** 自定义权限检查函数 */
  customCheck?: (userLevel: UserLevel) => boolean;
}

/**
 * 扩展的导航项配置（包含权限）
 */
export interface ExtendedNavigationItem extends NavigationItem {
  /** 权限配置 */
  permission?: NavigationPermission;
  /** 是否在游客模式下显示但禁用 */
  showWhenDisabled?: boolean;
}

/**
 * 导航事件类型
 */
export type NavigationEventType =
  | "navigate"
  | "show"
  | "hide"
  | "scroll"
  | "permission-denied";

/**
 * 导航事件数据接口
 */
export interface NavigationEventData {
  /** 事件类型 */
  type: NavigationEventType;
  /** 相关导航项 */
  item?: NavigationItem;
  /** 事件时间戳 */
  timestamp: number;
  /** 额外数据 */
  data?: Record<string, unknown>;
}

/**
 * 导航主题配置接口
 */
export interface NavigationTheme {
  /** 背景色 */
  background: string;
  /** 激活项背景色 */
  activeBackground: string;
  /** 文字颜色 */
  textColor: string;
  /** 激活项文字颜色 */
  activeTextColor: string;
  /** 边框颜色 */
  borderColor: string;
  /** 阴影 */
  shadow: string;
  /** 毛玻璃效果 */
  backdropBlur: boolean;
}

/**
 * 响应式断点配置
 */
export interface ResponsiveConfig {
  /** 移动端断点 */
  mobile: number;
  /** 平板断点 */
  tablet: number;
  /** 桌面端断点 */
  desktop: number;
}

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  /** 过渡持续时间 */
  duration: number;
  /** 缓动函数 */
  easing: string;
  /** 是否启用动画 */
  enabled: boolean;
  /** 自定义动画类名 */
  customClasses?: {
    enter?: string;
    exit?: string;
    active?: string;
  };
}

/**
 * 底部导航栏配置接口
 */
export interface BottomNavigationConfig {
  /** 导航项配置 */
  items: ExtendedNavigationItem[];
  /** 主题配置 */
  theme: NavigationTheme;
  /** 响应式配置 */
  responsive: ResponsiveConfig;
  /** 动画配置 */
  animation: AnimationConfig;
  /** 权限配置 */
  permissions: {
    /** 默认权限级别 */
    defaultLevel: UserLevel;
    /** 权限拒绝时的处理方式 */
    onPermissionDenied: "hide" | "disable" | "redirect";
    /** 重定向路径 */
    redirectPath?: string;
  };
}

/**
 * 导航钩子返回值接口
 */
export interface UseNavigationReturn {
  /** 当前导航状态 */
  state: NavigationState;
  /** 导航到指定项 */
  navigateTo: (itemId: string) => void;
  /** 显示导航栏 */
  show: () => void;
  /** 隐藏导航栏 */
  hide: () => void;
  /** 切换显示状态 */
  toggle: () => void;
  /** 检查权限 */
  checkPermission: (item: NavigationItem) => boolean;
  /** 获取当前激活项 */
  getActiveItem: () => NavigationItem | undefined;
}
