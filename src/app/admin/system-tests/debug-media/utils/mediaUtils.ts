/**
 * @fileoverview 媒体处理工具函数
 * @description 媒体文件处理和验证相关的工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { MediaDebugInfo } from '../types';
import { MEDIA_TYPES } from '../constants';

/**
 * 检查是否为视频文件
 * @param mediaType 媒体类型
 * @returns 是否为视频文件
 */
export const isVideoFile = (mediaType: string): boolean => {
  return mediaType === MEDIA_TYPES.VIDEO;
};

/**
 * 检查是否为图片文件
 * @param mediaType 媒体类型
 * @returns 是否为图片文件
 */
export const isImageFile = (mediaType: string): boolean => {
  return mediaType === MEDIA_TYPES.IMAGE;
};

/**
 * 根据MIME类型判断媒体类型
 * @param mimeType MIME类型
 * @returns 媒体类型
 */
export const getMediaTypeFromMime = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) {
    return MEDIA_TYPES.IMAGE;
  } else if (mimeType.startsWith('video/')) {
    return MEDIA_TYPES.VIDEO;
  }
  return 'UNKNOWN';
};

/**
 * 过滤媒体文件
 * @param files 媒体文件列表
 * @param searchQuery 搜索查询
 * @returns 过滤后的文件列表
 */
export const filterMediaFiles = (
  files: MediaDebugInfo[],
  searchQuery: string
): MediaDebugInfo[] => {
  if (!searchQuery.trim()) return files;
  
  const query = searchQuery.toLowerCase();
  
  return files.filter(file =>
    file.filename.toLowerCase().includes(query) ||
    file.originalName.toLowerCase().includes(query) ||
    file.mimeType.toLowerCase().includes(query)
  );
};

/**
 * 验证URL格式
 * @param url URL字符串
 * @returns 是否为有效URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url, window.location.origin);
    return true;
  } catch {
    return false;
  }
};

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 文件扩展名
 */
export const getFileExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
};

/**
 * 检查文件是否支持预览
 * @param file 媒体文件信息
 * @returns 是否支持预览
 */
export const isPreviewSupported = (file: MediaDebugInfo): boolean => {
  const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const supportedVideoTypes = ['video/mp4', 'video/webm'];
  
  return supportedImageTypes.includes(file.mimeType) || 
         supportedVideoTypes.includes(file.mimeType);
};
