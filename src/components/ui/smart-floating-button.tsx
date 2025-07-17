/**
 * @fileoverview 智能悬浮按钮组件（模块化重构版）
 * @description 现代化的智能悬浮按钮，支持拖拽、快速操作、通知等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0 - 模块化重构版
 * @since 1.0.0
 *
 * @example
 * <SmartFloatingButton
 *   defaultPosition={{ bottom: 90, right: 20 }}
 *   actions={quickActions}
 *   notifications={notifications}
 *   onAction={(actionId) => handleAction(actionId)}
 * />
 *
 * @dependencies
 * - react: ^18.0.0
 * - next: ^14.0.0
 * - lucide-react: ^0.263.1
 * - class-variance-authority: ^0.7.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，从JavaScript迁移到React + TypeScript
 * - 2024-01-XX: 模块化重构，拆分为多个文件
 */

// 重新导出模块化组件和相关类型
export { SmartFloatingButton } from "./smart-floating-button/SmartFloatingButton";
export type {
  QuickAction,
  NotificationData,
  Position,
  SmartFloatingButtonProps,
} from "./smart-floating-button/types";


