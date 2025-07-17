/**
 * @fileoverview 拖拽区域组件
 * @description 文件拖拽上传区域组件，从原 OptimizedBulkUploader.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileImage, FileVideo, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DropZoneProps {
  onFilesAdded: (files: File[]) => void;
  allowedTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number;
  currentFileCount?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * 拖拽区域组件
 * 负责处理文件的拖拽上传和文件选择
 */
const DropZoneComponent: React.FC<DropZoneProps> = ({
  onFilesAdded,
  allowedTypes = ['image/*', 'video/*'],
  maxFiles = 500,
  maxFileSize = 1000 * 1024 * 1024, // 1000MB (1GB)
  currentFileCount = 0,
  disabled = false,
  className,
  children,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 验证文件类型
   */
  const isValidFileType = useCallback((file: File): boolean => {
    return allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });
  }, [allowedTypes]);

  /**
   * 处理文件选择
   */
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesAdded(selectedFiles);
    }

    // 清空input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesAdded]);

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setDragCounter(prev => prev + 1);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, [disabled]);

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    // 设置拖拽效果
    e.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, [disabled]);

  /**
   * 处理文件拖拽放置
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    setIsDragOver(false);
    setDragCounter(0);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFilesAdded(droppedFiles);
    }
  }, [disabled, onFilesAdded]);

  /**
   * 打开文件选择器
   */
  const openFileSelector = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

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
   * 获取支持的文件类型描述
   */
  const getSupportedTypesDescription = (): string => {
    const hasImages = allowedTypes.some(type => type.startsWith('image'));
    const hasVideos = allowedTypes.some(type => type.startsWith('video'));

    if (hasImages && hasVideos) {
      return '支持图片和视频文件';
    } else if (hasImages) {
      return '支持图片文件';
    } else if (hasVideos) {
      return '支持视频文件';
    } else {
      return '支持的文件类型';
    }
  };

  const remainingFiles = maxFiles - currentFileCount;
  const canAddFiles = remainingFiles > 0 && !disabled;

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg transition-all duration-200',
        isDragOver && canAddFiles
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFileSelector}
    >
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* 拖拽区域内容 */}
      <div className="p-8 text-center">
        {children ? (
          children
        ) : (
          <>
            {/* 图标 */}
            <div className="mb-4">
              {isDragOver ? (
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* 主要文本 */}
            <div className="mb-2">
              <h3 className="text-lg font-medium">
                {isDragOver
                  ? '释放文件开始上传'
                  : canAddFiles
                  ? '拖拽文件到此处或点击选择'
                  : '已达到文件数量限制'
                }
              </h3>
            </div>

            {/* 描述文本 */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{getSupportedTypesDescription()}</p>
              <p>单个文件最大 {formatFileSize(maxFileSize)}</p>
              {canAddFiles ? (
                <p>还可以添加 {remainingFiles} 个文件</p>
              ) : (
                <p>已添加 {currentFileCount}/{maxFiles} 个文件</p>
              )}
            </div>

            {/* 操作按钮 */}
            {canAddFiles && (
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFileSelector();
                  }}
                  disabled={disabled}
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
              </div>
            )}

            {/* 支持的格式图标 */}
            <div className="mt-6 flex justify-center space-x-4">
              {allowedTypes.some(type => type.startsWith('image')) && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <FileImage className="w-4 h-4" />
                  <span>图片</span>
                </div>
              )}
              {allowedTypes.some(type => type.startsWith('video')) && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <FileVideo className="w-4 h-4" />
                  <span>视频</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 拖拽覆盖层 */}
      {isDragOver && canAddFiles && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Plus className="w-12 h-12 mx-auto text-primary mb-2" />
            <p className="text-lg font-medium text-primary">释放文件开始上传</p>
          </div>
        </div>
      )}
    </div>
  );
};

DropZoneComponent.displayName = 'DropZone';

export const DropZone = React.memo(DropZoneComponent);

/**
 * 导出拖拽区域组件
 */
export default DropZone;
