/**
 * @fileoverview 安全监控仪表板头部组件
 * @description 提供安全监控仪表板的头部控制功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, AlertTriangle } from 'lucide-react';

interface SecurityDashboardHeaderProps {
  lastUpdate: Date;
  scanning: boolean;
  loading: boolean;
  onScan: () => void;
  onExport: () => void;
  onRetry: () => void;
  hasError?: boolean;
}

/**
 * 安全监控仪表板头部组件
 */
export function SecurityDashboardHeader({
  lastUpdate,
  scanning,
  loading,
  onScan,
  onExport,
  onRetry,
  hasError = false
}: SecurityDashboardHeaderProps) {
  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载安全数据...</span>
      </div>
    );
  }

  // 错误状态
  if (hasError) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">无法加载安全数据</p>
        <Button onClick={onRetry} className="mt-4">
          重试
        </Button>
      </div>
    );
  }

  // 正常头部
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold">安全监控仪表板</h1>
        <p className="text-gray-600">
          最后更新: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          导出报告
        </Button>
        <Button 
          onClick={onScan} 
          size="sm" 
          disabled={scanning}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? '扫描中...' : '安全扫描'}
        </Button>
      </div>
    </div>
  );
}
