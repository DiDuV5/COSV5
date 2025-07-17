/**
 * @fileoverview 上传策略选择Hook
 * @description 智能选择最优上传策略的Hook
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { useCallback } from 'react';
import type { UploadStrategy, AdvancedUploadConfig } from '../types';

interface UseUploadStrategyProps {
  config: AdvancedUploadConfig;
}

export function useUploadStrategy({ config }: UseUploadStrategyProps) {
  /**
   * 智能策略选择
   */
  const selectUploadStrategy = useCallback((file: File): UploadStrategy => {
    if (!config.autoStrategy) return 'direct';

    const fileSize = file.size;
    const isVideo = file.type.startsWith('video/');

    // 小文件直接上传
    if (fileSize < 10 * 1024 * 1024) { // 10MB
      return 'direct';
    }

    // 大视频文件使用流式上传
    if (isVideo && fileSize > 100 * 1024 * 1024) { // 100MB
      return 'streaming';
    }

    // 中等大小文件使用分片上传
    if (fileSize > 50 * 1024 * 1024) { // 50MB
      return 'chunked';
    }

    // 混合策略
    return 'hybrid';
  }, [config.autoStrategy]);

  return {
    selectUploadStrategy,
  };
}
