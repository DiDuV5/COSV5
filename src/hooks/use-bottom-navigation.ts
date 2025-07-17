/**
 * @fileoverview 底部导航栏自定义钩子
 * @description 管理底部导航栏的状态、滚动行为和权限检查
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - next/navigation: ^14.0.0
 * - next-auth/react: ^4.24.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，从JavaScript迁移到React hooks
 * - 2025-06-28: 重命名为use-bottom-navigation.ts以符合命名规范
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type {
  NavigationState,
  NavigationItem,
  UseNavigationReturn,
  UserLevel
} from "@/types/navigation";

interface UseBottomNavigationOptions {
  /** 导航项配置 */
  items: NavigationItem[];
  /** 是否启用自动隐藏 */
  autoHide?: boolean;
  /** 滚动阈值 */
  scrollThreshold?: number;
  /** 状态变化回调 */
  onStateChange?: (state: NavigationState) => void;
}

/**
 * 底部导航栏自定义钩子
 */
export function useBottomNavigation({
  items,
  autoHide = true,
  scrollThreshold = 10,
  onStateChange
}: UseBottomNavigationOptions): UseNavigationReturn {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // 导航状态
  const [state, setState] = useState<NavigationState>({
    activeItemId: "",
    isVisible: true,
    isScrolling: false,
    lastScrollY: 0
  });

  // 引用
  const lastScrollY = useRef(0);
  const scrollTimer = useRef<NodeJS.Timeout>();
  const isScrolling = useRef(false);

  /**
   * 获取用户权限级别
   */
  const getUserLevel = useCallback((): UserLevel => {
    if (status === "loading") return "GUEST";
    if (!session) return "GUEST";

    // 根据session中的用户信息判断权限级别
    const user = session.user as any;
    return user?.userLevel || "USER";
  }, [session, status]);

  /**
   * 检查导航项权限
   */
  const checkPermission = useCallback((item: NavigationItem): boolean => {
    if (!item.requireAuth) return true;

    const userLevel = getUserLevel();
    if (userLevel === "GUEST") return false;

    return true;
  }, [session, status]);

  /**
   * 根据当前路径确定激活项
   */
  const determineActiveItem = useCallback((): string => {
    // 特殊路径处理
    const specialPaths: Record<string, string> = {
      "/profile": "profile",
      "/dashboard": "profile",
      "/settings": "profile",
      "/settings/profile": "profile",
      "/settings/account": "profile",
      "/settings/privacy": "profile",
      "/explore": "discover",
      "/discover": "discover",
      "/search": "discover",
      "/interact": "interact",
      "/notifications": "interact",
      "/messages": "interact",
    };

    // 检查特殊路径
    if (pathname && specialPaths[pathname]) {
      return specialPaths[pathname];
    }

    // 精确匹配
    const exactMatch = items.find(item => item.href === pathname);
    if (exactMatch) return exactMatch.id;

    // 路径前缀匹配（排除根路径的特殊处理）
    const prefixMatch = items.find(item => {
      if (item.href === "/") return pathname === "/";
      return pathname?.startsWith(item.href) && item.href !== "/";
    });

    // 如果没有匹配项且在根路径，返回首页
    if (!prefixMatch && pathname === "/") {
      return "home";
    }

    return prefixMatch?.id || items[0]?.id || "";
  }, [pathname, items]);

  /**
   * 处理滚动事件
   */
  const handleScroll = useCallback(() => {
    if (!autoHide) return;

    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY.current;

    // 设置滚动状态
    if (!isScrolling.current) {
      isScrolling.current = true;
      setState(prev => ({ ...prev, isScrolling: true }));
    }

    // 清除之前的定时器
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }

    // 设置新的定时器来重置滚动状态
    scrollTimer.current = setTimeout(() => {
      isScrolling.current = false;
      setState(prev => ({ ...prev, isScrolling: false }));
    }, 150);

    // 检查是否需要显示/隐藏导航栏
    if (Math.abs(scrollDelta) < scrollThreshold) return;

    const shouldHide = scrollDelta > 0 && currentScrollY > 100;
    const shouldShow = scrollDelta < 0;

    setState(prev => {
      const newState = {
        ...prev,
        isVisible: shouldHide ? false : shouldShow ? true : prev.isVisible,
        lastScrollY: currentScrollY
      };

      // 触发状态变化回调
      if (onStateChange && newState.isVisible !== prev.isVisible) {
        onStateChange(newState);
      }

      return newState;
    });

    lastScrollY.current = currentScrollY;
  }, [autoHide, scrollThreshold, onStateChange]);

  /**
   * 导航到指定项
   */
  const navigateTo = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // 检查权限
    if (!checkPermission(item)) {
      console.warn(`导航被拒绝: 用户无权访问 ${item.label}`);
      return;
    }

    // 执行自定义点击处理
    if (item.onClick) {
      item.onClick();
      return;
    }

    // 处理外部链接
    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }

    // 内部路由导航
    router.push(item.href);
  }, [items, checkPermission, router]);

  /**
   * 显示导航栏
   */
  const show = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, isVisible: true };
      if (onStateChange) onStateChange(newState);
      return newState;
    });
  }, [onStateChange]);

  /**
   * 隐藏导航栏
   */
  const hide = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, isVisible: false };
      if (onStateChange) onStateChange(newState);
      return newState;
    });
  }, [onStateChange]);

  /**
   * 切换显示状态
   */
  const toggle = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, isVisible: !prev.isVisible };
      if (onStateChange) onStateChange(newState);
      return newState;
    });
  }, [onStateChange]);

  /**
   * 获取当前激活项
   */
  const getActiveItem = useCallback((): NavigationItem | undefined => {
    return items.find(item => item.id === state.activeItemId);
  }, [items, state.activeItemId]);

  // 监听路径变化，更新激活项
  useEffect(() => {
    const activeItemId = determineActiveItem();
    setState(prev => ({ ...prev, activeItemId }));
  }, [determineActiveItem]);

  // 监听滚动事件
  useEffect(() => {
    if (!autoHide) return;

    let ticking = false;

    const throttledHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", throttledHandleScroll);
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, [autoHide, handleScroll]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, []);

  return {
    state,
    navigateTo,
    show,
    hide,
    toggle,
    checkPermission,
    getActiveItem
  };
}
