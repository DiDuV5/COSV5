/**
 * @fileoverview 文件详情卡片组件
 * @description 显示选中文件详细信息的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { MediaDebugInfo } from '../types';
import { 
  formatFileSize, 
  formatDateTime, 
  formatMimeType, 
  formatDimensions, 
  formatDuration 
} from '../utils/formatUtils';
import { isVideoFile } from '../utils/mediaUtils';

/**
 * 文件详情卡片组件属性接口
 */
interface FileDetailsCardProps {
  file: MediaDebugInfo;
  onTestUrls: () => void;
  isTestingUrls: boolean;
}

/**
 * 详情项组件
 */
const DetailItem: React.FC<{ label: string; value: string | React.ReactNode; copyable?: boolean }> = ({ 
  label, 
  value, 
  copyable = false 
}) => {
  const handleCopy = async () => {
    if (typeof value === 'string') {
      try {
        await navigator.clipboard.writeText(value);
        // 这里可以添加复制成功的提示
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  };

  return (
    <div className="flex justify-between items-start py-2">
      <dt className="text-sm font-medium text-gray-500 w-1/3">{label}</dt>
      <dd className="text-sm text-gray-900 w-2/3 flex items-center gap-2">
        <span className="break-all">{value}</span>
        {copyable && typeof value === 'string' && (
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            title="复制到剪贴板"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </dd>
    </div>
  );
};

/**
 * 文件详情卡片组件
 */
export const FileDetailsCard: React.FC<FileDetailsCardProps> = ({
  file,
  onTestUrls,
  isTestingUrls
}) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">文件详情</h3>
        <button
          onClick={onTestUrls}
          disabled={isTestingUrls}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isTestingUrls ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              测试URL
            </>
          )}
        </button>
      </div>
      
      <div className="px-6 py-4">
        <dl className="divide-y divide-gray-200">
          <DetailItem label="文件ID" value={file.id} copyable />
          <DetailItem label="文件名" value={file.filename} copyable />
          <DetailItem label="原始名称" value={file.originalName} copyable />
          <DetailItem label="文件URL" value={file.url} copyable />
          
          {file.thumbnailUrl && (
            <DetailItem label="缩略图URL" value={file.thumbnailUrl} copyable />
          )}
          
          <DetailItem label="媒体类型" value={file.mediaType} />
          <DetailItem label="MIME类型" value={formatMimeType(file.mimeType)} />
          <DetailItem label="文件大小" value={formatFileSize(file.fileSize)} />
          
          {file.width && file.height && (
            <DetailItem label="尺寸" value={formatDimensions(file.width, file.height)} />
          )}
          
          {isVideoFile(file.mediaType) && file.duration && (
            <DetailItem label="时长" value={formatDuration(file.duration)} />
          )}
          
          <DetailItem 
            label="处理状态" 
            value={
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                file.isProcessed 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {file.isProcessed ? '已处理' : '未处理'}
              </span>
            } 
          />
          
          <DetailItem 
            label="处理详情" 
            value={
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                file.processingStatus === 'COMPLETED' 
                  ? 'bg-green-100 text-green-800'
                  : file.processingStatus === 'FAILED'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {file.processingStatus}
              </span>
            } 
          />
          
          <DetailItem label="创建时间" value={formatDateTime(file.createdAt)} />
        </dl>
      </div>
    </div>
  );
};
