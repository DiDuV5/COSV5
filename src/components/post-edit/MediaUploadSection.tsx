/**
 * @fileoverview 媒体上传组件
 * @description 处理帖子编辑中的媒体文件上传和管理，从原 posts/[id]/edit/page.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fixMediaUrl } from '@/lib/media/cdn-url-fixer';

export interface MediaItem {
  id: string;
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  filename: string;
}

export interface MediaUploadSectionProps {
  existingMedia: MediaItem[];
  uploadedFiles: File[];
  isUploading: boolean;
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemoveExistingMedia?: (mediaId: string) => void;
}

/**
 * 媒体上传组件
 * 负责处理文件上传和媒体展示
 */
export function MediaUploadSection({
  existingMedia,
  uploadedFiles,
  isUploading,
  onFileSelect,
  onRemoveFile,
  onRemoveExistingMedia,
}: MediaUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件选择
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files);
    }
  };

  /**
   * 触发文件选择
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * 渲染媒体项目
   */
  const renderMediaItem = (media: MediaItem, onRemove: () => void) => (
    <div key={media.id} className="relative group">
      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
        {media.mediaType === 'IMAGE' ? (
          <Image
            src={fixMediaUrl(media.url)}
            alt={media.filename}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Video className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2">
        <Badge variant="secondary" className="text-xs">
          {media.mediaType === 'IMAGE' ? (
            <ImageIcon className="w-3 h-3 mr-1" />
          ) : (
            <Video className="w-3 h-3 mr-1" />
          )}
          {media.mediaType}
        </Badge>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );

  /**
   * 渲染上传的文件
   */
  const renderUploadedFile = (file: File, index: number) => (
    <div key={index} className="relative group">
      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
        {file.type.startsWith('image/') ? (
          <Image
            src={URL.createObjectURL(file)}
            alt={file.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Video className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2">
        <Badge variant="secondary" className="text-xs">
          {file.type.startsWith('image/') ? (
            <ImageIcon className="w-3 h-3 mr-1" />
          ) : (
            <Video className="w-3 h-3 mr-1" />
          )}
          {file.type.startsWith('image/') ? 'IMAGE' : 'VIDEO'}
        </Badge>
      </div>
      <button
        type="button"
        onClick={() => onRemoveFile(index)}
        className="absolute top-2 left-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>媒体文件</CardTitle>
        <CardDescription>
          上传图片或视频文件来丰富您的内容
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 现有媒体文件 */}
        {existingMedia.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">现有媒体文件</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {existingMedia.map((media) =>
                renderMediaItem(media, () => onRemoveExistingMedia?.(media.id))
              )}
            </div>
          </div>
        )}

        {/* 新上传的文件 */}
        {uploadedFiles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">新上传的文件</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedFiles.map((file, index) => renderUploadedFile(file, index))}
            </div>
          </div>
        )}

        {/* 上传区域 */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            点击上传图片或视频文件
          </p>
          <Button type="button" onClick={handleUploadClick} disabled={isUploading}>
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? '上传中...' : '选择文件'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* 上传提示 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 支持的图片格式：JPG, PNG, GIF, WebP</p>
          <p>• 支持的视频格式：MP4, WebM, MOV</p>
          <p>• 单个文件最大 100MB</p>
          <p>• 最多可上传 20 个文件</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 媒体上传组件的默认导出
 */
export default MediaUploadSection;
