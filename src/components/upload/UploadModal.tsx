/**
 * @fileoverview 文件上传模态窗口组件
 * @description 提供模态窗口形式的文件上传功能，支持拖拽和批量上传
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - shadcn/ui Dialog
 * - FileUploader 组件
 * - Lucide React
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Video, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpload } from '@/hooks/use-upload';
import { UploadProgress } from './UploadProgress';
import { UploadedFile } from './FileUploader';

interface UploadModalProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (errors: Array<{ filename: string; error: string }>) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  postId?: string;
  trigger?: React.ReactNode;
  className?: string;
}

export function UploadModal({
  onUploadComplete,
  onUploadError,
  maxFiles,
  maxFileSize,
  allowedTypes,
  postId,
  trigger,
  className = '',
}: UploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadFiles,
    uploadProgress,
    isUploading,
    uploadResults,
    uploadErrors,
    fileProgresses,
    cancelUpload,
    getUploadLimits,
  } = useUpload();

  // 获取上传限制配置
  const uploadLimits = getUploadLimits();
  const effectiveMaxFiles = maxFiles ?? uploadLimits.maxFilesPerPost;
  const effectiveMaxFileSize = maxFileSize ?? uploadLimits.maxFileSize;
  const effectiveAllowedTypes = allowedTypes ?? uploadLimits.allowedTypes;

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > effectiveMaxFileSize) {
      return `文件大小不能超过 ${Math.round(effectiveMaxFileSize / 1024 / 1024)}MB`;
    }

    if (!effectiveAllowedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type}`;
    }

    return null;
  }, [effectiveMaxFileSize, effectiveAllowedTypes]);

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 处理拖拽事件
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelect(files);
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((files: File[] | FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    // 检查文件数量限制
    if (selectedFiles.length + fileArray.length > effectiveMaxFiles) {
      errors.push({
        filename: '',
        error: `最多只能上传 ${effectiveMaxFiles} 个文件`
      });
      onUploadError?.(errors);
      return;
    }

    // 验证每个文件
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push({ filename: file.name, error });
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      onUploadError?.(errors);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [selectedFiles.length, effectiveMaxFiles, validateFile, onUploadError]);

  // 移除文件
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 开始上传
  const startUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    try {
      const results = await uploadFiles(selectedFiles, postId);
      
      if (results.length > 0) {
        onUploadComplete?.(results);
        setSelectedFiles([]); // 清空已选择的文件
        setIsOpen(false); // 关闭模态窗口
      }
    } catch (error) {
      console.error('上传失败:', error);
    }
  }, [selectedFiles, uploadFiles, postId, onUploadComplete]);

  // 获取文件图标
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-6 h-6 text-blue-500" />;
    }
    if (file.type.startsWith('video/')) {
      return <Video className="w-6 h-6 text-purple-500" />;
    }
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  // 默认触发按钮
  const defaultTrigger = (
    <Button variant="outline" className={className}>
      <Upload className="w-4 h-4 mr-2" />
      上传媒体
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            上传媒体文件
          </DialogTitle>
          <DialogDescription>
            支持图片和视频文件，最大 {Math.round(effectiveMaxFileSize / 1024 / 1024)}MB，
            最多 {effectiveMaxFiles} 个文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 拖拽上传区域 */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              拖拽文件到这里，或点击选择文件
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              支持格式: {effectiveAllowedTypes.map((type: string) => type.split('/')[1]).join(', ')}
            </p>
            <p className="text-xs text-gray-400">
              单个文件最大 {Math.round(effectiveMaxFileSize / 1024 / 1024)}MB
            </p>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={effectiveAllowedTypes.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          {/* 已选择的文件列表 */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                已选择 {selectedFiles.length} 个文件
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 上传进度 */}
          {isUploading && (
            <div className="space-y-2">
              <UploadProgress
                totalProgress={uploadProgress || 0}
                fileProgresses={fileProgresses || []}
                isUploading={isUploading}
                onCancel={cancelUpload}
              />
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isUploading}
            >
              取消
            </Button>
            
            <Button
              onClick={startUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="min-w-[100px]"
            >
              {isUploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  上传中...
                </div>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  上传 ({selectedFiles.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
