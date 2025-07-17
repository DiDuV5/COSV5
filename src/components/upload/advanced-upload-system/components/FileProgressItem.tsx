/**
 * @fileoverview 文件进度项组件
 * @description 显示单个文件的上传进度和控制按钮
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from 'react';
import { CheckCircle, AlertCircle, Upload, Pause, Play, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { FileProgressItemProps } from '../types';

export function FileProgressItem({
  file,
  onRemove,
  onPause,
  onResume,
  onRetry,
  getStrategyName,
  getStrategyColor,
  formatFileSize,
  formatSpeed,
  formatTime
}: FileProgressItemProps) {
  const getStatusIcon = () => {
    switch (file.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-500" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      case 'uploading':
        return 'border-blue-200 bg-blue-50';
      case 'paused':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.file.name}
            </p>
            <Badge className={`text-xs ${getStrategyColor(file.strategy)}`}>
              {getStrategyName(file.strategy)}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{formatFileSize(file.file.size)}</span>
            {file.status === 'uploading' && (
              <>
                <span>{formatSpeed(file.speed)}</span>
                <span>剩余 {formatTime(file.eta)}</span>
                {file.retryCount > 0 && (
                  <span className="text-yellow-600">重试 {file.retryCount}</span>
                )}
              </>
            )}
            {file.chunks && (
              <span>
                分片 {file.chunks.completed}/{file.chunks.total}
                {file.chunks.failed > 0 && (
                  <span className="text-red-600"> (失败 {file.chunks.failed})</span>
                )}
              </span>
            )}
          </div>

          {file.status === 'uploading' && (
            <Progress value={file.progress} className="h-1 mt-2" />
          )}

          {file.error && (
            <p className="text-xs text-red-600 mt-1">{file.error}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {file.status === 'uploading' && (
            <Button variant="ghost" size="sm" onClick={onPause}>
              <Pause className="w-4 h-4" />
            </Button>
          )}

          {file.status === 'paused' && (
            <Button variant="ghost" size="sm" onClick={onResume}>
              <Play className="w-4 h-4" />
            </Button>
          )}

          {file.status === 'failed' && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={onRemove}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
