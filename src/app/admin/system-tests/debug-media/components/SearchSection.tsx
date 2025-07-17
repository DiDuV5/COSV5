/**
 * @fileoverview 搜索组件
 * @description 媒体文件搜索功能组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';

/**
 * 搜索组件属性接口
 */
interface SearchSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

/**
 * 搜索组件
 */
export const SearchSection: React.FC<SearchSectionProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = "搜索文件名、原始名称或MIME类型..."
}) => {
  return (
    <div className="mb-6">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />

        {searchQuery && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={() => onSearchChange('')}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              title="清除搜索"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {searchQuery && (
        <div className="mt-2 text-sm text-gray-600">
          搜索关键词: <span className="font-medium text-gray-900">&quot;{searchQuery}&quot;</span>
        </div>
      )}
    </div>
  );
};
