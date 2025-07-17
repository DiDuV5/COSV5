/**
 * @fileoverview 上传统计组件
 * @description 显示上传进度统计信息
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from 'react';
import type { UploadStats } from '../types';

interface UploadStatsProps {
  stats: UploadStats;
}

export function UploadStats({ stats }: UploadStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        <div className="text-sm text-green-700">已完成</div>
      </div>
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{stats.uploading}</div>
        <div className="text-sm text-blue-700">上传中</div>
      </div>
      <div className="p-4 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        <div className="text-sm text-yellow-700">等待中</div>
      </div>
      <div className="p-4 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        <div className="text-sm text-red-700">失败</div>
      </div>
    </div>
  );
}
