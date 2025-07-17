/**
 * @fileoverview 媒体文件列表组件
 * @description 显示媒体文件列表的组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { MediaDebugInfo } from '../types';
import { formatFileSize, formatDateTime, formatMimeType, truncateText } from '../utils/formatUtils';
import { isVideoFile, isImageFile } from '../utils/mediaUtils';
import { PROCESSING_STATUS } from '../constants';

/**
 * 媒体文件列表组件属性接口
 */
interface MediaFileListProps {
  files: MediaDebugInfo[];
  selectedFile: MediaDebugInfo | null;
  onFileSelect: (file: MediaDebugInfo) => void;
  isLoading: boolean;
}

/**
 * 处理状态徽章组件
 */
const ProcessingStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case PROCESSING_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800';
      case PROCESSING_STATUS.FAILED:
        return 'bg-red-100 text-red-800';
      case PROCESSING_STATUS.PROCESSING:
        return 'bg-yellow-100 text-yellow-800';
      case PROCESSING_STATUS.PENDING:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case PROCESSING_STATUS.COMPLETED:
        return '已完成';
      case PROCESSING_STATUS.FAILED:
        return '失败';
      case PROCESSING_STATUS.PROCESSING:
        return '处理中';
      case PROCESSING_STATUS.PENDING:
        return '待处理';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  );
};

/**
 * 媒体类型图标组件
 */
const MediaTypeIcon: React.FC<{ mediaType: string }> = ({ mediaType }) => {
  if (isImageFile(mediaType)) {
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  } else if (isVideoFile(mediaType)) {
    return (
      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

/**
 * 媒体文件列表组件
 */
export const MediaFileList: React.FC<MediaFileListProps> = ({
  files,
  selectedFile,
  onFileSelect,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">加载媒体文件...</span>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">没有找到媒体文件</h3>
          <p className="mt-1 text-sm text-gray-500">尝试调整搜索条件或刷新数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">媒体文件列表</h3>
        <p className="text-sm text-gray-600">共 {files.length} 个文件</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <div
            key={file.id}
            onClick={() => onFileSelect(file)}
            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedFile?.id === file.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <MediaTypeIcon mediaType={file.mediaType} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {truncateText(file.filename, 30)}
                    </p>
                    <ProcessingStatusBadge status={file.processingStatus} />
                  </div>
                  
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span>{formatMimeType(file.mimeType)}</span>
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>{formatDateTime(file.createdAt)}</span>
                  </div>
                  
                  {file.originalName !== file.filename && (
                    <p className="mt-1 text-xs text-gray-400 truncate">
                      原始名称: {truncateText(file.originalName, 40)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {file.isProcessed ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
