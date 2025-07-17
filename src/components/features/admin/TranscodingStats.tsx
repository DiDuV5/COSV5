/**
 * @component TranscodingStats
 * @description 转码统计信息管理组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - className?: string - 自定义样式类名
 *
 * @example
 * <TranscodingStats className="mt-4" />
 *
 * @dependencies
 * - React 18+
 * - @trpc/react
 * - lucide-react
 * - recharts
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  RefreshCw,
  TrendingUp,
  FileVideo,
  Timer
} from 'lucide-react';

interface TranscodingStatsProps {
  className?: string;
}

export default function TranscodingStats({ className }: TranscodingStatsProps) {
  const [cleanupDays, setCleanupDays] = useState(30);

  // 获取转码统计信息
  const { data: stats, refetch, isPending } = api.transcoding.getTranscodingStats.useQuery();

  // 清理旧任务
  const cleanupMutation = api.transcoding.cleanupOldTasks.useMutation({
    onSuccess: () => {
      refetch();
    }
  });

  // 状态颜色映射
  const statusColors = {
    COMPLETED: '#10b981',
    FAILED: '#ef4444',
    PROCESSING: '#3b82f6',
    PENDING: '#f59e0b'
  };

  // 准备图表数据
  const statusData = stats?.statusBreakdown ? Object.entries(stats.statusBreakdown).map(([status, count]) => ({
    name: status,
    value: count,
    color: statusColors[status as keyof typeof statusColors] || '#6b7280'
  })) : [];

  // 格式化持续时间
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isPending) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载统计信息...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-gray-500">无法加载统计信息</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileVideo className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">总任务数</p>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">成功完成</p>
                <p className="text-2xl font-bold">{stats.statusBreakdown.COMPLETED || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">失败任务</p>
                <p className="text-2xl font-bold">{stats.statusBreakdown.FAILED || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Timer className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">平均耗时</p>
                <p className="text-2xl font-bold">{formatDuration(stats.averageDuration ?? null)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 状态分布图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>任务状态分布</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>状态统计</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 最近任务列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>最近任务</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              刷新
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge
                    variant="secondary"
                    className={`${statusColors[task.status as keyof typeof statusColors] ? 'text-white' : ''}`}
                    style={{
                      backgroundColor: statusColors[task.status as keyof typeof statusColors] || '#6b7280'
                    }}
                  >
                    {task.status}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{task.media?.originalName || '未知文件'}</p>
                    <p className="text-xs text-gray-500">
                      {task.media?.fileSize ? formatFileSize(task.media.fileSize) : '--'} • {task.createdAt ? new Date(task.createdAt).toLocaleString() : '--'}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  {task.progress > 0 && (
                    <p className="text-gray-600">{task.progress.toFixed(1)}%</p>
                  )}
                  {task.duration && (
                    <p className="text-xs text-gray-500">{formatDuration(task.duration)}</p>
                  )}
                  {task.errorMessage && (
                    <p className="text-xs text-red-500 max-w-[200px] truncate">
                      {task.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {stats.recentTasks.length === 0 && (
              <p className="text-center text-gray-500 py-4">暂无任务记录</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 清理工具 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5" />
            <span>清理工具</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <Label htmlFor="cleanup-days">清理天数前的任务记录</Label>
              <Input
                id="cleanup-days"
                type="number"
                min="1"
                max="365"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={() => cleanupMutation.mutate({ daysOld: cleanupDays })}
              disabled={cleanupMutation.isPending}
              variant="destructive"
            >
              {cleanupMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              清理记录
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            将删除 {cleanupDays} 天前已完成或失败的任务记录
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
