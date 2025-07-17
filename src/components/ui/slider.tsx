/**
 * @fileoverview 滑块组件
 * @description 用于选择数值范围的滑块组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - class-variance-authority: 样式变体管理
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({
    className,
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    ...props
  }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const sliderRef = React.useRef<HTMLDivElement>(null);

    const currentValue = value[0] || 0;
    const percentage = ((currentValue - min) / (max - min)) * 100;

    const updateValue = React.useCallback((clientX: number) => {
      if (!sliderRef.current || disabled) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newValue = min + percentage * (max - min);
      const steppedValue = Math.round(newValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      onValueChange?.([clampedValue]);
    }, [min, max, step, disabled, onValueChange]);

    const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
      if (disabled) return;

      setIsDragging(true);
      updateValue(e.clientX);
      e.preventDefault();
    }, [disabled, updateValue]);

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
      if (!isDragging) return;
      updateValue(e.clientX);
    }, [isDragging, updateValue]);

    const handleMouseUp = React.useCallback(() => {
      setIsDragging(false);
    }, []);

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
      // 如果不满足条件，返回undefined（可选的清理函数）
      return undefined;
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (disabled) return;

      let newValue = currentValue;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = Math.max(min, currentValue - step);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = Math.min(max, currentValue + step);
          break;
        case 'Home':
          newValue = min;
          break;
        case 'End':
          newValue = max;
          break;
        default:
          return;
      }

      e.preventDefault();
      onValueChange?.([newValue]);
    }, [currentValue, min, max, step, disabled, onValueChange]);

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex w-full touch-none select-none items-center',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        {...props}
      >
        <div
          ref={sliderRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-200 cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          {/* 进度条 */}
          <div
            className="absolute h-full bg-blue-600 transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />

          {/* 滑块手柄 */}
          <div
            className={cn(
              'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-white shadow-md transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isDragging && 'scale-110',
              disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
            )}
            style={{ left: `calc(${percentage}% - 8px)` }}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={handleKeyDown}
            role="slider"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={currentValue}
            aria-disabled={disabled}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
