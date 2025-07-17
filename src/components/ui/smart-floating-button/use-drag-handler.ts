/**
 * @fileoverview 拖拽处理Hook
 * @description 处理悬浮按钮的拖拽功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Position, DragState, UseDragReturn } from "./types";
import { constrainPosition, isMovementSignificant } from "./utils";

/**
 * 拖拽处理Hook
 */
export const useDragHandler = (enabled: boolean = true): UseDragReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ bottom: 90, right: 20 });
  const [dragStart, setDragStart] = useState<DragState>({ x: 0, y: 0, elementX: 0, elementY: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enabled || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();

    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: rect.left,
      elementY: rect.top
    });

    // 设置一个短暂的延迟来区分点击和拖拽
    dragTimeoutRef.current = setTimeout(() => {
      setHasMoved(true);
    }, 150);

    e.preventDefault();
    e.stopPropagation();
  }, [enabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !enabled) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // 如果移动距离超过阈值，立即标记为已移动
    if (isMovementSignificant(deltaX, deltaY)) {
      setHasMoved(true);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = null;
      }
    }

    // 计算新位置（基于窗口坐标系）
    const newLeft = dragStart.elementX + deltaX;
    const newTop = dragStart.elementY + deltaY;

    // 转换为 bottom/right 坐标系并应用约束
    const constrainedPosition = constrainPosition(
      newLeft,
      newTop,
      window.innerWidth,
      window.innerHeight
    );

    setPosition(constrainedPosition);
  }, [isDragging, enabled, dragStart]);

  const handleMouseUp = useCallback(() => {
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }

    // 立即重置拖拽状态
    setIsDragging(false);

    // 延迟重置移动状态，给点击事件一个判断的机会
    setTimeout(() => {
      setHasMoved(false);
    }, 100);
  }, []);

  // 使用 useRef 来存储事件处理函数，避免依赖变化导致的无限重渲染
  const handleMouseMoveRef = useRef(handleMouseMove);
  const handleMouseUpRef = useRef(handleMouseUp);

  // 更新 ref 中的函数
  useEffect(() => {
    handleMouseMoveRef.current = handleMouseMove;
    handleMouseUpRef.current = handleMouseUp;
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isDragging) {
      const mouseMoveHandler = (e: MouseEvent) => handleMouseMoveRef.current(e);
      const mouseUpHandler = () => handleMouseUpRef.current();

      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      return () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
    }
    // 如果不满足条件，返回undefined（可选的清理函数）
    return undefined;
  }, [isDragging]); // 只依赖 isDragging，避免函数依赖导致的重渲染

  return {
    isDragging,
    position,
    setPosition,
    elementRef,
    hasMoved,
    dragHandlers: {
      onMouseDown: handleMouseDown
    }
  };
};
