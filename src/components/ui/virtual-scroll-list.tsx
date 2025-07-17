/**
 * @fileoverview 虚拟滚动列表组件
 * @description 优化大列表性能，支持无限滚动和虚拟化渲染
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * 虚拟滚动配置
 */
export interface VirtualScrollConfig {
  /** 每项高度 */
  itemHeight: number;
  /** 容器高度 */
  containerHeight: number;
  /** 缓冲区大小（渲染额外的项目数） */
  bufferSize: number;
  /** 是否启用无限滚动 */
  enableInfiniteScroll: boolean;
  /** 触发加载更多的距离 */
  loadMoreThreshold: number;
}

/**
 * 虚拟滚动列表属性
 */
export interface VirtualScrollListProps<T> {
  /** 数据列表 */
  items: T[];
  /** 渲染项目的函数 */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** 获取项目唯一键的函数 */
  getItemKey: (item: T, index: number) => string | number;
  /** 虚拟滚动配置 */
  config: Partial<VirtualScrollConfig>;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否有更多数据 */
  hasMore?: boolean;
  /** 加载更多数据的函数 */
  onLoadMore?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 空状态组件 */
  emptyComponent?: React.ReactNode;
  /** 加载组件 */
  loadingComponent?: React.ReactNode;
  /** 错误组件 */
  errorComponent?: React.ReactNode;
  /** 是否有错误 */
  error?: boolean;
}

/**
 * 虚拟滚动列表组件
 */
export function VirtualScrollList<T>({
  items,
  renderItem,
  getItemKey,
  config,
  loading = false,
  hasMore = false,
  onLoadMore,
  className,
  emptyComponent,
  loadingComponent,
  errorComponent,
  error = false,
}: VirtualScrollListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 合并默认配置
  const virtualConfig: VirtualScrollConfig = useMemo(() => ({
    itemHeight: 100,
    containerHeight: 400,
    bufferSize: 5,
    enableInfiniteScroll: true,
    loadMoreThreshold: 200,
    ...config,
  }), [config]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const { itemHeight, containerHeight, bufferSize } = virtualConfig;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + bufferSize * 2);

    return { startIndex, endIndex, visibleCount };
  }, [scrollTop, items.length, virtualConfig]);

  // 计算总高度
  const totalHeight = items.length * virtualConfig.itemHeight;

  // 计算偏移量
  const offsetY = visibleRange.startIndex * virtualConfig.itemHeight;

  // 获取可见项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // 无限滚动检查
    if (
      virtualConfig.enableInfiniteScroll &&
      hasMore &&
      !loading &&
      !isLoadingMore &&
      onLoadMore
    ) {
      const { scrollTop, scrollHeight, clientHeight } = target;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceToBottom < virtualConfig.loadMoreThreshold) {
        setIsLoadingMore(true);
        onLoadMore();
      }
    }
  }, [virtualConfig, hasMore, loading, isLoadingMore, onLoadMore]);

  // 重置加载状态
  useEffect(() => {
    if (!loading) {
      setIsLoadingMore(false);
    }
  }, [loading]);

  // 滚动到指定项目
  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      const scrollTop = index * virtualConfig.itemHeight;
      containerRef.current.scrollTop = scrollTop;
    }
  }, [virtualConfig.itemHeight]);

  // 滚动到顶部
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = totalHeight;
    }
  }, [totalHeight]);

  // 错误状态
  if (error && errorComponent) {
    return <div className={cn('flex items-center justify-center', className)}>{errorComponent}</div>;
  }

  // 空状态
  if (items.length === 0 && !loading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        {emptyComponent || (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
        className
      )}
      style={{ height: virtualConfig.containerHeight }}
      onScroll={handleScroll}
    >
      {/* 虚拟容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 可见项目容器 */}
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index;
            const key = getItemKey(item, actualIndex);

            return (
              <div
                key={key}
                style={{
                  height: virtualConfig.itemHeight,
                  overflow: 'hidden',
                }}
                className="virtual-scroll-item"
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>

        {/* 加载更多指示器 */}
        {virtualConfig.enableInfiniteScroll && (loading || isLoadingMore) && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
            }}
            className="flex items-center justify-center"
          >
            {loadingComponent || (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>加载中...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 优化的分页Hook
 */
export function useOptimizedPagination<T>(
  fetchData: (params: { cursor?: string; limit: number }) => Promise<{
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
  }>,
  options: {
    limit?: number;
    initialLoad?: boolean;
  } = {}
) {
  const { limit = 20, initialLoad = true } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  // 加载数据
  const loadData = useCallback(async (reset = false) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const cursor = reset ? undefined : nextCursor;
      const result = await fetchData({ cursor, limit });

      setItems(prev => reset ? result.items : [...prev, ...result.items]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchData, limit, nextCursor, loading]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadData(false);
    }
  }, [hasMore, loading, loadData]);

  // 刷新
  const refresh = useCallback(() => {
    setItems([]);
    setNextCursor(undefined);
    setHasMore(true);
    loadData(true);
  }, [loadData]);

  // 初始加载
  useEffect(() => {
    if (initialLoad) {
      loadData(true);
    }
  }, [initialLoad, loadData]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    isEmpty: items.length === 0 && !loading,
  };
}

/**
 * 无限滚动Hook
 */
export function useInfiniteScroll(
  callback: () => void,
  options: {
    threshold?: number;
    enabled?: boolean;
  } = {}
) {
  const { threshold = 200, enabled = true } = options;
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;

      if (distanceToBottom < threshold && !isFetching) {
        setIsFetching(true);
        callback();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, threshold, enabled, isFetching]);

  useEffect(() => {
    if (isFetching) {
      const timer = setTimeout(() => setIsFetching(false), 1000);
      return () => clearTimeout(timer);
    }
    // 如果不满足条件，返回undefined（可选的清理函数）
    return undefined;
  }, [isFetching]);

  return { isFetching };
}

/**
 * 虚拟滚动性能优化Hook
 */
export function useVirtualScrollOptimization() {
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const handleScrollStart = useCallback(() => {
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    isScrolling,
    handleScrollStart,
  };
}

export default VirtualScrollList;
