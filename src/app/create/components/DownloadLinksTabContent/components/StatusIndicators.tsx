/**
 * @fileoverview 状态指示器组件
 * @description 显示下载链接管理的各种状态提示
 */

'use client';

import { AlertCircle } from 'lucide-react';
import { DownloadLinkStats } from '@/components/download';
import type { DownloadLink, LinkStats } from '../types';

interface StatusIndicatorsProps {
  links: DownloadLink[];
  stats: LinkStats;
  saving: boolean;
  isPublishing: boolean;
  isDraft: boolean;
  isEditing: boolean;
}

/**
 * 状态指示器组件
 */
export function StatusIndicators({
  links,
  stats,
  saving,
  isPublishing,
  isDraft,
  isEditing,
}: StatusIndicatorsProps) {
  return (
    <div className="space-y-4">
      {/* 调试信息 - 临时添加 */}
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
        <p><strong>调试信息:</strong></p>
        <p>saving: {saving.toString()}</p>
        <p>isPublishing: {isPublishing.toString()}</p>
        <p>isDraft: {isDraft.toString()}</p>
        <p>isEditing: {isEditing.toString()}</p>
        <p>links.length: {links.length}</p>
        <p>按钮disabled: {(saving || isPublishing || isDraft).toString()}</p>
      </div>

      {/* 下载链接统计 */}
      <DownloadLinkStats links={links} stats={stats} />

      {/* 状态提示 */}
      {(isPublishing || isDraft) && (
        <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <p className="text-xs text-amber-700">
            {isPublishing ? '发布过程中无法修改下载链接' : '草稿模式下无法修改下载链接'}
          </p>
        </div>
      )}
    </div>
  );
}
