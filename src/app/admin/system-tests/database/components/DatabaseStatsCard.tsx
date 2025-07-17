/**
 * @fileoverview 数据库统计卡片组件
 * @description 显示数据库统计信息的卡片组件
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */
"use client";


import React from 'react';
import { DatabaseStats } from '../types';
import { formatNumber, formatDate } from '../utils/formatUtils';

/**
 * 数据库统计卡片组件属性接口
 */
interface DatabaseStatsCardProps {
  stats: DatabaseStats | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

/**
 * 统计项组件
 */
const StatItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
    <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center`}>
      {icon}
    </div>
    <div>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  </div>
);

/**
 * 数据库统计卡片组件
 */
export const DatabaseStatsCard: React.FC<DatabaseStatsCardProps> = ({
  stats,
  isLoading,
  error,
  onRefresh
}) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">数据库统计</h3>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
              刷新中
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </>
          )}
        </button>
      </div>
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-600">加载统计信息...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-8 w-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        ) : stats ? (
          <div className="space-y-3">
            <StatItem
              icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
              label="用户总数"
              value={formatNumber(stats.totalUsers)}
              color="bg-blue-500"
            />
            
            <StatItem
              icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              label="内容总数"
              value={formatNumber(stats.totalPosts)}
              color="bg-green-500"
            />
            
            <StatItem
              icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              label="媒体文件"
              value={formatNumber(stats.totalMedia)}
              color="bg-purple-500"
            />
            
            <StatItem
              icon={
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
              label="评论总数"
              value={formatNumber(stats.totalComments)}
              color="bg-yellow-500"
            />
            
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">数据库大小</span>
                <span className="font-medium">{stats.dbSize}</span>
              </div>
              
              {stats.lastBackup && (
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">最后备份</span>
                  <span className="font-medium">{formatDate(stats.lastBackup)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>暂无统计数据</p>
          </div>
        )}
      </div>
    </div>
  );
};
