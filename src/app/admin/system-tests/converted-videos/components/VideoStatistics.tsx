/**
 * @fileoverview 视频统计概览组件
 * @description 显示转码视频的统计数据
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { Card, CardContent } from '@/components/ui/card';
import { VideoStatistics } from '../types';

/**
 * 统计卡片组件属性接口
 */
interface StatCardProps {
  value: string | number;
  label: string;
  color: string;
}

/**
 * 统计卡片组件
 */
const StatCard: React.FC<StatCardProps> = ({ value, label, color }) => (
  <Card>
    <CardContent className="p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </CardContent>
  </Card>
);

/**
 * 视频统计组件属性接口
 */
interface VideoStatisticsProps {
  statistics: VideoStatistics;
}

/**
 * 视频统计概览组件
 * @param props 组件属性
 * @returns JSX元素
 */
export const VideoStatisticsComponent: React.FC<VideoStatisticsProps> = ({ 
  statistics 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <StatCard
        value={statistics.completedCount}
        label="转码成功"
        color="text-green-600"
      />
      <StatCard
        value={statistics.failedCount}
        label="转码失败"
        color="text-red-600"
      />
      <StatCard
        value={`${statistics.averageCompressionRatio}%`}
        label="平均压缩率"
        color="text-blue-600"
      />
      <StatCard
        value={`${statistics.averageConversionTime}s`}
        label="平均转码时间"
        color="text-purple-600"
      />
    </div>
  );
};
