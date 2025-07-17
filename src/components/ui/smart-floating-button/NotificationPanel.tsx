/**
 * @fileoverview 通知面板组件
 * @description 悬浮按钮的通知面板
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

"use client";

import React, { forwardRef } from "react";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NotificationPanelProps } from "./types";
import { isMobileDevice } from "./utils";

/**
 * 通知面板组件
 */
export const NotificationPanel = forwardRef<HTMLDivElement, NotificationPanelProps>(
  ({ notifications, isOpen, onClose, onNotificationClick }, ref) => {
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "fixed z-40 w-80 max-h-96 notification-panel",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
          "border border-gray-200 dark:border-gray-700",
          "rounded-2xl shadow-2xl",
          isMobileDevice()
            ? "bottom-20 left-4 right-4 w-auto"
            : "bottom-20 right-4"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">通知中心</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors",
                    notification.unread
                      ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                  onClick={() => onNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.createdAt.toLocaleString()}
                      </p>
                    </div>
                    {notification.unread && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    );
  }
);

NotificationPanel.displayName = "NotificationPanel";
