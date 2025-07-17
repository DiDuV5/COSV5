/**
 * @fileoverview 管理员评论系统自定义Hook
 * @description 管理评论系统的状态和API调用
 */
"use client";


import { useState } from "react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";
import type { AdminCommentsHookReturn, ConfigForm, GlobalStats, AdminComment } from "../types";
import { getDefaultConfigForm } from "../utils";

export const useAdminComments = (): AdminCommentsHookReturn => {
  const { toast } = useToast();

  // 基础状态
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStatus, setSelectedStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserLevel, setSelectedUserLevel] = useState<string>("ALL");
  const [includeGuests, setIncludeGuests] = useState(true);
  const [configForm, setConfigForm] = useState<ConfigForm>(getDefaultConfigForm());

  // API查询
  const globalStatsQuery = api.comment.stats.getGlobalStats.useQuery();
  
  const latestCommentsQuery = api.comment.getLatestComments.useQuery({
    limit: 20,
    userLevel: selectedUserLevel === "ALL" ? undefined : selectedUserLevel,
    includeGuests,
  });

  const hotCommentsQuery = api.comment.getHotComments.useQuery({
    limit: 20,
    userLevel: selectedUserLevel === "ALL" ? undefined : selectedUserLevel,
    includeGuests,
  });

  const dislikedCommentsQuery = api.comment.query.getMostDislikedComments.useQuery({
    limit: 20,
    userLevel: selectedUserLevel === "ALL" ? undefined : selectedUserLevel,
    includeGuests,
  });

  const pendingCommentsQuery = api.comment.getPendingComments.useQuery({
    status: selectedStatus,
    limit: 20,
  });

  const userCommentsQuery = api.comment.getUserComments.useQuery(
    {
      username: userSearchQuery,
      limit: 20,
    },
    {
      enabled: !!userSearchQuery,
    }
  );

  const reactionConfigQuery = api.comment.config.getReactionConfig.useQuery();

  // API变更
  const moderateCommentMutation = api.comment.admin.moderate.useMutation({
    onSuccess: (data) => {
      toast({
        title: "审核成功",
        description: data.message,
      });
      pendingCommentsQuery.refetch();
      globalStatsQuery.refetch();
      setSelectedComments([]);
    },
    onError: (error) => {
      toast({
        title: "审核失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const batchModerateMutation = api.comment.admin.batchModerate.useMutation({
    onSuccess: (data) => {
      toast({
        title: "批量审核成功",
        description: data.message,
      });
      pendingCommentsQuery.refetch();
      globalStatsQuery.refetch();
      setSelectedComments([]);
    },
    onError: (error) => {
      toast({
        title: "批量审核失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const togglePinMutation = api.comment.admin.togglePin.useMutation({
    onSuccess: (data) => {
      toast({
        title: "操作成功",
        description: data.message,
      });
      latestCommentsQuery.refetch();
      hotCommentsQuery.refetch();
      pendingCommentsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = api.comment.admin.softDelete.useMutation({
    onSuccess: (data) => {
      toast({
        title: "删除成功",
        description: data.message,
      });
      latestCommentsQuery.refetch();
      hotCommentsQuery.refetch();
      pendingCommentsQuery.refetch();
      globalStatsQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateConfigMutation = api.comment.config.updateReactionConfig.useMutation({
    onSuccess: (data) => {
      toast({
        title: "配置更新成功",
        description: data.message,
      });
      reactionConfigQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "配置更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetConfigMutation = api.comment.config.resetReactionConfig.useMutation({
    onSuccess: (data) => {
      toast({
        title: "配置重置成功",
        description: data.message,
      });
      reactionConfigQuery.refetch();
      setConfigForm(getDefaultConfigForm());
    },
    onError: (error) => {
      toast({
        title: "配置重置失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 操作函数
  const handleCommentAction = (action: string, commentId: string, data?: any) => {
    switch (action) {
      case "APPROVE":
      case "REJECT":
        moderateCommentMutation.mutate({
          commentId,
          action,
          rejectionReason: data?.rejectionReason,
        });
        break;
      case "TOGGLE_PIN":
        togglePinMutation.mutate({
          commentId,
        });
        break;
      case "DELETE":
        deleteCommentMutation.mutate({
          commentId,
          reason: data?.reason || "管理员删除",
        });
        break;
      default:
        console.log("未处理的操作:", action);
    }
  };

  const handleBatchAction = (action: "APPROVE" | "REJECT") => {
    if (selectedComments.length === 0) {
      toast({
        title: "操作失败",
        description: "请先选择要操作的评论",
        variant: "destructive",
      });
      return;
    }

    batchModerateMutation.mutate({
      commentIds: selectedComments,
      action,
    });
  };

  const handleCommentSelect = (commentId: string, checked: boolean) => {
    if (checked) {
      setSelectedComments([...selectedComments, commentId]);
    } else {
      setSelectedComments(selectedComments.filter(id => id !== commentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allCommentIds = pendingCommentsQuery.data?.comments.map((c: any) => c.id) || [];
      setSelectedComments(allCommentIds);
    } else {
      setSelectedComments([]);
    }
  };

  const handleUserSearch = () => {
    if (!userSearchQuery.trim()) {
      toast({
        title: "搜索失败",
        description: "请输入用户名",
        variant: "destructive",
      });
      return;
    }
    userCommentsQuery.refetch();
  };

  const handleRefreshAll = () => {
    globalStatsQuery.refetch();
    latestCommentsQuery.refetch();
    hotCommentsQuery.refetch();
    dislikedCommentsQuery.refetch();
    pendingCommentsQuery.refetch();
    if (userSearchQuery) {
      userCommentsQuery.refetch();
    }
    toast({
      title: "刷新成功",
      description: "所有数据已更新",
    });
  };

  return {
    // 状态
    filters: {
      selectedUserLevel,
      includeGuests,
      searchQuery,
      userSearchQuery,
      selectedStatus,
    },
    setFilters: {
      setSelectedUserLevel,
      setIncludeGuests,
      setSearchQuery,
      setUserSearchQuery,
      setSelectedStatus,
    },
    tabState: {
      activeTab,
      setActiveTab,
    },
    selectionState: {
      selectedComments,
      setSelectedComments,
    },
    configState: {
      configForm,
      setConfigForm,
    },

    // 查询状态
    queries: {
      globalStats: {
        data: globalStatsQuery.data as unknown as GlobalStats | undefined,
        isPending: globalStatsQuery.isPending,
        refetch: globalStatsQuery.refetch,
      },
      latestComments: {
        data: latestCommentsQuery.data as unknown as AdminComment[] | undefined,
        isPending: latestCommentsQuery.isPending,
        refetch: latestCommentsQuery.refetch,
      },
      hotComments: {
        data: hotCommentsQuery.data as unknown as AdminComment[] | undefined,
        isPending: hotCommentsQuery.isPending,
        refetch: hotCommentsQuery.refetch,
      },
      dislikedComments: {
        data: dislikedCommentsQuery.data as unknown as AdminComment[] | undefined,
        isPending: dislikedCommentsQuery.isPending,
        refetch: dislikedCommentsQuery.refetch,
      },
      pendingCommentsData: {
        data: pendingCommentsQuery.data as unknown as { comments: AdminComment[]; total: number; } | undefined,
        isPending: pendingCommentsQuery.isPending,
        refetch: pendingCommentsQuery.refetch,
      },
      userCommentsData: {
        data: userCommentsQuery.data as unknown as { comments: AdminComment[]; } | undefined,
        isPending: userCommentsQuery.isPending,
        refetch: userCommentsQuery.refetch,
      },
      reactionConfig: {
        data: reactionConfigQuery.data,
        isPending: reactionConfigQuery.isPending,
        refetch: reactionConfigQuery.refetch,
      },
    },

    // 变更状态
    mutations: {
      moderateCommentMutation,
      batchModerateMutation,
      togglePinMutation,
      deleteCommentMutation,
      updateConfigMutation,
      resetConfigMutation,
    },

    // 操作函数
    actions: {
      handleCommentAction,
      handleBatchAction,
      handleCommentSelect,
      handleSelectAll,
      handleUserSearch,
      handleRefreshAll,
    },
  };
};
