/**
 * @fileoverview 表情反应按钮类型定义
 * @description 定义表情反应相关的类型和接口
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { ReactionType, ReactionStats } from '@/lib/reaction-types';

/**
 * 表情反应按钮属性
 */
export interface ReactionButtonProps {
  targetId: string;
  targetType: 'post' | 'comment';
  currentReaction?: string | null;
  likeCount?: number;
  reactionStats?: ReactionStats[];
  userLevel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPicker?: boolean;
  enableLongPress?: boolean;
  showStats?: boolean; // 是否显示表情统计
  onReactionChange?: (reaction: string | null) => void;
}

/**
 * 表情选择器定位信息
 */
export interface PickerPosition {
  position: 'top' | 'bottom' | 'left' | 'right';
  transform: string;
}

/**
 * 尺寸配置
 */
export interface SizeConfig {
  icon: string;
  text: string;
  padding: string;
}

/**
 * 长按状态
 */
export interface LongPressState {
  isLongPressing: boolean;
  touchStartTime: number;
  timer: NodeJS.Timeout | null;
}

/**
 * 反应状态
 */
export interface ReactionState {
  localReaction: string | null;
  count: number;
  showEmojiPicker: boolean;
}

/**
 * Mutation上下文
 */
export interface MutationContext {
  previousReaction: string | null;
  previousCount: number;
}
