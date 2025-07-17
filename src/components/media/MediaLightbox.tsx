/**
 * @fileoverview 媒体Lightbox查看器组件
 * @description 支持键盘导航、手势操作、全屏查看的媒体查看器
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @features
 * - 键盘导航支持 (方向键、ESC、空格)
 * - 触摸手势支持 (滑动切换、双击缩放)
 * - 全屏模式
 * - 视频播放控制
 * - 媒体信息显示
 * - 下载功能
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - Framer Motion (可选)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  Minimize,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Info,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OptimizedVideo } from './OptimizedVideo';
import { api } from '@/trpc/react';
import { fixMediaUrl } from '@/lib/media/cdn-url-fixer';

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

interface MediaLightboxProps {
  media: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  userLevel: string;
  postId: string;
}

export function MediaLightbox({
  media,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  userLevel,
  postId
}: MediaLightboxProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  const lightboxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentMedia = media[currentIndex];

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

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          if (currentMedia.mediaType === 'VIDEO' && canPlayVideos) {
            setIsVideoPlaying(!isVideoPlaying);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowInfo(!showInfo);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, isVideoPlaying, showInfo]);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 导航函数
  const goToPrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : media.length - 1;
    onIndexChange(newIndex);
    resetImageTransform();
  }, [currentIndex, media.length, onIndexChange]);

  const goToNext = useCallback(() => {
    const newIndex = currentIndex < media.length - 1 ? currentIndex + 1 : 0;
    onIndexChange(newIndex);
    resetImageTransform();
  }, [currentIndex, media.length, onIndexChange]);

  // 重置图片变换
  const resetImageTransform = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // 全屏切换
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await lightboxRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // 水平滑动切换
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }

    setTouchStart(null);
  };

  // 双击缩放
  const handleDoubleClick = () => {
    if (currentMedia.mediaType === 'IMAGE') {
      if (imageScale === 1) {
        setImageScale(2);
      } else {
        resetImageTransform();
      }
    }
  };

  // 下载媒体 - 确保使用原始文件URL
  const handleDownload = () => {
    const link = document.createElement('a');
    // 使用修复后的原始URL而不是可能的缩略图URL
    const fixedUrl = fixMediaUrl(currentMedia.url);
    link.href = fixedUrl;
    link.download = currentMedia.originalName || `media-${currentMedia.id}`;
    link.click();

    console.log('📥 下载媒体文件:', {
      filename: currentMedia.originalName,
      mediaType: currentMedia.mediaType,
      url: fixedUrl,
      fileSize: currentMedia.fileSize
    });
  };

  // 分享媒体
  const handleShare = async () => {
    const fixedUrl = fixMediaUrl(currentMedia.url);
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentMedia.originalName,
          url: fixedUrl
        });
      } catch (error) {
        console.log('分享取消或失败');
      }
    } else {
      // 复制链接到剪贴板
      await navigator.clipboard.writeText(fixedUrl);
      // 这里可以添加提示
    }
  };

  if (!isOpen || !currentMedia) return null;

  return (
    <div
      ref={lightboxRef}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
              onClick={handleShare}
              className="text-white hover:bg-white/20"
            >
              <Share2 className="w-4 h-4" />
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
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
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
      </div>

      {/* 主要内容区域 */}
      <div
        className="relative w-full h-full flex items-center justify-center p-16"
        onDoubleClick={handleDoubleClick}
      >
        {currentMedia.mediaType === 'VIDEO' ? (
          <div className="relative max-w-full max-h-full">
            {canPlayVideos ? (
              <OptimizedVideo
                src={fixMediaUrl(currentMedia.url)}
                poster={currentMedia.thumbnailUrl ? fixMediaUrl(currentMedia.thumbnailUrl) : undefined}
                controls={true}
                className="max-w-full max-h-full"
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
              />
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
                  {currentMedia.thumbnailUrl && (
                    <div className="mt-4 opacity-30">
                      <Image
                        src={currentMedia.thumbnailUrl}
                        alt="视频缩略图"
                        width={currentMedia.width || 400}
                        height={currentMedia.height || 300}
                        className="max-w-full max-h-48 object-contain rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative max-w-full max-h-full">
            <Image
              ref={imageRef}
              src={fixMediaUrl(currentMedia.cdnUrl || currentMedia.url)}
              alt={currentMedia.originalName}
              width={currentMedia.width || 800}
              height={currentMedia.height || 600}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${imageScale}) translate(${imagePosition.x}px, ${imagePosition.y}px)`
              }}
              priority
            />


          </div>
        )}
      </div>

      {/* 导航按钮 */}
      {media.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="lg"
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full w-12 h-12"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* 媒体信息面板 */}
      {showInfo && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="bg-black/60 rounded-lg p-4 text-white">
            <h3 className="font-medium mb-2">{currentMedia.originalName}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-300">类型:</span> {currentMedia.mediaType}
              </div>
              {currentMedia.width && currentMedia.height && (
                <div>
                  <span className="text-gray-300">尺寸:</span> {currentMedia.width} × {currentMedia.height}
                </div>
              )}
              {currentMedia.duration && (
                <div>
                  <span className="text-gray-300">时长:</span> {Math.floor(currentMedia.duration / 60)}:{(currentMedia.duration % 60).toFixed(0).padStart(2, '0')}
                </div>
              )}
              {currentMedia.fileSize && (
                <div>
                  <span className="text-gray-300">大小:</span> {(currentMedia.fileSize / 1024 / 1024).toFixed(1)} MB
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 背景点击关闭 */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
