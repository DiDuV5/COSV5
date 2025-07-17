/**
 * @fileoverview 表情图标组件
 * @description 显示表情反应图标的组件
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReactionIconProps {
  reaction: string | null;
  isActive: boolean;
  size: string;
  className?: string;
}

export function ReactionIcon({ reaction, isActive, size, className }: ReactionIconProps) {
  // 表情映射
  const getReactionDisplay = (reactionType: string | null) => {
    if (!reactionType) return null;

    const reactionMap: Record<string, { emoji: string; label: string }> = {
      'HEART': { emoji: '❤️', label: '喜欢' },
      'LIKE': { emoji: '👍', label: '赞' },
      'LOVE': { emoji: '😍', label: '爱了' },
      'HAHA': { emoji: '😂', label: '哈哈' },
      'WOW': { emoji: '😮', label: '哇' },
      'SAD': { emoji: '😢', label: '难过' },
      'ANGRY': { emoji: '😡', label: '愤怒' },
      'CARE': { emoji: '🤗', label: '关心' },
    };

    return reactionMap[reactionType.toUpperCase()] || { emoji: '❤️', label: '喜欢' };
  };

  const reactionDisplay = getReactionDisplay(reaction);

  if (reactionDisplay) {
    return (
      <span 
        className={cn(
          'inline-flex items-center justify-center transition-transform duration-200',
          isActive && 'scale-110',
          className
        )}
        style={{ fontSize: size === 'h-3 w-3' ? '12px' : size === 'h-4 w-4' ? '16px' : '20px' }}
        title={reactionDisplay.label}
      >
        {reactionDisplay.emoji}
      </span>
    );
  }

  // 默认心形图标
  return (
    <Heart
      className={cn(
        size,
        'transition-all duration-200',
        isActive 
          ? 'fill-red-500 text-red-500 scale-110' 
          : 'text-gray-500 hover:text-red-500',
        className
      )}
    />
  );
}
