/**
 * @fileoverview 测试概览卡片组件
 * @description 显示数据库测试概览信息的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { DatabaseTest } from '../types';
import { getTestStatusStats } from '../utils/testUtils';

/**
 * 测试概览卡片组件属性接口
 */
interface TestOverviewCardProps {
  tests: DatabaseTest[];
}

/**
 * 测试概览卡片组件
 */
export const TestOverviewCard: React.FC<TestOverviewCardProps> = ({ tests }) => {
  const stats = getTestStatusStats(tests);
  const totalTests = tests.length;
  const completedTests = stats.success + stats.error;
  const successRate = completedTests > 0 ? (stats.success / completedTests) * 100 : 0;
  
  // 计算平均响应时间
  const testsWithDuration = tests.filter(t => t.duration);
  const avgDuration = testsWithDuration.length > 0 
    ? testsWithDuration.reduce((sum, t) => sum + (t.duration || 0), 0) / testsWithDuration.length
    : 0;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">测试概览</h3>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{totalTests}</div>
            <div className="text-sm text-gray-600">总测试数</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">成功率</div>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{avgDuration.toFixed(0)}ms</div>
            <div className="text-sm text-gray-600">平均响应时间</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{completedTests}/{totalTests}</div>
            <div className="text-sm text-gray-600">已完成</div>
          </div>
        </div>
        
        {/* 进度条 */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>测试进度</span>
            <span>{completedTests}/{totalTests}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalTests > 0 ? (completedTests / totalTests) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
