/**
 * @fileoverview 视频播放器组件
 * @description 显示转码前后视频的对比播放器
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Video } from 'lucide-react';
import { OptimizedVideo } from '@/components/media/OptimizedVideo';
import { ConvertedVideo } from '../types';

/**
 * 视频播放器组件属性接口
 */
interface VideoPlayerProps {
  selectedVideo: ConvertedVideo | null;
}

/**
 * 空状态组件
 */
const EmptyState: React.FC = () => (
  <Card>
    <CardContent className="text-center py-12">
      <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        选择视频进行测试
      </h3>
      <p className="text-gray-500">
        点击左侧的转码后视频来进行播放测试
      </p>
    </CardContent>
  </Card>
);

/**
 * 视频播放区域组件
 */
interface VideoPlayAreaProps {
  title: string;
  codec: string;
  src: string;
  poster?: string;
  onError: (error: any) => void;
  onLoadedMetadata?: (metadata: any) => void;
}

const VideoPlayArea: React.FC<VideoPlayAreaProps> = ({
  title,
  codec,
  src,
  poster,
  onError,
  onLoadedMetadata
}) => (
  <div>
    <h4 className="font-medium mb-2">{title} ({codec})</h4>
    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
      <OptimizedVideo
        src={src}
        poster={poster}
        controls={true}
        className="w-full h-full"
        onError={onError}
        onLoadedMetadata={onLoadedMetadata}
      />
    </div>
  </div>
);

/**
 * 视频播放器组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ selectedVideo }) => {
  if (!selectedVideo) {
    return <EmptyState />;
  }

  const handleConvertedVideoError = (error: any) => {
    console.error('转码视频播放失败:', error);
  };

  const handleConvertedVideoMetadata = (metadata: any) => {
    console.log('转码视频元数据:', metadata);
  };

  const handleOriginalVideoError = (error: any) => {
    console.error('原始视频播放失败:', error);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          视频播放测试
        </CardTitle>
        <CardDescription>
          {selectedVideo.originalName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 转码后视频 */}
          <VideoPlayArea
            title="转码后视频"
            codec={selectedVideo.convertedCodec}
            src={selectedVideo.convertedUrl}
            poster={selectedVideo.thumbnailUrl}
            onError={handleConvertedVideoError}
            onLoadedMetadata={handleConvertedVideoMetadata}
          />

          {/* 原始视频对比 */}
          <VideoPlayArea
            title="原始视频"
            codec={selectedVideo.originalCodec}
            src={selectedVideo.originalUrl}
            poster={selectedVideo.thumbnailUrl}
            onError={handleOriginalVideoError}
          />
        </div>
      </CardContent>
    </Card>
  );
};
