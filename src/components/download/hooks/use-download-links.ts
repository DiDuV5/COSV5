/**
 * @fileoverview 下载链接数据处理Hook
 * @description 管理下载链接的获取、验证和状态管理
 */

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';

export interface DownloadLink {
  id: string;
  platform: string;
  title?: string;
  description?: string | null;
  cansPrice: number;
  downloadCount: number;
  createdAt: string;
  url?: string;
  extractCode?: string;
}

export interface UseDownloadLinksProps {
  postId: string;
  enabled?: boolean;
}

export interface UseDownloadLinksReturn {
  downloadLinks: DownloadLink[];
  isPending: boolean;
  error: any;
  retryCount: number;
  refetch: () => void;
  handleRetry: () => void;
}

/**
 * 下载链接数据处理Hook
 */
export function useDownloadLinks({ postId, enabled = true }: UseDownloadLinksProps): UseDownloadLinksReturn {
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // 获取下载链接 - 添加错误处理和重试机制
  const {
    data: downloadLinksResponse,
    isPending,
    error,
    refetch
  } = api.downloadLink.getByPostId.useQuery(
    { postId },
    {
      enabled, // 根据enabled参数控制是否启用查询
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 60000, // 1分钟缓存
    }
  );

  // 使用useEffect处理错误回调 (React Query v5)
  useEffect(() => {
    if (error) {
      console.error('获取下载链接失败:', error);
      console.log('下载链接查询状态:', {
        enabled,
        isPending,
        error: error?.message,
        hasResponse: !!downloadLinksResponse
      });
      toast({
        variant: "destructive",
        title: "加载失败",
        description: "无法加载下载链接，请稍后重试",
      });
    }
  }, [error, toast, enabled, isPending, downloadLinksResponse]);

  // 数据验证和处理 - 使用 useMemo 优化性能
  const downloadLinks = useMemo(() => {
    // 如果有错误或者没有响应数据，返回空数组
    if (error || !downloadLinksResponse?.success || !Array.isArray(downloadLinksResponse?.data)) {
      return [];
    }

    return downloadLinksResponse.data.filter((link: any) => {
      // 严格的数据验证
      if (!link || typeof link !== 'object') return false;
      if (typeof link.id !== 'string' || !link.id.trim()) return false;
      if (typeof link.platform !== 'string' || !link.platform.trim()) return false;
      if (typeof link.cansPrice !== 'number' || link.cansPrice < 0) return false;
      if (link.title && typeof link.title !== 'string') return false;
      if (link.description && typeof link.description !== 'string') return false;
      if (typeof link.downloadCount !== 'number') return false;
      if (!link.createdAt) return false;

      return true;
    });
  }, [downloadLinksResponse, error]);

  // 重试处理
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  return {
    downloadLinks: downloadLinks?.map((link: any) => ({
      id: link.id,
      platform: link.platform,
      title: link.title,
      description: link.description,
      cansPrice: link.cansPrice,
      downloadCount: link.downloadCount,
      createdAt: link.createdAt,
      url: link.url,
      extractCode: link.extractCode,
    })) || [],
    isPending,
    error,
    retryCount,
    refetch,
    handleRetry,
  };
}
