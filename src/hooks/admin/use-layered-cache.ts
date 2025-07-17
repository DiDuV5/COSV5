/**
 * @fileoverview 三级缓存管理Hook
 * @description 提供三级缓存数据获取和管理功能的React Hook
 * @author Augment AI
 * @date 2025-07-07
 * @version 1.0.0
 */

import React from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";

/**
 * 获取三级缓存统计数据Hook
 */
export function useLayeredCacheStats() {
  return api.admin.layeredCache.getStats.useQuery(undefined, {
    refetchInterval: 30000, // 30秒自动刷新
    staleTime: 25000, // 25秒内认为数据是新鲜的
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * 清理缓存Hook
 */
export function useClearCache() {
  const utils = api.useUtils();

  return api.admin.layeredCache.clearCache.useMutation({
    onSuccess: (data, variables) => {
      toast.success(data.message);
      
      // 刷新相关查询
      utils.admin.layeredCache.getStats.invalidate();
      
      // 根据清理的层级刷新对应的数据
      if (variables.level === "ALL") {
        utils.admin.layeredCache.invalidate();
      }
    },
    onError: (error) => {
      console.error("缓存清理失败:", error);
      toast.error("缓存清理失败，请重试");
    },
  });
}

/**
 * 实时监控Hook - 使用轮询获取实时数据
 */
export function useLayeredCacheRealtime(enabled: boolean = true) {
  const { data, isLoading, error } = useLayeredCacheStats();
  
  return {
    stats: data?.data,
    isLoading,
    error,
    isConnected: !error && !isLoading,
  };
}
