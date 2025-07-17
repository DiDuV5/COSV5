/**
 * @fileoverview 数据库信息卡片组件
 * @description 显示数据库基本信息的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';

/**
 * 数据库信息卡片组件
 */
export const DatabaseInfoCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">数据库信息</h3>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">数据库类型</span>
            <span className="text-sm font-medium text-gray-900">PostgreSQL</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">版本</span>
            <span className="text-sm font-medium text-gray-900">14.x</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">连接状态</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              已连接
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">字符集</span>
            <span className="text-sm font-medium text-gray-900">UTF-8</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">时区</span>
            <span className="text-sm font-medium text-gray-900">Asia/Shanghai</span>
          </div>
        </div>
      </div>
    </div>
  );
};
