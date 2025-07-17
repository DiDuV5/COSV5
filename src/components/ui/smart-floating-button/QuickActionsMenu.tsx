/**
 * @fileoverview 快速操作菜单组件
 * @description 悬浮按钮的快速操作菜单
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QuickActionsMenuProps } from "./types";

/**
 * 快速操作菜单组件
 */
export function QuickActionsMenu({
  actions,
  isOpen,
  position,
  onActionClick,
  checkPermission
}: QuickActionsMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed z-50 flex flex-col-reverse items-center space-y-reverse space-y-3 quick-actions-menu"
      style={{
        // 使用计算好的菜单位置，确保从主按钮中心展开
        left: position ? `${position.left}px` : '50%',
        bottom: position ? `${position.bottom}px` : '100px',
        transform: 'translateX(-50%)'
      }}
    >
      {actions.map((action, index) => (
        <Button
          key={action.id}
          variant="secondary"
          size="sm"
          className={cn(
            "w-10 h-10 rounded-full shadow-lg",
            "bg-white/90 dark:bg-gray-800/90 backdrop-blur-md",
            "hover:scale-110 transition-all duration-200",
            "animate-in zoom-in-50 slide-in-from-bottom-2",
            checkPermission(action)
              ? "hover:bg-blue-50 dark:hover:bg-blue-950/30"
              : "opacity-50 cursor-not-allowed"
          )}
          style={{
            animationDelay: `${index * 80}ms`,
            animationDuration: "300ms",
            animationFillMode: "both",
            // 初始状态从主按钮位置开始
            transformOrigin: "center bottom"
          }}
          onClick={() => onActionClick(action)}
          disabled={!checkPermission(action)}
          title={action.label}
        >
          <action.icon className="h-4 w-4" />
          {action.badge && action.badge > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
            >
              {action.badge > 99 ? "99+" : action.badge}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}
