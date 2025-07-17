/**
 * @fileoverview 带统计功能的视频播放器组件
 * @description 基于OptimizedVideo的增强版本，添加播放统计和性能监控
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - @/components/media/OptimizedVideo
 * - @/lib/trpc
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { OptimizedVideo } from './OptimizedVideo';
import { api } from '@/trpc/react';

interface VideoWithStatsProps {
  mediaId: string;
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
}

export function VideoWithStats({
  mediaId,
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
}: VideoWithStatsProps) {
  // 定义mutation钩子
  const recordPlayStatsMutation = api.media.recordPlayStats.useMutation();
  // 播放统计状态
  const [playStats, setPlayStats] = useState({
    startTime: 0,
    totalPlayTime: 0,
    bufferCount: 0,
    errorCount: 0,
    loadTime: 0,
    isPlaying: false,
    hasStarted: false,
    hasEnded: false,
  });

  const [videoMetadata, setVideoMetadata] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);

  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadStartTimeRef = useRef<number>(0);

  // 获取浏览器和设备信息
  const getBrowserInfo = useCallback(() => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let device = 'Desktop';

    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      device = 'Mobile';
    } else if (/iPad/i.test(userAgent)) {
      device = 'Tablet';
    }

    return { browser, device, userAgent };
  }, []);

  // 发送播放统计
  const sendPlayStats = useCallback(async () => {
    if (!videoMetadata || !playStats.hasStarted) return;

    const { browser, device, userAgent } = getBrowserInfo();
    const completionRate = videoMetadata.duration > 0 
      ? Math.min(playStats.totalPlayTime / videoMetadata.duration, 1)
      : 0;

    try {
      await recordPlayStatsMutation.mutateAsync({
        mediaId,
        playDuration: Math.round(playStats.totalPlayTime),
        totalDuration: Math.round(videoMetadata.duration),
        completionRate,
        userAgent,
        browser,
        device,
        resolution: `${videoMetadata.width}x${videoMetadata.height}`,
        loadTime: playStats.loadTime,
        bufferCount: playStats.bufferCount,
        errorCount: playStats.errorCount,
      });

      console.log('播放统计已发送:', {
        mediaId,
        playDuration: Math.round(playStats.totalPlayTime),
        completionRate: Math.round(completionRate * 100) + '%',
        browser,
        device
      });
    } catch (error) {
      console.error('发送播放统计失败:', error);
    }
  }, [mediaId, videoMetadata, playStats, getBrowserInfo]);

  // 处理视频元数据加载
  const handleLoadedMetadata = useCallback((metadata: { duration: number; width: number; height: number }) => {
    setVideoMetadata(metadata);
    
    const loadTime = Date.now() - loadStartTimeRef.current;
    setPlayStats(prev => ({
      ...prev,
      loadTime
    }));

    console.log('视频加载完成:', {
      mediaId,
      loadTime: loadTime + 'ms',
      ...metadata
    });

    onLoadedMetadata?.(metadata);
  }, [mediaId, onLoadedMetadata]);

  // 处理播放开始
  const handlePlay = useCallback(() => {
    if (!playStats.hasStarted) {
      setPlayStats(prev => ({
        ...prev,
        hasStarted: true,
        startTime: Date.now()
      }));
    }

    setPlayStats(prev => ({
      ...prev,
      isPlaying: true
    }));

    // 开始统计播放时间
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }

    statsIntervalRef.current = setInterval(() => {
      setPlayStats(prev => ({
        ...prev,
        totalPlayTime: prev.totalPlayTime + 1
      }));
    }, 1000);
  }, [playStats.hasStarted]);

  // 处理播放暂停
  const handlePause = useCallback(() => {
    setPlayStats(prev => ({
      ...prev,
      isPlaying: false
    }));

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  // 处理播放结束
  const handleEnded = useCallback(() => {
    setPlayStats(prev => ({
      ...prev,
      isPlaying: false,
      hasEnded: true
    }));

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    // 发送最终统计
    sendPlayStats();

    onEnded?.();
  }, [sendPlayStats, onEnded]);

  // 处理播放错误
  const handleError = useCallback((error: string) => {
    setPlayStats(prev => ({
      ...prev,
      errorCount: prev.errorCount + 1
    }));

    console.error('视频播放错误:', {
      mediaId,
      error,
      errorCount: playStats.errorCount + 1
    });

    onError?.(error);
  }, [mediaId, playStats.errorCount, onError]);

  // 处理缓冲事件
  const handleWaiting = useCallback(() => {
    setPlayStats(prev => ({
      ...prev,
      bufferCount: prev.bufferCount + 1
    }));

    console.log('视频缓冲:', {
      mediaId,
      bufferCount: playStats.bufferCount + 1
    });
  }, [mediaId, playStats.bufferCount]);

  // 处理时间更新
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    onTimeUpdate?.(currentTime, duration);
  }, [onTimeUpdate]);

  // 组件卸载时发送统计
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
      
      // 如果有播放记录，发送统计
      if (playStats.hasStarted && videoMetadata) {
        sendPlayStats();
      }
    };
  }, [playStats.hasStarted, videoMetadata, sendPlayStats]);

  // 页面可见性变化时处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && playStats.isPlaying) {
        // 页面隐藏时暂停统计
        handlePause();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playStats.isPlaying, handlePause]);

  // 记录加载开始时间
  useEffect(() => {
    loadStartTimeRef.current = Date.now();
  }, [src]);

  return (
    <div className="relative">
      <OptimizedVideo
        src={src}
        poster={poster}
        width={width}
        height={height}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        controls={controls}
        className={className}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onLoadedMetadata={handleLoadedMetadata}
        // 添加额外的事件处理
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
      />

      {/* 开发模式下显示统计信息 */}
      {process.env.NODE_ENV === 'development' && playStats.hasStarted && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs p-2 rounded">
          <div>播放时间: {Math.round(playStats.totalPlayTime)}s</div>
          <div>缓冲次数: {playStats.bufferCount}</div>
          <div>错误次数: {playStats.errorCount}</div>
          <div>加载时间: {playStats.loadTime}ms</div>
          {videoMetadata && (
            <div>完成率: {Math.round((playStats.totalPlayTime / videoMetadata.duration) * 100)}%</div>
          )}
        </div>
      )}
    </div>
  );
}
