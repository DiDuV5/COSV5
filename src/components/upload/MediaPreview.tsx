/**
 * @fileoverview 媒体预览组件
 * @description 显示已上传媒体文件的预览和管理功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js Image 组件
 * - Lucide React (图标)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Move,
  Eye,
  Download,
  Copy,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MediaSortModal } from './MediaSortModal';
import { MediaProxy } from '@/components/media/MediaProxy';

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  cdnUrl?: string | null;
  thumbnailUrl?: string;
  // 多尺寸URL字段（与数据库模型一致）
  smallUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GIF';
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize: number;
  isDuplicate?: boolean;
  order?: number;
  // 处理状态相关字段
  isProcessed?: boolean;
  processingStatus?: string;
  createdAt?: Date;
  // 缩略图数组（从上传API返回）
  thumbnails?: Array<{
    url: string;
    cdnUrl?: string;
    width: number;
    height: number;
    size: string;
  }>;
  // 处理后的图片数组（从上传API返回）
  processedImages?: Array<{
    url: string;
    width: number;
    height: number;
    size: string;
    format: string;
  }>;
}

interface MediaPreviewProps {
  files: MediaFile[];
  onDelete?: (fileId: string) => void;
  onReorder?: (files: MediaFile[]) => void;
  onPreview?: (file: MediaFile) => void;
  editable?: boolean;
  maxHeight?: number;
  className?: string;
}

export function MediaPreview({
  files,
  onDelete,
  onReorder,
  onPreview,
  editable = true,
  maxHeight = 400,
  className = '',
}: MediaPreviewProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showSortModal, setShowSortModal] = useState(false);

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

  // 从URL中提取路径，用于MediaProxy组件
  const getMediaPath = (url: string) => {
    if (!url) return '';

    // 检查是否为外部URL（如Unsplash、其他CDN等）
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // 如果是外部域名（非本地或R2存储），直接返回完整URL
      const isExternalDomain = !hostname.includes('localhost') &&
                              !hostname.includes('127.0.0.1') &&
                              !hostname.includes('r2.dev') &&
                              !hostname.includes('cloudflarestorage.com') &&
                              !hostname.includes('cosv5.com') &&
                              !hostname.includes('tutu365.cc');

      if (isExternalDomain) {
        // 外部URL直接返回，不进行路径提取
        return url;
      }

      // 对于本地或R2存储URL，提取路径部分
      let pathname = urlObj.pathname;

      // 如果是R2存储URL，去掉bucket名称前缀
      if (pathname.startsWith('/didu/')) {
        pathname = pathname.substring(6); // 去掉 '/didu/'
      }

      // 如果是本地API路径，去掉 '/api/files/' 前缀，只保留存储key
      if (pathname.startsWith('/api/files/')) {
        pathname = pathname.substring(11); // 去掉 '/api/files/'
      }

      return pathname;
    } catch {
      // 如果不是完整URL，假设它已经是路径
      let path = url.startsWith('/') ? url : `/${url}`;

      // 同样处理相对路径中的 '/api/files/' 前缀
      if (path.startsWith('/api/files/')) {
        path = path.substring(11);
      }

      return path;
    }
  };

  // 获取媒体的完整URL（用于复制和下载）
  const getMediaUrl = (url: string) => {
    if (!url) return '';

    // 如果已经是完整URL，直接返回
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // 构建完整URL
    const baseUrl = process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}/api/media/proxy?path=${encodeURIComponent(path)}`;
  };

  // 拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (!editable) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  }, [editable]);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // 拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (!editable || draggedIndex === null) return;
    e.preventDefault();

    if (draggedIndex !== index) {
      const newFiles = [...files];
      const draggedFile = newFiles[draggedIndex];
      newFiles.splice(draggedIndex, 1);
      newFiles.splice(index, 0, draggedFile);

      // 更新 order 字段
      const reorderedFiles = newFiles.map((file, idx) => ({
        ...file,
        order: idx,
      }));

      onReorder?.(reorderedFiles);
      setDraggedIndex(index);
    }
  }, [editable, draggedIndex, files, onReorder]);

  // 复制链接
  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // 这里可以添加成功提示
    } catch (error) {
      console.error('复制链接失败:', error);
    }
  }, []);

  // 下载文件
  const downloadFile = useCallback((file: MediaFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  if (files.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        还没有上传任何文件
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          媒体文件 ({files.length})
        </h3>
        {editable && files.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSortModal(true)}
              className="flex items-center gap-2"
            >
              <ArrowUpDown className="w-4 h-4" />
              拖拽调整顺序
            </Button>
          </div>
        )}
      </div>

      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {files.map((file, index) => (
          <div
            key={file.id}
            className={`
              relative group bg-white border border-gray-200 rounded-lg overflow-hidden
              ${editable ? 'cursor-move' : ''}
              ${draggedIndex === index ? 'opacity-50' : ''}
              hover:shadow-md transition-shadow
            `}
            draggable={editable}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
          >
            {/* 媒体预览 */}
            <div className="aspect-square relative bg-gray-100">
              {file.mediaType === 'VIDEO' ? (
                <div className="relative w-full h-full">
                  <MediaProxy
                    path={getMediaPath(file.thumbnailUrl || file.url)}
                    alt={file.originalName}
                    fill
                    className="object-cover"
                  />
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
                (() => {
                  // 对于图片，优先使用small尺寸的缩略图（适合预览网格）
                  const smallThumbnail = file.thumbnails?.find(t => t.size === 'small');
                  const imageUrl = smallThumbnail?.url || file.thumbnailUrl || file.url;
                  return (
                    <MediaProxy
                      path={getMediaPath(imageUrl)}
                      alt={file.originalName}
                      fill
                      className="object-cover"
                    />
                  );
                })()
              )}

              {/* 文件类型标识 */}
              <div className="absolute top-2 left-2">
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    file.mediaType === 'VIDEO' ? 'bg-purple-100 text-purple-800' :
                    file.mediaType === 'GIF' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}
                >
                  {file.mediaType}
                </Badge>
              </div>

              {/* 重复文件标识 */}
              {file.isDuplicate && (
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                    重复
                  </Badge>
                </div>
              )}

              {/* 悬停操作 */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview?.(file)}
                  className="text-white hover:bg-white/20"
                >
                  <Eye className="w-4 h-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => copyUrl(getMediaUrl(file.url))}>
                      <Copy className="w-4 h-4 mr-2" />
                      复制链接
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadFile({...file, url: getMediaUrl(file.url)})}>
                      <Download className="w-4 h-4 mr-2" />
                      下载文件
                    </DropdownMenuItem>
                    {editable && onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(file.id)}
                        className="text-red-600"
                      >
                        <X className="w-4 h-4 mr-2" />
                        删除文件
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* 拖拽指示器 */}
              {editable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Move className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* 文件信息 */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.originalName}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.fileSize)}
                </p>
                {file.width && file.height && (
                  <p className="text-xs text-gray-500">
                    {file.width}×{file.height}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 媒体排序模态框 */}
      <MediaSortModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        files={files}
        onReorder={onReorder || (() => {})}
      />
    </div>
  );
}
