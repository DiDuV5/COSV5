/**
 * @fileoverview 精选内容管理Hook
 * @description 管理精选内容的数据获取和操作
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";

export function useFeaturedManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // 获取精选内容列表 (包括未激活的)
  const { data: featuredContents, isPending, refetch } = api.recommendation.getFeatured.useQuery({
    limit: 20,
    includeInactive: true,
  });

  // 获取可用的作品列表用于选择
  const { data: availablePostsData } = api.post.getAll.useQuery({
    limit: 100,
    sortBy: "latest",
  });

  const availablePosts = availablePostsData?.posts || [];

  // 删除精选内容
  const deleteFeaturedMutation = api.recommendation.deleteFeatured.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "精选内容已成功删除",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 切换激活状态
  const updateFeaturedMutation = api.recommendation.updateFeatured.useMutation({
    onSuccess: () => {
      toast({
        title: "更新成功",
        description: "精选内容状态已更新",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 处理删除
  const handleDelete = (id: string) => {
    deleteFeaturedMutation.mutate({ id });
  };

  // 处理切换激活状态
  const handleToggleActive = (id: string, isActive: boolean) => {
    updateFeaturedMutation.mutate({ id, isActive: !isActive });
  };

  // 过滤搜索结果
  const filteredContents = featuredContents?.filter(item =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return {
    // 数据
    featuredContents,
    availablePosts,
    filteredContents,
    isPending,
    
    // 搜索
    searchQuery,
    setSearchQuery,
    
    // 操作
    handleDelete,
    handleToggleActive,
    refetch,
    
    // 加载状态
    isDeleting: deleteFeaturedMutation.isPending,
    isUpdating: updateFeaturedMutation.isPending,
  };
}
