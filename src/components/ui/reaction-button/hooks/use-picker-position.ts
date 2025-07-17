/**
 * @fileoverview 表情选择器定位Hook
 * @description 智能计算表情选择器的最佳显示位置
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */
"use client";


import { useState, useCallback, useEffect } from 'react';
import type { PickerPosition } from '../types';
import { PICKER_DIMENSIONS } from '../utils';

interface UsePickerPositionProps {
  showEmojiPicker: boolean;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export function usePickerPosition({ showEmojiPicker, buttonRef }: UsePickerPositionProps) {
  const [pickerPosition, setPickerPosition] = useState<PickerPosition>({
    position: 'top',
    transform: 'bottom-full left-1/2 -translate-x-1/2 mb-2'
  });

  // 智能定位表情选择器
  const calculatePickerPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const { width: pickerWidth, height: pickerHeight, margin } = PICKER_DIMENSIONS;

    let position: 'top' | 'bottom' | 'left' | 'right' = 'top';
    let transform = 'bottom-full left-1/2 -translate-x-1/2 mb-2';

    // 检查各方向空间
    const spaceAbove = buttonRect.top;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceLeft = buttonRect.left;
    const spaceRight = viewportWidth - buttonRect.right;

    // 优先显示在上方
    if (spaceAbove >= pickerHeight + margin) {
      position = 'top';
      // 检查水平居中是否会超出边界
      const centerX = buttonRect.left + buttonRect.width / 2;
      const leftEdge = centerX - pickerWidth / 2;
      const rightEdge = centerX + pickerWidth / 2;

      if (leftEdge < margin) {
        // 左对齐
        transform = 'bottom-full left-0 mb-2';
      } else if (rightEdge > viewportWidth - margin) {
        // 右对齐
        transform = 'bottom-full right-0 mb-2';
      } else {
        // 居中
        transform = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      }
    }
    // 其次显示在下方
    else if (spaceBelow >= pickerHeight + margin) {
      position = 'bottom';
      const centerX = buttonRect.left + buttonRect.width / 2;
      const leftEdge = centerX - pickerWidth / 2;
      const rightEdge = centerX + pickerWidth / 2;

      if (leftEdge < margin) {
        transform = 'top-full left-0 mt-2';
      } else if (rightEdge > viewportWidth - margin) {
        transform = 'top-full right-0 mt-2';
      } else {
        transform = 'top-full left-1/2 -translate-x-1/2 mt-2';
      }
    }
    // 左侧显示
    else if (spaceLeft >= pickerWidth + margin) {
      position = 'left';
      transform = 'right-full top-1/2 -translate-y-1/2 mr-2';
    }
    // 右侧显示
    else if (spaceRight >= pickerWidth + margin) {
      position = 'right';
      transform = 'left-full top-1/2 -translate-y-1/2 ml-2';
    }
    // 强制显示在上方（即使空间不足）
    else {
      position = 'top';
      transform = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }

    setPickerPosition({ position, transform });
  }, [buttonRef]);

  // 当显示表情选择器时计算位置
  useEffect(() => {
    if (showEmojiPicker) {
      calculatePickerPosition();

      // 监听窗口大小变化
      const handleResize = () => calculatePickerPosition();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
    // 如果不满足条件，返回undefined（可选的清理函数）
    return undefined;
  }, [showEmojiPicker, calculatePickerPosition]);

  return pickerPosition;
}
