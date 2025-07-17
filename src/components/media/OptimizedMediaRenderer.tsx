/**
 * @fileoverview 优化的媒体渲染组件
 * @description 解决Next.js Image组件误用和性能问题
 * @author Augment AI
 * @date 2025-06-14
 * @version 1.0.0
 */

'use client';

import React, { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { Play, AlertTriangle, Loader2 } from 'lucide-react';
import { useBestMediaUrl, useVideoThumbnailUrl } from '@/lib/media/cdn-url-fixer';

// 辅助函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export interface MediaItem {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GIF';
  url: string;
  cdnUrl?: string | null;
  thumbnailUrl?: string | null;
  originalName: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fileSize?: number;
  isDuplicate?: boolean;
  fileHash?: string | null;
}

export interface OptimizedMediaRendererProps {
  media: MediaItem;
  className?: string;
  onClick?: (media: MediaItem) => void;
  showPlayIcon?: boolean;
  showTypeLabel?: boolean;
  loading?: 'lazy' | 'eager';
  quality?: number;
  sizes?: string;
  priority?: boolean;
}

/**
 * 优化的媒体渲染组件
 * - 正确区分图片和视频的渲染方式
 * - 使用CDN URL优化
 * - 内存友好的加载策略
 */
export const OptimizedMediaRenderer = memo<OptimizedMediaRendererProps>(({
  media,
  className = '',
  onClick,
  showPlayIcon = true,
  showTypeLabel = false,
  loading = 'lazy',
  quality = 75,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPending, setIsLoading] = useState(true);

  // 获取最佳媒体URL - 视频使用缩略图用于预览
  const videoThumbnailUrl = useVideoThumbnailUrl({...media, mediaType: media.mediaType});
  const bestMediaUrl = useBestMediaUrl({...media, mediaType: media.mediaType});
  const bestUrl = media.mediaType === 'VIDEO' ? videoThumbnailUrl : bestMediaUrl;

  // 处理图片加载完成
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setIsLoading(false);
    setHasError(false);
  }, []);

  // 处理图片加载错误
  const handleImageError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    setImageLoaded(false);
  }, []);

  // 处理点击事件
  const handleClick = useCallback(() => {
    onClick?.(media);
  }, [onClick, media]);

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 格式化视频时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取媒体类型标签
  const getTypeLabel = () => {
    switch (media.mediaType) {
      case 'VIDEO': return '视频';
      case 'GIF': return 'GIF';
      case 'IMAGE': return '图片';
      default: return '媒体';
    }
  };

  // 获取媒体类型颜色
  const getTypeColor = () => {
    switch (media.mediaType) {
      case 'VIDEO': return 'bg-red-600';
      case 'GIF': return 'bg-purple-600';
      case 'IMAGE': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  // 容器样式
  const containerClass = `
    relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300
    hover:scale-[1.02] hover:shadow-lg group
    ${className}
  `.trim();

  // 如果没有有效URL，显示错误状态
  if (!bestUrl) {
    return (
      <div className={`${containerClass} bg-gray-100 flex items-center justify-center min-h-[200px]`}>
        <div className="text-center text-gray-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">媒体文件不可用</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass} onClick={handleClick}>
      {/* 加载状态 */}
      {isPending && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center text-gray-500">
            <AlertTriangle className="w-6 h-6 mx-auto mb-1" />
            <p className="text-xs">加载失败</p>
          </div>
        </div>
      )}

      {/* 媒体内容 */}
      <div className="relative w-full h-full">
        {media.mediaType === 'VIDEO' ? (
          // 视频：使用缩略图显示，如果没有缩略图则显示视频第一帧
          <Image
            src={media.thumbnailUrl || bestUrl}
            alt={media.originalName}
            fill
            className={`object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading={loading}
          />
        ) : (
          // 图片：使用Next.js Image组件优化
          <Image
            src={bestUrl}
            alt={media.originalName}
            fill
            className={`object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            sizes={sizes}
            quality={quality}
            priority={priority}
            loading={loading}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}

        {/* 视频播放图标 */}
        {media.mediaType === 'VIDEO' && showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="bg-white/90 rounded-full p-3 group-hover:bg-white transition-all transform group-hover:scale-110">
              <Play className="w-6 h-6 text-gray-800" />
            </div>
          </div>
        )}

        {/* 媒体类型标签 */}
        {showTypeLabel && (
          <div className={`absolute top-2 left-2 ${getTypeColor()} text-white text-xs px-2 py-1 rounded-full shadow-sm`}>
            {getTypeLabel()}
          </div>
        )}

        {/* 重复文件标记 */}
        {media.isDuplicate && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
            <span>🔗</span>
            <span>哈希</span>
          </div>
        )}

        {/* 视频时长 */}
        {media.mediaType === 'VIDEO' && media.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(media.duration)}
          </div>
        )}

        {/* 文件大小（悬停显示） */}
        {media.fileSize && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {formatFileSize(media.fileSize)}
          </div>
        )}

        {/* 加载进度指示器 */}
        {isPending && !hasError && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
            <div className="h-full bg-blue-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
});

OptimizedMediaRenderer.displayName = 'OptimizedMediaRenderer';

export default OptimizedMediaRenderer;

/**
 * 媒体网格组件
 */
export interface MediaGridProps {
  media: MediaItem[];
  onMediaClick?: (media: MediaItem) => void;
  className?: string;
  columns?: number;
  gap?: number;
}

export const MediaGrid = memo<MediaGridProps>(({
  media,
  onMediaClick,
  className = '',
  columns = 3,
  gap = 4
}) => {
  const gridClass = `
    grid gap-${gap}
    grid-cols-1 md:grid-cols-${Math.min(columns, 3)} lg:grid-cols-${columns}
    ${className}
  `.trim();

  return (
    <div className={gridClass}>
      {media.map((item) => (
        <OptimizedMediaRenderer
          key={item.id}
          media={item}
          onClick={onMediaClick}
          showPlayIcon={true}
          showTypeLabel={true}
          className="aspect-square"
        />
      ))}
    </div>
  );
});

MediaGrid.displayName = 'MediaGrid';

/**
 * 媒体列表组件
 */
export interface MediaListProps {
  media: MediaItem[];
  onMediaClick?: (media: MediaItem) => void;
  className?: string;
}

export const MediaList = memo<MediaListProps>(({
  media,
  onMediaClick,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {media.map((item) => (
        <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
          <OptimizedMediaRenderer
            media={item}
            onClick={onMediaClick}
            className="w-16 h-16 flex-shrink-0"
            showPlayIcon={true}
            loading="eager"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {item.originalName}
            </h3>
            <p className="text-sm text-gray-500">
              {item.mediaType} • {item.fileSize ? formatFileSize(item.fileSize) : '未知大小'}
            </p>
            {item.mediaType === 'VIDEO' && item.duration && (
              <p className="text-xs text-gray-400">
                时长: {formatDuration(item.duration)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

MediaList.displayName = 'MediaList';
