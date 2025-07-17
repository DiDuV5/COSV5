/**
 * @fileoverview 视频播放器组件
 * @description 基于 HTML5 video 的自定义视频播放器
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Lucide React (图标)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
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
}

export function VideoPlayer({
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
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isPending, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // 格式化时间
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // 播放/暂停
  const togglePlay = useCallback(() => {
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
  }, [isPlaying, onError]);

  // 调整音量
  const handleVolumeChange = useCallback((newVolume: number[]) => {
    if (!videoRef.current) return;
    
    const volumeValue = newVolume[0] / 100;
    videoRef.current.volume = volumeValue;
    setVolume(volumeValue);
    setIsMuted(volumeValue === 0);
  }, []);

  // 静音/取消静音
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;

    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  // 跳转到指定时间
  const seekTo = useCallback((newTime: number[]) => {
    if (!videoRef.current) return;
    
    const timeValue = (newTime[0] / 100) * duration;
    videoRef.current.currentTime = timeValue;
    setCurrentTime(timeValue);
  }, [duration]);

  // 快进/快退
  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [currentTime, duration]);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;

    if (!isFullscreen) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [isFullscreen]);

  // 显示/隐藏控制栏
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // 检测视频编码兼容性
  const checkVideoCompatibility = useCallback(() => {
    if (typeof window === 'undefined' || !videoRef.current) return;

    const video = videoRef.current;

    // 检测 H.265/HEVC 支持
    const hevcSupport = video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"');
    const h264Support = video.canPlayType('video/mp4; codecs="avc1.42E01E"');

    console.log('视频编码支持检测:', {
      hevc: hevcSupport,
      h264: h264Support,
      src: src
    });

    // 如果不支持当前编码，显示警告
    if (hevcSupport === '' && src.includes('.mp4')) {
      console.warn('当前浏览器可能不支持 H.265/HEVC 编码，建议转码为 H.264');
    }
  }, [src]);

  // 视频事件处理
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
      console.log('视频元数据加载成功:', {
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight
      });
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
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
        src: src
      });

      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    };

    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleCanPlay = () => {
      console.log('视频可以开始播放');
      setIsLoading(false);
    };

    const handleWaiting = () => {
      console.log('视频缓冲中...');
      setIsLoading(true);
    };

    const handleCanPlayThrough = () => {
      console.log('视频已完全加载');
      setIsLoading(false);
    };

    // 添加事件监听器
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // 检测兼容性
    checkVideoCompatibility();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onTimeUpdate, onEnded, onError, checkVideoCompatibility]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-2">视频加载失败</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative bg-black ${className}`}
      style={{ width, height }}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 视频元素 */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />

      {/* 加载指示器 */}
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* 播放按钮覆盖层 */}
      {!isPlaying && !isPending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Button
            variant="ghost"
            size="lg"
            onClick={togglePlay}
            className="text-white hover:bg-white/20 w-16 h-16 rounded-full"
          >
            <Play className="w-8 h-8" />
          </Button>
        </div>
      )}

      {/* 控制栏 */}
      {controls && (showControls || !isPlaying) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* 进度条 */}
          <div className="mb-4">
            <Slider
              value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
              onValueChange={seekTo}
              max={100}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 快退 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skip(-10)}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              {/* 播放/暂停 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              {/* 快进 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => skip(10)}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              {/* 音量控制 */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              {/* 时间显示 */}
              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* 全屏按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
