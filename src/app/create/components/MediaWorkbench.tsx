/**
 * @fileoverview 媒体工作台组件
 * @description 专业级媒体管理系统，支持批量处理500+文件
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaFile, MediaPreview } from '@/components/upload/MediaPreview';
import {
  Camera,
  FileImage,
  Grid3X3,
  ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  Upload,
  Video,
  Zap
} from 'lucide-react';

interface MediaWorkbenchProps {
  uploadedFiles: MediaFile[];
  showMediaPreview: boolean;
  onShowUploadModal: () => void;
  onToggleMediaPreview: () => void;
  onFileDelete: (fileId: string) => void;
  onFileReorder: (files: MediaFile[]) => void;
  onRefreshMediaInfo?: (mediaId: string) => Promise<void>;
  onRefreshAllMediaInfo?: () => Promise<void>;
}

export function MediaWorkbench({
  uploadedFiles,
  showMediaPreview,
  onShowUploadModal,
  onToggleMediaPreview,
  onFileDelete,
  onFileReorder,
  onRefreshMediaInfo,
  onRefreshAllMediaInfo,
}: MediaWorkbenchProps) {
  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">专业媒体工作台</CardTitle>
              <CardDescription className="text-sm">
                为专业创作者设计的媒体管理系统，支持批量处理500+文件
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-sm">
              <Badge variant="outline" className="text-xs">
                图片: {uploadedFiles.filter(f => f.mediaType === 'IMAGE').length}
              </Badge>
              <Badge variant="outline" className="text-xs">
                视频: {uploadedFiles.filter(f => f.mediaType === 'VIDEO').length}
              </Badge>
              <Badge variant="secondary" className="text-xs font-medium">
                总计: {uploadedFiles.length}/1000
              </Badge>
            </div>
            <Button
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              onClick={onShowUploadModal}
            >
              <Upload className="w-4 h-4 mr-2" />
              批量上传
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {uploadedFiles.length === 0 ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100/50 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-200 cursor-pointer"
            onClick={onShowUploadModal}
          >
            <div className="flex flex-col items-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <FileImage className="w-10 h-10 text-blue-600" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">专业创作工作台</h3>
                <p className="text-gray-600 max-w-md">
                  支持拖拽上传，智能批量处理，专为cosplay创作者优化的媒体管理系统
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-base font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowUploadModal();
                  }}
                >
                  <Upload className="w-5 h-5 mr-3" />
                  开始批量上传
                </Button>
                <p className="text-sm text-gray-500">支持拖拽文件到此区域 • 最大1000MB单文件 • 智能压缩优化</p>
              </div>

              <div className="grid grid-cols-3 gap-6 text-sm text-gray-500">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium">高清图片</span>
                  <span className="text-xs">JPG, PNG, WebP</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium">4K视频</span>
                  <span className="text-xs">MP4, MOV, AVI</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium">智能处理</span>
                  <span className="text-xs">自动优化压缩</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 媒体文件统计和操作栏 */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Grid3X3 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-900">
                    已管理 {uploadedFiles.length} 个媒体文件
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  封面: {uploadedFiles.find(f => f.order === 0)?.filename || '未设置'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {onRefreshAllMediaInfo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onRefreshAllMediaInfo}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    title="刷新文件信息（获取WebP转换后的最新大小）"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新信息
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onShowUploadModal}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  继续上传
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onToggleMediaPreview}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {showMediaPreview ? (
                    <>
                      <Minimize2 className="w-4 h-4 mr-2" />
                      收起管理
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4 mr-2" />
                      展开管理
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 专业媒体管理界面 - 有文件时始终显示 */}
            <div className="border border-gray-200 rounded-xl bg-white">
              <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>专业媒体管理</span>
                  </h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>拖拽调整顺序</span>
                    <span>•</span>
                    <span>第一个文件为封面</span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <MediaPreview
                  files={uploadedFiles}
                  onDelete={onFileDelete}
                  onReorder={onFileReorder}
                  editable={true}
                  maxHeight={400}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
