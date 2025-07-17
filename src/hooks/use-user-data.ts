/**
 * @fileoverview 统一用户数据获取Hook
 * @description 提供统一的用户数据获取接口，避免重复实现，支持缓存和性能优化
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * 
 * @changelog
 * - 2024-01-XX: 创建统一的用户数据获取Hook，替代分散的重复实现
 */

import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

/**
 * 用户数据获取选项
 */
export interface UseUserDataOptions {
  /** 是否启用查询 */
  enabled?: boolean;
  /** 数据缓存时间（毫秒），默认5分钟 */
  staleTime?: number;
  /** 缓存保留时间（毫秒），默认10分钟 */
  gcTime?: number;
  /** 是否包含社交媒体链接 */
  includeSocialLinks?: boolean;
  /** 是否包含详细统计数据 */
  includeDetailedStats?: boolean;
  /** 是否包含罐头账户信息 */
  includeCansAccount?: boolean;
  /** 是否包含签到状态 */
  includeCheckinStatus?: boolean;
}

/**
 * 用户数据Hook返回类型
 */
export interface UseUserDataReturn {
  // 基础用户信息
  user?: any;
  userStats?: any;
  socialLinks?: any[];
  
  // 罐头系统相关
  cansAccount?: any;
  checkinStatus?: any;
  availableTasks?: any[];
  
  // 加载状态
  isPending: boolean;
  isError: boolean;
  error?: any;
  
  // 操作方法
  refetch: () => void;
  refetchUserStats: () => void;
  refetchSocialLinks: () => void;
  refetchCansAccount: () => void;
  refetchCheckinStatus: () => void;
}

/**
 * 统一的用户数据获取Hook
 * @param username - 用户名，如果不提供则使用当前登录用户
 * @param options - 配置选项
 * @returns 用户数据和操作方法
 */
export function useUserData(
  username?: string,
  options: UseUserDataOptions = {}
): UseUserDataReturn {
  const { data: session } = useSession();
  
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5分钟
    gcTime = 10 * 60 * 1000, // 10分钟
    includeSocialLinks = true,
    includeDetailedStats = true,
    includeCansAccount = false,
    includeCheckinStatus = false,
  } = options;

  // 确定要查询的用户名
  const targetUsername = username || session?.user?.username;
  const targetUserId = session?.user?.id;
  
  // 查询是否启用
  const queryEnabled = enabled && !!targetUsername;
  const cansQueryEnabled = enabled && !!session && (includeCansAccount || includeCheckinStatus);

  // 获取用户详细统计数据
  const {
    data: userStats,
    isPending: isStatsLoading,
    error: statsError,
    refetch: refetchUserStats,
  } = api.user.getDetailedStats.useQuery(
    { username: targetUsername },
    {
      enabled: queryEnabled && includeDetailedStats,
      staleTime,
      gcTime: gcTime,
      retry: 2,
      retryDelay: 1000,
    }
  );

  // 获取社交媒体链接
  const {
    data: socialLinks,
    isPending: isSocialLinksLoading,
    error: socialLinksError,
    refetch: refetchSocialLinks,
  } = api.user.getSocialLinks.useQuery(
    { userId: targetUserId || "" },
    {
      enabled: queryEnabled && includeSocialLinks && !!targetUserId,
      staleTime,
      gcTime: gcTime,
      retry: 2,
    }
  );

  // 获取罐头账户信息
  const {
    data: cansAccount,
    isPending: isCansAccountLoading,
    error: cansAccountError,
    refetch: refetchCansAccount,
  } = api.cans.getAccount.useQuery(
    undefined,
    {
      enabled: cansQueryEnabled && includeCansAccount,
      staleTime: 2 * 60 * 1000, // 罐头数据2分钟缓存
      gcTime: 5 * 60 * 1000,
      retry: 2,
    }
  );

  // 获取签到状态
  const {
    data: checkinStatus,
    isPending: isCheckinStatusLoading,
    error: checkinStatusError,
    refetch: refetchCheckinStatus,
  } = api.cans.getCheckinStatus.useQuery(
    undefined,
    {
      enabled: cansQueryEnabled && includeCheckinStatus,
      staleTime: 1 * 60 * 1000, // 签到状态1分钟缓存
      gcTime: 3 * 60 * 1000,
      retry: 2,
    }
  );

  // 获取可用任务（如果需要签到状态，通常也需要任务信息）
  const {
    data: availableTasks,
    isPending: isTasksLoading,
  } = api.cans.getAvailableTasks.useQuery(
    undefined,
    {
      enabled: cansQueryEnabled && includeCheckinStatus,
      staleTime: 5 * 60 * 1000, // 任务数据5分钟缓存
      gcTime: 10 * 60 * 1000,
    }
  );

  // 计算总体加载状态
  const isPending = (includeDetailedStats && isStatsLoading) ||
                   (includeSocialLinks && isSocialLinksLoading) ||
                   (includeCansAccount && isCansAccountLoading) ||
                   (includeCheckinStatus && isCheckinStatusLoading) ||
                   (includeCheckinStatus && isTasksLoading);

  // 计算错误状态
  const error = statsError || socialLinksError || cansAccountError || checkinStatusError;
  const isError = !!error;

  // 统一的重新获取方法
  const refetch = () => {
    if (includeDetailedStats) refetchUserStats();
    if (includeSocialLinks) refetchSocialLinks();
    if (includeCansAccount) refetchCansAccount();
    if (includeCheckinStatus) refetchCheckinStatus();
  };

  return {
    // 数据
    user: userStats, // userStats包含了基础用户信息
    userStats,
    socialLinks,
    cansAccount,
    checkinStatus,
    availableTasks,
    
    // 状态
    isPending,
    isError,
    error,
    
    // 操作方法
    refetch,
    refetchUserStats,
    refetchSocialLinks,
    refetchCansAccount,
    refetchCheckinStatus,
  };
}

/**
 * Dashboard专用的用户数据Hook
 * 预配置了Dashboard页面需要的所有数据
 */
export function useDashboardUserData() {
  return useUserData(undefined, {
    includeDetailedStats: true,
    includeSocialLinks: true,
    includeCansAccount: true,
    includeCheckinStatus: true,
    staleTime: 2 * 60 * 1000, // Dashboard数据2分钟缓存
  });
}

/**
 * Profile页面专用的用户数据Hook
 * 预配置了Profile页面需要的数据
 */
export function useProfileUserData(username?: string) {
  return useUserData(username, {
    includeDetailedStats: true,
    includeSocialLinks: true,
    includeCansAccount: false,
    includeCheckinStatus: false,
    staleTime: 5 * 60 * 1000, // Profile数据5分钟缓存
  });
}
