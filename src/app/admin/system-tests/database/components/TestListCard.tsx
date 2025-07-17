/**
 * @fileoverview 测试列表卡片组件
 * @description 显示数据库测试列表的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { DatabaseTest, DatabaseTestStatus } from '../types';
import { getPerformanceColor } from '../utils/formatUtils';

/**
 * 测试列表卡片组件属性接口
 */
interface TestListCardProps {
  tests: DatabaseTest[];
  onRunTest: (testName: string) => void;
  isRunning: boolean;
}

/**
 * 测试状态图标组件
 */
const TestStatusIcon: React.FC<{ status: DatabaseTestStatus }> = ({ status }) => {
  switch (status) {
    case 'success':
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'running':
      return (
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      );
    default:
      return (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

/**
 * 测试项组件
 */
const TestItem: React.FC<{
  test: DatabaseTest;
  onRun: () => void;
  disabled: boolean;
}> = ({ test, onRun, disabled }) => {
  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <TestStatusIcon status={test.status} />
          
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">{test.name}</h3>
            <p className="text-sm text-gray-600">{test.description}</p>
            
            {test.result && (
              <p className="text-sm text-green-600 mt-1">{test.result}</p>
            )}
            
            {test.error && (
              <p className="text-sm text-red-600 mt-1">{test.error}</p>
            )}
            
            {test.duration && (
              <p className={`text-sm mt-1 ${getPerformanceColor(test.duration)}`}>
                耗时: {test.duration}ms
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={onRun}
          disabled={disabled || test.status === 'running'}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {test.status === 'running' ? '运行中' : '运行'}
        </button>
      </div>
    </div>
  );
};

/**
 * 测试列表卡片组件
 */
export const TestListCard: React.FC<TestListCardProps> = ({
  tests,
  onRunTest,
  isRunning
}) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">数据库测试项目</h3>
        <p className="text-sm text-gray-600">点击运行按钮执行单个测试</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {tests.map((test) => (
            <TestItem
              key={test.name}
              test={test}
              onRun={() => onRunTest(test.name)}
              disabled={isRunning}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
