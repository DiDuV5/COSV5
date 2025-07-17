/**
 * @fileoverview 加载状态组件
 * @description 显示数据加载中的状态
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { RefreshCw } from 'lucide-react';

/**
 * 加载状态组件
 * @returns JSX元素
 */
export const LoadingState: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">加载转码视频数据...</span>
      </div>
    </div>
  );
};
