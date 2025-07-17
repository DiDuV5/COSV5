/**
 * @fileoverview 视频详情组件
 * @description 显示视频转码详情和播放测试结果
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';
import { ConvertedVideo } from '../types';
import { formatFileSize, formatTime, getCompressionRatio } from '../utils/videoUtils';

/**
 * 转码详情组件属性接口
 */
interface VideoDetailsProps {
  selectedVideo: ConvertedVideo | null;
}

/**
 * 详情项组件
 */
interface DetailItemProps {
  label: string;
  value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
  <div>
    <span className="font-medium">{label}:</span>
    <div className="text-gray-600">{value}</div>
  </div>
);

/**
 * 转码详情卡片组件
 */
const TranscodingDetailsCard: React.FC<{ video: ConvertedVideo }> = ({ video }) => {
  const compressionRatio = getCompressionRatio(video.originalSize, video.convertedSize);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>转码详情</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <DetailItem
              label="原始编码"
              value={video.originalCodec}
            />
            <DetailItem
              label="转码后编码"
              value={video.convertedCodec}
            />
            <DetailItem
              label="原始大小"
              value={formatFileSize(video.originalSize)}
            />
            <DetailItem
              label="转码后大小"
              value={formatFileSize(video.convertedSize)}
            />
            <DetailItem
              label="压缩率"
              value={`${compressionRatio}%`}
            />
            <DetailItem
              label="转码时间"
              value={formatTime(video.conversionTime)}
            />
          </div>
          
          {/* 压缩率可视化 */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>文件大小对比</span>
              <span>{compressionRatio}% 压缩</span>
            </div>
            <Progress 
              value={(video.convertedSize / video.originalSize) * 100} 
              className="h-2"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 播放测试结果卡片组件
 */
const PlaybackTestResultCard: React.FC<{ video: ConvertedVideo }> = ({ video }) => {
  if (!video.playbackTest) {
    return null;
  }

  const { playbackTest } = video;

  return (
    <Card>
      <CardHeader>
        <CardTitle>播放测试结果</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {playbackTest.canPlay ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={playbackTest.canPlay ? 'text-green-600' : 'text-red-600'}>
              {playbackTest.canPlay ? '播放成功' : '播放失败'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            加载时间: {playbackTest.loadTime}ms
          </div>
          
          {playbackTest.error && (
            <div className="text-sm text-red-600">
              错误: {playbackTest.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 视频详情组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const VideoDetails: React.FC<VideoDetailsProps> = ({ selectedVideo }) => {
  if (!selectedVideo) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TranscodingDetailsCard video={selectedVideo} />
      <PlaybackTestResultCard video={selectedVideo} />
    </div>
  );
};
