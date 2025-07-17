/**
 * @fileoverview 表情反应按钮工具函数
 * @description 提供表情反应相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { SizeConfig } from './types';

/**
 * 尺寸配置映射
 */
export const SIZE_CONFIGS: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: { icon: 'h-3 w-3', text: 'text-xs', padding: 'px-2 py-1' },
  md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'px-3 py-2' },
  lg: { icon: 'h-5 w-5', text: 'text-base', padding: 'px-4 py-2' },
};

/**
 * 长按触发时间（毫秒）
 */
export const LONG_PRESS_DURATION = 300;

/**
 * 表情选择器预估尺寸
 */
export const PICKER_DIMENSIONS = {
  width: 8 * 40 + 16, // 约336px
  height: 60, // 约60px
  margin: 10, // 边距
};

/**
 * 检查是否应该执行快速点击
 */
export function shouldExecuteQuickClick(
  pressDuration: number,
  isLongPressing: boolean,
  showEmojiPicker: boolean
): boolean {
  return pressDuration < LONG_PRESS_DURATION && !isLongPressing && !showEmojiPicker;
}

/**
 * 获取尺寸配置
 */
export function getSizeConfig(size: 'sm' | 'md' | 'lg'): SizeConfig {
  return SIZE_CONFIGS[size];
}
