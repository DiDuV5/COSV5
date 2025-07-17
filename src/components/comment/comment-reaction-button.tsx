/**
 * @component CommentReactionButton
 * @description 评论反应按钮组件，支持点赞和点踩功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - commentId: string - 评论ID
 * - currentReaction?: CommentReactionType | null - 当前用户的反应类型
 * - likeCount?: number - 点赞数量
 * - dislikeCount?: number - 点踩数量
 * - hotScore?: number - 热度分数
 * - size?: 'sm' | 'md' | 'lg' - 按钮尺寸
 * - variant?: 'default' | 'compact' | 'minimal' - 显示变体
 * - disabled?: boolean - 是否禁用
 * - showCounts?: boolean - 是否显示数量
 * - onReactionChange?: function - 反应变化回调
 *
 * @example
 * <CommentReactionButton
 *   commentId="comment-123"
 *   currentReaction="like"
 *   likeCount={5}
 *   dislikeCount={1}
 *   hotScore={2}
 *   size="md"
 *   showCounts={true}
 *   onReactionChange={(reaction, stats) => console.log(reaction, stats)}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - @trpc/react-query
 * - lucide-react
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import type {
  CommentReactionType,
  CommentReactionStats,
  CommentReactionButtonProps
} from '@/types/comment';

export function CommentReactionButton({
  commentId,
  currentReaction = null,
  likeCount = 0,
  dislikeCount = 0,
  hotScore = 0,
  size = 'md',
  variant = 'default',
  disabled = false,
  showCounts = true,
  onReactionChange,
}: CommentReactionButtonProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();

  // 本地状态管理
  const [localReaction, setLocalReaction] = useState<CommentReactionType | null>(currentReaction);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [localDislikeCount, setLocalDislikeCount] = useState(dislikeCount);
  const [localHotScore, setLocalHotScore] = useState(hotScore);

  // 获取用户反应状态（确保数据持久化）- 只在没有外部状态时获取
  const { data: reactionStatusData } = api.comment.interactionExtended.getReactionStatus.useQuery(
    { commentIds: [commentId] },
    {
      enabled: !!session?.user && currentReaction === null,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5分钟缓存
    }
  );

  // 获取评论的完整反应统计 - 只在没有外部数据时获取
  const { data: reactionStatsData } = api.comment.interactionExtended.getReactionStats.useQuery(
    {
      commentId,
      includeUsers: false,
      limit: 1
    },
    {
      enabled: likeCount === 0 && dislikeCount === 0,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2分钟缓存
    }
  );

  // 同步服务器状态到本地状态
  React.useEffect(() => {
    if (reactionStatusData?.[commentId]) {
      const serverReaction = reactionStatusData[commentId].reactionType;
      // 将所有正面反应类型映射为 'like'，负面反应映射为 'dislike'
      const positiveReactions = ['like', 'HEART', 'THUMBS_UP', 'FIRE', 'HUNDRED', 'CLAP', 'STAR'];
      const mappedReaction = serverReaction && positiveReactions.includes(serverReaction) ? 'like' :
                           serverReaction === 'dislike' ? 'dislike' : null;
      setLocalReaction(mappedReaction);
    }
  }, [reactionStatusData, commentId]);

  // 同步统计数据到本地状态
  React.useEffect(() => {
    if (reactionStatsData) {
      const likeReaction = reactionStatsData.reactions?.find(r => r.type === 'like');
      const dislikeReaction = reactionStatsData.reactions?.find(r => r.type === 'dislike');

      const newLikeCount = likeReaction?.count || 0;
      const newDislikeCount = dislikeReaction?.count || 0;
      const newHotScore = newLikeCount - (newDislikeCount * 3);

      setLocalLikeCount(newLikeCount);
      setLocalDislikeCount(newDislikeCount);
      setLocalHotScore(newHotScore);
    }
  }, [reactionStatsData]);

  // 同步外部传入的props（向后兼容）
  React.useEffect(() => {
    if (currentReaction !== undefined) {
      setLocalReaction(currentReaction);
    }
  }, [currentReaction]);

  React.useEffect(() => {
    setLocalLikeCount(likeCount);
  }, [likeCount]);

  React.useEffect(() => {
    setLocalDislikeCount(dislikeCount);
  }, [dislikeCount]);

  // 反应切换mutation
  const toggleReactionMutation = api.comment.interaction.toggleReaction.useMutation({
    onMutate: async ({ reactionType }) => {
      // 取消相关查询以避免冲突
      await utils.comment.interactionExtended.getReactionStatus.cancel({ commentIds: [commentId] });
      await utils.comment.interactionExtended.getReactionStats.cancel({ commentId });

      // 保存之前的状态用于回滚
      const previousState = {
        reaction: localReaction,
        likeCount: localLikeCount,
        dislikeCount: localDislikeCount,
        hotScore: localHotScore,
      };

      // 计算新状态 - 修复逻辑确保数量正确
      let newReaction: CommentReactionType | null = reactionType || null;
      let newLikeCount = localLikeCount;
      let newDislikeCount = localDislikeCount;

      console.log('=== 乐观更新计算 ===');
      console.log('当前反应:', localReaction);
      console.log('目标反应:', reactionType);
      console.log('当前点赞数:', localLikeCount);
      console.log('当前点踩数:', localDislikeCount);

      // 如果点击相同的反应，则取消反应
      if (localReaction === reactionType) {
        newReaction = null;
        if (reactionType === 'like') {
          newLikeCount = Math.max(0, localLikeCount - 1);
        } else if (reactionType === 'dislike') {
          newDislikeCount = Math.max(0, localDislikeCount - 1);
        }
      } else {
        // 切换到新反应或添加新反应
        if (localReaction === 'like' && reactionType === 'dislike') {
          // 从点赞切换到点踩
          newLikeCount = Math.max(0, localLikeCount - 1);
          newDislikeCount = localDislikeCount + 1;
        } else if (localReaction === 'dislike' && reactionType === 'like') {
          // 从点踩切换到点赞
          newDislikeCount = Math.max(0, localDislikeCount - 1);
          newLikeCount = localLikeCount + 1;
        } else if (!localReaction) {
          // 添加新反应
          if (reactionType === 'like') {
            newLikeCount = localLikeCount + 1;
          } else if (reactionType === 'dislike') {
            newDislikeCount = localDislikeCount + 1;
          }
        }
      }

      const newHotScore = newLikeCount - (newDislikeCount * 3);

      console.log('=== 计算结果 ===');
      console.log('新反应:', newReaction);
      console.log('新点赞数:', newLikeCount);
      console.log('新点踩数:', newDislikeCount);
      console.log('新热度:', newHotScore);
      console.log('==================');

      // 更新本地状态
      setLocalReaction(newReaction);
      setLocalLikeCount(newLikeCount);
      setLocalDislikeCount(newDislikeCount);
      setLocalHotScore(newHotScore);

      // 调用回调
      onReactionChange?.(newReaction, {
        likeCount: newLikeCount,
        dislikeCount: newDislikeCount,
        hotScore: newHotScore,
      });

      return { previousState };
    },
    onSuccess: (data) => {
      console.log('=== 服务器返回数据 ===');
      console.log('反应类型:', data.reactionType);
      console.log('点赞数:', data.likeCount);
      console.log('点踩数:', (data as any).dislikeCount || 0);
      console.log('热度分数:', (data as any).hotScore || 0);
      console.log('=====================');

      // 使用服务器返回的准确数据
      const positiveReactions = ['like', 'HEART', 'THUMBS_UP', 'FIRE', 'HUNDRED', 'CLAP', 'STAR'];
      const mappedReaction = data.reactionType && positiveReactions.includes(data.reactionType) ? 'like' :
                           data.reactionType === 'dislike' ? 'dislike' : null;

      setLocalReaction(mappedReaction);
      setLocalLikeCount(data.likeCount);
      setLocalDislikeCount((data as any).dislikeCount || 0);
      setLocalHotScore((data as any).hotScore || 0);

      onReactionChange?.(mappedReaction, {
        likeCount: data.likeCount,
        dislikeCount: (data as any).dislikeCount || 0,
        hotScore: (data as any).hotScore || 0,
      });

      // 刷新相关缓存 - 确保数据持久化
      Promise.all([
        utils.comment.getComments.invalidate(),
        utils.comment.interactionExtended.getReactionStatus.invalidate({ commentIds: [commentId] }),
        utils.comment.interactionExtended.getReactionStats.invalidate({ commentId }),
        utils.comment.interactionExtended.getLikeStatus.invalidate(), // 向后兼容
      ]);
    },
    onError: (error, variables, context) => {
      // 回滚乐观更新
      if (context?.previousState) {
        const { reaction, likeCount, dislikeCount, hotScore } = context.previousState;
        setLocalReaction(reaction);
        setLocalLikeCount(likeCount);
        setLocalDislikeCount(dislikeCount);
        setLocalHotScore(hotScore);

        onReactionChange?.(reaction, {
          likeCount,
          dislikeCount,
          hotScore,
        });
      }

      toast({
        title: "操作失败",
        description: error.message || "反应操作失败，请重试",
        variant: "destructive",
      });
    },
  });

  // 处理反应点击
  const handleReaction = useCallback((reactionType: CommentReactionType) => {
    if (!session) {
      toast({
        title: "请先登录",
        description: "登录后才能对评论进行反应",
        variant: "destructive",
      });
      return;
    }

    if (disabled || toggleReactionMutation.isPending) {
      return;
    }

    toggleReactionMutation.mutate({
      commentId,
      reactionType,
    });
  }, [session, disabled, toggleReactionMutation, commentId, toast]);

  // 样式配置
  const sizeClasses = {
    sm: 'h-7 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
    lg: 'h-9 px-4 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const isPending = toggleReactionMutation.isPending;

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "p-1 h-auto",
            localReaction === 'like' && "text-blue-600 bg-blue-50 dark:bg-blue-900/20"
          )}
          onClick={() => handleReaction('like')}
          disabled={disabled || isPending}
        >
          {isPending && localReaction === 'like' ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin")} />
          ) : (
            <ThumbsUp className={iconSizes[size]} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "p-1 h-auto",
            localReaction === 'dislike' && "text-red-600 bg-red-50 dark:bg-red-900/20"
          )}
          onClick={() => handleReaction('dislike')}
          disabled={disabled || isPending}
        >
          {isPending && localReaction === 'dislike' ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin")} />
          ) : (
            <ThumbsDown className={iconSizes[size]} />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* 点赞按钮 */}
      <Button
        variant={localReaction === 'like' ? 'default' : 'outline'}
        size="sm"
        className={cn(
          sizeClasses[size],
          "flex items-center gap-1.5",
          localReaction === 'like' && "bg-blue-600 hover:bg-blue-700 text-white",
          variant === 'compact' && "px-2"
        )}
        onClick={() => handleReaction('like')}
        disabled={disabled || isPending}
      >
        {isPending && localReaction === 'like' ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin")} />
        ) : (
          <ThumbsUp className={iconSizes[size]} />
        )}
        {showCounts && (
          <span className="font-medium">{localLikeCount}</span>
        )}
      </Button>

      {/* 点踩按钮 */}
      <Button
        variant={localReaction === 'dislike' ? 'default' : 'outline'}
        size="sm"
        className={cn(
          sizeClasses[size],
          "flex items-center gap-1.5",
          localReaction === 'dislike' && "bg-red-600 hover:bg-red-700 text-white",
          variant === 'compact' && "px-2"
        )}
        onClick={() => handleReaction('dislike')}
        disabled={disabled || isPending}
      >
        {isPending && localReaction === 'dislike' ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin")} />
        ) : (
          <ThumbsDown className={iconSizes[size]} />
        )}
        {showCounts && (
          <span className="font-medium">{localDislikeCount}</span>
        )}
      </Button>

      {/* 热度分数不显示给用户，仅用于后台排序 */}
    </div>
  );
}
