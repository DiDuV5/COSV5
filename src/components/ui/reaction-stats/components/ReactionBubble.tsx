/**
 * @fileoverview 表情反应气泡组件
 * @description 单个表情反应的显示和交互组件
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { REACTION_CONFIGS, type ReactionType } from '@/lib/reaction-types';

import type { ReactionBubbleProps } from '../types';
import { 
  CSS_CLASSES, 
  ARIA_LABELS, 
  TEST_IDS, 
  KEYBOARD_SHORTCUTS,
  ERROR_MESSAGES 
} from '../constants';
import { getAriaLabel, createTestId } from '../utils';

/**
 * @component ReactionBubble
 * @description 表情反应气泡组件
 */
export function ReactionBubble({
  stat,
  index,
  sizeConfig,
  isCurrentUserReaction,
  isClickable,
  isPending,
  isOnline,
  enableQuickReaction,
  targetId,
  showUserList,
  onReactionClick,
  onShowUserList,
}: ReactionBubbleProps) {
  const { toast } = useToast();

  // 获取表情配置
  const config = REACTION_CONFIGS[stat.type];
  if (!config) {
    console.warn('ReactionBubble: 未找到表情配置', { type: stat.type });
    return null;
  }

  // 验证统计数据
  if (!stat || typeof stat.count !== 'number' || stat.count < 0) {
    console.warn('ReactionBubble: 无效的统计数据', { stat });
    return null;
  }

  /**
   * 处理点击事件
   */
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOnline) {
      toast({
        title: "网络错误",
        description: ERROR_MESSAGES.NETWORK_ERROR,
        variant: "destructive",
      });
      return;
    }

    if (enableQuickReaction && targetId) {
      // 主要功能：快速反应
      onReactionClick(stat.type as ReactionType);
    } else {
      // 如果没有启用快速反应，则显示用户列表
      onShowUserList(stat.type as ReactionType);
    }
  };

  /**
   * 处理右键菜单
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShowUserList(stat.type as ReactionType);
  };

  /**
   * 处理双击
   */
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShowUserList(stat.type as ReactionType);
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (KEYBOARD_SHORTCUTS.confirm.includes(e.key as any)) {
      e.preventDefault();
      if (enableQuickReaction && targetId) {
        onReactionClick(stat.type as ReactionType);
      } else {
        onShowUserList(stat.type as ReactionType);
      }
    } else if (KEYBOARD_SHORTCUTS.contextMenu.includes(e.key as any)) {
      e.preventDefault();
      onShowUserList(stat.type as ReactionType);
    }
  };

  // 生成ARIA标签
  const ariaLabel = getAriaLabel({
    emoji: config.label,
    count: stat.count,
    isSelected: isCurrentUserReaction,
    enableQuickReaction: enableQuickReaction && !!targetId,
  });

  // 生成工具提示
  const title = enableQuickReaction && targetId
    ? `点击进行${config.label}反应，右键查看用户列表`
    : `查看${config.label}用户列表`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center"
    >
      {showUserList ? (
        <div className="relative group">
          {/* 主要的表情气泡按钮 */}
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending || !isOnline}
            data-testid={createTestId(TEST_IDS.reactionBubble, stat.type)}
            data-reaction-type={stat.type}
            aria-label={ariaLabel}
            aria-pressed={isCurrentUserReaction}
            role="button"
            className={cn(
              CSS_CLASSES.bubble,
              CSS_CLASSES.focus,
              isClickable ? CSS_CLASSES.clickable : CSS_CLASSES.nonClickable,
              isCurrentUserReaction && enableQuickReaction ? CSS_CLASSES.selected : '',
              !isOnline ? CSS_CLASSES.disabled : '',
              sizeConfig.padding
            )}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            title={title}
          >
            {isPending ? (
              <Loader2 
                className={CSS_CLASSES.loadingIcon} 
                aria-hidden="true" 
                data-testid={TEST_IDS.loadingSpinner}
              />
            ) : (
              <span className={sizeConfig.emoji} aria-hidden="true">
                {config.emoji}
              </span>
            )}
            <span className={cn('font-medium', sizeConfig.count)}>
              {stat.count}
            </span>
          </Button>

          {/* 用户列表提示图标 - 仅在hover时显示 */}
          {enableQuickReaction && targetId && (
            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="w-4 h-4 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs">
                <Users className={CSS_CLASSES.userIcon} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending || !isOnline}
          data-testid={createTestId(TEST_IDS.reactionBubble, stat.type)}
          data-reaction-type={stat.type}
          aria-label={ariaLabel}
          aria-pressed={isCurrentUserReaction}
          className={cn(
            CSS_CLASSES.bubble,
            CSS_CLASSES.focus,
            isClickable ? CSS_CLASSES.clickable : CSS_CLASSES.nonClickable,
            isCurrentUserReaction && enableQuickReaction ? CSS_CLASSES.selected : '',
            !isOnline ? CSS_CLASSES.disabled : '',
            sizeConfig.padding
          )}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          title={title}
        >
          {isPending ? (
            <Loader2 
              className={CSS_CLASSES.loadingIcon} 
              aria-hidden="true"
              data-testid={TEST_IDS.loadingSpinner}
            />
          ) : (
            <span className={sizeConfig.emoji} aria-hidden="true">
              {config.emoji}
            </span>
          )}
          <span className={cn('font-medium', sizeConfig.count)}>
            {stat.count}
          </span>
        </Button>
      )}
    </motion.div>
  );
}

/**
 * @component ReactionBubbleSkeleton
 * @description 表情气泡骨架屏组件
 */
export function ReactionBubbleSkeleton({ 
  sizeConfig 
}: { 
  sizeConfig: { padding: string; emoji: string; count: string } 
}) {
  return (
    <div className={cn(
      'flex items-center gap-1 rounded-full bg-gray-100 animate-pulse',
      sizeConfig.padding
    )}>
      <div className={cn('bg-gray-200 rounded', sizeConfig.emoji === 'text-sm' ? 'w-4 h-4' : 'w-5 h-5')} />
      <div className={cn('bg-gray-200 rounded', sizeConfig.count === 'text-xs' ? 'w-6 h-3' : 'w-8 h-4')} />
    </div>
  );
}

/**
 * @component MoreReactionsButton
 * @description 显示更多反应按钮组件
 */
export function MoreReactionsButton({
  hiddenCount,
  sizeConfig,
  onClick,
}: {
  hiddenCount: number;
  sizeConfig: { padding: string; count: string };
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      data-testid={TEST_IDS.moreButton}
      aria-label={ARIA_LABELS.moreButton(hiddenCount)}
      className={cn(
        'flex items-center gap-1 text-gray-500 hover:text-gray-700',
        CSS_CLASSES.focus,
        sizeConfig.padding
      )}
    >
      <span className={sizeConfig.count}>+{hiddenCount}</span>
      <svg 
        className="w-3 h-3" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Button>
  );
}
