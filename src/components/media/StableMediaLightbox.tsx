/**
 * @fileoverview 稳定的媒体Lightbox查看器组件
 * @description 高性能、无闪烁的媒体全屏查看器，支持键盘导航和触摸手势
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 键盘导航支持 (方向键、ESC、空格)
 * - 触摸手势支持 (滑动切换)
 * - 全屏模式
 * - 视频播放控制
 * - 性能优化，避免渲染循环
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - Lucide React
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/trpc/react';
import { useBestMediaUrl, useVideoThumbnailUrl, useOriginalMediaUrl } from '@/lib/media/cdn-url-fixer';

interface MediaItem {
  id: string;
  url: string;
  cdnUrl?: string | null;
  thumbnailUrl?: string | null;
  filename?: string | null;
  originalName: string;
  mediaType: string; // 改为 string 类型以兼容数据库返回的值
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fileSize?: number | null;
}

interface StableMediaLightboxProps {
  media: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  userLevel: string;
}

export const StableMediaLightbox = React.memo<StableMediaLightboxProps>(({
  media,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  userLevel
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isPending, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const lightboxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 当前媒体项
  const currentMedia = media[currentIndex];

  // 获取转换后的媒体URL - 区分显示和下载场景
  const bestMediaUrl = useBestMediaUrl({...currentMedia, mediaType: currentMedia.mediaType});
  const displayUrl = bestMediaUrl; // 统一使用最佳媒体URL

  // 获取缩略图URL（用于视频封面）
  const videoThumbnailUrl = useVideoThumbnailUrl({...currentMedia, mediaType: currentMedia.mediaType});
  const thumbnailUrl = currentMedia.mediaType === 'VIDEO' ? videoThumbnailUrl : null;

  // 获取原始文件URL（用于下载）
  const downloadUrl = useOriginalMediaUrl({
    ...currentMedia,
    mediaType: currentMedia.mediaType
  });

  // 获取用户权限配置
  const { data: userPermissions } = api.permission.getConfigByLevel.useQuery(
    { userLevel },
    {
      enabled: !!userLevel,
      staleTime: 5 * 60 * 1000, // 5分钟缓存
      gcTime: 10 * 60 * 1000 // 10分钟缓存
    }
  );

  // 检查权限
  const canPlayVideos = userPermissions?.canPlayVideos ?? false;

  // 键盘导航处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        if (currentIndex > 0) {
          onIndexChange(currentIndex - 1);
        }
        break;
      case 'ArrowRight':
        if (currentIndex < media.length - 1) {
          onIndexChange(currentIndex + 1);
        }
        break;
      case ' ':
        e.preventDefault();
        if (currentMedia.mediaType === 'VIDEO' && canPlayVideos && videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
        break;
    }
  }, [isOpen, currentIndex, media.length, onClose, onIndexChange, currentMedia.mediaType]);

  // 触摸手势处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // 水平滑动距离大于垂直滑动距离，且滑动距离足够
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && currentIndex > 0) {
        // 向右滑动，显示上一张
        onIndexChange(currentIndex - 1);
      } else if (deltaX < 0 && currentIndex < media.length - 1) {
        // 向左滑动，显示下一张
        onIndexChange(currentIndex + 1);
      }
    }

    setTouchStart(null);
  }, [touchStart, currentIndex, media.length, onIndexChange]);

  // 下载文件 - 使用原始文件URL而不是显示URL
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = downloadUrl; // 使用原始文件URL
    link.download = currentMedia.originalName || `media-${currentMedia.id}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('📥 下载文件:', {
      filename: currentMedia.originalName,
      mediaType: currentMedia.mediaType,
      downloadUrl: downloadUrl,
      fileSize: currentMedia.fileSize
    });
  }, [downloadUrl, currentMedia]);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes?: number | null) => {
    if (!bytes) return '未知大小';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  // 格式化视频时长
  const formatDuration = useCallback((seconds?: number | null) => {
    if (!seconds) return '未知时长';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 监听键盘事件
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  // 重置状态当媒体改变时
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [currentIndex]);

  if (!isOpen || !currentMedia) return null;

  return (
    <div
      ref={lightboxRef}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // 点击背景关闭
        if (e.target === lightboxRef.current) {
          onClose();
        }
      }}
    >
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-white border-white/30">
              {currentIndex + 1} / {media.length}
            </Badge>
            <Badge
              variant={currentMedia.mediaType === 'VIDEO' ? 'destructive' : 'secondary'}
              className="text-white"
            >
              {currentMedia.mediaType === 'VIDEO' ? '视频' : '图片'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="text-white hover:bg-white/20"
            >
              <Info className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="text-white hover:bg-white/20"
              title="下载媒体文件"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 媒体信息面板 */}
        {showInfo && (
          <div className="mt-4 p-3 bg-black/70 rounded-lg text-white text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>文件名: {currentMedia.originalName}</div>
              <div>大小: {formatFileSize(currentMedia.fileSize)}</div>
              {currentMedia.width && currentMedia.height && (
                <div>尺寸: {currentMedia.width} × {currentMedia.height}</div>
              )}
              {currentMedia.mediaType === 'VIDEO' && (
                <div>时长: {formatDuration(currentMedia.duration)}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 导航按钮 */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="lg"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
          onClick={() => onIndexChange(currentIndex - 1)}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}

      {currentIndex < media.length - 1 && (
        <Button
          variant="ghost"
          size="lg"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 z-10"
          onClick={() => onIndexChange(currentIndex + 1)}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* 主要内容区域 */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8 lg:p-16">
        {currentMedia.mediaType === 'VIDEO' ? (
          canPlayVideos ? (
            <video
              ref={videoRef}
              src={displayUrl}
              poster={thumbnailUrl || undefined}
              controls
              className="lightbox-media object-contain"
              onLoadStart={() => setIsLoading(true)}
              onCanPlay={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            >
              <div className="text-center text-white p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">视频编码不兼容</h3>
                <p className="text-gray-300 text-sm mb-4">
                  此视频使用H.265/HEVC编码，您的浏览器可能不支持播放
                </p>
                <div className="text-xs text-gray-400">
                  建议使用支持H.265的浏览器，或联系管理员转码为H.264格式
                </div>
              </div>
            </video>
          ) : (
            <div className="relative max-w-full max-h-full flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center text-white p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">视频播放受限</h3>
                <p className="text-gray-300 text-sm mb-4">
                  您当前的权限等级（{userLevel}）不允许播放视频
                </p>
                <div className="text-xs text-gray-400">
                  请联系管理员升级权限或查看其他内容
                </div>
                {thumbnailUrl && (
                  <div className="mt-4 opacity-30">
                    <Image
                      src={thumbnailUrl}
                      alt="视频缩略图"
                      width={400}
                      height={300}
                      className="max-w-full max-h-48 object-contain rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="relative">
              <Image
                src={displayUrl}
                alt={currentMedia.originalName}
                width={currentMedia.width || 1200}
                height={currentMedia.height || 800}
                className="lightbox-media object-contain w-auto h-auto"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                priority
              />
            </div>
          </div>
        )}

        {/* 加载状态 */}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 错误状态 */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-xl mb-2">⚠️</div>
              <div>媒体加载失败</div>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm text-center">
        <div>使用方向键切换 • 空格键播放/暂停 • ESC键关闭</div>
      </div>
    </div>
  );
});

StableMediaLightbox.displayName = 'StableMediaLightbox';
