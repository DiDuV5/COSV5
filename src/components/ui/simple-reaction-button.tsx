/**
 * @fileoverview 简化版表情反应按钮组件 - 专用于评论系统
 * @description 提供简化的👍👎反应功能，适用于评论和回复
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * <SimpleReactionButton
 *   targetId="comment-id"
 *   targetType="comment"
 *   currentUserReaction="THUMBS_UP"
 *   likeCount={5}
 *   userLevel="VIP"
 *   onReactionChange={(reactionType) => console.log(reactionType)}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - Framer Motion
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/trpc/react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

interface SimpleReactionButtonProps {
  targetId: string;
  targetType: 'comment';
  currentUserReaction?: string | null;
  likeCount?: number;
  dislikeCount?: number;
  userLevel?: string;
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  className?: string;
  onReactionChange?: (reactionType: string | null) => void;
}

export function SimpleReactionButton({
  targetId,
  targetType,
  currentUserReaction,
  likeCount = 0,
  dislikeCount = 0,
  userLevel = 'GUEST',
  size = 'sm',
  showCounts = true,
  className,
  onReactionChange,
}: SimpleReactionButtonProps) {
  const [isPending, setIsLoading] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [localDislikeCount, setLocalDislikeCount] = useState(dislikeCount);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);

  // Hooks
  const { toast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();

  // 防抖配置：500ms内不允许重复点击
  const DEBOUNCE_DELAY = 500;

  // 同步外部传入的计数
  useEffect(() => {
    setLocalLikeCount(likeCount);
  }, [likeCount]);

  useEffect(() => {
    setLocalDislikeCount(dislikeCount);
  }, [dislikeCount]);

  // 评论表情反应mutation
  const commentReactMutation = api.comment.interaction.react.useMutation({
    onMutate: async (variables: any) => {
      setIsLoading(true);
      setPendingReaction(variables.reactionType);

      // 乐观更新逻辑修复
      const newReaction = variables.reactionType;
      const oldReaction = currentUserReaction;

      console.log('SimpleReactionButton乐观更新:', {
        oldReaction,
        newReaction,
        currentLikeCount: localLikeCount,
        currentDislikeCount: localDislikeCount
      });

      // 先移除旧反应的影响
      if (oldReaction === 'THUMBS_UP') {
        setLocalLikeCount(prev => Math.max(0, prev - 1));
      } else if (oldReaction === 'THUMBS_DOWN') {
        setLocalDislikeCount(prev => Math.max(0, prev - 1));
      }

      // 再添加新反应的影响（如果不是取消操作）
      if (newReaction === 'THUMBS_UP') {
        setLocalLikeCount(prev => prev + 1);
      } else if (newReaction === 'THUMBS_DOWN') {
        setLocalDislikeCount(prev => prev + 1);
      }
      // 注意：如果newReaction为null，表示取消反应，不需要增加任何计数
    },
    onSuccess: (data: any) => {
      setIsLoading(false);
      setPendingReaction(null);
      onReactionChange?.(data.reactionType);

      const reactionText = data.reactionType === 'THUMBS_UP' ? '点赞' :
                          data.reactionType === 'THUMBS_DOWN' ? '点踩' : '取消反应';

      toast({
        title: "反应已更新",
        description: `${reactionText}成功`,
      });
    },
    onError: (error: any) => {
      setIsLoading(false);
      setPendingReaction(null);

      // 回滚乐观更新
      setLocalLikeCount(likeCount);
      setLocalDislikeCount(dislikeCount);

      console.error('评论表情反应失败:', error);
      toast({
        title: "操作失败",
        description: error.message || "表情反应失败，请重试",
        variant: "destructive",
      });
    },
  });

  // 处理表情反应点击
  const handleReaction = (reactionType: 'THUMBS_UP' | 'THUMBS_DOWN') => {
    const currentTime = Date.now();

    // 防抖检查：防止快速连续点击
    if (currentTime - lastClickTime < DEBOUNCE_DELAY) {
      console.log('SimpleReactionButton: 防抖拦截，忽略重复点击');
      return;
    }

    // 检查是否正在处理中
    if (isPending || pendingReaction) {
      console.log('SimpleReactionButton: 正在处理中，忽略点击');
      return;
    }

    // 更新最后点击时间
    setLastClickTime(currentTime);

    // 检查登录状态
    if (!session?.user) {
      toast({
        title: "请先登录",
        description: "登录后即可使用表情反应功能",
      });
      router.push('/auth/signin');
      return;
    }

    // 确定新的反应类型：如果点击的是当前反应，则取消；否则切换到新反应
    const newReaction = currentUserReaction === reactionType ? null : reactionType;

    console.log('SimpleReactionButton点击:', {
      targetType,
      targetId,
      currentReaction: currentUserReaction,
      clickedReaction: reactionType,
      newReaction,
      isCancel: newReaction === null,
      timestamp: currentTime
    });

    // 调用API - 注意这里传递的是newReaction，可能为null
    commentReactMutation.mutate({
      commentId: targetId,
      reactionType: newReaction // 这里可能是null，表示取消反应
    });
  };

  // 尺寸配置
  const sizeConfig = {
    sm: {
      button: 'h-7 px-2 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    md: {
      button: 'h-8 px-3 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    lg: {
      button: 'h-10 px-4 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    }
  };

  const currentSize = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-2', className)} data-testid="simple-reaction-button">
      {/* 点赞按钮 */}
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending || pendingReaction === 'THUMBS_UP'}
        data-testid="thumbs-up-button"
        data-reaction-type="THUMBS_UP"
        className={cn(
          'transition-all duration-200',
          currentSize.button,
          currentSize.gap,
          currentUserReaction === 'THUMBS_UP'
            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
            : 'hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20',
          (isPending || pendingReaction === 'THUMBS_UP') && 'opacity-70 cursor-not-allowed'
        )}
        onClick={() => handleReaction('THUMBS_UP')}
      >
        {(isPending && pendingReaction === 'THUMBS_UP') ||
         (isPending && currentUserReaction === 'THUMBS_UP' && !pendingReaction) ? (
          <Loader2 className={cn('animate-spin', currentSize.icon)} />
        ) : (
          <ThumbsUp className={cn(currentSize.icon)} />
        )}
        {showCounts && (
          <span className="font-medium">
            {localLikeCount > 0 ? localLikeCount : ''}
          </span>
        )}
      </Button>

      {/* 点踩按钮 */}
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending || pendingReaction === 'THUMBS_DOWN'}
        data-testid="thumbs-down-button"
        data-reaction-type="THUMBS_DOWN"
        className={cn(
          'transition-all duration-200',
          currentSize.button,
          currentSize.gap,
          currentUserReaction === 'THUMBS_DOWN'
            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
            : 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20',
          (isPending || pendingReaction === 'THUMBS_DOWN') && 'opacity-70 cursor-not-allowed'
        )}
        onClick={() => handleReaction('THUMBS_DOWN')}
      >
        {(isPending && pendingReaction === 'THUMBS_DOWN') ||
         (isPending && currentUserReaction === 'THUMBS_DOWN' && !pendingReaction) ? (
          <Loader2 className={cn('animate-spin', currentSize.icon)} />
        ) : (
          <ThumbsDown className={cn(currentSize.icon)} />
        )}
        {/* 点踩不显示数量，只影响排序 */}
      </Button>
    </div>
  );
}
