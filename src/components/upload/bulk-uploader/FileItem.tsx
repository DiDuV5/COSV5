/**
 * @fileoverview 文件项组件
 * @description 单个文件项的渲染组件，从原 OptimizedBulkUploader.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { X, Pause, Play, CheckCircle, AlertCircle, FileImage, FileVideo, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UploadFileItem, UploadStatus } from './upload-queue-manager';

export interface FileItemProps {
  file: UploadFileItem;
  index: number;
  onRemove: (fileId: string) => void;
  onPause?: (fileId: string) => void;
  onResume?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  showThumbnail?: boolean;
  compact?: boolean;
}

/**
 * 文件项组件
 * 负责渲染单个文件的上传状态和操作
 */
export const FileItem = React.memo<FileItemProps>(({
  file,
  index,
  onRemove,
  onPause,
  onResume,
  onRetry,
  showThumbnail = true,
  compact = false,
}) => {
  const isImage = file.file.type.startsWith('image/');
  const isVideo = file.file.type.startsWith('video/');

  /**
   * 获取状态配置
   */
  const statusConfig = useMemo(() => {
    const configs: Record<UploadStatus, {
      color: string;
      bgColor: string;
      icon: React.ComponentType<any>;
      label: string;
      showProgress: boolean;
    }> = {
      pending: {
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: FileImage,
        label: '等待上传',
        showProgress: false,
      },
      uploading: {
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        icon: Play,
        label: '上传中',
        showProgress: true,
      },
      processing: {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        icon: Play,
        label: '处理中',
        showProgress: true,
      },
      completed: {
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        icon: CheckCircle,
        label: '上传完成',
        showProgress: false,
      },
      error: {
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        icon: AlertCircle,
        label: '上传失败',
        showProgress: false,
      },
      paused: {
        color: 'text-orange-500',
        bgColor: 'bg-orange-100',
        icon: Pause,
        label: '已暂停',
        showProgress: true,
      },
      cancelled: {
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        icon: X,
        label: '已取消',
        showProgress: false,
      },
    };
    return configs[file.status];
  }, [file.status]);

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  /**
   * 格式化上传时间
   */
  const formatUploadTime = (): string => {
    if (!file.startTime) return '';

    const duration = file.endTime
      ? file.endTime - file.startTime
      : Date.now() - file.startTime;

    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}秒`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  /**
   * 渲染缩略图
   */
  const renderThumbnail = () => {
    if (!showThumbnail) return null;

    if (file.thumbnail) {
      return (
        <div className="w-full h-full relative overflow-hidden rounded">
          <Image
            src={file.thumbnail}
            alt={file.file.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50px, 32px"
            priority={false}
          />
        </div>
      );
    }

    const IconComponent = isVideo ? FileVideo : FileImage;
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded">
        <IconComponent className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  };

  /**
   * 渲染操作按钮
   */
  const renderActions = () => {
    const actions: React.ReactNode[] = [];

    // 暂停/恢复按钮
    if (file.status === 'uploading' && onPause) {
      actions.push(
        <Button
          key="pause"
          variant="ghost"
          size="sm"
          onClick={() => onPause(file.id)}
          className="h-6 w-6 p-0"
        >
          <Pause className="w-3 h-3" />
        </Button>
      );
    } else if (file.status === 'paused' && onResume) {
      actions.push(
        <Button
          key="resume"
          variant="ghost"
          size="sm"
          onClick={() => onResume(file.id)}
          className="h-6 w-6 p-0"
        >
          <Play className="w-3 h-3" />
        </Button>
      );
    }

    // 重试按钮
    if (file.status === 'error' && onRetry) {
      actions.push(
        <Button
          key="retry"
          variant="ghost"
          size="sm"
          onClick={() => onRetry(file.id)}
          className="h-6 w-6 p-0"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>
      );
    }

    // 删除按钮
    if (file.status !== 'uploading' && file.status !== 'processing') {
      actions.push(
        <Button
          key="remove"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(file.id)}
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      );
    }

    return actions;
  };

  if (compact) {
    // 紧凑模式
    return (
      <div className="flex items-center space-x-3 p-2 border rounded-lg bg-card">
        {/* 缩略图 */}
        <div className="w-8 h-8 flex-shrink-0">
          {renderThumbnail()}
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium truncate">{file.file.name}</span>
            <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          {statusConfig.showProgress && (
            <Progress value={file.progress} className="h-1 mt-1" />
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-1">
          {renderActions()}
        </div>
      </div>
    );
  }

  // 标准模式
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* 缩略图区域 */}
      <div className="aspect-video bg-muted relative">
        {renderThumbnail()}

        {/* 状态覆盖层 */}
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          statusConfig.bgColor,
          file.status === 'completed' ? 'bg-opacity-0' : 'bg-opacity-80'
        )}>
          <statusConfig.icon className={cn('w-8 h-8', statusConfig.color)} />
        </div>

        {/* 进度条 */}
        {statusConfig.showProgress && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={file.progress} className="h-1 rounded-none" />
          </div>
        )}

        {/* 操作按钮 */}
        <div className="absolute top-2 right-2 flex space-x-1">
          {renderActions()}
        </div>
      </div>

      {/* 文件信息 */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate" title={file.file.name}>
              {file.file.name}
            </h4>
            <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
              <span>{formatFileSize(file.file.size)}</span>
              {file.startTime && (
                <>
                  <span>•</span>
                  <span>{formatUploadTime()}</span>
                </>
              )}
            </div>
          </div>

          <Badge variant="outline" className={cn('ml-2', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* 进度信息 */}
        {statusConfig.showProgress && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>进度</span>
              <span>{file.progress}%</span>
            </div>
            <Progress value={file.progress} className="h-2" />
          </div>
        )}

        {/* 错误信息 */}
        {file.status === 'error' && file.error && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            {file.error}
            {file.retryCount && file.retryCount > 0 && (
              <span className="ml-2">
                (重试 {file.retryCount} 次)
              </span>
            )}
          </div>
        )}

        {/* 成功信息 */}
        {file.status === 'completed' && (
          <div className="mt-2 text-xs text-green-600">
            上传成功 {file.endTime && file.startTime && (
              <span>• 耗时 {Math.round((file.endTime - file.startTime) / 1000)}秒</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

FileItem.displayName = 'FileItem';

/**
 * 导出文件项组件
 */
export default FileItem;
