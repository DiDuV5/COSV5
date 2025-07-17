/**
 * @fileoverview 转码视频测试主页面组件
 * @description 整合所有子组件的主页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

'use client';

import { useVideoData } from '../hooks/useVideoData';
import { useVideoPlayback } from '../hooks/useVideoPlayback';
import { PageHeader } from './PageHeader';
import { VideoStatisticsComponent } from './VideoStatistics';
import { VideoList } from './VideoList';
import { VideoPlayer } from './VideoPlayer';
import { VideoDetails } from './VideoDetails';
import { QuickLinks } from './QuickLinks';
import { LoadingState } from './LoadingState';

/**
 * 转码视频测试主页面组件
 * @returns JSX元素
 */
export const ConvertedVideosPage: React.FC = () => {
  // 使用自定义Hooks管理状态
  const { videos, setVideos, isLoading, statistics } = useVideoData();
  const { selectedVideo, testVideoPlayback } = useVideoPlayback({ videos, setVideos });

  // 显示加载状态
  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <PageHeader />

      {/* 统计概览 */}
      <VideoStatisticsComponent statistics={statistics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：视频列表 */}
        <div className="space-y-6">
          <VideoList
            videos={videos}
            selectedVideo={selectedVideo}
            onVideoSelect={testVideoPlayback}
          />
        </div>

        {/* 右侧：视频播放测试 */}
        <div className="space-y-6">
          <VideoPlayer selectedVideo={selectedVideo} />
          <VideoDetails selectedVideo={selectedVideo} />
        </div>
      </div>

      {/* 快速链接 */}
      <QuickLinks />
    </div>
  );
};
