/**
 * @fileoverview 页面头部组件
 * @description 媒体调试页面的头部组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';

/**
 * 页面头部组件属性接口
 */
interface PageHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  totalFiles: number;
  filteredFiles: number;
}

/**
 * 页面头部组件
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  onRefresh,
  isLoading,
  totalFiles,
  filteredFiles
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">媒体调试工具</h1>
          <p className="text-gray-600 mt-1">
            检查媒体文件状态和URL可访问性
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              刷新中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新数据
            </>
          )}
        </button>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalFiles}</div>
            <div className="text-sm text-gray-600">总文件数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{filteredFiles}</div>
            <div className="text-sm text-gray-600">显示文件</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {totalFiles > 0 ? Math.round((filteredFiles / totalFiles) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">匹配率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {isLoading ? '...' : '正常'}
            </div>
            <div className="text-sm text-gray-600">系统状态</div>
          </div>
        </div>
      </div>
    </div>
  );
};
