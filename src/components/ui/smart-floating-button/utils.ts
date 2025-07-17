/**
 * @fileoverview 智能悬浮按钮工具函数
 * @description 悬浮按钮相关的工具函数和常量
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import {
  Bell,
  ArrowUp,
  ArrowDown,
  Plus,
  MessageCircle,
} from "lucide-react";
import type { QuickAction } from "./types";

/**
 * 默认快速操作配置
 */
export const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: "notification",
    icon: Bell,
    label: "通知中心",
    action: "toggleNotifications",
    requireAuth: true
  },
  {
    id: "create-post",
    icon: Plus,
    label: "发布作品",
    action: "createPost",
    requireAuth: true
  },
  {
    id: "create-moment",
    icon: MessageCircle,
    label: "发布动态",
    action: "createMoment",
    requireAuth: true
  },
  {
    id: "scroll-top",
    icon: ArrowUp,
    label: "回到顶部",
    action: "scrollToTop",
    requireAuth: false
  },
  {
    id: "scroll-bottom",
    icon: ArrowDown,
    label: "回到底部",
    action: "scrollToBottom",
    requireAuth: false
  }
];

/**
 * 检测是否为移动设备
 */
export const isMobileDevice = (): boolean => {
  return typeof window !== 'undefined' && window.innerWidth < 768;
};

/**
 * 计算位置约束
 */
export const constrainPosition = (
  newLeft: number,
  newTop: number,
  windowWidth: number,
  windowHeight: number
): { right: number; bottom: number } => {
  const newRight = Math.max(10, Math.min(windowWidth - 50, windowWidth - newLeft - 40));
  const newBottom = Math.max(10, Math.min(windowHeight - 50, windowHeight - newTop - 40));

  return { right: newRight, bottom: newBottom };
};

/**
 * 检查移动距离是否超过阈值
 */
export const isMovementSignificant = (deltaX: number, deltaY: number, threshold: number = 3): boolean => {
  return Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold;
};
