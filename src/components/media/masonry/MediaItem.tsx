/**
 * @fileoverview 媒体项组件
 * @description 单个媒体项的渲染组件，从原 HighPerformanceMasonryGrid.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Play,
  Lock,
  Eye,
  EyeOff,
  FileImage,
  Video as VideoIcon,
  Crown,
  Filter,
} from 'lucide-react';
import {
  type LayoutPosition,
  MasonryLayoutCalculator
} from './layout-calculator';
import { useBestMediaUrl, useVideoThumbnailUrl } from '@/lib/media/cdn-url-fixer';

export interface MediaItemProps {
  position: LayoutPosition;
  isRestricted?: boolean;
  showPreview?: boolean;
  onItemClick?: (item: LayoutPosition['item']) => void;
  onPermissionUpgrade?: () => void;
}

/**
 * 媒体项组件
 * 负责渲染单个媒体项，支持懒加载和权限控制
 */
export const MediaItem = React.memo<MediaItemProps>(({
  position,
  isRestricted = false,
  showPreview = false,
  onItemClick,
  onPermissionUpgrade,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageLoad = useCallback(() => {
    console.log('✅ MediaItem 图片加载成功:', {
      id: position.item.id
    });
    setIsLoading(false);
    setHasError(false);
  }, [position.item.id]);

  const handleImageError = useCallback((error: any) => {
    console.error('❌ MediaItem 图片加载失败:', {
      id: position.item.id,
      error
    });
    setIsLoading(false);
    setHasError(true);
  }, [position.item.id]);

  const handleClick = useCallback(() => {
    // 如果是受限内容且不允许预览，显示权限升级提示
    if (isRestricted && !showPreview) {
      onPermissionUpgrade?.();
      return;
    }

    // 否则正常处理点击事件
    onItemClick?.(position.item);
  }, [isRestricted, showPreview, onPermissionUpgrade, onItemClick, position.item]);

  const isVideo = MasonryLayoutCalculator.isVideoType(position.item.mediaType);

  // 调试日志
  console.log('🎬 MediaItemComponent 渲染:', {
    id: position.item.id,
    mediaType: position.item.mediaType,
    isVideo,
    item: position.item
  });

  // 视频使用缩略图，图片使用原始URL
  const videoThumbnailUrl = useVideoThumbnailUrl({...position.item, mediaType: position.item.mediaType});
  const bestMediaUrl = useBestMediaUrl({...position.item, mediaType: position.item.mediaType});
  const displayUrl = isVideo ? videoThumbnailUrl : bestMediaUrl;

  console.log('🎬 MediaItemComponent URL结果:', {
    videoThumbnailUrl,
    bestMediaUrl,
    displayUrl,
    isVideo
  });

  // 添加状态调试信息
  console.log('🎬 MediaItemComponent 状态:', {
    id: position.item.id,
    isVisible,
    isPending,
    hasError,
    displayUrl
  });

  return (
    <div
      ref={itemRef}
      className="absolute cursor-pointer group"
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
      }}
      onClick={handleClick}
    >
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted">
        {/* 加载状态 */}
        {isPending && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <FileImage className="w-8 h-8 text-muted-foreground" />
          </div>
        )}

        {/* 错误状态 */}
        {hasError && (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileImage className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">加载失败</p>
            </div>
          </div>
        )}

        {/* 媒体内容 */}
        {isVisible && !hasError && (
          <>
            <Image
              src={displayUrl}
              alt={position.item.originalName}
              fill
              className={`object-cover transition-all duration-300 ${
                isRestricted && !showPreview
                  ? 'blur-md scale-110'
                  : 'group-hover:scale-105'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            />

            {/* 视频播放按钮 */}
            {isVideo && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-gray-800 ml-1" />
                </div>
              </div>
            )}

            {/* 媒体类型标识 */}
            <Badge
              variant={isVideo ? 'destructive' : 'secondary'}
              className="absolute top-2 left-2 text-xs"
            >
              {isVideo ? (
                <><VideoIcon className="w-3 h-3 mr-1" />视频</>
              ) : (
                <><FileImage className="w-3 h-3 mr-1" />图片</>
              )}
            </Badge>

            {/* 受限内容遮罩 */}
            {isRestricted && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">
                        {showPreview ? '预览模式' : '需要权限'}
                      </span>
                    </div>

                    {!showPreview && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPermissionUpgrade?.();
                        }}
                      >
                        <Crown className="w-3 h-3 mr-1" />
                        升级
                      </Button>
                    )}
                  </div>

                  {showPreview && (
                    <p className="text-white/80 text-xs mt-1">
                      升级权限查看完整内容
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 悬停效果 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {isRestricted ? (
                  showPreview ? (
                    <Badge variant="outline" className="bg-white/90 text-xs">
                      <Filter className="w-3 h-3 mr-1" />
                      预览
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-white/90 text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      锁定
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="bg-white/90 text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    查看
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

MediaItem.displayName = 'MediaItem';

/**
 * 媒体项加载状态组件
 */
export const MediaItemSkeleton: React.FC<{
  position: Pick<LayoutPosition, 'x' | 'y' | 'width' | 'height'>;
}> = ({ position }) => (
  <div
    className="absolute"
    style={{
      left: position.x,
      top: position.y,
      width: position.width,
      height: position.height,
    }}
  >
    <div className="w-full h-full rounded-lg bg-muted animate-pulse flex items-center justify-center">
      <FileImage className="w-8 h-8 text-muted-foreground" />
    </div>
  </div>
);

/**
 * 媒体项错误状态组件
 */
export const MediaItemError: React.FC<{
  position: Pick<LayoutPosition, 'x' | 'y' | 'width' | 'height'>;
  onRetry?: () => void;
}> = ({ position, onRetry }) => (
  <div
    className="absolute"
    style={{
      left: position.x,
      top: position.y,
      width: position.width,
      height: position.height,
    }}
  >
    <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <FileImage className="w-8 h-8 mx-auto mb-2" />
        <p className="text-xs mb-2">加载失败</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            重试
          </Button>
        )}
      </div>
    </div>
  </div>
);

/**
 * 导出媒体项组件
 */
export default MediaItem;
