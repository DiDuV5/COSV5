/**
 * @fileoverview 媒体调试主页面组件
 * @description 媒体调试页面的主要组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

'use client';

import React from 'react';
import { useMediaDebug } from '../hooks/useMediaDebug';
import { PageHeader } from './PageHeader';
import { SearchSection } from './SearchSection';
import { MediaFileList } from './MediaFileList';
import { FileDetailsCard } from './FileDetailsCard';
import { UrlTestCard } from './UrlTestCard';
import { MediaPreviewCard } from './MediaPreviewCard';
import { QuickLinksSection } from './QuickLinksSection';

/**
 * 媒体调试主页面组件
 */
export const DebugMediaPage: React.FC = () => {
  const {
    mediaFiles,
    selectedFile,
    searchQuery,
    isLoading,
    testResults,
    filteredFiles,
    setSelectedFile,
    setSearchQuery,
    fetchMediaFiles,
    testSelectedFileUrls,
  } = useMediaDebug();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <PageHeader
          onRefresh={fetchMediaFiles}
          isLoading={isLoading}
          totalFiles={mediaFiles.length}
          filteredFiles={filteredFiles.length}
        />

        {/* 搜索区域 */}
        <SearchSection
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：文件列表 */}
          <div className="space-y-6">
            <MediaFileList
              files={filteredFiles}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              isLoading={isLoading}
            />
            
            {/* 快速链接 */}
            <QuickLinksSection />
          </div>

          {/* 右侧：文件详情和预览 */}
          <div className="space-y-6">
            {selectedFile ? (
              <>
                {/* 文件详情 */}
                <FileDetailsCard
                  file={selectedFile}
                  onTestUrls={testSelectedFileUrls}
                  isTestingUrls={false} // 这里可以添加测试状态
                />

                {/* URL测试结果 */}
                <UrlTestCard testResults={testResults} />

                {/* 媒体预览 */}
                <MediaPreviewCard file={selectedFile} />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="text-center text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">选择文件查看详情</h3>
                  <p className="text-gray-600">
                    从左侧列表中选择一个媒体文件来查看详细信息、测试URL和预览内容
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
