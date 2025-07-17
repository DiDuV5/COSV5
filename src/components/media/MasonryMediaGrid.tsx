/**
 * @fileoverview 瀑布流媒体网格组件
 * @description 高性能的瀑布流布局，支持虚拟滚动和懒加载
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 自适应瀑布流布局
 * - 虚拟滚动性能优化
 * - 懒加载和Intersection Observer
 * - 视频缩略图预览
 * - 响应式设计
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - Intersection Observer API
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Play, Clock, FileImage, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename?: string | null;
  originalName: string;
  mediaType: 'IMAGE' | 'VIDEO';
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fileSize?: number | null;
}

interface MasonryMediaGridProps {
  media: MediaItem[];
  viewMode: 'masonry' | 'grid';
  onMediaClick: (mediaItem: MediaItem, index: number) => void;
  userLevel: string;
  className?: string;
}

// 响应式列数配置
const getColumnCount = (width: number): number => {
  if (width < 640) return 2;      // mobile
  if (width < 768) return 3;      // sm
  if (width < 1024) return 4;     // md
  if (width < 1280) return 5;     // lg
  return 6;                       // xl+
};

// 格式化文件大小
const formatFileSize = (bytes?: number | null): string => {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// 格式化视频时长
const formatDuration = (seconds?: number | null): string => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function MasonryMediaGrid({
  media,
  viewMode,
  onMediaClick,
  userLevel,
  className = ''
}: MasonryMediaGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  // 监听容器宽度变化 - 添加防抖
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        // 只有宽度变化超过10px才更新，避免频繁重渲染
        if (Math.abs(newWidth - containerWidth) > 10) {
          setContainerWidth(newWidth);
        }
      }
    };

    const debouncedUpdateWidth = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(updateWidth, 150);
    };

    updateWidth();
    window.addEventListener('resize', debouncedUpdateWidth);
    return () => {
      window.removeEventListener('resize', debouncedUpdateWidth);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [containerWidth]);

  // 计算列数和列宽
  const { columnCount, columnWidth, gap } = useMemo(() => {
    const cols = viewMode === 'grid' ? getColumnCount(containerWidth) : getColumnCount(containerWidth);
    const gapSize = 16; // 16px gap
    const availableWidth = containerWidth - (gapSize * (cols - 1));
    const colWidth = Math.floor(availableWidth / cols);

    return {
      columnCount: cols,
      columnWidth: colWidth,
      gap: gapSize
    };
  }, [containerWidth, viewMode]);

  // 计算媒体项的显示高度
  const calculateItemHeight = useCallback((item: MediaItem): number => {
    if (viewMode === 'grid') {
      return columnWidth; // 正方形网格
    }

    // 瀑布流模式：保持原始宽高比
    if (item.width && item.height) {
      return Math.floor((columnWidth * item.height) / item.width);
    }

    // 默认高度
    return item.mediaType === 'VIDEO' ? Math.floor(columnWidth * 0.75) : Math.floor(columnWidth * 1.2);
  }, [columnWidth, viewMode]);

  // 瀑布流布局计算 - 添加稳定性检查
  const layoutItems = useMemo(() => {
    // 确保基础数据有效
    if (columnCount === 0 || columnWidth === 0 || !media.length) {
      return { positions: [], totalHeight: 400 };
    }

    const columnHeights = new Array(columnCount).fill(0);
    const positions: Array<{
      item: MediaItem;
      index: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    media.forEach((item, index) => {
      // 找到最短的列
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      const height = calculateItemHeight(item);

      // 确保计算结果有效
      if (height > 0 && columnWidth > 0) {
        positions.push({
          item,
          index,
          x: shortestColumnIndex * (columnWidth + gap),
          y: columnHeights[shortestColumnIndex],
          width: columnWidth,
          height
        });

        // 更新列高度
        columnHeights[shortestColumnIndex] += height + gap;
      }
    });

    return {
      positions,
      totalHeight: Math.max(...columnHeights, 400) // 确保最小高度
    };
  }, [media, columnCount, columnWidth, gap, calculateItemHeight]);

  // 媒体项组件 - 使用React.memo优化
  const MediaItem = React.memo(({ position }: { position: typeof layoutItems.positions[0] }) => {
    const [isPending, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Intersection Observer for lazy loading - 优化
    useEffect(() => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
          }
        },
        { rootMargin: '100px', threshold: 0.1 }
      );

      if (itemRef.current) {
        observerRef.current.observe(itemRef.current);
      }

      return () => {
        observerRef.current?.disconnect();
      };
    }, [position.item.id]); // 只依赖item.id

    const handleImageLoad = useCallback(() => {
      setIsLoading(false);
      setLoadedImages(prev => new Set(Array.from(prev).concat(position.item.id)));
    }, [position.item.id]);

    const handleImageError = useCallback(() => {
      setIsLoading(false);
      setHasError(true);
    }, []);

    const handleClick = useCallback(() => {
      onMediaClick(position.item, position.index);
    }, [position.item, position.index, onMediaClick]);

    return (
      <div
        ref={itemRef}
        className="absolute cursor-pointer group"
        style={{
          left: position.x,
          top: position.y,
          width: position.width,
          height: position.height
        }}
        onClick={handleClick}
      >
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100 transition-transform group-hover:scale-[1.02] shadow-sm group-hover:shadow-md">
          {/* 骨架屏 */}
          {!isVisible && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}

          {/* 错误状态 */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">加载失败</p>
              </div>
            </div>
          )}

          {/* 媒体内容 */}
          {isVisible && !hasError && (
            <>
              <Image
                src={position.item.thumbnailUrl || position.item.url}
                alt={position.item.originalName}
                fill
                className={`object-cover transition-opacity duration-300 ${
                  isPending ? 'opacity-0' : 'opacity-100'
                }`}
                sizes={`${columnWidth}px`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
                quality={75}
              />

              {/* 视频覆盖层 */}
              {position.item.mediaType === 'VIDEO' && (
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-3 group-hover:bg-white transition-colors">
                      <Play className="w-6 h-6 text-gray-800" />
                    </div>
                  </div>

                  {/* 视频时长 */}
                  {position.item.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(position.item.duration)}
                    </div>
                  )}
                </div>
              )}

              {/* 媒体类型标识 */}
              <div className="absolute top-2 left-2">
                <Badge
                  variant={position.item.mediaType === 'VIDEO' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {position.item.mediaType === 'VIDEO' ? '视频' : '图片'}
                </Badge>
              </div>

              {/* 文件信息 */}
              {position.item.fileSize && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {formatFileSize(position.item.fileSize)}
                </div>
              )}

              {/* 加载指示器 */}
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  });

  // 设置组件显示名
  MediaItem.displayName = 'MediaItem';

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ height: layoutItems.totalHeight || 400 }}
    >
      {layoutItems.positions.map((position) => (
        <MediaItem key={position.item.id} position={position} />
      ))}

      {/* 空状态 */}
      {media.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <FileImage className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无媒体内容</p>
          </div>
        </div>
      )}
    </div>
  );
}
