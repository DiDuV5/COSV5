/**
 * @fileoverview 拖拽覆盖层组件
 * @description 全局拖拽上传时显示的覆盖层UI
 */

'use client';

import { Upload, ImageIcon, Video } from 'lucide-react';

interface DragOverlayProps {
  isDragOver: boolean;
}

export function DragOverlay({ isDragOver }: DragOverlayProps) {
  if (!isDragOver) return null;

  return (
    <div className="fixed inset-0 z-50 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border-2 border-dashed border-blue-400">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          拖拽文件到这里上传
        </h3>
        <p className="text-gray-600 mb-4">
          支持图片和视频文件，可批量上传
        </p>
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <ImageIcon className="w-4 h-4" />
            <span>图片</span>
          </div>
          <div className="flex items-center space-x-1">
            <Video className="w-4 h-4" />
            <span>视频</span>
          </div>
        </div>
      </div>
    </div>
  );
}
