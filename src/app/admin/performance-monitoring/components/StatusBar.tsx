/**
 * @fileoverview 性能监控状态栏组件
 * @description 显示最后更新时间、连接状态和错误信息
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import React from 'react';
import { Clock, AlertTriangle } from "lucide-react";
import { UpdateInterval } from '../types';

interface StatusBarProps {
  lastUpdated: Date;
  realTimeLastUpdated?: Date;
  isConnected: boolean;
  realTimeError?: string;
  updateInterval: UpdateInterval;
}

export function StatusBar({
  lastUpdated,
  realTimeLastUpdated,
  isConnected,
  realTimeError,
  updateInterval,
}: StatusBarProps) {
  const displayLastUpdated = realTimeLastUpdated || lastUpdated;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
      {/* 状态信息 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
        {/* 最后更新时间 */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            最后更新: {displayLastUpdated.toLocaleString()}
          </span>
        </div>

        {/* 连接状态 */}
        <div className="flex items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} 
          />
          <span 
            className={`${
              isConnected ? 'text-green-600' : 'text-red-600'
            } whitespace-nowrap`}
          >
            {isConnected ? '实时连接' : '连接断开'}
          </span>
        </div>

        {/* 错误信息 */}
        {realTimeError && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">错误: {realTimeError}</span>
          </div>
        )}
      </div>

      {/* 更新间隔 */}
      <div className="text-xs text-gray-400 whitespace-nowrap">
        更新间隔: {updateInterval / 1000}秒
      </div>
    </div>
  );
}
