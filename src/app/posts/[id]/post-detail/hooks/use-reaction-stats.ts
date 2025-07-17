/**
 * @fileoverview 表情统计Hook
 * @description 管理表情反应统计数据和相关操作
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import React from 'react';
import { api } from '@/trpc/react';
import { validateReactionStatsData } from '../utils';
import type { ProcessedReactionStats, ReactionChangeHandler } from '../types';

interface UseReactionStatsProps {
  postId: string;
  post: any;
  session: any;
}

export function useReactionStats({ postId, post, session }: UseReactionStatsProps) {
  // tRPC utils for cache invalidation
  const utils = api.useUtils();

  /**
   * 获取表情反应统计数据
   */
  const {
    data: reactionStatsData,
    isPending: reactionStatsLoading,
    error: reactionStatsError,
    refetch: refetchReactionStats,
    isRefetching: reactionStatsRefetching
  } = api.post.getReactionStats.useQuery(
    {
      postId: postId,
      includeUsers: true,
      limit: 20
    },
    {
      enabled: !!postId,
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: 1000,
    }
  );

  /**
   * 处理表情反应统计数据，包括验证、错误处理和优雅降级
   */
  const processedReactionStats: ProcessedReactionStats | null = React.useMemo(() => {
    // 如果正在加载或没有数据，返回null
    if (reactionStatsLoading || !reactionStatsData) {
      return null;
    }

    // 验证数据
    const validation = validateReactionStatsData(reactionStatsData);

    if (!validation.isValid) {
      console.warn('ReactionStats数据验证失败:', {
        postId,
        error: validation.error,
        rawData: reactionStatsData,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    return validation.data;
  }, [reactionStatsData, reactionStatsLoading, postId]);

  /**
   * 统一的表情反应变化处理函数
   */
  const handleReactionChange: ReactionChangeHandler = React.useCallback(async (reactionType: string | null, context = '') => {
    if (!postId) {
      console.warn('handleReactionChange: postId不存在');
      return;
    }

    try {
      console.log(`${post?.contentType === 'MOMENT' ? '动态' : '作品'}详情页表情反应变化:`, {
        reactionType,
        postId: postId,
        context,
        timestamp: new Date().toISOString(),
        userLevel: session?.user?.userLevel
      });

      // 批量刷新所有相关数据，确保数据同步
      await Promise.all([
        utils.post.getById.invalidate({ id: postId }),
        utils.post.getLikeStatus.invalidate({ postIds: [postId] }),
        utils.post.getReactionStats.invalidate({ postId: postId })
      ]);

      console.log('ReactionStats缓存失效完成');
    } catch (error) {
      console.error('表情反应处理失败:', {
        error,
        reactionType,
        postId,
        context,
        timestamp: new Date().toISOString()
      });

      // 错误恢复：尝试单独刷新每个缓存
      try {
        await utils.post.getById.invalidate({ id: postId });
      } catch (e) {
        console.error('帖子数据缓存失效失败:', e);
      }
    }
  }, [postId, post?.contentType, session?.user?.userLevel, utils]);

  return {
    reactionStatsData,
    reactionStatsLoading,
    reactionStatsError,
    reactionStatsRefetching,
    processedReactionStats,
    handleReactionChange,
    refetchReactionStats,
  };
}
