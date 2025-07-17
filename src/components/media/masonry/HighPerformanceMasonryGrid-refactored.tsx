/**
 * @fileoverview 重构后的高性能瀑布流媒体网格组件
 * @description 专为Tu Cosplay平台设计的稳定、高性能瀑布流组件，采用模块化架构
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/trpc/react';

// 导入拆分的组件和工具
import {
  MasonryLayoutCalculator,
  type MediaItem as MediaItemType,
  type LayoutResult
} from './layout-calculator';
import PermissionController, {
  usePermissionControl,
  type PermissionConfig
} from './PermissionController';
import MediaItemComponent from './MediaItem';

export interface HighPerformanceMasonryGridProps {
  media: MediaItemType[];
  userLevel: string;
  onItemClick?: (item: MediaItemType) => void;
  enablePermissionUpgrade?: boolean;
  onPermissionUpgrade?: () => void;
  showPermissionController?: boolean;
  className?: string;
}

/**
 * 重构后的高性能瀑布流网格组件
 * 采用模块化架构，提供更好的可维护性和性能
 */
export const HighPerformanceMasonryGridRefactored = React.memo<HighPerformanceMasonryGridProps>(({
  media,
  userLevel,
  onItemClick,
  enablePermissionUpgrade = false,
  onPermissionUpgrade,
  showPermissionController = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [showRestrictedContent, setShowRestrictedContent] = useState(false);
  const [showPermissionDetails, setShowPermissionDetails] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  // 获取用户权限配置
  const { data: userPermissions, isPending: permissionsLoading } = api.permission.getConfigByLevel.useQuery(
    { userLevel },
    {
      staleTime: 5 * 60 * 1000, // 5分钟缓存
      gcTime: 10 * 60 * 1000, // 10分钟缓存 (React Query v5)
      refetchOnWindowFocus: false,
    }
  );

  // 使用权限控制 Hook
  const {
    accessLimit,
    maxAccessibleCount,
    accessibleMedia,
    restrictedMedia,
  } = usePermissionControl(media, userLevel, userPermissions);

  // 计算布局配置
  const layoutConfig = useMemo(() => {
    return MasonryLayoutCalculator.calculateLayout(containerWidth);
  }, [containerWidth]);

  // 当前显示的媒体列表
  const displayMedia = useMemo(() => {
    return showRestrictedContent ? media : accessibleMedia;
  }, [showRestrictedContent, media, accessibleMedia]);

  // 计算瀑布流布局
  const layoutResult: LayoutResult = useMemo(() => {
    return MasonryLayoutCalculator.calculateMasonryLayout(displayMedia, layoutConfig);
  }, [displayMedia, layoutConfig]);

  // 容器宽度监听 - 添加防抖
  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      const newWidth = containerRef.current.offsetWidth;
      if (Math.abs(newWidth - containerWidth) > 10) {
        setContainerWidth(newWidth);
      }
    }
  }, [containerWidth]);

  const debouncedUpdateWidth = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    resizeTimeoutRef.current = setTimeout(updateContainerWidth, 150);
  }, [updateContainerWidth]);

  // 初始化和监听容器宽度变化
  useEffect(() => {
    updateContainerWidth();
    
    const resizeObserver = new ResizeObserver(debouncedUpdateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [updateContainerWidth, debouncedUpdateWidth]);

  /**
   * 处理媒体项点击
   */
  const handleItemClick = useCallback((item: MediaItemType) => {
    onItemClick?.(item);
  }, [onItemClick]);

  /**
   * 处理权限升级
   */
  const handlePermissionUpgrade = useCallback(() => {
    onPermissionUpgrade?.();
  }, [onPermissionUpgrade]);

  // 加载状态
  if (permissionsLoading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 空状态
  if (media.length === 0) {
    return (
      <div className={`w-full ${className}`}>
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">暂无媒体内容</p>
            <p className="text-sm">等待更多精彩内容上传</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* 权限控制组件 */}
      {showPermissionController && (
        <PermissionController
          media={media}
          userLevel={userLevel}
          userPermissions={userPermissions}
          showRestrictedContent={showRestrictedContent}
          showPermissionDetails={showPermissionDetails}
          enablePermissionUpgrade={enablePermissionUpgrade}
          onToggleRestrictedContent={setShowRestrictedContent}
          onTogglePermissionDetails={setShowPermissionDetails}
          onPermissionUpgrade={handlePermissionUpgrade}
        />
      )}

      {/* 瀑布流容器 */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: layoutResult.totalHeight }}
      >
        {layoutResult.positions.map((position) => {
          const isRestricted = position.index >= maxAccessibleCount;
          const showPreview = isRestricted && (accessLimit as any).canViewRestrictedPreview;

          return (
            <MediaItemComponent
              key={position.item.id}
              position={position}
              isRestricted={isRestricted}
              showPreview={showPreview}
              onItemClick={handleItemClick}
              onPermissionUpgrade={handlePermissionUpgrade}
            />
          );
        })}
      </div>

      {/* 布局统计信息（开发模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>总项目: {layoutResult.positions.length}</div>
            <div>列数: {layoutConfig.columnCount}</div>
            <div>列宽: {layoutConfig.columnWidth}px</div>
            <div>总高度: {Math.round(layoutResult.totalHeight)}px</div>
          </div>
        </div>
      )}
    </div>
  );
});

HighPerformanceMasonryGridRefactored.displayName = 'HighPerformanceMasonryGridRefactored';

/**
 * 导出重构后的瀑布流组件
 */
export default HighPerformanceMasonryGridRefactored;
