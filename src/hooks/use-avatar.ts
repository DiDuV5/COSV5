/**
 * @fileoverview 头像管理Hook
 * @description 提供头像加载、缓存和错误处理功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - avatar-utils
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  normalizeAvatarUrl, 
  extractAvatarData, 
  generateAvatarAlt, 
  getUserInitials,
  generateAvatarCacheKey,
  getAvatarSizeInPixels,
  type AvatarData,
  type AvatarUrlOptions 
} from '@/lib/avatar-utils';

// Hook选项
export interface UseAvatarOptions extends AvatarUrlOptions {
  enableCache?: boolean;
  preload?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

// Hook返回值
export interface UseAvatarReturn {
  avatarUrl: string | null;
  isPending: boolean;
  hasError: boolean;
  alt: string;
  initials: string;
  retry: () => void;
  preload: () => Promise<void>;
}

// 内存缓存
const avatarCache = new Map<string, {
  url: string | null;
  timestamp: number;
  error: boolean;
}>();

// 缓存过期时间（5分钟）
const CACHE_EXPIRY = 5 * 60 * 1000;

/**
 * 头像管理Hook
 * 提供统一的头像加载、缓存和错误处理
 */
export function useAvatar(
  user: any,
  options: UseAvatarOptions = {}
): UseAvatarReturn {
  const {
    enableCache = true,
    preload = false,
    retryOnError = true,
    maxRetries = 3,
    ...urlOptions
  } = options;

  // 提取用户头像数据
  const avatarData = useMemo(() => extractAvatarData(user), [user]);
  
  // 生成缓存键
  const cacheKey = useMemo(() => {
    const size = getAvatarSizeInPixels(urlOptions.size || 40);
    return generateAvatarCacheKey(avatarData, size);
  }, [avatarData, urlOptions.size]);

  // 状态管理
  const [isPending, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // 生成alt文本和首字母
  const alt = useMemo(() => generateAvatarAlt(avatarData), [avatarData]);
  const initials = useMemo(() => getUserInitials(avatarData), [avatarData]);

  // 从缓存获取头像URL
  const getCachedAvatar = useCallback(() => {
    if (!enableCache) return null;
    
    const cached = avatarCache.get(cacheKey);
    if (!cached) return null;
    
    // 检查缓存是否过期
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      avatarCache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }, [cacheKey, enableCache]);

  // 设置缓存
  const setCachedAvatar = useCallback((url: string | null, error = false) => {
    if (!enableCache) return;
    
    avatarCache.set(cacheKey, {
      url,
      timestamp: Date.now(),
      error,
    });
  }, [cacheKey, enableCache]);

  // 加载头像
  const loadAvatar = useCallback(async () => {
    // 检查缓存
    const cached = getCachedAvatar();
    if (cached) {
      setAvatarUrl(cached.url);
      setHasError(cached.error);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      // 规范化头像URL
      const normalizedUrl = normalizeAvatarUrl(avatarData.avatarUrl, urlOptions);
      
      if (normalizedUrl) {
        // 验证图片是否可以加载
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = normalizedUrl;
        });
        
        setAvatarUrl(normalizedUrl);
        setCachedAvatar(normalizedUrl, false);
      } else {
        setAvatarUrl(null);
        setCachedAvatar(null, false);
      }
      
      setRetryCount(0);
    } catch (error) {
      console.warn('头像加载失败:', error);
      setHasError(true);
      setAvatarUrl(null);
      setCachedAvatar(null, true);
      
      // 自动重试
      if (retryOnError && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, Math.pow(2, retryCount) * 1000); // 指数退避
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    avatarData.avatarUrl,
    urlOptions,
    getCachedAvatar,
    setCachedAvatar,
    retryOnError,
    retryCount,
    maxRetries,
  ]);

  // 手动重试
  const retry = useCallback(() => {
    setRetryCount(0);
    setHasError(false);
    loadAvatar();
  }, [loadAvatar]);

  // 预加载头像
  const preloadAvatar = useCallback(async () => {
    const normalizedUrl = normalizeAvatarUrl(avatarData.avatarUrl, urlOptions);
    if (!normalizedUrl) return;

    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to preload image'));
        img.src = normalizedUrl;
      });
    } catch (error) {
      console.warn('头像预加载失败:', error);
    }
  }, [avatarData.avatarUrl, urlOptions]);

  // 初始加载
  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  // 预加载
  useEffect(() => {
    if (preload) {
      preloadAvatar();
    }
  }, [preload, preloadAvatar]);

  // 重试逻辑
  useEffect(() => {
    if (retryCount > 0 && retryCount <= maxRetries) {
      loadAvatar();
    }
  }, [retryCount, maxRetries, loadAvatar]);

  return {
    avatarUrl,
    isPending,
    hasError,
    alt,
    initials,
    retry,
    preload: preloadAvatar,
  };
}

/**
 * 批量预加载头像
 */
export function useBatchAvatarPreload(users: any[], options: UseAvatarOptions = {}) {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadedCount, setPreloadedCount] = useState(0);

  const preloadAll = useCallback(async () => {
    if (users.length === 0) return;

    setIsPreloading(true);
    setPreloadedCount(0);

    const promises = users.map(async (user, index) => {
      try {
        const avatarData = extractAvatarData(user);
        const normalizedUrl = normalizeAvatarUrl(avatarData.avatarUrl, options);
        
        if (normalizedUrl) {
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to preload'));
            img.src = normalizedUrl;
          });
        }
        
        setPreloadedCount(prev => prev + 1);
      } catch (error) {
        console.warn(`预加载用户 ${index} 头像失败:`, error);
        setPreloadedCount(prev => prev + 1);
      }
    });

    await Promise.all(promises);
    setIsPreloading(false);
  }, [users, options]);

  return {
    preloadAll,
    isPreloading,
    preloadedCount,
    total: users.length,
    progress: users.length > 0 ? (preloadedCount / users.length) * 100 : 0,
  };
}

/**
 * 清除头像缓存
 */
export function clearAvatarCache() {
  avatarCache.clear();
}

/**
 * 获取缓存统计信息
 */
export function getAvatarCacheStats() {
  return {
    size: avatarCache.size,
    entries: Array.from(avatarCache.entries()).map(([key, value]) => ({
      key,
      url: value.url,
      timestamp: value.timestamp,
      error: value.error,
      age: Date.now() - value.timestamp,
    })),
  };
}
