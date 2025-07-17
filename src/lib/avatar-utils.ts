/**
 * @fileoverview 头像工具函数
 * @description 统一处理用户头像相关逻辑，解决头像显示不一致问题
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

// 头像数据接口
export interface AvatarData {
  avatarUrl?: string | null;
  displayName?: string | null;
  username: string;
  id?: string;
}

// 头像URL处理选项
export interface AvatarUrlOptions {
  fallbackToDefault?: boolean;
  size?: number;
  format?: 'webp' | 'jpg' | 'png';
}

/**
 * 统一处理头像URL
 * 解决不同数据源头像URL格式不一致的问题
 */
export function normalizeAvatarUrl(
  avatarUrl: string | null | undefined,
  options: AvatarUrlOptions = {}
): string | null {
  const { fallbackToDefault = true, size, format } = options;

  // 如果没有头像URL
  if (!avatarUrl || avatarUrl.trim() === '') {
    return fallbackToDefault ? getDefaultAvatarUrl(options) : null;
  }

  // 处理完整的HTTP/HTTPS URL
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return processExternalAvatarUrl(avatarUrl, options);
  }

  // 处理相对路径
  if (avatarUrl.startsWith('/')) {
    return processRelativeAvatarUrl(avatarUrl, options);
  }

  // 处理其他格式（如文件名）
  return processFileNameAvatarUrl(avatarUrl, options);
}

/**
 * 处理外部头像URL
 */
function processExternalAvatarUrl(url: string, options: AvatarUrlOptions): string {
  const { size, format } = options;

  // 处理Unsplash图片
  if (url.includes('unsplash.com')) {
    const baseUrl = url.split('?')[0];
    const params = new URLSearchParams();
    
    if (size) {
      params.set('w', size.toString());
      params.set('h', size.toString());
      params.set('fit', 'crop');
      params.set('crop', 'face');
    }
    
    if (format) {
      params.set('fm', format);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  // 处理DiceBear头像
  if (url.includes('dicebear.com')) {
    const urlObj = new URL(url);
    
    if (size) {
      urlObj.searchParams.set('size', size.toString());
    }
    
    return urlObj.toString();
  }

  // 处理Telegram头像
  if (url.includes('t.me')) {
    return url; // Telegram头像通常不需要额外处理
  }

  // 其他外部URL直接返回
  return url;
}

/**
 * 处理相对路径头像URL
 */
function processRelativeAvatarUrl(url: string, options: AvatarUrlOptions): string {
  const { size, format } = options;

  // 如果已经是API路径，直接返回
  if (url.startsWith('/api/')) {
    return url;
  }

  // 构建R2存储路径
  const baseUrl = process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL || 'https://cc.tutu365.cc';
  let apiUrl = `${baseUrl}/avatars${url.startsWith('/') ? url : '/' + url}`;

  // 添加查询参数
  const params = new URLSearchParams();
  if (size) {
    params.set('size', size.toString());
  }
  if (format) {
    params.set('format', format);
  }

  if (params.toString()) {
    apiUrl += `?${params.toString()}`;
  }

  return apiUrl;
}

/**
 * 处理文件名格式的头像URL
 */
function processFileNameAvatarUrl(filename: string, options: AvatarUrlOptions): string {
  return processRelativeAvatarUrl(`/${filename}`, options);
}

/**
 * 获取默认头像URL
 */
function getDefaultAvatarUrl(options: AvatarUrlOptions): string {
  const { size = 200 } = options;
  
  // 使用DiceBear生成默认头像
  return `https://api.dicebear.com/7.x/avataaars/svg?size=${size}&backgroundColor=3b82f6,8b5cf6,06b6d4`;
}

/**
 * 从用户数据中提取头像信息
 */
export function extractAvatarData(user: any): AvatarData {
  return {
    avatarUrl: user?.avatarUrl || user?.image || user?.avatar || null,
    displayName: user?.displayName || user?.name || null,
    username: user?.username || user?.email || 'user',
    id: user?.id,
  };
}

/**
 * 生成用户头像的alt文本
 */
export function generateAvatarAlt(user: AvatarData): string {
  const name = user.displayName || user.username;
  return `${name}的头像`;
}

/**
 * 获取用户名首字母（用于fallback）
 */
export function getUserInitials(user: AvatarData): string {
  const name = user.displayName || user.username;
  if (!name) return 'U';
  
  // 处理中文名字
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.charAt(0);
  }
  
  // 处理英文名字
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  
  return name.charAt(0).toUpperCase();
}

/**
 * 检查头像URL是否有效
 */
export async function validateAvatarUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && (response.headers.get('content-type')?.startsWith('image/') ?? false);
  } catch {
    return false;
  }
}

/**
 * 预加载头像图片
 */
export function preloadAvatar(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load avatar'));
    img.src = url;
  });
}

/**
 * 生成头像缓存键
 */
export function generateAvatarCacheKey(user: AvatarData, size?: number): string {
  const { id, username, avatarUrl } = user;
  const key = id || username;
  const sizeStr = size ? `_${size}` : '';
  const urlHash = avatarUrl ? btoa(avatarUrl).slice(0, 8) : 'default';
  
  return `avatar_${key}_${urlHash}${sizeStr}`;
}

/**
 * 头像尺寸预设
 */
export const AVATAR_SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 64,
  xl: 80,
  '2xl': 96,
  '3xl': 128,
} as const;

/**
 * 根据尺寸名称获取像素值
 */
export function getAvatarSizeInPixels(size: keyof typeof AVATAR_SIZES | number): number {
  if (typeof size === 'number') {
    return size;
  }
  
  return AVATAR_SIZES[size] || AVATAR_SIZES.md;
}
