/**
 * @fileoverview 视频处理工具函数
 * @description 视频相关的格式化和计算工具
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { VideoQuality, VideoStatus } from '../types';

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化时间
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs}秒`;
};

/**
 * 计算压缩率
 * @param original 原始文件大小
 * @param converted 转码后文件大小
 * @returns 压缩率百分比
 */
export const getCompressionRatio = (original: number, converted: number): number => {
  if (original === 0) return 0;
  return Math.round((1 - converted / original) * 100);
};

/**
 * 获取质量颜色样式
 * @param quality 视频质量
 * @returns CSS类名字符串
 */
export const getQualityColor = (quality: VideoQuality): string => {
  switch (quality) {
    case 'high':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-red-100 text-red-800';
  }
};

/**
 * 获取质量显示文本
 * @param quality 视频质量
 * @returns 质量显示文本
 */
export const getQualityText = (quality: VideoQuality): string => {
  switch (quality) {
    case 'high':
      return '高质量';
    case 'medium':
      return '中等质量';
    case 'low':
      return '低质量';
  }
};

/**
 * 获取状态显示文本
 * @param status 视频状态
 * @returns 状态显示文本
 */
export const getStatusText = (status: VideoStatus): string => {
  switch (status) {
    case 'completed':
      return '转码完成';
    case 'failed':
      return '转码失败';
    case 'processing':
      return '转码中';
  }
};
