/**
 * @fileoverview 高级上传系统工具函数
 * @description 提供格式化和策略相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { UploadStrategy } from './types';

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化速度
 */
export const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatFileSize(bytesPerSecond)}/s`;
};

/**
 * 格式化时间
 */
export const formatTime = (seconds: number): string => {
  if (seconds === 0 || !isFinite(seconds)) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 获取策略显示名称
 */
export const getStrategyName = (strategy: UploadStrategy): string => {
  const names = {
    direct: '直接上传',
    chunked: '分片上传',
    streaming: '流式上传',
    hybrid: '混合策略'
  };
  return names[strategy];
};

/**
 * 获取策略颜色
 */
export const getStrategyColor = (strategy: UploadStrategy): string => {
  const colors = {
    direct: 'bg-blue-100 text-blue-800',
    chunked: 'bg-green-100 text-green-800',
    streaming: 'bg-purple-100 text-purple-800',
    hybrid: 'bg-orange-100 text-orange-800'
  };
  return colors[strategy];
};

/**
 * 生成唯一文件ID
 */
export const generateFileId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(7)}`;
};
