/**
 * @fileoverview 懒加载媒体项组件
 * @description 支持懒加载和性能优化的媒体项组件
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

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { useBestMediaUrl } from '@/lib/media/cdn-url-fixer';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  originalName: string;
  mediaType: 'IMAGE' | 'VIDEO';
  width?: number | null;
  height?: number | null;
}

interface LazyMediaItemProps {
  mediaItem: MediaItem;
  index: number;
  onClick: (mediaItem: MediaItem, index: number) => void;
  className?: string;
}

export function LazyMediaItem({
  mediaItem,
  index,
  onClick,
  className = ''
}: LazyMediaItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{width: number; height: number} | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  // 使用CDN URL修复工具获取最佳URL
  const bestUrl = useBestMediaUrl(mediaItem);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setIsLoading(false);
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleClick = () => {
    onClick(mediaItem, index);
  };

  // 计算显示尺寸，保持宽高比
  const getDisplayDimensions = () => {
    // 如果有数据库中的尺寸信息，优先使用
    if (mediaItem.width && mediaItem.height) {
      return {
        width: mediaItem.width,
        height: mediaItem.height
      };
    }

    // 如果有自然尺寸，使用自然尺寸
    if (naturalDimensions) {
      return naturalDimensions;
    }

    // 默认尺寸，根据媒体类型调整
    return mediaItem.mediaType === 'VIDEO'
      ? { width: 400, height: 600 }  // 视频默认竖屏比例
      : { width: 400, height: 500 }; // 图片默认比例
  };

  const displayDimensions = getDisplayDimensions();

  return (
    <div
      ref={itemRef}
      className={`relative break-inside-avoid mb-3 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group ${className}`}
      onClick={handleClick}
    >
      {/* 骨架屏 - 使用估算的宽高比 */}
      {!isVisible && (
        <div
          className="w-full bg-gray-200 animate-pulse rounded-lg"
          style={{
            aspectRatio: `${displayDimensions.width} / ${displayDimensions.height}`,
            minHeight: '200px'
          }}
        />
      )}

      {/* 加载状态 */}
      {isVisible && isPending && !hasError && (
        <div
          className="relative w-full bg-gray-200 animate-pulse rounded-lg"
          style={{
            aspectRatio: `${displayDimensions.width} / ${displayDimensions.height}`,
            minHeight: '200px'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {isVisible && hasError && (
        <div
          className="w-full bg-gray-100 flex items-center justify-center rounded-lg"
          style={{
            aspectRatio: `${displayDimensions.width} / ${displayDimensions.height}`,
            minHeight: '200px'
          }}
        >
          <div className="text-gray-400 text-center">
            <div className="w-12 h-12 mx-auto mb-2 opacity-50">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-xs">加载失败</p>
          </div>
        </div>
      )}

      {/* 媒体内容 */}
      {isVisible && !hasError && (
        <div className="relative">
          {mediaItem.mediaType === 'VIDEO' ? (
            <div className="relative">
              {/* 视频使用Image组件 */}
              <Image
                src={bestUrl}
                alt={mediaItem.originalName}
                width={displayDimensions.width}
                height={displayDimensions.height}
                className={`w-full h-auto object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  aspectRatio: `${displayDimensions.width} / ${displayDimensions.height}`
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
              
              {/* 视频播放图标 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="bg-white/90 rounded-full p-3 group-hover:bg-white transition-colors transform group-hover:scale-110">
                  <Play className="w-6 h-6 text-gray-800" />
                </div>
              </div>
              
              {/* 媒体类型标识 */}
              <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                视频
              </div>
            </div>
          ) : (
            <div className="relative">
              <Image
                src={bestUrl}
                alt={mediaItem.originalName}
                width={displayDimensions.width}
                height={displayDimensions.height}
                className={`w-full h-auto object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  aspectRatio: `${displayDimensions.width} / ${displayDimensions.height}`
                }}
                sizes="(max-width: 768px) 50vw, 25vw"
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
                quality={75}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />
              
              {/* 悬停放大图标 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300 opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 rounded-full p-2 transform scale-90 group-hover:scale-100 transition-transform">
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              
              {/* 媒体类型标识 */}
              <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full shadow-sm">
                图片
              </div>
            </div>
          )}

          {/* 加载进度指示器 */}
          {isPending && !hasError && (
            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-white/80 rounded-full h-1 overflow-hidden">
                <div className="bg-blue-500 h-full w-full animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
