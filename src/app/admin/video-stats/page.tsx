/**
 * @fileoverview 视频播放统计页面
 * @description 管理员查看视频播放统计和性能数据
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - React 18+
 * - @/lib/trpc/client
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, TrendingUp, Users, Clock, Smartphone, Monitor } from 'lucide-react';

// 类型定义
interface Media {
  id: string;
  mediaType: string;
  filename: string;
  duration?: number;
  [key: string]: any;
}

interface Post {
  id: string;
  title: string;
  media?: Media[];
  [key: string]: any;
}

export default function VideoStatsPage() {
  const [selectedMediaId, setSelectedMediaId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week');

  // 获取所有视频媒体
  const { data: mediaList, isPending: mediaLoading } = api.post.getAll.useQuery({
    limit: 100
  });

  // 获取选中视频的统计数据
  const { data: stats, isPending: statsLoading, refetch } = api.media.getPlayStats.useQuery(
    {
      mediaId: selectedMediaId,
      timeRange
    },
    {
      enabled: !!selectedMediaId
    }
  );

  // 获取视频列表
  const videoMedia = mediaList?.posts.flatMap((post: Post) =>
    post.media?.filter((m: Media) => m.mediaType === 'VIDEO') || []
  ) || [];

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">视频播放统计</h1>
        <p className="text-gray-600">
          查看视频播放数据、用户行为和性能指标
        </p>
      </div>

      {/* 控制面板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>选择视频</CardTitle>
            <CardDescription>选择要查看统计的视频</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedMediaId} onValueChange={setSelectedMediaId}>
              <SelectTrigger>
                <SelectValue placeholder="选择视频文件" />
              </SelectTrigger>
              <SelectContent>
                {videoMedia.map((media: Media) => (
                  <SelectItem key={media.id} value={media.id}>
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]">
                        {media.originalName}
                      </span>
                      <Badge variant="outline">
                        {(media as any)?.resolution || '未知'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>时间范围</CardTitle>
            <CardDescription>选择统计时间范围</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">最近24小时</SelectItem>
                <SelectItem value="week">最近7天</SelectItem>
                <SelectItem value="month">最近30天</SelectItem>
                <SelectItem value="all">全部时间</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* 统计数据 */}
      {selectedMediaId && (
        <>
          {statsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* 概览统计 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">总播放次数</CardTitle>
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalPlays}</div>
                    <p className="text-xs text-muted-foreground">
                      {timeRange === 'day' ? '今日' :
                       timeRange === 'week' ? '本周' :
                       timeRange === 'month' ? '本月' : '总计'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">总播放时长</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatDuration(stats.totalPlayTime)}</div>
                    <p className="text-xs text-muted-foreground">
                      累计观看时间
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">平均完成率</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercentage(stats.avgCompletionRate)}</div>
                    <p className="text-xs text-muted-foreground">
                      用户观看完整度
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">平均加载时间</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{Math.round(stats.avgLoadTime)}ms</div>
                    <p className="text-xs text-muted-foreground">
                      视频加载速度
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 浏览器和设备统计 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      浏览器分布
                    </CardTitle>
                    <CardDescription>不同浏览器的播放次数</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.browserStats).map(([browser, count]) => (
                        <div key={browser} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-medium">{browser}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{count as number}</span>
                            <Badge variant="outline">
                              {Math.round(((count as number) / stats.totalPlays) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      设备分布
                    </CardTitle>
                    <CardDescription>不同设备类型的播放次数</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stats.deviceStats).map(([device, count]) => (
                        <div key={device} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium">{device}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">{count as number}</span>
                            <Badge variant="outline">
                              {Math.round(((count as number) / stats.totalPlays) * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 最近播放记录 */}
              <Card>
                <CardHeader>
                  <CardTitle>最近播放记录</CardTitle>
                  <CardDescription>最近10次播放的详细信息</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.recentPlays.map((play: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <div>
                            <div className="text-sm font-medium">
                              播放时长: {formatDuration(play.playDuration)}
                            </div>
                            <div className="text-xs text-gray-500">
                              完成率: {formatPercentage(play.completionRate)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {play.browser} / {play.device}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(play.playedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-500 mb-4">暂无播放数据</p>
                  <Button onClick={() => refetch()}>刷新数据</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedMediaId && (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">请选择一个视频文件查看统计数据</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
