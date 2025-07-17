/**
 * @fileoverview 平台图标和名称工具
 * @description 提供各种下载平台的图标和名称映射
 */

import React from 'react';

/**
 * 平台配置接口
 */
export interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
}

/**
 * 平台配置映射
 */
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  // 网盘平台
  baidu: {
    name: '百度网盘',
    icon: '🌐',
    color: '#2932e1',
  },
  aliyun: {
    name: '阿里云盘',
    icon: '☁️',
    color: '#ff6a00',
  },
  quark: {
    name: '夸克网盘',
    icon: '⚡',
    color: '#1890ff',
  },
  '115': {
    name: '115网盘',
    icon: '💾',
    color: '#00a854',
  },
  lanzou: {
    name: '蓝奏云',
    icon: '🔵',
    color: '#1890ff',
  },
  
  // 文件分享平台
  mega: {
    name: 'MEGA',
    icon: '🔴',
    color: '#d9001b',
  },
  onedrive: {
    name: 'OneDrive',
    icon: '📁',
    color: '#0078d4',
  },
  googledrive: {
    name: 'Google Drive',
    icon: '🗂️',
    color: '#4285f4',
  },
  dropbox: {
    name: 'Dropbox',
    icon: '📦',
    color: '#0061ff',
  },
  
  // 直链下载
  direct: {
    name: '直链下载',
    icon: '⬇️',
    color: '#52c41a',
  },
  torrent: {
    name: '种子下载',
    icon: '🌱',
    color: '#722ed1',
  },
  magnet: {
    name: '磁力链接',
    icon: '🧲',
    color: '#eb2f96',
  },
  
  // 其他平台
  telegram: {
    name: 'Telegram',
    icon: '✈️',
    color: '#0088cc',
  },
  wechat: {
    name: '微信群',
    icon: '💬',
    color: '#07c160',
  },
  qq: {
    name: 'QQ群',
    icon: '🐧',
    color: '#12b7f5',
  },
  
  // 默认
  other: {
    name: '其他平台',
    icon: '🔗',
    color: '#666666',
  },
};

/**
 * 获取平台图标
 */
export function getPlatformIcon(platform: string): string {
  if (!platform || typeof platform !== 'string') {
    return PLATFORM_CONFIGS.other.icon;
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  const config = PLATFORM_CONFIGS[normalizedPlatform];
  
  return config?.icon || PLATFORM_CONFIGS.other.icon;
}

/**
 * 获取平台名称
 */
export function getPlatformName(platform: string): string {
  if (!platform || typeof platform !== 'string') {
    return PLATFORM_CONFIGS.other.name;
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  const config = PLATFORM_CONFIGS[normalizedPlatform];
  
  return config?.name || platform;
}

/**
 * 获取平台颜色
 */
export function getPlatformColor(platform: string): string {
  if (!platform || typeof platform !== 'string') {
    return PLATFORM_CONFIGS.other.color;
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  const config = PLATFORM_CONFIGS[normalizedPlatform];
  
  return config?.color || PLATFORM_CONFIGS.other.color;
}

/**
 * 获取平台完整配置
 */
export function getPlatformConfig(platform: string): PlatformConfig {
  if (!platform || typeof platform !== 'string') {
    return PLATFORM_CONFIGS.other;
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  const config = PLATFORM_CONFIGS[normalizedPlatform];
  
  return config || PLATFORM_CONFIGS.other;
}

/**
 * 检查平台是否需要提取码
 */
export function platformNeedsExtractCode(platform: string): boolean {
  if (!platform || typeof platform !== 'string') {
    return false;
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  const needsExtractCode = ['baidu', 'aliyun', 'quark', '115', 'lanzou'];
  
  return needsExtractCode.includes(normalizedPlatform);
}

/**
 * 检查平台是否支持直接下载
 */
export function platformSupportsDirectDownload(platform: string): boolean {
  if (!platform || typeof platform !== 'string') {
    return false;
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  const directDownloadPlatforms = ['direct', 'mega', 'onedrive', 'googledrive', 'dropbox'];
  
  return directDownloadPlatforms.includes(normalizedPlatform);
}

/**
 * 获取平台的下载提示文本
 */
export function getPlatformDownloadHint(platform: string): string {
  if (!platform || typeof platform !== 'string') {
    return '点击下载';
  }

  const normalizedPlatform = platform.toLowerCase().trim();
  
  switch (normalizedPlatform) {
    case 'baidu':
      return '跳转到百度网盘下载';
    case 'aliyun':
      return '跳转到阿里云盘下载';
    case 'quark':
      return '跳转到夸克网盘下载';
    case '115':
      return '跳转到115网盘下载';
    case 'lanzou':
      return '跳转到蓝奏云下载';
    case 'mega':
      return '跳转到MEGA下载';
    case 'onedrive':
      return '跳转到OneDrive下载';
    case 'googledrive':
      return '跳转到Google Drive下载';
    case 'dropbox':
      return '跳转到Dropbox下载';
    case 'direct':
      return '直接下载文件';
    case 'torrent':
      return '下载种子文件';
    case 'magnet':
      return '复制磁力链接';
    case 'telegram':
      return '跳转到Telegram频道';
    case 'wechat':
      return '获取微信群二维码';
    case 'qq':
      return '获取QQ群号';
    default:
      return '点击下载';
  }
}
