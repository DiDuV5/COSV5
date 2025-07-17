/**
 * @fileoverview URL测试卡片组件
 * @description URL可访问性测试的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { UrlTestResults } from '../types';
import { useUrlTesting } from '../hooks/useUrlTesting';

/**
 * URL测试卡片组件属性接口
 */
interface UrlTestCardProps {
  testResults: UrlTestResults;
}

/**
 * URL测试结果项组件
 */
const TestResultItem: React.FC<{ url: string; isAccessible: boolean }> = ({ url, isAccessible }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={url}>
          {url}
        </p>
      </div>
      <div className="ml-3 flex items-center">
        {isAccessible ? (
          <div className="flex items-center gap-1 text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-medium">可访问</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-xs font-medium">不可访问</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * URL测试卡片组件
 */
export const UrlTestCard: React.FC<UrlTestCardProps> = ({ testResults }) => {
  const {
    testUrl,
    isTestingUrl,
    testResult,
    testError,
    setTestUrl,
    clearTestResult
  } = useUrlTesting();

  // 创建performTest函数
  const performTest = async () => {
    if (!testUrl.trim()) return;
    // 这里应该调用实际的测试逻辑
    console.log('Testing URL:', testUrl);
  };

  const hasResults = Object.keys(testResults).length > 0;
  const accessibleCount = Object.values(testResults).filter(Boolean).length;
  const totalCount = Object.keys(testResults).length;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">URL测试</h3>
        <p className="text-sm text-gray-600">测试URL的可访问性</p>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* 自定义URL测试 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            测试自定义URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="输入要测试的URL..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => performTest()}
              disabled={isTestingUrl || !testUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isTestingUrl ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  测试中
                </>
              ) : (
                '测试'
              )}
            </button>
          </div>

          {/* 自定义测试结果 */}
          {testResult !== null && (
            <div className="mt-2">
              <TestResultItem url={testUrl} isAccessible={testResult} />
            </div>
          )}

          {testError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{testError}</p>
            </div>
          )}
        </div>

        {/* 文件URL测试结果 */}
        {hasResults && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-medium text-gray-700">文件URL测试结果</h4>
              <span className="text-xs text-gray-500">
                {accessibleCount}/{totalCount} 可访问
              </span>
            </div>

            <div className="space-y-2">
              {Object.entries(testResults).map(([url, isAccessible]) => (
                <TestResultItem key={url} url={url} isAccessible={isAccessible} />
              ))}
            </div>

            {/* 测试结果统计 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">测试结果统计</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">{accessibleCount} 可访问</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">{totalCount - accessibleCount} 不可访问</span>
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${totalCount > 0 ? (accessibleCount / totalCount) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  成功率: {totalCount > 0 ? Math.round((accessibleCount / totalCount) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        )}

        {!hasResults && (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-sm">选择文件并点击&quot;测试URL&quot;开始测试</p>
          </div>
        )}
      </div>
    </div>
  );
};
