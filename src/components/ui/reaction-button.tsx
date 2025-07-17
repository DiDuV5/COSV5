/**
 * @component ReactionButton
 * @description 增强版表情反应按钮组件 - 重构为模块化架构
 * @author Augment AI
 * @date 2025-06-22
 * @version 4.0.0 - 模块化重构
 *
 * @features
 * - 支持多种表情反应 (❤️👍😍😂😮😢😡🤗)
 * - 长按显示表情选择器
 * - 智能定位表情选择器位置
 * - 乐观更新和错误回滚
 * - 兼容旧版点赞API
 * - 响应式设计和无障碍支持
 * - 触觉反馈和动画效果
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 增加多表情支持
 * - 2024-01-XX: 优化长按体验
 * - 2024-01-XX: 增强无障碍支持
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import {
  REACTION_TYPES,
  getAvailableReactions,
  canUseReaction,
  type ReactionType,
} from '@/lib/reaction-types';
import { SimpleReactionButton } from '@/components/ui/simple-reaction-button';

// 导入模块化组件和Hook
import type { ReactionButtonProps, ReactionState } from './reaction-button/types';
import { getSizeConfig } from './reaction-button/utils';
import { useReactionMutations } from './reaction-button/hooks/use-reaction-mutations';
import { useLongPress } from './reaction-button/hooks/use-long-press';
import { usePickerPosition } from './reaction-button/hooks/use-picker-position';
import { ReactionIcon } from './reaction-button/components/ReactionIcon';
import { EmojiPicker } from './reaction-button/components/EmojiPicker';

export function ReactionButton({
  targetId,
  targetType,
  currentReaction,
  likeCount = 0,
  reactionStats = [],
  userLevel = 'GUEST',
  size = 'md',
  className,
  showPicker = true,
  enableLongPress = true,
  showStats = false,
  onReactionChange,
}: ReactionButtonProps) {
  // 所有hooks必须在组件顶部无条件调用
  const { data: session } = useSession();
  const router = useRouter();

  // 状态管理
  const [localReaction, setLocalReaction] = useState<string | null>(currentReaction || null);
  const [count, setCount] = useState(likeCount);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 引用
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 获取表情统计数据（如果需要显示统计）
  const { data: statsData } = api.post.getReactionStats.useQuery(
    {
      postId: targetType === 'post' ? targetId : '',
      includeUsers: true,
      limit: 20
    },
    {
      enabled: showStats && targetType === 'post',
      refetchOnWindowFocus: false,
    }
  );

  // 同步外部传入的状态
  useEffect(() => {
    setLocalReaction(currentReaction || null);
  }, [currentReaction]);

  useEffect(() => {
    setCount(likeCount);
  }, [likeCount]);

  // 使用自定义Hooks
  const mutations = useReactionMutations({
    localReaction,
    count,
    setLocalReaction,
    setCount,
    onReactionChange,
  });

  // 获取用户可用的表情列表（需要在hooks中使用）
  const availableReactions = getAvailableReactions(userLevel);
  const defaultReaction = REACTION_TYPES.HEART;

  const pickerPosition = usePickerPosition({
    showEmojiPicker,
    buttonRef,
  });

  // 处理表情选择
  const handleEmojiSelect = useCallback((reactionType: ReactionType) => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    if (!canUseReaction(userLevel, reactionType)) {
      return;
    }

    // 如果选择的是当前表情，则取消反应
    const newReaction = localReaction === reactionType ? null : reactionType;

    // 使用对应的react API
    if (targetType === 'post') {
      mutations.postReactMutation.mutate({
        postId: targetId,
        reactionType: newReaction
      });
    } else {
      mutations.commentReactMutation.mutate({
        commentId: targetId,
        reactionType: newReaction
      });
    }

    setShowEmojiPicker(false);
  }, [session, userLevel, localReaction, targetType, targetId, mutations, router]);

  // 处理快速点击（默认❤️表情）
  const handleQuickClick = useCallback(() => {
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    const newReaction = localReaction ? null : REACTION_TYPES.HEART;

    if (targetType === 'post') {
      mutations.postReactMutation.mutate({
        postId: targetId,
        reactionType: newReaction
      });
    } else {
      mutations.commentReactMutation.mutate({
        commentId: targetId,
        reactionType: newReaction
      });
    }
  }, [session, localReaction, targetType, targetId, mutations, router]);

  const longPressHandlers = useLongPress({
    enableLongPress,
    showPicker,
    targetId,
    targetType,
    availableReactions,
    userLevel,
    showEmojiPicker,
    setShowEmojiPicker,
    onQuickClick: handleQuickClick,
  });

  // 🎯 分级表情反应系统：根据targetType选择组件
  // 评论系统使用简化版（仅👍👎），作品和动态使用丰富版（8种表情）
  if (targetType === 'comment') {
    return (
      <SimpleReactionButton
        targetId={targetId}
        targetType={targetType}
        currentUserReaction={currentReaction}
        likeCount={likeCount}
        userLevel={userLevel}
        size={size}
        showCounts={!showStats}
        className={className}
        onReactionChange={onReactionChange}
      />
    );
  }

  // 计算是否已点赞和尺寸配置
  const isLiked = !!localReaction;
  const sizeConfig = getSizeConfig(size);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleQuickClick}
        onMouseDown={longPressHandlers.handleMouseDown}
        onMouseUp={longPressHandlers.handleMouseUp}
        onMouseLeave={longPressHandlers.handleMouseLeave}
        onTouchStart={longPressHandlers.handleTouchStart}
        onTouchEnd={longPressHandlers.handleTouchEnd}
        disabled={mutations.isPending}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border transition-all duration-200',
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeConfig.padding,
          isLiked
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-white border-gray-200 text-gray-600 hover:text-red-500',
          className
        )}
        title={isLiked ? '取消反应' : '点赞'}
      >
        <ReactionIcon
          reaction={localReaction}
          isActive={isLiked}
          size={sizeConfig.icon}
        />
        
        {count > 0 && (
          <span className={cn('font-medium', sizeConfig.text)}>
            {count}
          </span>
        )}
      </button>

      {/* 表情选择器 */}
      <EmojiPicker
        isVisible={showEmojiPicker}
        position={pickerPosition}
        availableReactions={availableReactions}
        onReactionSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />
    </div>
  );
}
