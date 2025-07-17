/**
 * @fileoverview 简化版视频播放器组件
 * @description 基于原生 HTML5 video 的简单视频播放器，专注于兼容性
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
import { Play } from 'lucide-react';

interface SimpleVideoPlayerProps {
  src: string;
  poster?: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (error: string) => void;
}

export function SimpleVideoPlayer({
  src,
  poster,
  width,
  height,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  className = '',
  onError,
}: SimpleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsLoading] = useState(true);

  // 播放/暂停
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(error => {
        console.error('播放失败:', error);
        const errorMessage = '播放失败';
        setError(errorMessage);
        onError?.(errorMessage);
      });
    }
  };

  // 视频事件处理
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      console.log('视频元数据加载成功:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        src: src
      });
    };

    const handlePlay = () => {
      setIsPlaying(true);
      console.log('视频开始播放:', src);
    };

    const handlePause = () => {
      setIsPlaying(false);
      console.log('视频暂停:', src);
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
        src: src
      });
      
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    };

    const handleCanPlay = () => {
      console.log('视频可以开始播放:', src);
      setIsLoading(false);
    };

    const handleWaiting = () => {
      console.log('视频缓冲中...', src);
    };

    const handleCanPlayThrough = () => {
      console.log('视频已完全加载:', src);
      setIsLoading(false);
    };

    // 添加事件监听器
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplaythrough', handleCanPlayThrough);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
    };
  }, [src, onError]);

  if (error) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-2">视频加载失败</p>
          <p className="text-sm text-gray-500">{error}</p>
          <p className="text-xs text-gray-400 mt-2">文件: {src}</p>
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
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        className="w-full h-full object-contain"
        preload="metadata"
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
    </div>
  );
}
