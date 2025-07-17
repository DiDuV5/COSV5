/**
 * @fileoverview 评论操作处理器
 * @description 处理评论的各种操作，如点赞、审核、删除等
 */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";

export interface CommentActionsProps {
  postId: string;
  onCommentUpdate?: () => void;
}

export interface LikeState {
  liked: boolean;
  count: number;
}

/**
 * 评论操作处理器Hook
 */
export function useCommentActions({ postId, onCommentUpdate }: CommentActionsProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [likeStates, setLikeStates] = useState<Record<string, LikeState>>({});

  // 获取 tRPC utils 用于缓存失效
  const utils = api.useUtils();

  // 点赞/取消点赞 mutation
  const toggleLikeMutation = api.comment.toggleLike.useMutation({
    onMutate: async ({ commentId }) => {
      // 乐观更新
      setLikeStates(prev => {
        const current = prev[commentId] || { liked: false, count: 0 };
        return {
          ...prev,
          [commentId]: {
            liked: !current.liked,
            count: current.count + (current.liked ? -1 : 1),
          },
        };
      });
    },
    onError: (error, { commentId }) => {
      // 回滚乐观更新
      setLikeStates(prev => {
        const current = prev[commentId];
        if (current) {
          return {
            ...prev,
            [commentId]: {
              liked: !current.liked,
              count: current.count + (current.liked ? 1 : -1),
            },
          };
        }
        return prev;
      });

      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: async () => {
      // 刷新评论数据
      await utils.comment.getComments.invalidate({ contentId: postId });
      onCommentUpdate?.();
    },
  });

  // 删除评论 mutation
  const deleteCommentMutation = api.comment.admin.softDelete.useMutation({
    onSuccess: async (data: any) => {
      toast({
        title: "删除成功",
        description: data.message,
      });

      await Promise.all([
        utils.comment.getComments.invalidate({ contentId: postId }),
        utils.post.getById.invalidate({ id: postId }),
      ]);

      onCommentUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 管理员审核 mutation
  const moderateCommentMutation = api.comment.admin.moderate.useMutation({
    onSuccess: async (data: any) => {
      toast({
        title: "审核操作成功",
        description: data.message,
      });

      await Promise.all([
        utils.comment.getComments.invalidate({ contentId: postId }),
        utils.post.getById.invalidate({ id: postId }),
        utils.comment.getPendingComments.invalidate(),
      ]);

      onCommentUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "审核操作失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 置顶评论 mutation
  const togglePinMutation = api.comment.admin.togglePin.useMutation({
    onSuccess: (data: any) => {
      toast({
        title: data.isPinned ? "置顶成功" : "取消置顶成功",
        description: data.message,
      });
      onCommentUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 处理点赞操作
  const handleLike = (commentId: string) => {
    if (!session?.user) {
      toast({
        title: "请先登录",
        description: "登录后才能点赞评论",
        variant: "destructive",
      });
      return;
    }

    toggleLikeMutation.mutate({ commentId });
  };

  // 处理删除操作
  const handleDelete = (commentId: string, reason?: string) => {
    deleteCommentMutation.mutate({
      commentId,
      reason: reason || "用户删除",
    });
  };

  // 处理管理员操作
  const handleAdminAction = (
    action: "approve" | "reject" | "pin" | "unpin" | "delete",
    commentId: string,
    data?: { reason?: string }
  ) => {
    const isAdmin = session?.user?.userLevel === "ADMIN" || session?.user?.userLevel === "SUPER_ADMIN";

    if (!isAdmin) {
      toast({
        title: "权限不足",
        description: "只有管理员可以执行此操作",
        variant: "destructive",
      });
      return;
    }

    switch (action) {
      case "approve":
        moderateCommentMutation.mutate({
          commentId,
          action: "APPROVE",
        });
        break;
      case "reject":
        moderateCommentMutation.mutate({
          commentId,
          action: "REJECT",
          rejectionReason: data?.reason || "内容不当",
        });
        break;
      case "pin":
      case "unpin":
        togglePinMutation.mutate({
          commentId,
        });
        break;
      case "delete":
        deleteCommentMutation.mutate({
          commentId,
          reason: data?.reason || "管理员删除",
        });
        break;
      default:
        console.log("未处理的管理员操作:", action);
    }
  };

  return {
    likeStates,
    setLikeStates,
    handleLike,
    handleDelete,
    handleAdminAction,
    isLiking: toggleLikeMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
    isModerating: moderateCommentMutation.isPending,
    isPinning: togglePinMutation.isPending,
  };
}
