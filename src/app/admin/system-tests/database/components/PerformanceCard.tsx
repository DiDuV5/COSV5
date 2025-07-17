/**
 * @fileoverview 性能指标卡片组件
 * @description 显示数据库性能指标的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { DatabaseTest } from '../types';
import { getPerformanceColor, getPerformanceIcon } from '../utils/formatUtils';
import { PERFORMANCE_THRESHOLDS } from '../constants';

/**
 * 性能指标卡片组件属性接口
 */
interface PerformanceCardProps {
  tests: DatabaseTest[];
}

/**
 * 性能指标项组件
 */
const PerformanceItem: React.FC<{
  test: DatabaseTest;
}> = ({ test }) => {
  if (!test.duration || test.status !== 'success') {
    return null;
  }

  const colorClass = getPerformanceColor(test.duration);
  const iconType = getPerformanceIcon(test.duration);

  const getIcon = () => {
    switch (iconType) {
      case 'CheckCircle':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'AlertCircle':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'XCircle':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium text-gray-900">{test.name}</span>
      </div>
      <span className={`text-sm font-medium ${colorClass}`}>
        {test.duration}ms
      </span>
    </div>
  );
};

/**
 * 性能指标卡片组件
 */
export const PerformanceCard: React.FC<PerformanceCardProps> = ({ tests }) => {
  const successfulTests = tests.filter(t => t.status === 'success' && t.duration);
  
  if (successfulTests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">性能指标</h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>暂无性能数据</p>
            <p className="text-xs mt-1">运行测试后查看性能指标</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">性能指标</h3>
        <p className="text-sm text-gray-600">查询响应时间</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {successfulTests.map((test) => (
            <PerformanceItem key={test.name} test={test} />
          ))}
        </div>
        
        {/* 性能阈值说明 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">性能等级</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">优秀: &lt; {PERFORMANCE_THRESHOLDS.GOOD}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">一般: {PERFORMANCE_THRESHOLDS.GOOD}-{PERFORMANCE_THRESHOLDS.WARNING}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">较慢: &gt; {PERFORMANCE_THRESHOLDS.WARNING}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
