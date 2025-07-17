/**
 * @fileoverview 帖子详情数据Hook
 * @description 管理帖子详情页面的数据获取和状态
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { api } from '@/trpc/react';

interface UsePostDetailProps {
  postId: string;
}

export function usePostDetail({ postId }: UsePostDetailProps) {
  // 获取帖子详情
  const { data: post, isPending, error } = api.post.getById.useQuery(
    { id: postId },
    { enabled: !!postId }
  );

  // 获取用户点赞状态（用于ReactionButton组件）
  const { data: likeStatusData } = api.post.getLikeStatus.useQuery(
    { postIds: [postId] },
    {
      enabled: !!postId,
      refetchOnWindowFocus: false,
    }
  );

  return {
    post,
    isPending,
    error,
    likeStatusData,
  };
}
