/**
 * @fileoverview 页面头部组件
 * @description 数据库测试页面的头部组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { DatabaseTest } from '../types';
import { getTestStatusStats } from '../utils/testUtils';

/**
 * 页面头部组件属性接口
 */
interface PageHeaderProps {
  tests: DatabaseTest[];
  isRunning: boolean;
  onRunAllTests: () => void;
  onResetTests: () => void;
}

/**
 * 页面头部组件
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  tests,
  isRunning,
  onRunAllTests,
  onResetTests
}) => {
  const stats = getTestStatusStats(tests);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据库测试</h1>
          <p className="text-gray-600 mt-1">
            测试数据库连接和查询性能
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onResetTests}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            重置测试
          </button>
          
          <button
            onClick={onRunAllTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                运行中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h1m4 0h1M9 6h1m4 0h1" />
                </svg>
                运行所有测试
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            <div className="text-sm text-gray-600">成功</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
            <div className="text-sm text-gray-600">失败</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
            <div className="text-sm text-gray-600">运行中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.idle}</div>
            <div className="text-sm text-gray-600">待运行</div>
          </div>
        </div>
      </div>
    </div>
  );
};
