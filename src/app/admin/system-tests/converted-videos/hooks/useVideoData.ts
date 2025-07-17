'use client';

/**
 * @fileoverview 视频数据获取Hook
 * @description 管理视频数据的获取和状态
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState, useEffect } from 'react';
import { ConvertedVideo, VideoStatistics } from '../types';
import { getCompressionRatio } from '../utils/videoUtils';

/**
 * 视频数据Hook返回值接口
 */
interface UseVideoDataReturn {
  videos: ConvertedVideo[];
  setVideos: React.Dispatch<React.SetStateAction<ConvertedVideo[]>>;
  isLoading: boolean;
  statistics: VideoStatistics;
}

/**
 * 生成模拟视频数据
 * @returns 模拟的转码视频数组
 */
const generateMockVideos = (): ConvertedVideo[] => {
  return [
    {
      id: '1',
      originalName: 'cosplay_dance_4k.mov',
      originalUrl: '/uploads/original/cosplay_dance_4k.mov',
      convertedUrl: '/uploads/converted/cosplay_dance_4k_h264.mp4',
      thumbnailUrl: '/uploads/thumbnails/cosplay_dance_4k_thumb.jpg',
      originalCodec: 'H.265/HEVC 4K',
      convertedCodec: 'H.264 1080p',
      originalSize: 125829120, // 120MB
      convertedSize: 52428800,  // 50MB
      conversionTime: 180,      // 3分钟
      quality: 'high',
      status: 'completed',
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      originalName: 'anime_cosplay.avi',
      originalUrl: '/uploads/original/anime_cosplay.avi',
      convertedUrl: '/uploads/converted/anime_cosplay_h264.mp4',
      thumbnailUrl: '/uploads/thumbnails/anime_cosplay_thumb.jpg',
      originalCodec: 'DivX',
      convertedCodec: 'H.264 720p',
      originalSize: 83886080,  // 80MB
      convertedSize: 41943040, // 40MB
      conversionTime: 120,     // 2分钟
      quality: 'medium',
      status: 'completed',
      createdAt: '2024-01-15T11:00:00Z'
    },
    {
      id: '3',
      originalName: 'photo_shoot.mkv',
      originalUrl: '/uploads/original/photo_shoot.mkv',
      convertedUrl: '/uploads/converted/photo_shoot_h264.mp4',
      originalCodec: 'H.265/HEVC',
      convertedCodec: 'H.264 Baseline',
      originalSize: 104857600, // 100MB
      convertedSize: 62914560, // 60MB
      conversionTime: 240,     // 4分钟
      quality: 'high',
      status: 'completed',
      createdAt: '2024-01-15T12:00:00Z'
    },
    {
      id: '4',
      originalName: 'corrupted_video.mp4',
      originalUrl: '/uploads/original/corrupted_video.mp4',
      convertedUrl: '',
      originalCodec: 'Unknown',
      convertedCodec: '',
      originalSize: 31457280, // 30MB
      convertedSize: 0,
      conversionTime: 0,
      quality: 'low',
      status: 'failed',
      createdAt: '2024-01-15T13:00:00Z'
    }
  ];
};

/**
 * 计算视频统计数据
 * @param videos 视频数组
 * @returns 统计数据
 */
const calculateStatistics = (videos: ConvertedVideo[]): VideoStatistics => {
  const completedVideos = videos.filter(v => v.status === 'completed');
  const failedVideos = videos.filter(v => v.status === 'failed');

  const averageCompressionRatio = completedVideos.length > 0
    ? Math.round(completedVideos.reduce((sum, v) =>
        sum + getCompressionRatio(v.originalSize, v.convertedSize), 0) / completedVideos.length)
    : 0;

  const averageConversionTime = completedVideos.length > 0
    ? Math.round(completedVideos.reduce((sum, v) => sum + v.conversionTime, 0) / completedVideos.length)
    : 0;

  return {
    completedCount: completedVideos.length,
    failedCount: failedVideos.length,
    averageCompressionRatio,
    averageConversionTime
  };
};

/**
 * 视频数据管理Hook
 * @returns 视频数据和相关状态
 */
export const useVideoData = (): UseVideoDataReturn => {
  const [videos, setVideos] = useState<ConvertedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 模拟获取转码后的视频数据
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockVideos = generateMockVideos();
        setVideos(mockVideos);
      } catch (error) {
        console.error('加载视频数据失败:', error);
        // 在实际应用中，这里应该设置错误状态
      } finally {
        setIsLoading(false);
      }
    };

    loadVideoData();
  }, []);

  // 计算统计数据
  const statistics = calculateStatistics(videos);

  return {
    videos,
    setVideos,
    isLoading,
    statistics
  };
};
