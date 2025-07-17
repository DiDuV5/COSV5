/**
 * @fileoverview 拖拽上传区域组件
 * @description 处理文件拖拽和选择的组件
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React, { useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AdvancedUploadConfig } from '../types';
import { formatFileSize } from '../utils';

interface UploadDropZoneProps {
  config: AdvancedUploadConfig;
  isDragOver: boolean;
  isUploading: boolean;
  onDragOver: (_e: React.DragEvent) => void;
  onDragLeave: (_e: React.DragEvent) => void;
  onDrop: (_e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}

export function UploadDropZone({
  config,
  isDragOver,
  isUploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: UploadDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  }, [onFileSelect]);

  return (
    <>
      {/* 拖拽上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={handleClick}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          拖拽文件到这里，或点击选择文件
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          支持批量上传，最大 {formatFileSize(config.maxFileSize)} 单文件
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
          <Badge variant="outline">智能策略选择</Badge>
          <Badge variant="outline">断点续传</Badge>
          <Badge variant="outline">并发控制</Badge>
          <Badge variant="outline">流式处理</Badge>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={config.allowedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </>
  );
}
