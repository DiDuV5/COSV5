/**
 * @fileoverview 实时性能指标工具函数
 * @description 提供格式化和状态判断等工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

import type { SystemHealth, MetricsUtils } from './types';

/**
 * 格式化数字
 */
export const formatNumber = (num: number, decimals: number = 1): string => {
  return num.toFixed(decimals);
};

/**
 * 格式化百分比
 */
export const formatPercentage = (num: number): string => {
  return `${num.toFixed(1)}%`;
};

/**
 * 获取健康状态颜色类名
 */
export const getHealthColor = (health: SystemHealth): string => {
  switch (health) {
    case 'excellent': return 'bg-green-100 text-green-800';
    case 'good': return 'bg-blue-100 text-blue-800';
    case 'warning': return 'bg-yellow-100 text-yellow-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

/**
 * 获取健康状态文本
 */
export const getHealthText = (health: SystemHealth): string => {
  switch (health) {
    case 'excellent': return '优秀';
    case 'good': return '良好';
    case 'warning': return '警告';
    case 'critical': return '严重';
    default: return '未知';
  }
};

/**
 * 获取响应时间状态
 */
export const getResponseTimeStatus = (time: number): 'fast' | 'medium' | 'slow' => {
  if (time < 5) return 'fast';
  if (time < 20) return 'medium';
  return 'slow';
};

/**
 * 获取响应时间状态文本
 */
export const getResponseTimeStatusText = (time: number): string => {
  const status = getResponseTimeStatus(time);
  switch (status) {
    case 'fast': return '快';
    case 'medium': return '中';
    case 'slow': return '慢';
  }
};

/**
 * 获取响应时间状态颜色类名
 */
export const getResponseTimeStatusColor = (time: number): string => {
  const status = getResponseTimeStatus(time);
  switch (status) {
    case 'fast': return 'border-green-200 text-green-700';
    case 'medium': return 'border-yellow-200 text-yellow-700';
    case 'slow': return 'border-red-200 text-red-700';
  }
};

/**
 * 获取连接数状态
 */
export const getConnectionStatus = (connections: number): 'low' | 'medium' | 'high' => {
  if (connections < 5) return 'low';
  if (connections < 15) return 'medium';
  return 'high';
};

/**
 * 获取连接数状态文本
 */
export const getConnectionStatusText = (connections: number): string => {
  const status = getConnectionStatus(connections);
  switch (status) {
    case 'low': return '低';
    case 'medium': return '中';
    case 'high': return '高';
  }
};

/**
 * 获取连接数状态颜色类名
 */
export const getConnectionStatusColor = (connections: number): string => {
  const status = getConnectionStatus(connections);
  switch (status) {
    case 'low': return 'border-green-200 text-green-700';
    case 'medium': return 'border-yellow-200 text-yellow-700';
    case 'high': return 'border-red-200 text-red-700';
  }
};

/**
 * 获取缓存命中率状态
 */
export const getCacheHitRateStatus = (rate: number): 'excellent' | 'good' | 'poor' => {
  if (rate > 80) return 'excellent';
  if (rate > 60) return 'good';
  return 'poor';
};

/**
 * 获取缓存命中率状态文本
 */
export const getCacheHitRateStatusText = (rate: number): string => {
  const status = getCacheHitRateStatus(rate);
  switch (status) {
    case 'excellent': return '优';
    case 'good': return '良';
    case 'poor': return '差';
  }
};

/**
 * 获取缓存命中率状态颜色类名
 */
export const getCacheHitRateStatusColor = (rate: number): string => {
  const status = getCacheHitRateStatus(rate);
  switch (status) {
    case 'excellent': return 'border-green-200 text-green-700';
    case 'good': return 'border-yellow-200 text-yellow-700';
    case 'poor': return 'border-red-200 text-red-700';
  }
};

/**
 * 获取慢查询状态图标颜色
 */
export const getSlowQueryStatusColor = (count: number): string => {
  if (count === 0) return 'text-green-600';
  if (count < 5) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * 获取缓存命中率颜色（用于显示数值）
 */
export const getCacheHitRateColor = (rate: number): string => {
  if (rate >= 85) return 'text-green-600';
  if (rate >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * 获取权限检查时间颜色
 */
export const getPermissionCheckTimeColor = (time: number): string => {
  if (time < 10) return 'text-green-600';
  if (time < 20) return 'text-yellow-600';
  return 'text-red-600';
};

/**
 * 工具函数集合对象
 */
export const metricsUtils: MetricsUtils = {
  formatNumber,
  formatPercentage,
  getHealthColor,
  getHealthText,
  getResponseTimeStatus,
  getConnectionStatus,
  getCacheHitRateStatus
};

/**
 * 默认导出所有工具函数
 */
export default {
  formatNumber,
  formatPercentage,
  getHealthColor,
  getHealthText,
  getResponseTimeStatus,
  getResponseTimeStatusText,
  getResponseTimeStatusColor,
  getConnectionStatus,
  getConnectionStatusText,
  getConnectionStatusColor,
  getCacheHitRateStatus,
  getCacheHitRateStatusText,
  getCacheHitRateStatusColor,
  getSlowQueryStatusColor,
  getCacheHitRateColor,
  getPermissionCheckTimeColor
};
