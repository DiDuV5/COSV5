/**
 * @fileoverview 格式化工具函数
 * @description 数据库测试页面的数据格式化工具
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 格式化数字为本地化字符串
 * @param num 数字
 * @returns 格式化后的字符串
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * 格式化日期
 * @param dateString ISO日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

/**
 * 获取性能等级颜色
 * @param duration 持续时间（毫秒）
 * @returns 颜色类名
 */
export const getPerformanceColor = (duration: number): string => {
  if (duration < 1000) return 'text-green-600';
  if (duration < 3000) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * 获取性能等级图标
 * @param duration 持续时间（毫秒）
 * @returns 图标组件名
 */
export const getPerformanceIcon = (duration: number): 'CheckCircle' | 'AlertCircle' | 'XCircle' => {
  if (duration < 1000) return 'CheckCircle';
  if (duration < 3000) return 'AlertCircle';
  return 'XCircle';
};
