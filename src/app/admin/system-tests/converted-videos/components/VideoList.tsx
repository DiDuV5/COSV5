/**
 * @fileoverview 视频列表组件
 * @description 显示转码后视频的列表和状态
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { ConvertedVideo, VideoStatus } from '../types';
import { 
  formatFileSize, 
  formatTime, 
  getCompressionRatio, 
  getQualityColor, 
  getQualityText 
} from '../utils/videoUtils';

/**
 * 获取状态图标
 * @param status 视频状态
 * @returns JSX元素
 */
const getStatusIcon = (status: VideoStatus) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'processing':
      return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
  }
};

/**
 * 视频项组件属性接口
 */
interface VideoItemProps {
  video: ConvertedVideo;
  isSelected: boolean;
  onVideoClick: (video: ConvertedVideo) => void;
}

/**
 * 视频项组件
 */
const VideoItem: React.FC<VideoItemProps> = ({ 
  video, 
  isSelected, 
  onVideoClick 
}) => {
  const handleClick = () => {
    if (video.status === 'completed') {
      onVideoClick(video);
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
        isSelected ? 'border-blue-500 bg-blue-50' : ''
      } ${video.status !== 'completed' ? 'cursor-not-allowed opacity-75' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{video.originalName}</h4>
          <p className="text-xs text-gray-600">
            {video.originalCodec} → {video.convertedCodec}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(video.status)}
          <Badge className={getQualityColor(video.quality)}>
            {getQualityText(video.quality)}
          </Badge>
        </div>
      </div>
      
      {video.status === 'completed' && (
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <span>原始大小: {formatFileSize(video.originalSize)}</span>
          </div>
          <div>
            <span>转码后: {formatFileSize(video.convertedSize)}</span>
          </div>
          <div>
            <span>压缩率: {getCompressionRatio(video.originalSize, video.convertedSize)}%</span>
          </div>
          <div>
            <span>转码时间: {formatTime(video.conversionTime)}</span>
          </div>
        </div>
      )}
      
      {video.status === 'failed' && (
        <div className="text-xs text-red-600">
          转码失败：文件损坏或格式不支持
        </div>
      )}
      
      {video.playbackTest && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-xs">
            {video.playbackTest.canPlay ? (
              <CheckCircle className="w-3 h-3 text-green-600" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600" />
            )}
            <span className={video.playbackTest.canPlay ? 'text-green-600' : 'text-red-600'}>
              {video.playbackTest.canPlay ? '播放正常' : '播放失败'}
            </span>
            <span className="text-gray-500">
              ({video.playbackTest.loadTime}ms)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 视频列表组件属性接口
 */
interface VideoListProps {
  videos: ConvertedVideo[];
  selectedVideo: ConvertedVideo | null;
  onVideoSelect: (video: ConvertedVideo) => Promise<void>;
}

/**
 * 视频列表组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const VideoList: React.FC<VideoListProps> = ({ 
  videos, 
  selectedVideo, 
  onVideoSelect 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          转码后视频列表
        </CardTitle>
        <CardDescription>
          点击视频进行播放测试
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {videos.map((video) => (
            <VideoItem
              key={video.id}
              video={video}
              isSelected={selectedVideo?.id === video.id}
              onVideoClick={onVideoSelect}
            />
          ))}
          
          {videos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              没有转码后的视频
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
