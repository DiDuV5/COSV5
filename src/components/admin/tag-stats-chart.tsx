/**
 * @fileoverview 标签统计图表组件
 * @description 显示标签使用趋势和热门标签排行榜
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Lucide React
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useMemo } from 'react';
import { TrendingUp, Hash, Eye, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TagStatsData {
  name: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  heatScore: number;
  trend: number[];
}

interface TagStatsChartProps {
  data: TagStatsData[];
  timeRange: string;
  totalTags: number;
  totalPosts: number;
  className?: string;
}

export function TagStatsChart({ 
  data, 
  timeRange, 
  totalTags, 
  totalPosts, 
  className 
}: TagStatsChartProps) {
  // 计算最大值用于进度条
  const maxCount = useMemo(() => {
    return Math.max(...data.map(tag => tag.count), 1);
  }, [data]);

  const maxHeatScore = useMemo(() => {
    return Math.max(...data.map(tag => tag.heatScore), 1);
  }, [data]);

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // 获取热度颜色
  const getHeatColor = (score: number) => {
    const ratio = score / maxHeatScore;
    if (ratio >= 0.8) return 'bg-red-500';
    if (ratio >= 0.6) return 'bg-orange-500';
    if (ratio >= 0.4) return 'bg-yellow-500';
    if (ratio >= 0.2) return 'bg-green-500';
    return 'bg-blue-500';
  };

  // 简单的趋势图
  const renderTrendLine = (trend: number[]) => {
    if (trend.length === 0) return null;
    
    const max = Math.max(...trend, 1);
    const points = trend.map((value, index) => {
      const x = (index / (trend.length - 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-16 h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-blue-500"
        />
      </svg>
    );
  };

  return (
    <div className={className}>
      {/* 热门标签排行榜 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            热门标签排行榜
          </CardTitle>
          <CardDescription>
            {timeRange === 'month' ? '本月' : timeRange === 'week' ? '本周' : '全部时间'}最受欢迎的标签
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.slice(0, 10).map((tag, index) => (
              <div key={tag.name} className="flex items-center gap-3">
                {/* 排名 */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>

                {/* 标签信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {tag.name}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${getHeatColor(tag.heatScore)}`} />
                  </div>
                  
                  {/* 进度条 */}
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(tag.count / maxCount) * 100} 
                      className="flex-1 h-2"
                    />
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                      {formatNumber(tag.count)}
                    </span>
                  </div>
                </div>

                {/* 趋势图 */}
                <div className="flex-shrink-0">
                  {renderTrendLine(tag.trend)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 标签统计详情 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            详细统计
          </CardTitle>
          <CardDescription>
            标签的详细使用数据和互动统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.slice(0, 5).map((tag) => (
              <div key={tag.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="font-mono">
                    {tag.name}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${getHeatColor(tag.heatScore)}`} />
                    <span className="text-sm text-gray-500">热度 {tag.heatScore}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-gray-500">使用次数</p>
                      <p className="font-semibold">{formatNumber(tag.count)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-gray-500">总浏览量</p>
                      <p className="font-semibold">{formatNumber(tag.views)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-gray-500">总点赞数</p>
                      <p className="font-semibold">{formatNumber(tag.likes)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-gray-500">总评论数</p>
                      <p className="font-semibold">{formatNumber(tag.comments)}</p>
                    </div>
                  </div>
                </div>

                {/* 趋势图 */}
                {tag.trend.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">使用趋势</p>
                    <div className="h-16 bg-gray-50 rounded flex items-end justify-center p-2">
                      {renderTrendLine(tag.trend)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 总体统计 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>总体概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{totalTags}</p>
              <p className="text-sm text-gray-500">总标签数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{totalPosts}</p>
              <p className="text-sm text-gray-500">相关帖子</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {data.length > 0 ? formatNumber(data.reduce((sum, tag) => sum + tag.views, 0)) : '0'}
              </p>
              <p className="text-sm text-gray-500">总浏览量</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {data.length > 0 ? formatNumber(data.reduce((sum, tag) => sum + tag.likes, 0)) : '0'}
              </p>
              <p className="text-sm text-gray-500">总点赞数</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
