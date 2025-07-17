/**
 * @fileoverview 表情反应统计组件工具函数
 * @description 提供验证、错误处理、格式化等工具函数
 */
"use client";


import type { 
  ReactionStatsProps, 
  ValidationResult, 
  ErrorInfo, 
  ErrorType,
  ReactionStats 
} from '../types';
import { ERROR_MESSAGES, VALIDATION_RULES } from '../constants';

/**
 * @function parseErrorMessage
 * @description 解析错误信息，返回结构化的错误对象
 * @param error - 原始错误对象
 * @returns ErrorInfo - 结构化错误信息
 */
export function parseErrorMessage(error: any): ErrorInfo {
  const message = error?.message || '未知错误';

  if (message.includes('网络') || message.includes('Network')) {
    return {
      type: 'NETWORK_ERROR',
      message: ERROR_MESSAGES.NETWORK_ERROR,
      details: message,
      retryable: true
    };
  }

  if (message.includes('权限') || message.includes('Permission')) {
    return {
      type: 'PERMISSION_DENIED',
      message: ERROR_MESSAGES.PERMISSION_DENIED,
      details: message,
      retryable: false
    };
  }

  if (message.includes('不存在') || message.includes('not found')) {
    return {
      type: 'INVALID_TARGET',
      message: ERROR_MESSAGES.INVALID_TARGET,
      details: message,
      retryable: false
    };
  }

  if (message.includes('频率') || message.includes('rate')) {
    return {
      type: 'RATE_LIMITED',
      message: ERROR_MESSAGES.RATE_LIMITED,
      details: message,
      retryable: true
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
    details: message,
    retryable: true
  };
}

/**
 * @function validateProps
 * @description 验证组件属性的有效性
 * @param props - 组件属性
 * @returns 验证结果和错误信息
 */
export function validateProps(props: ReactionStatsProps): ValidationResult {
  const errors: string[] = [];

  // 验证 reactionStats
  if (!Array.isArray(props.reactionStats)) {
    errors.push('reactionStats必须是数组');
  } else {
    // 验证数组中的每个元素
    props.reactionStats.forEach((stat, index) => {
      if (!stat || typeof stat !== 'object') {
        errors.push(`reactionStats[${index}]必须是对象`);
      } else {
        if (typeof stat.count !== 'number' || stat.count < 0) {
          errors.push(`reactionStats[${index}].count必须是非负数`);
        }
        if (!stat.type || typeof stat.type !== 'string') {
          errors.push(`reactionStats[${index}].type必须是有效字符串`);
        }
      }
    });
  }

  // 验证 totalCount
  if (typeof props.totalCount !== 'number' || props.totalCount < VALIDATION_RULES.totalCount.min) {
    errors.push('totalCount必须是非负数');
  }

  // 验证快速反应相关属性
  if (props.enableQuickReaction) {
    if (!props.targetId || typeof props.targetId !== 'string' || props.targetId.trim() === '') {
      errors.push('启用快速反应时必须提供有效的targetId');
    } else if (props.targetId.length > VALIDATION_RULES.targetIdMaxLength) {
      errors.push(`targetId长度不能超过${VALIDATION_RULES.targetIdMaxLength}字符`);
    }

    if (!props.targetType || !['post', 'comment'].includes(props.targetType)) {
      errors.push('启用快速反应时必须提供有效的targetType (post 或 comment)');
    }
  }

  // 验证 maxDisplay
  if (props.maxDisplay !== undefined) {
    if (typeof props.maxDisplay !== 'number' || 
        props.maxDisplay < VALIDATION_RULES.maxDisplay.min || 
        props.maxDisplay > VALIDATION_RULES.maxDisplay.max) {
      errors.push(`maxDisplay必须在${VALIDATION_RULES.maxDisplay.min}-${VALIDATION_RULES.maxDisplay.max}之间`);
    }
  }

  // 验证 size
  if (props.size && !['sm', 'md', 'lg'].includes(props.size)) {
    errors.push('size必须是 sm、md 或 lg');
  }

  // 验证 userLevel
  if (props.userLevel && !VALIDATION_RULES.validUserLevels.includes(props.userLevel as any)) {
    errors.push(`userLevel必须是有效值: ${VALIDATION_RULES.validUserLevels.join(', ')}`);
  }

  // 验证回调函数
  if (props.onReactionChange && typeof props.onReactionChange !== 'function') {
    errors.push('onReactionChange必须是函数');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * @function filterValidStats
 * @description 过滤有效的反应统计数据
 * @param reactionStats - 原始统计数据
 * @returns 过滤后的有效统计数据
 */
export function filterValidStats(reactionStats: ReactionStats[]): ReactionStats[] {
  if (!Array.isArray(reactionStats)) {
    return [];
  }

  return reactionStats.filter(stat => {
    return stat && 
           typeof stat === 'object' && 
           typeof stat.count === 'number' && 
           stat.count > 0 &&
           stat.type &&
           typeof stat.type === 'string';
  });
}

/**
 * @function sortStatsByCount
 * @description 按数量排序统计数据
 * @param stats - 统计数据数组
 * @param order - 排序顺序
 * @returns 排序后的统计数据
 */
export function sortStatsByCount(
  stats: ReactionStats[], 
  order: 'asc' | 'desc' = 'desc'
): ReactionStats[] {
  return [...stats].sort((a, b) => {
    return order === 'desc' ? b.count - a.count : a.count - b.count;
  });
}

/**
 * @function getDisplayStats
 * @description 获取要显示的统计数据
 * @param reactionStats - 原始统计数据
 * @param maxDisplay - 最大显示数量
 * @param showAll - 是否显示全部
 * @returns 显示的统计数据和是否有更多数据
 */
export function getDisplayStats(
  reactionStats: ReactionStats[],
  maxDisplay: number,
  showAll: boolean = false
): { displayStats: ReactionStats[]; hasMore: boolean } {
  const validStats = filterValidStats(reactionStats);
  const sortedStats = sortStatsByCount(validStats);
  
  const displayStats = showAll ? sortedStats : sortedStats.slice(0, maxDisplay);
  const hasMore = sortedStats.length > maxDisplay;

  return { displayStats, hasMore };
}

/**
 * @function isValidReactionType
 * @description 检查反应类型是否有效
 * @param reactionType - 反应类型
 * @returns 是否有效
 */
export function isValidReactionType(reactionType: any): boolean {
  return typeof reactionType === 'string' && reactionType.trim().length > 0;
}

/**
 * @function shouldRetryError
 * @description 判断错误是否应该重试
 * @param error - 错误对象
 * @param retryCount - 当前重试次数
 * @param maxRetries - 最大重试次数
 * @returns 是否应该重试
 */
export function shouldRetryError(error: any, retryCount: number, maxRetries: number): boolean {
  if (retryCount >= maxRetries) {
    return false;
  }

  const errorInfo = parseErrorMessage(error);
  return errorInfo.retryable;
}

/**
 * @function debounce
 * @description 防抖函数
 * @param func - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * @function throttle
 * @description 节流函数
 * @param func - 要节流的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * @function formatReactionCount
 * @description 格式化反应数量显示
 * @param count - 数量
 * @returns 格式化后的字符串
 */
export function formatReactionCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return `${(count / 1000000).toFixed(1)}M`;
  }
}

/**
 * @function getAriaLabel
 * @description 生成无障碍标签
 * @param config - 配置对象
 * @returns ARIA标签字符串
 */
export function getAriaLabel(config: {
  emoji: string;
  count: number;
  isSelected: boolean;
  enableQuickReaction: boolean;
}): string {
  const { emoji, count, isSelected, enableQuickReaction } = config;
  
  if (enableQuickReaction) {
    return `${emoji}反应，当前${count}个，${isSelected ? '已选中' : '点击选择'}`;
  } else {
    return `查看${emoji}反应用户列表，共${count}个用户`;
  }
}

/**
 * @function logError
 * @description 记录错误日志
 * @param context - 错误上下文
 * @param error - 错误对象
 * @param additionalInfo - 附加信息
 */
export function logError(context: string, error: any, additionalInfo?: Record<string, any>): void {
  const errorInfo = parseErrorMessage(error);
  
  console.error(`ReactionStats: ${context}失败`, {
    error: errorInfo,
    additionalInfo,
    timestamp: new Date().toISOString(),
  });
}

/**
 * @function logInfo
 * @description 记录信息日志
 * @param context - 上下文
 * @param message - 消息
 * @param additionalInfo - 附加信息
 */
export function logInfo(context: string, message: string, additionalInfo?: Record<string, any>): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`ReactionStats: ${context} - ${message}`, {
      additionalInfo,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * @function createTestId
 * @description 创建测试ID
 * @param base - 基础ID
 * @param suffix - 后缀
 * @returns 完整的测试ID
 */
export function createTestId(base: string, suffix?: string): string {
  return suffix ? `${base}-${suffix}` : base;
}

/**
 * @function isNetworkError
 * @description 判断是否为网络错误
 * @param error - 错误对象
 * @returns 是否为网络错误
 */
export function isNetworkError(error: any): boolean {
  const errorInfo = parseErrorMessage(error);
  return errorInfo.type === 'NETWORK_ERROR';
}

/**
 * @function sanitizeInput
 * @description 清理输入数据
 * @param input - 输入数据
 * @returns 清理后的数据
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
}
