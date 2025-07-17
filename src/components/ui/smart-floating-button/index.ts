/**
 * @fileoverview 智能悬浮按钮模块索引
 * @description 统一导出智能悬浮按钮相关的组件、Hook和类型
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出主组件
export { SmartFloatingButton } from "./SmartFloatingButton";

// 导出子组件
export { QuickActionsMenu } from "./QuickActionsMenu";
export { NotificationPanel } from "./NotificationPanel";

// 导出Hook
export { useDragHandler } from "./use-drag-handler";

// 导出工具函数
export { DEFAULT_ACTIONS, isMobileDevice, constrainPosition, isMovementSignificant } from "./utils";

// 导出类型
export type {
  QuickAction,
  NotificationData,
  Position,
  DragState,
  UseDragReturn,
  SmartFloatingButtonProps,
  QuickActionsMenuProps,
  NotificationPanelProps,
} from "./types";
