'use client';

/**
 * @fileoverview 视频播放测试Hook
 * @description 管理视频播放测试逻辑和状态
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState, useCallback } from 'react';
import { ConvertedVideo, PlaybackTest, PlaybackTestState } from '../types';

/**
 * 播放测试Hook返回值接口
 */
interface UseVideoPlaybackReturn {
  selectedVideo: ConvertedVideo | null;
  playbackTests: PlaybackTestState;
  testVideoPlayback: (video: ConvertedVideo) => Promise<void>;
  setSelectedVideo: React.Dispatch<React.SetStateAction<ConvertedVideo | null>>;
  updateVideoWithPlaybackTest: (videoId: string, playbackTest: PlaybackTest) => void;
}

/**
 * 播放测试Hook参数接口
 */
interface UseVideoPlaybackParams {
  videos: ConvertedVideo[];
  setVideos: React.Dispatch<React.SetStateAction<ConvertedVideo[]>>;
}

/**
 * 模拟视频播放测试
 * @param video 要测试的视频
 * @returns 播放测试结果
 */
const simulatePlaybackTest = async (video: ConvertedVideo): Promise<PlaybackTest> => {
  const startTime = Date.now();

  try {
    // 模拟播放测试延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    const loadTime = Date.now() - startTime;
    const canPlay = Math.random() > 0.1; // 90% 成功率

    return {
      canPlay,
      loadTime,
      error: canPlay ? undefined : '视频格式不兼容或文件损坏'
    };
  } catch (error) {
    return {
      canPlay: false,
      loadTime: Date.now() - startTime,
      error: '网络错误或服务器问题'
    };
  }
};

/**
 * 视频播放测试管理Hook
 * @param params Hook参数
 * @returns 播放测试相关状态和方法
 */
export const useVideoPlayback = ({
  videos,
  setVideos
}: UseVideoPlaybackParams): UseVideoPlaybackReturn => {
  const [selectedVideo, setSelectedVideo] = useState<ConvertedVideo | null>(null);
  const [playbackTests, setPlaybackTests] = useState<PlaybackTestState>({});

  /**
   * 更新视频的播放测试结果
   */
  const updateVideoWithPlaybackTest = useCallback((videoId: string, playbackTest: PlaybackTest) => {
    setVideos(prev => prev.map(v =>
      v.id === videoId
        ? { ...v, playbackTest }
        : v
    ));
  }, [setVideos]);

  /**
   * 执行视频播放测试
   */
  const testVideoPlayback = useCallback(async (video: ConvertedVideo) => {
    // 只测试已完成转码的视频
    if (video.status !== 'completed') {
      console.warn('只能测试已完成转码的视频');
      return;
    }

    // 设置当前选中的视频
    setSelectedVideo(video);

    try {
      console.log(`开始测试视频播放: ${video.originalName}`);

      // 执行播放测试
      const testResult = await simulatePlaybackTest(video);

      // 更新播放测试状态
      setPlaybackTests(prev => ({
        ...prev,
        [video.id]: testResult
      }));

      // 更新视频对象
      updateVideoWithPlaybackTest(video.id, testResult);

      console.log(`视频播放测试完成: ${video.originalName}`, testResult);

    } catch (error) {
      console.error(`视频播放测试失败: ${video.originalName}`, error);

      const errorResult: PlaybackTest = {
        canPlay: false,
        loadTime: 0,
        error: error instanceof Error ? error.message : '未知错误'
      };

      setPlaybackTests(prev => ({
        ...prev,
        [video.id]: errorResult
      }));

      updateVideoWithPlaybackTest(video.id, errorResult);
    }
  }, [updateVideoWithPlaybackTest]);

  return {
    selectedVideo,
    playbackTests,
    testVideoPlayback,
    setSelectedVideo,
    updateVideoWithPlaybackTest
  };
};
