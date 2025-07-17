/**
 * @fileoverview 文件列表组件
 * @description 显示选中文件的列表和操作按钮
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from 'react';
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AdvancedUploadFile } from '../types';
import { formatFileSize, getStrategyName, getStrategyColor, formatSpeed, formatTime } from '../utils';

interface FileListProps {
  files: AdvancedUploadFile[];
  isUploading: boolean;
  overallProgress: number;
  uploadSpeed: number;
  eta: number;
  onStartUpload: () => void;
  onClearFiles: () => void;
  onRemoveFile: (fileId: string) => void;
  onSwitchToProgress: () => void;
}

export function FileList({
  files,
  isUploading,
  overallProgress,
  uploadSpeed,
  eta,
  onStartUpload,
  onClearFiles,
  onRemoveFile,
  onSwitchToProgress,
}: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium">
          已选择 {files.length} 个文件
        </h4>
        <div className="flex gap-2">
          <Button
            onClick={onStartUpload}
            disabled={isUploading || files.every(f => f.status !== 'pending')}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            开始上传
          </Button>
          <Button
            variant="outline"
            onClick={onClearFiles}
            disabled={isUploading}
          >
            清空列表
          </Button>
        </div>
      </div>

      {/* 总体进度 */}
      {isUploading && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">总体进度</span>
            <span className="text-sm text-gray-600">
              {overallProgress.toFixed(1)}% • {formatSpeed(uploadSpeed)} • 剩余 {formatTime(eta)}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      )}

      {/* 简化的文件列表预览 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {files.slice(0, 5).map((file) => (
          <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {file.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
            {file.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {file.status === 'uploading' && <Upload className="w-4 h-4 text-blue-500 animate-pulse" />}
            {file.status === 'pending' && <Upload className="w-4 h-4 text-gray-400" />}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{file.file.name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatFileSize(file.file.size)}</span>
                <Badge className={`text-xs ${getStrategyColor(file.strategy)}`}>
                  {getStrategyName(file.strategy)}
                </Badge>
                {file.status === 'uploading' && (
                  <span className={getProgressColor(file.status)}>{file.progress.toFixed(0)}%</span>
                )}
              </div>

              {/* 显示详细状态信息 */}
              {(file as any).statusText && (
                <p className={`text-xs mt-1 ${getStatusTextColor(file.status)}`}>
                  {(file as any).statusText}
                </p>
              )}

              {/* 通用进度条 */}
              {file.status === 'uploading' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(file.status)}`}
                      style={{ width: `${Math.min(file.progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{getProgressText(file.status)}</span>
                    <span>{file.progress.toFixed(0)}%</span>
                    {(file as any).eta && (file as any).eta > 0 && (
                      <span>预计剩余: {Math.ceil((file as any).eta / 60)}分钟</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveFile(file.id)}
              disabled={isUploading}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {files.length > 5 && (
          <div className="text-center text-sm text-gray-500 py-2">
            还有 {files.length - 5} 个文件...
            <Button
              variant="link"
              size="sm"
              onClick={onSwitchToProgress}
              className="text-blue-600 p-0 h-auto"
            >
              查看全部
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// 辅助函数
function getProgressColor(status: string): string {
  switch (status) {
    case 'transcoding':
      return 'text-orange-600 font-medium';
    case 'uploading':
      return 'text-blue-600';
    case 'processing':
      return 'text-purple-600';
    default:
      return 'text-blue-600';
  }
}

function getStatusTextColor(status: string): string {
  switch (status) {
    case 'transcoding':
      return 'text-orange-600';
    case 'uploading':
      return 'text-blue-600';
    case 'processing':
      return 'text-purple-600';
    case 'completed':
      return 'text-green-600';
    case 'failed':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}



function getProgressBarColor(status: string): string {
  switch (status) {
    case 'transcoding':
      return 'bg-orange-500';
    case 'uploading':
      return 'bg-blue-500';
    case 'processing':
      return 'bg-purple-500';
    default:
      return 'bg-blue-500';
  }
}

function getProgressText(status: string): string {
  switch (status) {
    case 'transcoding':
      return '转码中...';
    case 'uploading':
      return '上传中...';
    case 'processing':
      return '处理中...';
    default:
      return '进行中...';
  }
}
