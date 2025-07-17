/**
 * @fileoverview 优化的原生视频播放器组件
 * @description 基于原生 HTML5 video 的优化视频播放器，支持所有浏览器
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, AlertCircle } from 'lucide-react';
import { fixMediaUrl } from '@/lib/media/cdn-url-fixer';

interface OptimizedVideoProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onLoadedMetadata?: (metadata: { duration: number; width: number; height: number }) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onWaiting?: () => void;
}

export function OptimizedVideo({
  src,
  poster,
  width,
  height,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  className = '',
  onTimeUpdate,
  onEnded,
  onError,
  onLoadedMetadata,
  onPlay,
  onPause,
  onWaiting,
}: OptimizedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPending, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 浏览器检测
  const isFirefox = typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox');

  // 智能视频源选择
  const getOptimizedSrc = (originalSrc: string): string => {
    // 首先修复URL（处理废弃域名等问题）
    const fixedSrc = fixMediaUrl(originalSrc);

    // 如果已经是转码版本，直接返回
    if (fixedSrc.includes('_h264') || fixedSrc.includes('_firefox') || fixedSrc.includes('_emergency_h264')) {
      return fixedSrc;
    }

    // 对于原始视频，优先使用转码后的H.264版本
    // 这确保浏览器兼容性
    console.log('🔍 检查视频源优化:', fixedSrc);
    return fixedSrc; // 数据库中的URL应该已经指向转码后的文件
  };

  const optimizedSrc = getOptimizedSrc(src);
  const fixedPoster = poster ? fixMediaUrl(poster) : undefined;

  // 视频事件处理
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setError(null);

      const metadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      };

      console.log('视频元数据加载成功:', {
        ...metadata,
        src: optimizedSrc,
        browser: isFirefox ? 'Firefox' : 'Chrome/Edge'
      });

      onLoadedMetadata?.(metadata);
    };

    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime, video.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleError = (event: Event) => {
      const target = event.target as HTMLVideoElement;
      let errorMessage = '视频加载失败';

      if (target.error) {
        switch (target.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = '视频加载被中断';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = '网络错误，无法加载视频';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = '视频解码失败，可能是编码格式不支持';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = '视频格式不支持或文件损坏';
            break;
          default:
            errorMessage = '未知视频错误';
        }
      }

      console.error('视频播放错误:', {
        error: target.error,
        errorCode: target.error?.code,
        errorMessage,
        src: optimizedSrc,
        browser: isFirefox ? 'Firefox' : 'Chrome/Edge'
      });

      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      console.log('视频可以开始播放:', optimizedSrc);
    };

    const handleWaiting = () => {
      setIsLoading(true);
      onWaiting?.();
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
      console.log('视频已完全加载:', optimizedSrc);
    };

    // 添加事件监听器
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [optimizedSrc, onTimeUpdate, onEnded, onError, onLoadedMetadata, isFirefox]);

  // 播放/暂停切换
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(error => {
        console.error('播放失败:', error);
        setError('播放失败');
        onError?.('播放失败');
      });
    }
  };

  if (error) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-2">视频加载失败</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-2">文件: {src}</p>
          {optimizedSrc !== src && (
            <p className="text-xs text-blue-500 mt-1">已尝试优化版本: {optimizedSrc}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-black ${className}`}
      style={{ width, height }}
    >
      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={optimizedSrc}
        poster={fixedPoster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        className="w-full h-full object-contain"
        preload="metadata"
        playsInline // 移动端内联播放
      />

      {/* 加载指示器 */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 播放按钮覆盖层 (仅在没有原生控制栏时显示) */}
      {!controls && !isPlaying && !isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <button
            onClick={togglePlay}
            className="text-white hover:bg-white/20 w-16 h-16 rounded-full flex items-center justify-center transition-colors"
          >
            <Play className="w-8 h-8" />
          </button>
        </div>
      )}

      {/* 浏览器兼容性指示器 (开发模式) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
          {isFirefox ? 'Firefox' : 'Chrome/Edge'} | {optimizedSrc !== src ? 'Optimized' : 'Original'}
        </div>
      )}
    </div>
  );
}
