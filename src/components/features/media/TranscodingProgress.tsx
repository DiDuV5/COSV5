/**
 * @component TranscodingProgress
 * @description 转码进度显示组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - mediaId: string - 媒体文件ID
 * - onComplete?: () => void - 转码完成回调
 * - onError?: (error: string) => void - 转码错误回调
 *
 * @example
 * <TranscodingProgress
 *   mediaId="media123"
 *   onComplete={() => console.log('转码完成')}
 *   onError={(error) => console.error('转码失败:', error)}
 * />
 *
 * @dependencies
 * - React 18+
 * - @trpc/react
 * - lucide-react
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/trpc/react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface TranscodingProgressProps {
  mediaId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  showDetails?: boolean;
}

export default function TranscodingProgress({
  mediaId,
  onComplete,
  onError,
  showDetails = false
}: TranscodingProgressProps) {
  const [isPolling, setIsPolling] = useState(true);

  // 查询转码状态
  const { data: taskStatus, refetch, isPending } = api.transcoding.getTaskStatus.useQuery(
    { mediaId },
    {
      enabled: isPolling,
      refetchInterval: isPolling ? 2000 : false, // 简化轮询逻辑
    }
  );

  // 使用useEffect处理状态变化回调 (React Query v5)
  useEffect(() => {
    if (taskStatus) {
      // 如果任务完成或失败，停止轮询
      if (taskStatus.status === 'COMPLETED' || taskStatus.status === 'FAILED') {
        setIsPolling(false);
      }

      if (taskStatus.status === 'COMPLETED' && onComplete) {
        onComplete();
      }
      if (taskStatus.status === 'FAILED' && onError && taskStatus.errorMessage) {
        onError(taskStatus.errorMessage);
      }
    }
  }, [taskStatus, onComplete, onError]);

  // 重试转码任务
  const retryMutation = api.transcoding.retryFailedTask.useMutation({
    onSuccess: () => {
      setIsPolling(true);
      refetch();
    }
  });

  // 取消转码任务
  const cancelMutation = api.transcoding.cancelTask.useMutation({
    onSuccess: () => {
      setIsPolling(false);
      refetch();
    }
  });

  // 格式化持续时间
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      case 'PROCESSING': return 'bg-blue-500';
      case 'PENDING': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PROCESSING': return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '转码完成';
      case 'FAILED': return '转码失败';
      case 'PROCESSING': return '正在转码';
      case 'PENDING': return '等待转码';
      case 'NOT_FOUND': return '未找到任务';
      default: return '未知状态';
    }
  };

  if (isPending) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">加载转码状态...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!taskStatus) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">未找到转码任务</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getStatusIcon(taskStatus.status)}
            <span>{getStatusText(taskStatus.status)}</span>
            <Badge
              variant="secondary"
              className={`${getStatusColor(taskStatus.status)} text-white`}
            >
              {taskStatus.status}
            </Badge>
          </div>

          <div className="flex items-center space-x-1">
            {taskStatus.status === 'FAILED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => retryMutation.mutate({ taskId: mediaId })}
                disabled={retryMutation.isPending}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                重试
              </Button>
            )}

            {taskStatus.status === 'PROCESSING' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => cancelMutation.mutate({ taskId: mediaId })}
                disabled={cancelMutation.isPending}
              >
                <Pause className="h-3 w-3 mr-1" />
                取消
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 进度条 */}
        {(taskStatus.status === 'PROCESSING' || taskStatus.status === 'COMPLETED') && (
          <div className="space-y-2">
            <Progress value={taskStatus.progress} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{taskStatus.progress.toFixed(1)}%</span>
              {taskStatus.duration && (
                <span>耗时: {formatDuration(taskStatus.duration)}</span>
              )}
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {taskStatus.status === 'FAILED' && taskStatus.errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start space-x-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">转码失败</p>
                <p className="mt-1 text-xs">{taskStatus.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* 详细信息 */}
        {showDetails && (
          <div className="mt-4 space-y-2 text-xs text-gray-500">
            {taskStatus.startedAt && (
              <div className="flex justify-between">
                <span>开始时间:</span>
                <span>{new Date(taskStatus.startedAt).toLocaleString()}</span>
              </div>
            )}
            {taskStatus.completedAt && (
              <div className="flex justify-between">
                <span>完成时间:</span>
                <span>{new Date(taskStatus.completedAt).toLocaleString()}</span>
              </div>
            )}
            {taskStatus.inputPath && (
              <div className="flex justify-between">
                <span>输入文件:</span>
                <span className="truncate ml-2 max-w-[200px]">
                  {taskStatus.inputPath.split('/').pop()}
                </span>
              </div>
            )}
            {taskStatus.outputPath && (
              <div className="flex justify-between">
                <span>输出文件:</span>
                <span className="truncate ml-2 max-w-[200px]">
                  {taskStatus.outputPath.split('/').pop()}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
