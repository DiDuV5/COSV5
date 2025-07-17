/**
 * @fileoverview 上传进度显示组件
 * @description 显示详细的文件上传进度，包括单个文件进度和总体进度，集成统一错误处理
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.1.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - lucide-react: 图标库
 * - @/components/ui: UI 组件
 * - @/lib/errors/recovery-manager: 错误恢复管理
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 集成统一错误处理和恢复机制 (v1.1.0)
 */

'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Upload,
  Loader2,
  Image,
  Video,
  FileText,
  Clock,
  RefreshCw,
  ChevronDown,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileUploadProgress, UploadError } from '@/hooks/use-upload';

interface UploadProgressProps {
  fileProgresses: FileUploadProgress[];
  totalProgress: number;
  isUploading: boolean;
  uploadErrors?: UploadError[];
  onCancel?: () => void;
  onRetry?: (filename: string) => void;
  className?: string;
}

export function UploadProgress({
  fileProgresses,
  totalProgress,
  isUploading,
  uploadErrors = [],
  onCancel,
  onRetry,
  className = '',
}: UploadProgressProps) {
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  // 计算统计信息
  const stats = useMemo(() => {
    const total = fileProgresses.length;
    const completed = fileProgresses.filter(fp => fp.status === 'completed').length;
    const failed = fileProgresses.filter(fp => fp.status === 'error').length;
    const uploading = fileProgresses.filter(fp => fp.status === 'uploading').length;
    const pending = fileProgresses.filter(fp => fp.status === 'pending').length;

    return { total, completed, failed, uploading, pending };
  }, [fileProgresses]);

  // 获取文件图标
  const getFileIcon = (filename: string, status: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
    const isVideo = /\.(mp4|webm|avi|mov)$/i.test(filename);
    
    const iconClass = "w-4 h-4";
    
    if (status === 'completed') {
      return <CheckCircle className={`${iconClass} text-green-500`} />;
    }
    if (status === 'error') {
      return <XCircle className={`${iconClass} text-red-500`} />;
    }
    if (status === 'uploading') {
      return <Loader2 className={`${iconClass} text-blue-500 animate-spin`} />;
    }
    if (status === 'pending') {
      return <Clock className={`${iconClass} text-gray-400`} />;
    }
    
    if (isImage) {
      return <Image className={`${iconClass} text-blue-500`} />;
    }
    if (isVideo) {
      return <Video className={`${iconClass} text-purple-500`} />;
    }
    return <FileText className={`${iconClass} text-gray-500`} />;
  };

  // 获取状态文本
  const getStatusText = (status: string, progress: number) => {
    switch (status) {
      case 'pending':
        return '等待中';
      case 'uploading':
        return `上传中 ${(progress || 0).toFixed(0)}%`;
      case 'completed':
        return '已完成';
      case 'error':
        return '失败';
      default:
        return '未知';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'uploading':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (fileProgresses.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 总体进度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-900">
              总体进度
            </span>
            <span className="text-xs text-gray-500">
              ({stats.completed}/{stats.total} 完成)
            </span>
          </div>
          {isUploading && onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-red-600 hover:text-red-700 h-7 px-2 text-xs"
            >
              取消
            </Button>
          )}
        </div>
        
        <Progress value={totalProgress} className="w-full h-2" />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>{(totalProgress || 0).toFixed(1)}% 完成</span>
          <div className="flex gap-4">
            {stats.uploading > 0 && (
              <span className="text-blue-600">
                {stats.uploading} 上传中
              </span>
            )}
            {stats.pending > 0 && (
              <span className="text-gray-500">
                {stats.pending} 等待中
              </span>
            )}
            {stats.failed > 0 && (
              <span className="text-red-600">
                {stats.failed} 失败
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 错误汇总 */}
      {stats.failed > 0 && uploadErrors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <span>
                {stats.failed} 个文件上传失败
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                {showErrorDetails ? '隐藏' : '查看'} 详情
                <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showErrorDetails ? 'rotate-180' : ''}`} />
              </Button>
            </div>

            {showErrorDetails && (
              <div className="mt-3 space-y-2">
                {uploadErrors.map((error, index) => (
                  <div key={index} className="text-xs bg-white p-2 rounded border border-red-200">
                    <p className="font-medium">{error.filename}</p>
                    <p className="text-red-600 mt-1">
                      {error.userMessage || error.error}
                    </p>
                    {error.recoveryActions && error.recoveryActions.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-gray-700">建议解决方案：</p>
                        <ul className="list-disc list-inside text-gray-600 mt-1">
                          {error.recoveryActions.map((action, idx) => (
                            <li key={idx}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 文件列表 */}
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-gray-700">文件详情</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {fileProgresses.map((fileProgress, index) => (
            <div
              key={`${fileProgress.filename}-${index}`}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
            >
              {/* 文件图标 */}
              <div className="flex-shrink-0">
                {getFileIcon(fileProgress.filename, fileProgress.status)}
              </div>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileProgress.filename}
                  </p>
                  <span className={`text-xs font-medium ${getStatusColor(fileProgress.status)}`}>
                    {getStatusText(fileProgress.status, fileProgress.progress)}
                  </span>
                </div>

                {/* 单个文件进度条 */}
                {(fileProgress.status === 'uploading' || fileProgress.status === 'completed') && (
                  <Progress 
                    value={fileProgress.progress} 
                    className="w-full h-1" 
                  />
                )}

                {/* 错误信息和恢复建议 */}
                {fileProgress.status === 'error' && fileProgress.error && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-red-600">
                      {fileProgress.error}
                    </p>

                    {/* 查找对应的错误详情 */}
                    {(() => {
                      const errorDetail = uploadErrors.find(err => err.filename === fileProgress.filename);
                      if (!errorDetail) return null;

                      return (
                        <div className="space-y-2">
                          {/* 用户友好消息 */}
                          {errorDetail.userMessage && errorDetail.userMessage !== errorDetail.error && (
                            <p className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                              💡 {errorDetail.userMessage}
                            </p>
                          )}

                          {/* 恢复建议 */}
                          {errorDetail.recoveryActions && errorDetail.recoveryActions.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                                >
                                  <Info className="w-3 h-3 mr-1" />
                                  查看解决方案
                                  <ChevronDown className="w-3 h-3 ml-1" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-1">
                                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded space-y-1">
                                  <p className="font-medium">建议解决方案：</p>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {errorDetail.recoveryActions.map((action, idx) => (
                                      <li key={idx}>{action}</li>
                                    ))}
                                  </ul>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {/* 重试按钮 */}
                          {errorDetail.retryable && onRetry && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRetry(fileProgress.filename)}
                              className="h-6 px-2 text-xs text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              重试上传
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
