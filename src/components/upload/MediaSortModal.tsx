/**
 * @fileoverview 媒体文件排序模态框组件
 * @description 提供更大的界面用于拖拽调整媒体文件顺序
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - Lucide React
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GripVertical,
  Play,
  X,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import { MediaFile } from './MediaPreview';
import { useBestMediaUrl, useVideoThumbnailUrl } from '@/lib/media/cdn-url-fixer';

interface MediaSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: MediaFile[];
  onReorder: (files: MediaFile[]) => void;
  onSave?: () => void;
}

// 媒体项组件，使用URL转换hook
function MediaItemPreview({ file }: { file: MediaFile }) {
  // 使用URL转换函数获取正确的URL
  const displayUrl = useBestMediaUrl({
    url: file.url,
    cdnUrl: file.cdnUrl,
    thumbnailUrl: file.thumbnailUrl,
    mediaType: file.mediaType
  });

  // 对于视频，使用专门的缩略图URL
  const thumbnailUrl = useVideoThumbnailUrl({
    url: file.url,
    cdnUrl: file.cdnUrl,
    thumbnailUrl: file.thumbnailUrl,
    mediaType: file.mediaType
  });

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化视频时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 媒体预览 */}
      <div className="aspect-square relative bg-gray-100">
        {file.mediaType === 'VIDEO' ? (
          <div className="relative w-full h-full">
            {/* 使用缩略图作为视频预览 */}
            {thumbnailUrl ? (
              // eslint-disable-next-line no-restricted-syntax
              <img
                src={thumbnailUrl}
                alt={file.originalName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('❌ 视频缩略图加载失败:', thumbnailUrl, e);
                  // 如果缩略图失败，尝试使用视频文件本身
                  (e.target as HTMLImageElement).src = displayUrl;
                }}
              />
            ) : (
              <video
                src={displayUrl}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
                onError={(e) => {
                  console.error('❌ 视频加载失败:', displayUrl, e);
                }}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className="w-8 h-8 text-white" />
            </div>
            {file.duration && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {formatDuration(file.duration)}
              </div>
            )}
          </div>
        ) : (
          <Image
            src={thumbnailUrl}
            alt={file.originalName || '媒体文件'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            onError={(e) => {
              console.error('❌ 图片加载失败:', thumbnailUrl, e);
            }}
          />
        )}
      </div>

      {/* 文件信息 */}
      <div className="p-3 bg-white">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.originalName}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            {formatFileSize(file.fileSize)}
          </span>
          <Badge variant="outline" className="text-xs">
            {file.mediaType}
          </Badge>
        </div>
      </div>
    </>
  );
}

export function MediaSortModal({
  isOpen,
  onClose,
  files,
  onReorder,
  onSave,
}: MediaSortModalProps) {
  const [localFiles, setLocalFiles] = useState<MediaFile[]>(files);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 重置为原始顺序
  const resetOrder = useCallback(() => {
    setLocalFiles([...files]);
    setHasChanges(false);
  }, [files]);

  // 移除了getFullUrl函数和重复的格式化函数，现在使用useBestMediaUrl hook

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...localFiles];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    // 更新 order 字段
    const reorderedFiles = newFiles.map((file, idx) => ({
      ...file,
      order: idx,
    }));

    setLocalFiles(reorderedFiles);
    setDraggedIndex(index);
    setHasChanges(true);
  }, [draggedIndex, localFiles]);

  // 保存更改
  const handleSave = useCallback(() => {
    onReorder(localFiles);
    setHasChanges(false);
    onSave?.();
    onClose();
  }, [localFiles, onReorder, onSave, onClose]);

  // 取消更改
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      resetOrder();
    }
    onClose();
  }, [hasChanges, resetOrder, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GripVertical className="w-5 h-5" />
            调整媒体文件顺序
          </DialogTitle>
          <DialogDescription>
            拖拽媒体文件来调整它们在作品中的显示顺序。第一个文件将作为封面图片。
          </DialogDescription>
        </DialogHeader>

        {/* 提示信息 */}
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            拖拽文件重新排序，第一个文件将作为作品封面。支持图片和视频混合排列。
          </p>
        </div>

        {/* 媒体文件网格 */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {localFiles.map((file, index) => (
              <div
                key={file.id}
                className={`
                  relative group bg-white border-2 rounded-lg overflow-hidden cursor-move
                  transition-all duration-200
                  ${draggedIndex === index
                    ? 'opacity-50 border-blue-500 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }
                `}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
              >
                {/* 顺序标识 */}
                <div className="absolute top-2 left-2 z-10">
                  <Badge
                    variant={index === 0 ? "default" : "secondary"}
                    className={`text-xs font-bold ${
                      index === 0 ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    {index === 0 ? '封面' : index + 1}
                  </Badge>
                </div>

                {/* 拖拽手柄 */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded p-1">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* 媒体预览和文件信息 */}
                <MediaItemPreview file={file} />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetOrder}
              disabled={!hasChanges}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重置顺序
            </Button>
            <span className="text-sm text-gray-500">
              共 {localFiles.length} 个文件
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              保存顺序
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
