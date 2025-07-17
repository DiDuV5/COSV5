/**
 * @fileoverview 智能悬浮按钮主组件
 * @description 现代化的智能悬浮按钮，支持拖拽、快速操作、通知等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0 - 模块化重构版
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
 * - 2024-01-XX: 模块化重构，拆分为多个文件
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 导入模块化组件和Hook
import { QuickActionsMenu } from "./QuickActionsMenu";
import { NotificationPanel } from "./NotificationPanel";
import { useDragHandler } from "./use-drag-handler";
import { DEFAULT_ACTIONS } from "./utils";
import type { SmartFloatingButtonProps, QuickAction, NotificationData } from "./types";

/**
 * 智能悬浮按钮组件
 */
export function SmartFloatingButton({
  mainIcon: MainIcon = Sparkles,
  actions = DEFAULT_ACTIONS,
  notifications = [],
  className,
  enableDrag = true,
  defaultPosition = { bottom: 90, right: 20 },
  onAction,
  onNotificationClick
}: SmartFloatingButtonProps) {
  const { data: session, status } = useSession();

  // 拖拽功能
  const { isDragging, position, setPosition, elementRef, hasMoved, dragHandlers } = useDragHandler(enableDrag);

  // 组件状态
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{ left: number; bottom: number } | null>(null);

  // 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // 初始化位置 - 只在组件首次挂载时设置，避免无限重渲染
  useEffect(() => {
    if (!isInitializedRef.current) {
      setPosition(defaultPosition);
      isInitializedRef.current = true;
    }
  }, [defaultPosition]); // 移除 setPosition 依赖，因为它应该是稳定的

  // 计算未读通知数量
  useEffect(() => {
    const count = notifications.filter(n => n.unread).length;
    setUnreadCount(count);
  }, [notifications]);

  /**
   * 检查用户权限
   */
  const checkPermission = useCallback((action: QuickAction): boolean => {
    if (!action.requireAuth) return true;
    return status === "authenticated" && !!session;
  }, [session, status]);

  /**
   * 处理主按钮点击
   */
  const handleMainButtonClick = useCallback((e: React.MouseEvent) => {
    // 如果正在拖拽或刚刚拖拽过，不触发点击
    if (isDragging || hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 计算菜单位置
    if (!isQuickActionsOpen && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      const buttonCenterX = rect.left + rect.width / 2;
      const buttonBottom = window.innerHeight - rect.top;

      setMenuPosition({
        left: buttonCenterX,
        bottom: buttonBottom + 10
      });
    }

    setIsQuickActionsOpen(!isQuickActionsOpen);
    setIsNotificationPanelOpen(false);
  }, [isQuickActionsOpen, isDragging, hasMoved]);

  /**
   * 处理操作点击
   */
  const handleActionClick = useCallback((action: QuickAction) => {
    if (!checkPermission(action)) {
      console.warn("权限不足:", action.label);
      return;
    }

    // 执行内置操作
    switch (action.action) {
      case "toggleNotifications":
        setIsNotificationPanelOpen(!isNotificationPanelOpen);
        setIsQuickActionsOpen(false);
        break;
      case "scrollToTop":
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "scrollToBottom":
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
        break;
      case "createPost":
        window.location.href = "/create";
        break;
      case "createMoment":
        window.location.href = "/moments/create";
        break;
      default:
        // 执行自定义操作
        if (action.onClick) {
          action.onClick();
        } else if (onAction) {
          onAction(action.id);
        }
        break;
    }

    // 关闭菜单
    setIsQuickActionsOpen(false);
  }, [checkPermission, isNotificationPanelOpen, onAction]);

  /**
   * 处理通知点击
   */
  const handleNotificationClick = useCallback((notification: NotificationData) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsNotificationPanelOpen(false);
  }, [onNotificationClick]);

  /**
   * 关闭所有面板
   */
  const closeAllPanels = useCallback(() => {
    setIsQuickActionsOpen(false);
    setIsNotificationPanelOpen(false);
  }, []);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node)
      ) {
        closeAllPanels();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAllPanels]);

  // 过滤可用的操作
  const availableActions = actions.filter(action =>
    !action.requireAuth || (session && status === "authenticated")
  );

  return (
    <>
      {/* 快速操作菜单 */}
      <QuickActionsMenu
        actions={availableActions}
        isOpen={isQuickActionsOpen}
        position={menuPosition}
        onActionClick={handleActionClick}
        checkPermission={checkPermission}
      />

      {/* 主悬浮按钮 - 可拖拽容器 */}
      <div
        ref={elementRef}
        className={cn(
          "fixed z-50 w-10 h-10",
          "transition-all duration-300 ease-out",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          className
        )}
        style={{
          bottom: `${position.bottom}px`,
          right: `${position.right}px`
        }}
        {...dragHandlers}
      >
        {/* 主按钮 */}
        <Button
          variant="default"
          size="sm"
          className={cn(
            "w-10 h-10 rounded-full shadow-lg relative overflow-hidden",
            "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500",
            "hover:from-blue-600 hover:via-purple-600 hover:to-pink-600",
            "hover:scale-105 active:scale-95",
            "transition-all duration-300 ease-out",
            "cursor-pointer select-none",
            "border-2 border-white/20",
            isQuickActionsOpen && "rotate-45 scale-105",
            // 水滴效果相关类
            "before:absolute before:inset-0 before:rounded-full",
            "before:bg-gradient-to-br before:from-white/30 before:to-transparent",
            "before:opacity-0 hover:before:opacity-100",
            "before:transition-opacity before:duration-300",
            // 光晕效果
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-gradient-to-br after:from-blue-400/20 after:to-purple-600/20",
            "after:blur-md after:scale-150 after:-z-10"
          )}
          onClick={handleMainButtonClick}
        >
          <MainIcon className="h-4 w-4 text-white relative z-10" />

          {/* 通知徽章 */}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center animate-pulse z-20"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}

          {/* 水滴高光效果 */}
          <div className="absolute top-0.5 left-0.5 w-2 h-2 bg-white/40 rounded-full blur-sm opacity-70" />
        </Button>
      </div>

      {/* 通知面板 */}
      <NotificationPanel
        ref={notificationPanelRef}
        notifications={notifications}
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        onNotificationClick={handleNotificationClick}
      />
    </>
  );
}
