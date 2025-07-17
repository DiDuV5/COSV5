/**
 * @fileoverview 底部导航栏组件
 * @description 移动端底部导航栏，支持自动隐藏、权限控制和响应式设计
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * <BottomNavigation 
 *   autoHide={true}
 *   showLabels={true}
 *   onNavigate={(item) => console.log('导航到:', item.label)}
 * />
 *
 * @dependencies
 * - react: ^18.0.0
 * - next/navigation: ^14.0.0
 * - next-auth/react: ^4.24.0
 * - lucide-react: ^0.263.1
 * - class-variance-authority: ^0.7.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，从JavaScript迁移到React + TypeScript
 */

"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  Home, 
  Search, 
  MessageCircle, 
  User,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { useBottomNavigation } from "@/hooks/use-bottom-navigation";
import type {
  BottomNavigationProps,
  NavigationItem
} from "@/types/navigation";

/**
 * 默认导航项配置
 */
const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "home",
    icon: Home,
    label: "首页",
    href: "/",
    requireAuth: false,
  },
  {
    id: "discover",
    icon: Search,
    label: "发现",
    href: "/explore",
    requireAuth: false,
  },
  {
    id: "interact",
    icon: MessageCircle,
    label: "互动",
    href: "/interact",
    requireAuth: true,
  },
  {
    id: "profile",
    icon: User,
    label: "我的",
    href: "/dashboard",
    requireAuth: true,
  },
];

/**
 * 底部导航栏组件
 */
export function BottomNavigation({
  items = DEFAULT_NAVIGATION_ITEMS,
  autoHide = true,
  scrollThreshold = 10,
  className,
  showLabels = true,
  theme = "auto",
  activeItemId,
  onNavigate,
  onVisibilityChange,
}: BottomNavigationProps) {
  const { data: session, status } = useSession();
  
  // 使用导航钩子
  const {
    state,
    navigateTo,
    checkPermission,
    getActiveItem
  } = useBottomNavigation({
    items,
    autoHide,
    scrollThreshold,
    onStateChange: onVisibilityChange ? (state: any) => onVisibilityChange(state.isVisible) : undefined
  });

  // 处理导航项点击
  const handleItemClick = (item: NavigationItem) => {
    // 检查权限
    if (!checkPermission(item)) {
      // 如果需要登录但用户未登录，可以显示登录提示或跳转到登录页
      if (item.requireAuth && !session) {
        // 这里可以触发登录模态框或跳转到登录页
        console.log("需要登录才能访问此功能");
        return;
      }
      return;
    }

    // 执行导航
    navigateTo(item.id);
    
    // 触发回调
    if (onNavigate) {
      onNavigate(item);
    }
  };

  // 渲染移动端导航项（包含用户头像）
  const renderMobileNavigationItem = (item: NavigationItem) => {
    const isActive = state.activeItemId === item.id;
    const hasPermission = checkPermission(item);
    const isDisabled = item.disabled || (!hasPermission && item.requireAuth);
    const IconComponent = item.icon;
    const isProfileItem = item.id === "profile";

    return (
      <Button
        key={item.id}
        variant="ghost"
        size="sm"
        className={cn(
          "flex flex-col items-center justify-center gap-1 h-auto py-2 px-3 rounded-xl transition-all duration-300",
          "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50",
          "dark:hover:from-blue-950/30 dark:hover:to-purple-950/30",
          "active:scale-95 group",
          isActive && [
            "bg-gradient-to-r from-blue-500 to-purple-600 text-white",
            "hover:from-blue-600 hover:to-purple-700",
            "dark:from-blue-600 dark:to-purple-700",
            "nav-item-active"
          ],
          isDisabled && [
            "opacity-50 cursor-not-allowed",
            "hover:bg-transparent dark:hover:bg-transparent"
          ],
          !isActive && !isDisabled && [
            "text-gray-700 dark:text-gray-300",
            "hover:text-blue-600 dark:hover:text-blue-400",
            "hover:shadow-md hover:shadow-blue-500/10"
          ]
        )}
        onClick={() => handleItemClick(item)}
        disabled={isDisabled}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
      >
        <div className="relative">
          {/* 个人资料显示用户头像 */}
          {isProfileItem && session?.user ? (
            <UnifiedAvatar
              user={{
                username: (session.user as any)?.username || session.user?.email || 'user',
                displayName: (session.user as any)?.displayName || session.user?.name,
                avatarUrl: (session.user as any)?.avatarUrl || session.user?.image,
                isVerified: (session.user as any)?.isVerified || false,
                userLevel: (session.user as any)?.userLevel || 'USER',
              }}
              size="sm"
              showVerifiedBadge={false}
              fallbackType="gradient"
              className={cn(
                "border-2 user-avatar transition-all duration-300 rounded-full",
                isActive ? [
                  "border-white shadow-lg shadow-blue-500/30",
                  "ring-2 ring-blue-400/50 active"
                ] : [
                  "border-gray-300 dark:border-gray-600",
                  "group-hover:border-blue-400 dark:group-hover:border-blue-500"
                ]
              )}
            />
          ) : (
            <IconComponent
              className={cn(
                "h-5 w-5 transition-all duration-300",
                isActive && "scale-110 drop-shadow-sm",
                !isActive && "group-hover:scale-105"
              )}
            />
          )}

          {/* 权限锁定图标 */}
          {!hasPermission && item.requireAuth && (
            <Lock className="absolute -top-1 -right-1 h-3 w-3 text-gray-400" />
          )}

          {/* 通知徽章 */}
          {item.badge && item.badge > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center animate-pulse"
            >
              {item.badge > 99 ? "99+" : item.badge}
            </Badge>
          )}
        </div>

        {/* 标签文字 - 个人资料项不显示文字 */}
        {showLabels && !isProfileItem && (
          <span
            className={cn(
              "text-xs font-medium transition-all duration-300",
              isActive && "text-white drop-shadow-sm",
              !isActive && !isDisabled && "text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            )}
          >
            {item.label}
          </span>
        )}

        {/* 激活状态的光晕效果 */}
        {isActive && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 blur-xl -z-10" />
        )}
      </Button>
    );
  };

  // 渲染桌面端导航项
  const renderDesktopNavigationItem = (item: NavigationItem) => {
    const isActive = state.activeItemId === item.id;
    const hasPermission = checkPermission(item);
    const isDisabled = item.disabled || (!hasPermission && item.requireAuth);
    const IconComponent = item.icon;
    const isProfileItem = item.id === "profile";

    return (
      <Button
        key={item.id}
        variant="ghost"
        size="sm"
        className={cn(
          "relative flex items-center gap-3 h-12 px-5 rounded-xl transition-all duration-300",
          "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50",
          "dark:hover:from-blue-950/30 dark:hover:to-purple-950/30",
          "active:scale-95 group",
          isActive && [
            "bg-gradient-to-r from-blue-500 to-purple-600 text-white",
            "hover:from-blue-600 hover:to-purple-700",
            "dark:from-blue-600 dark:to-purple-700",
            "nav-item-active"
          ],
          isDisabled && [
            "opacity-50 cursor-not-allowed",
            "hover:bg-transparent dark:hover:bg-transparent"
          ],
          !isActive && !isDisabled && [
            "text-gray-700 dark:text-gray-300",
            "hover:text-blue-600 dark:hover:text-blue-400",
            "hover:shadow-md hover:shadow-blue-500/10"
          ]
        )}
        onClick={() => handleItemClick(item)}
        disabled={isDisabled}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
      >
        <div className="relative">
          {/* 个人资料显示用户头像 */}
          {isProfileItem && session?.user ? (
            <UnifiedAvatar
              user={{
                username: (session.user as any)?.username || session.user?.email || 'user',
                displayName: (session.user as any)?.displayName || session.user?.name,
                avatarUrl: (session.user as any)?.avatarUrl || session.user?.image,
                isVerified: (session.user as any)?.isVerified || false,
                userLevel: (session.user as any)?.userLevel || 'USER',
              }}
              size="sm"
              showVerifiedBadge={false}
              fallbackType="gradient"
              className={cn(
                "border-2 user-avatar transition-all duration-300 rounded-full",
                isActive ? [
                  "border-white shadow-lg shadow-blue-500/30",
                  "ring-2 ring-blue-400/50 active"
                ] : [
                  "border-gray-300 dark:border-gray-600",
                  "group-hover:border-blue-400 dark:group-hover:border-blue-500"
                ]
              )}
            />
          ) : (
            <IconComponent
              className={cn(
                "h-5 w-5 transition-all duration-300",
                isActive && "scale-110 drop-shadow-sm",
                !isActive && "group-hover:scale-105"
              )}
            />
          )}

          {/* 权限锁定图标 */}
          {!hasPermission && item.requireAuth && (
            <Lock className="absolute -top-1 -right-1 h-3 w-3 text-gray-400" />
          )}

          {/* 通知徽章 */}
          {item.badge && item.badge > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center animate-pulse"
            >
              {item.badge > 99 ? "99+" : item.badge}
            </Badge>
          )}
        </div>

        {/* 桌面端标签 - 个人资料项不显示文字 */}
        {!isProfileItem && (
          <span
            className={cn(
              "text-sm font-medium transition-all duration-300",
              isActive && "text-white drop-shadow-sm",
              !isActive && !isDisabled && "text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            )}
          >
            {item.label}
          </span>
        )}

        {/* 激活状态的光晕效果 */}
        {isActive && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 blur-xl -z-10" />
        )}
      </Button>
    );
  };

  // 如果是加载状态，显示骨架屏
  if (status === "loading") {
    return (
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
        "border-t border-gray-200 dark:border-gray-800",
        "flex items-center justify-around px-4",
        className
      )}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-1">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            {showLabels && (
              <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            )}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <>
      {/* 移动端圆角悬浮导航栏 */}
      <nav
        className={cn(
          "fixed bottom-4 left-4 right-4 z-50 transition-all duration-500 ease-out",
          "h-16 bg-white/90 dark:bg-gray-900/90",
          "border border-gray-200/50 dark:border-gray-700/50",
          "rounded-2xl px-4 py-2",
          "floating-nav nav-glow",
          // 悬浮效果增强
          "hover:scale-[1.02] hover:-translate-y-1",
          // 自动隐藏效果
          !state.isVisible && autoHide && "transform translate-y-20 opacity-0 scale-95",
          // 只在移动端显示
          "sm:hidden",
          className
        )}
        role="navigation"
        aria-label="移动端悬浮导航栏"
      >
        <div className="flex items-center justify-around h-full">
          {items.map(renderMobileNavigationItem)}
        </div>
      </nav>

      {/* 桌面端圆角悬浮导航栏 */}
      <nav
        className={cn(
          "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50",
          "transition-all duration-500 ease-out",
          "bg-white/90 dark:bg-gray-900/90",
          "border border-gray-200/50 dark:border-gray-700/50",
          "rounded-2xl px-6 py-4",
          "floating-nav nav-glow",
          // 悬浮效果增强
          "hover:scale-105 hover:-translate-y-1",
          // 自动隐藏效果
          !state.isVisible && autoHide && "transform -translate-x-1/2 translate-y-20 opacity-0 scale-95",
          // 只在桌面端显示
          "hidden sm:block",
          className
        )}
        role="navigation"
        aria-label="桌面端悬浮导航栏"
      >
        <div className="flex items-center space-x-1">
          {items.map(renderDesktopNavigationItem)}
        </div>
      </nav>
    </>
  );
}

/**
 * 导出默认配置
 */
export { DEFAULT_NAVIGATION_ITEMS };

/**
 * 导出组件类型
 */
export type { BottomNavigationProps, NavigationItem };
