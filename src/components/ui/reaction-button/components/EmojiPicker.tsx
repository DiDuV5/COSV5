/**
 * @fileoverview 表情选择器组件
 * @description 显示可选择的表情反应列表
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import React from 'react';
import { cn } from '@/lib/utils';
import type { PickerPosition } from '../types';
import type { ReactionType, ReactionConfig } from '@/lib/reaction-types';

interface EmojiPickerProps {
  isVisible: boolean;
  position: PickerPosition;
  availableReactions: ReactionConfig[];
  onReactionSelect: (reactionType: ReactionType) => void;
  onClose: () => void;
}

export function EmojiPicker({
  isVisible,
  position,
  availableReactions,
  onReactionSelect,
  onClose,
}: EmojiPickerProps) {
  if (!isVisible) return null;

  // 表情映射
  const getReactionEmoji = (reactionType: string) => {
    const emojiMap: Record<string, string> = {
      'HEART': '❤️',
      'LIKE': '👍',
      'LOVE': '😍',
      'HAHA': '😂',
      'WOW': '😮',
      'SAD': '😢',
      'ANGRY': '😡',
      'CARE': '🤗',
    };
    return emojiMap[reactionType.toUpperCase()] || '❤️';
  };

  const getReactionLabel = (reactionType: string) => {
    const labelMap: Record<string, string> = {
      'HEART': '喜欢',
      'LIKE': '赞',
      'LOVE': '爱了',
      'HAHA': '哈哈',
      'WOW': '哇',
      'SAD': '难过',
      'ANGRY': '愤怒',
      'CARE': '关心',
    };
    return labelMap[reactionType.toUpperCase()] || '喜欢';
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backgroundColor: 'transparent' }}
      />

      {/* 表情选择器 */}
      <div
        className={cn(
          'absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2',
          'flex items-center gap-1 min-w-max',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          position.transform
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {availableReactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => onReactionSelect(reaction.type)}
            className={cn(
              'flex flex-col items-center justify-center',
              'w-10 h-10 rounded-lg',
              'hover:bg-gray-100 transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
            )}
            title={getReactionLabel(reaction.type)}
          >
            <span className="text-lg leading-none">
              {getReactionEmoji(reaction.type)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
