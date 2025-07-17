/**
 * @fileoverview 表情反应Mutations Hook
 * @description 管理表情反应相关的API调用
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/trpc/react';
import type { MutationContext } from '../types';

interface UseReactionMutationsProps {
  localReaction: string | null;
  count: number;
  setLocalReaction: (reaction: string | null) => void;
  setCount: (count: number | ((prev: number) => number)) => void;
  onReactionChange?: (reaction: string | null) => void;
}

export function useReactionMutations({
  localReaction,
  count,
  setLocalReaction,
  setCount,
  onReactionChange,
}: UseReactionMutationsProps) {
  const { toast } = useToast();

  // 乐观更新逻辑
  const handleOptimisticUpdate = useCallback((newReaction: string | null) => {
    const wasLiked = !!localReaction;
    const willBeLiked = !!newReaction;

    setLocalReaction(newReaction);
    if (wasLiked && !willBeLiked) {
      setCount(prev => Math.max(0, prev - 1));
    } else if (!wasLiked && willBeLiked) {
      setCount(prev => prev + 1);
    }

    return { previousReaction: localReaction, previousCount: count };
  }, [localReaction, count, setLocalReaction, setCount]);

  // 回滚乐观更新
  const handleRollback = useCallback((context: MutationContext | undefined) => {
    if (context) {
      setLocalReaction(context.previousReaction);
      setCount(context.previousCount);
    }
  }, [setLocalReaction, setCount]);

  // 帖子反应 mutation
  const postReactMutation = api.post.react.useMutation({
    onMutate: async (variables) => {
      return handleOptimisticUpdate(variables.reactionType);
    },
    onSuccess: (data) => {
      const newReaction = data.reactionType;
      setLocalReaction(newReaction);

      if (typeof data.likeCount === 'number') {
        setCount(data.likeCount);
      }

      toast({
        title: data.message || '操作成功',
        duration: 2000,
      });

      onReactionChange?.(newReaction);
    },
    onError: (error, variables, context) => {
      handleRollback(context);
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 暂时禁用评论反应API调用，使用模拟实现
  const commentReactMutation = {
    mutate: (variables: any) => {
      console.log('评论反应功能暂时禁用:', variables);
      const newReaction = variables.reactionType;
      setLocalReaction(newReaction);
      setCount(prev => newReaction ? prev + 1 : Math.max(0, prev - 1));

      toast({
        title: '操作成功',
        duration: 2000,
      });

      onReactionChange?.(newReaction);
    },
    isPending: false
  };

  // 兼容的点赞 mutations
  const legacyLikeMutation = api.post.like.useMutation({
    onSuccess: (data) => {
      setLocalReaction('HEART');
      setCount(prev => prev + 1);
      toast({
        title: data.message || '点赞成功',
        duration: 2000,
      });
      onReactionChange?.('HEART');
    },
    onError: (error) => {
      toast({
        title: '点赞失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const legacyUnlikeMutation = api.post.unlike.useMutation({
    onSuccess: (data) => {
      setLocalReaction(null);
      setCount(prev => Math.max(0, prev - 1));
      toast({
        title: data.message || '取消点赞',
        duration: 2000,
      });
      onReactionChange?.(null);
    },
    onError: (error) => {
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 暂时禁用评论点赞API调用，使用模拟实现
  const commentLikeMutation = {
    mutate: (variables: any) => {
      console.log('评论点赞功能暂时禁用:', variables);
      const liked = !localReaction;
      setLocalReaction(liked ? 'HEART' : null);
      setCount(prev => liked ? prev + 1 : Math.max(0, prev - 1));
      toast({
        title: '操作成功',
        duration: 2000,
      });
      onReactionChange?.(liked ? 'HEART' : null);
    },
    isPending: false
  };

  const isPending = 
    postReactMutation.isPending || 
    commentReactMutation.isPending || 
    legacyLikeMutation.isPending || 
    legacyUnlikeMutation.isPending || 
    commentLikeMutation.isPending;

  return {
    postReactMutation,
    commentReactMutation,
    legacyLikeMutation,
    legacyUnlikeMutation,
    commentLikeMutation,
    isPending,
  };
}
