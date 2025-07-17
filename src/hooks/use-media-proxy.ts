/**
 * @fileoverview 媒体代理Hook
 * @description 使用tRPC媒体代理API替代REST API
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/trpc/react';

/**
 * 媒体代理响应类型
 */
export interface MediaProxyResponse {
  type: 'redirect' | 'placeholder';
  url?: string;
  content?: string;
  contentType?: string;
  cacheControl?: string;
  cdnUrl?: string;
}

/**
 * 媒体代理Hook选项
 */
export interface UseMediaProxyOptions {
  /** 缓存时间（秒），默认3600秒（1小时） */
  maxAge?: number;
  /** 是否启用自动重试 */
  enableRetry?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
}

/**
 * 媒体代理Hook返回值
 */
export interface UseMediaProxyReturn {
  /** 媒体URL（预签名URL或CDN URL） */
  mediaUrl: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 重新获取媒体URL */
  refetch: () => void;
  /** 媒体类型 */
  mediaType: 'redirect' | 'placeholder' | null;
  /** 原始响应数据 */
  data: MediaProxyResponse | null;
}

/**
 * 内存缓存
 */
const mediaCache = new Map<string, {
  data: MediaProxyResponse;
  timestamp: number;
  maxAge: number;
}>();

/**
 * 清理过期缓存
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of mediaCache.entries()) {
    if (now - value.timestamp > value.maxAge * 1000) {
      mediaCache.delete(key);
    }
  }
}

/**
 * 媒体代理Hook
 *
 * @param path 媒体文件路径
 * @param options 配置选项
 * @returns 媒体代理结果
 *
 * @example
 * ```tsx
 * const { mediaUrl, isLoading, error } = useMediaProxy('uploads/2025/07/image.jpg');
 *
 * if (isLoading) return <div>加载中...</div>;
 * if (error) return <div>错误: {error}</div>;
 *
 * return <img src={mediaUrl} alt="媒体文件" />;
 * ```
 */
export function useMediaProxy(
  path: string | null | undefined,
  options: UseMediaProxyOptions = {}
): UseMediaProxyReturn {
  const {
    maxAge = 3600,
    enableRetry = true,
    retryCount = 3,
    enableCache = true,
  } = options;

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'redirect' | 'placeholder' | null>(null);
  const [data, setData] = useState<MediaProxyResponse | null>(null);

  // 生成缓存键
  const cacheKey = path ? `${path}_${maxAge}` : null;

  // tRPC查询
  const {
    data: proxyData,
    isLoading,
    error: queryError,
    refetch: queryRefetch,
  } = api.media.mediaProxy.useQuery(
    { path: path!, maxAge },
    {
      enabled: !!path,
      retry: enableRetry ? retryCount : false,
      staleTime: maxAge * 1000, // 使用maxAge作为staleTime
      gcTime: maxAge * 1000, // React Query v5 使用 gcTime 替代 cacheTime
    }
  );

  // 处理数据更新
  useEffect(() => {
    if (!path) {
      setMediaUrl(null);
      setError(null);
      setMediaType(null);
      setData(null);
      return;
    }

    // 检查内存缓存
    if (enableCache && cacheKey) {
      const cached = mediaCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.maxAge * 1000) {
        const cachedData = cached.data;
        setData(cachedData);
        setMediaType(cachedData.type);

        if (cachedData.type === 'redirect') {
          setMediaUrl(cachedData.url || cachedData.cdnUrl || null);
        } else if (cachedData.type === 'placeholder') {
          // 对于占位符，创建data URL
          const dataUrl = `data:${cachedData.contentType || 'image/svg+xml'};charset=utf-8,${encodeURIComponent(cachedData.content || '')}`;
          setMediaUrl(dataUrl);
        }
        setError(null);
        return;
      }
    }

    // 处理查询错误
    if (queryError) {
      setError(queryError.message || '获取媒体文件失败');
      setMediaUrl(null);
      setMediaType(null);
      setData(null);
      return;
    }

    // 处理查询数据
    if (proxyData) {
      setData(proxyData as MediaProxyResponse);
      setMediaType(proxyData.type as "redirect" | "placeholder");
      setError(null);

      if (proxyData.type === 'redirect') {
        setMediaUrl(proxyData.url || proxyData.cdnUrl || null);
      } else if (proxyData.type === 'placeholder') {
        // 对于占位符，创建data URL
        const dataUrl = `data:${proxyData.contentType || 'image/svg+xml'};charset=utf-8,${encodeURIComponent(proxyData.content || '')}`;
        setMediaUrl(dataUrl);
      }

      // 更新内存缓存
      if (enableCache && cacheKey) {
        mediaCache.set(cacheKey, {
          data: proxyData as MediaProxyResponse,
          timestamp: Date.now(),
          maxAge,
        });

        // 定期清理过期缓存
        if (Math.random() < 0.1) { // 10%的概率触发清理
          cleanExpiredCache();
        }
      }
    }
  }, [path, proxyData, queryError, enableCache, cacheKey, maxAge]);

  // 重新获取函数
  const refetch = useCallback(() => {
    if (cacheKey) {
      mediaCache.delete(cacheKey); // 清除缓存
    }
    queryRefetch();
  }, [cacheKey, queryRefetch]);

  return {
    mediaUrl,
    isLoading: isLoading && !!path,
    error,
    refetch,
    mediaType,
    data,
  };
}

/**
 * 批量媒体代理Hook
 *
 * 注意：由于React Hooks规则限制，此函数已被弃用。
 * 请在组件中为每个路径单独调用 useMediaProxy Hook。
 *
 * @deprecated 请使用多个 useMediaProxy 调用替代
 * @param paths 媒体文件路径数组
 * @param options 配置选项
 * @returns 批量媒体代理结果
 */
export function useBatchMediaProxy(
  paths: (string | null | undefined)[],
  options: UseMediaProxyOptions = {}
) {
  // 为了符合React Hooks规则，我们需要为固定数量的路径调用Hook
  // 这里假设最多处理10个路径，超出的会被忽略
  const maxPaths = 10;
  const paddedPaths = [...paths.slice(0, maxPaths), ...Array(Math.max(0, maxPaths - paths.length)).fill(null)];

  // 为每个路径位置调用Hook（即使路径为null）
  const result0 = useMediaProxy(paddedPaths[0], options);
  const result1 = useMediaProxy(paddedPaths[1], options);
  const result2 = useMediaProxy(paddedPaths[2], options);
  const result3 = useMediaProxy(paddedPaths[3], options);
  const result4 = useMediaProxy(paddedPaths[4], options);
  const result5 = useMediaProxy(paddedPaths[5], options);
  const result6 = useMediaProxy(paddedPaths[6], options);
  const result7 = useMediaProxy(paddedPaths[7], options);
  const result8 = useMediaProxy(paddedPaths[8], options);
  const result9 = useMediaProxy(paddedPaths[9], options);

  const results = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9];
  const actualResults = results.slice(0, paths.length);

  return {
    mediaUrls: actualResults.map(r => r.mediaUrl),
    isLoading: actualResults.some(r => r.isLoading),
    errors: actualResults.map(r => r.error),
    refetchAll: () => actualResults.forEach(r => r.refetch()),
    data: actualResults.map(r => r.data),
  };
}

/**
 * 清理所有媒体缓存
 */
export function clearMediaCache() {
  mediaCache.clear();
}

/**
 * 获取缓存统计信息
 */
export function getMediaCacheStats() {
  cleanExpiredCache();
  return {
    size: mediaCache.size,
    keys: Array.from(mediaCache.keys()),
  };
}
