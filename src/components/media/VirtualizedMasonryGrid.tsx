/**
 * @fileoverview 虚拟化瀑布流网格组件
 * @description 高性能的瀑布流布局，支持大量媒体内容的流畅浏览
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { useBestMediaUrl, useVideoThumbnailUrl } from '@/lib/media/cdn-url-fixer';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  originalName: string;
  mediaType: 'IMAGE' | 'VIDEO';
  width?: number | null;
  height?: number | null;
}

interface VirtualizedMasonryGridProps {
  media: MediaItem[];
  onMediaClick: (mediaItem: MediaItem, index: number) => void;
  className?: string;
}

interface VisibleItem {
  index: number;
  top: number;
  height: number;
  column: number;
}

const COLUMN_WIDTH = 300;
const GAP = 12;
const OVERSCAN = 5; // 额外渲染的项目数量

export function VirtualizedMasonryGrid({
  media,
  onMediaClick,
  className = ''
}: VirtualizedMasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // 计算列数
  const columnCount = useMemo(() => {
    if (containerWidth === 0) return 1;
    return Math.max(1, Math.floor((containerWidth + GAP) / (COLUMN_WIDTH + GAP)));
  }, [containerWidth]);

  // 计算每个项目的位置
  const itemPositions = useMemo(() => {
    const positions: VisibleItem[] = [];
    const columnHeights = new Array(columnCount).fill(0);

    media.forEach((item, index) => {
      // 估算高度（如果还没有实际高度）
      const estimatedHeight = itemHeights.get(index) ||
        (item.height && item.width ?
          (item.height / item.width) * COLUMN_WIDTH :
          COLUMN_WIDTH * 1.2); // 默认比例

      // 找到最短的列
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));

      positions.push({
        index,
        top: columnHeights[shortestColumn],
        height: estimatedHeight,
        column: shortestColumn
      });

      columnHeights[shortestColumn] += estimatedHeight + GAP;
    });

    return positions;
  }, [media, columnCount, itemHeights]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (itemPositions.length === 0) return 0;
    return Math.max(...itemPositions.map(pos => pos.top + pos.height));
  }, [itemPositions]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    return itemPositions.filter(item => {
      const itemTop = item.top;
      const itemBottom = item.top + item.height;

      return itemBottom >= viewportTop - (OVERSCAN * 200) &&
             itemTop <= viewportBottom + (OVERSCAN * 200);
    });
  }, [itemPositions, scrollTop, containerHeight]);

  // 处理容器尺寸变化
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
        setContainerHeight(rect.height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // 处理图片加载完成
  const handleImageLoad = useCallback((index: number, height: number) => {
    setItemHeights(prev => new Map(prev).set(index, height));
    setLoadedImages(prev => new Set(prev).add(index));
  }, []);

  // 媒体项组件
  const MediaItem = ({ item, position }: { item: MediaItem; position: VisibleItem }) => {
    const imageRef = useRef<HTMLImageElement>(null);
    const [isPending, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // 使用CDN URL修复工具获取最佳URL - 视频使用缩略图
    const videoThumbnailUrl = useVideoThumbnailUrl({...item, mediaType: item.mediaType});
    const bestMediaUrl = useBestMediaUrl({...item, mediaType: item.mediaType});
    const bestUrl = item.mediaType === 'VIDEO' ? videoThumbnailUrl : bestMediaUrl;

    const handleLoad = () => {
      setIsLoading(false);
      if (imageRef.current) {
        const actualHeight = (imageRef.current.naturalHeight / imageRef.current.naturalWidth) * COLUMN_WIDTH;
        handleImageLoad(position.index, actualHeight);
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    const style = {
      position: 'absolute' as const,
      left: position.column * (COLUMN_WIDTH + GAP),
      top: position.top,
      width: COLUMN_WIDTH,
      height: position.height,
    };

    return (
      <div
        style={style}
        className="rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:shadow-lg group"
        onClick={() => onMediaClick(item, position.index)}
      >
        {/* 加载骨架屏 */}
        {isPending && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
        )}

        {/* 错误状态 */}
        {hasError && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
            <div className="text-gray-400 text-center">
              <div className="w-8 h-8 mx-auto mb-2 opacity-50">📷</div>
              <p className="text-xs">加载失败</p>
            </div>
          </div>
        )}

        {/* 媒体内容 */}
        <div className="relative w-full h-full">
          {item.mediaType === 'VIDEO' ? (
            // 视频使用缩略图，统一使用Next.js Image组件优化
            <div className="relative w-full h-full">
              <Image
                ref={imageRef}
                src={bestUrl}
                alt={item.originalName}
                fill
                className="object-cover"
                sizes={`${COLUMN_WIDTH}px`}
                onLoad={handleLoad}
                onError={handleError}
                loading="lazy"
                quality={75}
              />
              {/* 视频播放图标 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="bg-white/90 rounded-full p-3 group-hover:bg-white transition-colors">
                  <Play className="w-6 h-6 text-gray-800" />
                </div>
              </div>
            </div>
          ) : (
            // 图片使用Next.js Image组件优化
            <Image
              ref={imageRef}
              src={bestUrl}
              alt={item.originalName}
              fill
              className="object-cover"
              sizes={`${COLUMN_WIDTH}px`}
              onLoad={handleLoad}
              onError={handleError}
              loading="lazy"
              quality={75}
            />
          )}

          {/* 悬停放大图标 */}
          {item.mediaType === 'IMAGE' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors opacity-0 group-hover:opacity-100">
              <div className="bg-white/90 rounded-full p-2">
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          )}

          {/* 媒体类型标识 */}
          <div className={`absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full ${
            item.mediaType === 'VIDEO' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            {item.mediaType === 'VIDEO' ? '视频' : '图片'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height: '600px' }}
      onScroll={handleScroll}
    >
      {/* 虚拟容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 渲染可见项目 */}
        {visibleItems.map(position => {
          const item = media[position.index];
          return (
            <MediaItem
              key={item.id}
              item={item}
              position={position}
            />
          );
        })}
      </div>

      {/* 加载指示器 */}
      {media.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-center">
            <div className="w-12 h-12 mx-auto mb-4 opacity-50">📷</div>
            <p>暂无媒体内容</p>
          </div>
        </div>
      )}
    </div>
  );
}
