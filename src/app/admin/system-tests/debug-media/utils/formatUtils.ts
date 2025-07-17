/**
 * @fileoverview 格式化工具函数
 * @description 媒体调试页面的数据格式化工具
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 格式化视频时长
 * @param seconds 秒数
 * @returns 格式化后的时长字符串 (mm:ss)
 */
export const formatDuration = (seconds?: number): string => {
  if (!seconds) return '';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * 格式化日期时间
 * @param dateString ISO日期字符串
 * @returns 格式化后的本地日期时间字符串
 */
export const formatDateTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateString;
  }
};

/**
 * 格式化媒体尺寸
 * @param width 宽度
 * @param height 高度
 * @returns 格式化后的尺寸字符串
 */
export const formatDimensions = (width?: number, height?: number): string => {
  if (!width || !height) return '';
  return `${width}×${height}`;
};

/**
 * 格式化MIME类型显示名称
 * @param mimeType MIME类型
 * @returns 用户友好的类型名称
 */
export const formatMimeType = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
    'image/jpeg': 'JPEG 图片',
    'image/png': 'PNG 图片',
    'image/gif': 'GIF 图片',
    'image/webp': 'WebP 图片',
    'video/mp4': 'MP4 视频',
    'video/webm': 'WebM 视频',
    'video/avi': 'AVI 视频',
    'video/mov': 'MOV 视频',
  };
  
  return typeMap[mimeType] || mimeType;
};

/**
 * 截断长文本
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
