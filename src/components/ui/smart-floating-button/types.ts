/**
 * @fileoverview 智能悬浮按钮类型定义
 * @description SmartFloatingButton组件的TypeScript类型定义
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import React from "react";

/**
 * 快速操作配置接口
 */
export interface QuickAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: string;
  requireAuth: boolean;
  badge?: number;
  onClick?: () => void;
}

/**
 * 通知数据接口
 */
export interface NotificationData {
  id: string;
  title: string;
  content: string;
  unread: boolean;
  createdAt: Date;
}

/**
 * 位置配置接口
 */
export interface Position {
  bottom: number;
  right: number;
}

/**
 * 拖拽状态接口
 */
export interface DragState {
  x: number;
  y: number;
  elementX: number;
  elementY: number;
}

/**
 * 拖拽Hook返回值接口
 */
export interface UseDragReturn {
  isDragging: boolean;
  position: Position;
  setPosition: (position: Position) => void;
  elementRef: React.RefObject<HTMLDivElement>;
  hasMoved: boolean;
  dragHandlers: {
    onMouseDown: (e: React.MouseEvent) => void;
  };
}

/**
 * 智能悬浮按钮属性接口
 */
export interface SmartFloatingButtonProps {
  mainIcon?: React.ComponentType<{ className?: string }>;
  actions?: QuickAction[];
  notifications?: NotificationData[];
  className?: string;
  enableDrag?: boolean;
  defaultPosition?: Position;
  onAction?: (actionId: string) => void;
  onNotificationClick?: (notification: NotificationData) => void;
}

/**
 * 快速操作菜单属性接口
 */
export interface QuickActionsMenuProps {
  actions: QuickAction[];
  isOpen: boolean;
  position: { left: number; bottom: number } | null;
  onActionClick: (action: QuickAction) => void;
  checkPermission: (action: QuickAction) => boolean;
}

/**
 * 通知面板属性接口
 */
export interface NotificationPanelProps {
  notifications: NotificationData[];
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: NotificationData) => void;
}
