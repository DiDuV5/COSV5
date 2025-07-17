/**
 * @fileoverview 虚拟滚动图片网格组件
 * @description 高性能的虚拟滚动图片网格，支持大量图片的流畅展示
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * <VirtualImageGrid
 *   items={imageList}
 *   itemHeight={200}
 *   columns={3}
 *   gap={16}
 * />
 *
 * @dependencies
 * - React 18+
 * - Intersection Observer API
 *
 * @changelog
 * - 2025-06-16: 初始版本创建，支持虚拟滚动和懒加载
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { OptimizedImage } from './optimized-image';
import { cn } from '@/lib/utils';

/**
 * 图片项目接口
 */
export interface ImageGridItem {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  thumbnail?: string;
  onClick?: () => void;
}

/**
 * 虚拟图片网格属性接口
 */
export interface VirtualImageGridProps {
  /** 图片项目列表 */
  items: ImageGridItem[];
  /** 列数 */
  columns?: number;
  /** 项目间距 */
  gap?: number;
  /** 基础项目高度 */
  itemHeight?: number;
  /** 容器高度 */
  containerHeight?: number;
  /** 自定义类名 */
  className?: string;
  /** 加载更多回调 */
  onLoadMore?: () => void;
  /** 是否正在加载 */
  loading?: boolean;
  /** 是否有更多数据 */
  hasMore?: boolean;
  /** 缓冲区大小（屏幕数量） */
  bufferSize?: number;
  /** 是否启用瀑布流布局 */
  enableMasonry?: boolean;
  /** 响应式断点 */
  responsive?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

/**
 * 项目位置信息
 */
interface ItemPosition {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

/**
 * 使用响应式列数
 */
const useResponsiveColumns = (
  defaultColumns: number,
  responsive?: VirtualImageGridProps['responsive']
) => {
  const [columns, setColumns] = useState(defaultColumns);

  useEffect(() => {
    if (!responsive || typeof window === 'undefined') {
      return;
    }

    const updateColumns = () => {
      const width = window.innerWidth;
      
      if (width >= 1280 && responsive.xl) {
        setColumns(responsive.xl);
      } else if (width >= 1024 && responsive.lg) {
        setColumns(responsive.lg);
      } else if (width >= 768 && responsive.md) {
        setColumns(responsive.md);
      } else if (width >= 640 && responsive.sm) {
        setColumns(responsive.sm);
      } else {
        setColumns(defaultColumns);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [defaultColumns, responsive]);

  return columns;
};

/**
 * 计算瀑布流布局
 */
const calculateMasonryLayout = (
  items: ImageGridItem[],
  columns: number,
  itemWidth: number,
  gap: number,
  baseHeight: number
): ItemPosition[] => {
  const columnHeights = new Array(columns).fill(0);
  const positions: ItemPosition[] = [];

  items.forEach((item, index) => {
    // 找到最短的列
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    
    // 计算项目高度
    let itemHeight = baseHeight;
    if (item.aspectRatio) {
      itemHeight = itemWidth / item.aspectRatio;
    } else if (item.width && item.height) {
      itemHeight = (itemWidth * item.height) / item.width;
    }

    const x = shortestColumnIndex * (itemWidth + gap);
    const y = columnHeights[shortestColumnIndex];

    positions.push({
      index,
      x,
      y,
      width: itemWidth,
      height: itemHeight,
      visible: false
    });

    // 更新列高度
    columnHeights[shortestColumnIndex] += itemHeight + gap;
  });

  return positions;
};

/**
 * 计算网格布局
 */
const calculateGridLayout = (
  items: ImageGridItem[],
  columns: number,
  itemWidth: number,
  itemHeight: number,
  gap: number
): ItemPosition[] => {
  return items.map((_, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    return {
      index,
      x: col * (itemWidth + gap),
      y: row * (itemHeight + gap),
      width: itemWidth,
      height: itemHeight,
      visible: false
    };
  });
};

/**
 * 虚拟滚动图片网格组件
 */
export const VirtualImageGrid: React.FC<VirtualImageGridProps> = ({
  items,
  columns: defaultColumns = 3,
  gap = 16,
  itemHeight = 200,
  containerHeight = 600,
  className,
  onLoadMore,
  loading = false,
  hasMore = false,
  bufferSize = 2,
  enableMasonry = false,
  responsive
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());

  // 响应式列数
  const columns = useResponsiveColumns(defaultColumns, responsive);

  // 计算项目宽度
  const itemWidth = useMemo(() => {
    if (containerWidth === 0) return 0;
    return (containerWidth - gap * (columns - 1)) / columns;
  }, [containerWidth, columns, gap]);

  // 计算布局位置
  const positions = useMemo(() => {
    if (itemWidth === 0) return [];
    
    if (enableMasonry) {
      return calculateMasonryLayout(items, columns, itemWidth, gap, itemHeight);
    } else {
      return calculateGridLayout(items, columns, itemWidth, itemHeight, gap);
    }
  }, [items, columns, itemWidth, gap, itemHeight, enableMasonry]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (positions.length === 0) return 0;
    return Math.max(...positions.map(pos => pos.y + pos.height)) + gap;
  }, [positions, gap]);

  // 计算可见项目
  const updateVisibleItems = useCallback(() => {
    if (!containerRef.current || positions.length === 0) return;

    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;
    const bufferHeight = containerHeight * bufferSize;

    const newVisibleItems = new Set<number>();

    positions.forEach((position, index) => {
      const itemTop = position.y;
      const itemBottom = position.y + position.height;

      // 检查项目是否在可视区域内（包含缓冲区）
      if (
        itemBottom >= viewportTop - bufferHeight &&
        itemTop <= viewportBottom + bufferHeight
      ) {
        newVisibleItems.add(index);
      }
    });

    setVisibleItems(newVisibleItems);
  }, [scrollTop, containerHeight, positions, bufferSize]);

  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    // 检查是否需要加载更多
    if (
      hasMore &&
      !loading &&
      onLoadMore &&
      target.scrollTop + target.clientHeight >= target.scrollHeight - 100
    ) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 更新可见项目
  useEffect(() => {
    updateVisibleItems();
  }, [updateVisibleItems]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-auto',
        className
      )}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 虚拟容器 */}
      <div
        className="relative"
        style={{ height: totalHeight }}
      >
        {/* 渲染可见项目 */}
        {positions.map((position, index) => {
          if (!visibleItems.has(index)) return null;

          const item = items[index];
          if (!item) return null;

          return (
            <div
              key={item.id}
              className="absolute cursor-pointer transition-transform hover:scale-105"
              style={{
                left: position.x,
                top: position.y,
                width: position.width,
                height: position.height,
              }}
              onClick={item.onClick}
            >
              <OptimizedImage
                src={item.thumbnail || item.src}
                alt={item.alt}
                width={position.width}
                height={position.height}
                className="w-full h-full object-cover rounded-lg"
                sizes={`${position.width}px`}
                enableLazyLoading={true}
                showLoadingState={true}
                fallbackSrc="/images/placeholder.jpg"
              />
            </div>
          );
        })}

        {/* 加载状态 */}
        {loading && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center py-4">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span>加载中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 预设的响应式图片网格
 */
export const ResponsiveImageGrid: React.FC<Omit<VirtualImageGridProps, 'responsive'>> = (props) => {
  return (
    <VirtualImageGrid
      responsive={{
        sm: 2,
        md: 3,
        lg: 4,
        xl: 5
      }}
      {...props}
    />
  );
};

/**
 * 瀑布流图片网格
 */
export const MasonryImageGrid: React.FC<VirtualImageGridProps> = (props) => {
  return (
    <VirtualImageGrid
      enableMasonry={true}
      {...props}
    />
  );
};

export default VirtualImageGrid;
