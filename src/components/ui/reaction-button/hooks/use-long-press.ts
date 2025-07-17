/**
 * @fileoverview 长按处理Hook
 * @description 处理长按手势和相关逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import { useState, useCallback, useRef, useEffect } from 'react';
import type { LongPressState } from '../types';
import { LONG_PRESS_DURATION, shouldExecuteQuickClick } from '../utils';

interface UseLongPressProps {
  enableLongPress: boolean;
  showPicker: boolean;
  targetId: string;
  targetType: 'post' | 'comment';
  availableReactions: any[];
  userLevel: string;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  onQuickClick: () => void;
}

export function useLongPress({
  enableLongPress,
  showPicker,
  targetId,
  targetType,
  availableReactions,
  userLevel,
  showEmojiPicker,
  setShowEmojiPicker,
  onQuickClick,
}: UseLongPressProps) {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // 长按开始处理
  const handlePressStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!enableLongPress || !showPicker) {
      console.log('长按被禁用:', { enableLongPress, showPicker });
      return;
    }

    console.log('开始长按检测:', {
      targetId,
      targetType,
      availableReactions: availableReactions.length,
      userLevel,
      availableReactionTypes: availableReactions.map(r => r.type)
    });

    // 只在非被动事件中阻止默认行为
    if (e.cancelable) {
      e.preventDefault();
    }

    touchStartTimeRef.current = Date.now();
    setIsLongPressing(false);

    // 清除之前的定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      console.log('长按触发，显示表情选择器');
      setIsLongPressing(true);
      setShowEmojiPicker(true);

      // 触觉反馈（如果支持）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // 标记长按已触发，用于测试
      if (typeof window !== 'undefined' && (window as any).longPressDebug) {
        (window as any).longPressDebug.longPressTriggered = true;
      }
    }, LONG_PRESS_DURATION);
  }, [
    enableLongPress,
    showPicker,
    targetId,
    targetType,
    availableReactions,
    userLevel,
    setShowEmojiPicker
  ]);

  // 长按结束处理
  const handlePressEnd = useCallback((_e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const pressDuration = Date.now() - touchStartTimeRef.current;

    // 如果按压时间短于长按阈值，且不在长按状态，则执行快速点击
    if (shouldExecuteQuickClick(pressDuration, isLongPressing, showEmojiPicker)) {
      onQuickClick();
    }

    // 延迟重置长按状态，避免影响点击判断
    setTimeout(() => {
      setIsLongPressing(false);
    }, 100);
  }, [isLongPressing, showEmojiPicker, onQuickClick]);

  // 长按取消处理
  const handlePressCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsLongPressing(false);
  }, []);

  // 鼠标事件处理器
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handlePressStart(e);
  }, [handlePressStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    handlePressEnd(e);
  }, [handlePressEnd]);

  const handleMouseLeave = useCallback(() => {
    handlePressCancel();
  }, [handlePressCancel]);

  // 触摸事件处理器
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handlePressStart(e);
  }, [handlePressStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    handlePressEnd(e);
  }, [handlePressEnd]);

  return {
    isLongPressing,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
  };
}
