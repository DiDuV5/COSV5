/**
 * @fileoverview 媒体预览卡片组件
 * @description 显示媒体文件预览的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React, { useState } from 'react';
import { MediaDebugInfo } from '../types';
import { isVideoFile, isImageFile, isPreviewSupported } from '../utils/mediaUtils';

/**
 * 媒体预览卡片组件属性接口
 */
interface MediaPreviewCardProps {
  file: MediaDebugInfo;
}

/**
 * 图片预览组件
 */
const ImagePreview: React.FC<{ file: MediaDebugInfo }> = ({ file }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <div className="relative">
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        </div>
      )}

      {imageError ? (
        <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm">图片加载失败</p>
          </div>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line no-restricted-syntax */}
          <img
            src={file.url}
            alt={file.originalName}
            className={`w-full h-auto max-h-96 object-contain rounded-lg ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
              setImageLoading(false);
            }}
          />
        </>
      )}
    </div>
  );
};

/**
 * 视频预览组件
 */
const VideoPreview: React.FC<{ file: MediaDebugInfo }> = ({ file }) => {
  const [videoError, setVideoError] = useState(false);

  if (videoError) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm">视频加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <video
      controls
      className="w-full h-auto max-h-96 rounded-lg"
      poster={file.thumbnailUrl}
      onError={() => setVideoError(true)}
    >
      <source src={file.url} type={file.mimeType} />
      您的浏览器不支持视频播放。
    </video>
  );
};

/**
 * 媒体预览卡片组件
 */
export const MediaPreviewCard: React.FC<MediaPreviewCardProps> = ({ file }) => {
  const canPreview = isPreviewSupported(file);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">媒体预览</h3>
        <p className="text-sm text-gray-600">
          {file.originalName}
        </p>
      </div>

      <div className="px-6 py-4">
        {!canPreview ? (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">不支持预览此文件类型</p>
              <p className="text-xs text-gray-400 mt-1">{file.mimeType}</p>
            </div>
          </div>
        ) : isImageFile(file.mediaType) ? (
          <ImagePreview file={file} />
        ) : isVideoFile(file.mediaType) ? (
          <VideoPreview file={file} />
        ) : (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
            <div className="text-center text-gray-500">
              <p className="text-sm">未知的媒体类型</p>
            </div>
          </div>
        )}

        {/* 预览操作按钮 */}
        {canPreview && (
          <div className="mt-4 flex justify-center gap-2">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              新窗口打开
            </a>

            {file.thumbnailUrl && (
              <a
                href={file.thumbnailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                查看缩略图
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
