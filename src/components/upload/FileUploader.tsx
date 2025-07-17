/**
 * @fileoverview 文件上传组件
 * @description 支持拖拽、批量上传、进度显示的文件上传组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Lucide React (图标)
 * - @/hooks/useUpload (自定义上传钩子)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image, Video, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUpload } from '@/hooks/use-upload';
import { UploadProgress } from './UploadProgress';

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GIF';
  width?: number;
  height?: number;
  duration?: number;
  fileSize: number;
  isDuplicate?: boolean;
}

// 优化的文件列表组件 - 支持大量文件显示
function FileListOptimized({
  files,
  onRemoveFile,
  isUploading,
  getFileIcon,
  formatFileSize
}: {
  files: File[];
  onRemoveFile: (index: number) => void;
  isUploading: boolean;
  getFileIcon: (file: File) => React.ReactNode;
  formatFileSize: (size: number) => string;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 20; // 每页显示20个文件
  const totalPages = Math.ceil(files.length / itemsPerPage);

  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, files.length);
  const currentFiles = files.slice(startIndex, endIndex);

  return (
    <div className="space-y-3">
      {/* 分页信息 */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          显示 {startIndex + 1}-{endIndex} 项，共 {files.length} 个文件
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            上一页
          </Button>
          <span className="px-2">
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
          >
            下一页
          </Button>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {currentFiles.map((file, pageIndex) => {
          const actualIndex = startIndex + pageIndex;
          return (
            <div
              key={`${file.name}-${actualIndex}`}
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
                  onClick={() => onRemoveFile(actualIndex)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* 批量操作 */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // 清除当前页的所有文件
            for (let i = endIndex - 1; i >= startIndex; i--) {
              onRemoveFile(i);
            }
            // 调整页码
            if (currentPage > 0 && startIndex >= files.length - itemsPerPage) {
              setCurrentPage(currentPage - 1);
            }
          }}
          disabled={isUploading}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          清除当前页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // 清除所有文件
            for (let i = files.length - 1; i >= 0; i--) {
              onRemoveFile(i);
            }
            setCurrentPage(0);
          }}
          disabled={isUploading}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          清除全部
        </Button>
      </div>
    </div>
  );
}

interface FileUploaderProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (errors: Array<{ filename: string; error: string }>) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  postId?: string;
  className?: string;
}

export function FileUploader({
  onUploadComplete,
  onUploadError,
  maxFiles,
  maxFileSize,
  allowedTypes,
  postId,
  className = '',
}: FileUploaderProps) {
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
    resetUpload,
  } = useUpload();

  // 获取上传限制配置
  const uploadLimits = getUploadLimits();

  // 使用传入的参数或后端配置的默认值
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

  // 处理文件选择
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    // 计算可以添加的文件数量
    const remainingSlots = effectiveMaxFiles - selectedFiles.length;

    if (remainingSlots <= 0) {
      errors.push({
        filename: '',
        error: `已达到最大文件数量限制 (${effectiveMaxFiles} 个)`,
      });
      onUploadError?.(errors);
      return;
    }

    // 如果选择的文件数量超过剩余槽位，只处理前面的文件
    const filesToProcess = fileArray.slice(0, remainingSlots);
    const skippedFiles = fileArray.slice(remainingSlots);

    // 如果有文件被跳过，添加警告
    if (skippedFiles.length > 0) {
      errors.push({
        filename: '',
        error: `已跳过 ${skippedFiles.length} 个文件，最多只能选择 ${effectiveMaxFiles} 个文件`,
      });
    }

    // 验证每个文件
    filesToProcess.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push({ filename: file.name, error });
      } else {
        validFiles.push(file);
      }
    });

    // 显示错误信息（如果有）
    if (errors.length > 0) {
      onUploadError?.(errors);
    }

    // 添加有效文件
    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [selectedFiles.length, effectiveMaxFiles, validateFile, onUploadError]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

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
      }
    } catch (error) {
      console.error('上传失败:', error);
    }
  }, [selectedFiles, uploadFiles, postId, onUploadComplete]);

  // 获取文件图标
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    if (file.type.startsWith('video/')) {
      return <Video className="w-8 h-8 text-purple-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
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
        <p className="text-sm text-gray-500 mb-4">
          支持图片和视频文件，最大 {Math.round(effectiveMaxFileSize / 1024 / 1024)}MB
        </p>
        <p className="text-xs text-gray-400">
          支持格式: {effectiveAllowedTypes.map((type: string) => type.split('/')[1]).join(', ')}
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              已选择 {selectedFiles.length} 个文件
            </h4>
            {selectedFiles.length > 50 && (
              <p className="text-xs text-blue-600">
                大量文件已优化显示
              </p>
            )}
          </div>

          {/* 优化大量文件的显示 - 超过100个文件时使用分页 */}
          {selectedFiles.length > 100 ? (
            <FileListOptimized
              files={selectedFiles}
              onRemoveFile={removeFile}
              isUploading={isUploading}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
            />
          ) : (
            // 少量文件时使用普通滚动
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
          )}
        </div>
      )}

      {/* 上传进度 */}
      {(isUploading || fileProgresses.length > 0) && (
        <UploadProgress
          fileProgresses={fileProgresses}
          totalProgress={uploadProgress}
          isUploading={isUploading}
          onCancel={cancelUpload}
        />
      )}

      {/* 上传结果 */}
      {uploadResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-green-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            上传成功 ({uploadResults.length} 个文件)
          </h4>
        </div>
      )}

      {/* 上传错误 */}
      {uploadErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            上传问题 ({uploadErrors.length} 个)
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {uploadErrors.map((error, index) => (
              <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-400">
                {error.filename ? (
                  <span className="font-medium">{error.filename}:</span>
                ) : null}
                <span className={error.filename ? "ml-1" : ""}>{error.error}</span>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => resetUpload()}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            清除错误信息
          </Button>
        </div>
      )}

      {/* 操作按钮 */}
      {selectedFiles.length > 0 && !isUploading && (
        <div className="flex gap-2">
          <Button
            onClick={startUpload}
            disabled={selectedFiles.length === 0}
            className="flex-1"
          >
            上传 {selectedFiles.length} 个文件
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedFiles([])}
          >
            清空
          </Button>
        </div>
      )}
    </div>
  );
}
