/**
 * @fileoverview 上传状态管理器
 * @description 管理上传状态的创建、更新和查询
 * @author Augment AI
 * @date 2025-07-03
 */

import { useState, useCallback, useRef } from 'react';
import type {
  UploadState,
  UploadFile,
  UploadHealthStatus,
  UseUnifiedUploadConfig,
  UserFriendlyError,
  ProgressStage
} from '../types/upload-hook-types';

/**
 * 上传状态管理器Hook
 */
export function useUploadStateManager(config: UseUnifiedUploadConfig) {
  // 状态管理
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [globalHealth, setGlobalHealth] = useState<'HEALTHY' | 'WARNING' | 'CRITICAL'>('HEALTHY');

  // 引用管理
  const progressIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const retryCounters = useRef<Map<string, number>>(new Map());

  /**
   * 创建初始上传状态
   */
  const createInitialState = useCallback((uploadFile: UploadFile): UploadState => {
    return {
      isUploading: false,
      isCompleted: false,
      hasError: false,
      progress: 0,
      stage: 'preparing' as ProgressStage,
      statusMessage: '准备上传...',
      detailMessage: '',
      retryCount: 0,
      canRetry: true,
      fileName: uploadFile.file.name,
      fileSize: uploadFile.file.size,
      fileType: uploadFile.file.type,
      startTime: Date.now()
    };
  }, []);

  /**
   * 更新上传状态
   */
  const updateUploadState = useCallback((
    sessionId: string,
    updates: Partial<UploadState>
  ) => {
    setUploadStates(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        ...updates
      }
    }));
  }, []);

  /**
   * 设置上传开始状态
   */
  const setUploadStarted = useCallback((sessionId: string) => {
    updateUploadState(sessionId, {
      isUploading: true,
      isCompleted: false,
      hasError: false,
      stage: 'uploading' as ProgressStage,
      statusMessage: '正在上传...',
      startTime: Date.now()
    });
  }, [updateUploadState]);

  /**
   * 更新上传进度
   */
  const updateProgress = useCallback((
    sessionId: string,
    progress: number,
    stage: ProgressStage,
    message: string,
    detailMessage?: string
  ) => {
    updateUploadState(sessionId, {
      progress: Math.min(100, Math.max(0, progress)),
      stage,
      statusMessage: message,
      detailMessage: detailMessage || ''
    });
  }, [updateUploadState]);

  /**
   * 设置上传完成状态
   */
  const setUploadCompleted = useCallback((
    sessionId: string,
    result: UploadState['result']
  ) => {
    updateUploadState(sessionId, {
      isUploading: false,
      isCompleted: true,
      hasError: false,
      progress: 100,
      stage: 'completed' as ProgressStage,
      statusMessage: '上传完成',
      detailMessage: '文件已成功上传',
      result,
      endTime: Date.now()
    });

    // 清理进度定时器
    const interval = progressIntervals.current.get(sessionId);
    if (interval) {
      clearInterval(interval);
      progressIntervals.current.delete(sessionId);
    }
  }, [updateUploadState]);

  /**
   * 设置上传错误状态
   */
  const setUploadError = useCallback((
    sessionId: string,
    error: UserFriendlyError
  ) => {
    const currentState = uploadStates[sessionId];
    const retryCount = (currentState?.retryCount || 0) + 1;
    const maxRetries = config.maxRetries || 3;
    const canRetry = retryCount < maxRetries;

    updateUploadState(sessionId, {
      isUploading: false,
      isCompleted: false,
      hasError: true,
      stage: 'error' as ProgressStage,
      statusMessage: error.userMessage || '上传失败',
      detailMessage: error.technicalDetails || '',
      error,
      retryCount,
      canRetry,
      endTime: Date.now()
    });

    // 更新重试计数器
    retryCounters.current.set(sessionId, retryCount);

    // 清理进度定时器
    const interval = progressIntervals.current.get(sessionId);
    if (interval) {
      clearInterval(interval);
      progressIntervals.current.delete(sessionId);
    }
  }, [uploadStates, config.maxRetries, updateUploadState]);

  /**
   * 设置上传取消状态
   */
  const setUploadCancelled = useCallback((sessionId: string) => {
    updateUploadState(sessionId, {
      isUploading: false,
      isCompleted: false,
      hasError: false,
      stage: 'cancelled' as ProgressStage,
      statusMessage: '上传已取消',
      detailMessage: '用户取消了上传操作',
      endTime: Date.now()
    });

    // 清理进度定时器
    const interval = progressIntervals.current.get(sessionId);
    if (interval) {
      clearInterval(interval);
      progressIntervals.current.delete(sessionId);
    }

    // 清理重试计数器
    retryCounters.current.delete(sessionId);
  }, [updateUploadState]);

  /**
   * 重置上传状态（用于重试）
   */
  const resetUploadForRetry = useCallback((sessionId: string) => {
    const currentState = uploadStates[sessionId];
    if (!currentState) return;

    updateUploadState(sessionId, {
      isUploading: false,
      isCompleted: false,
      hasError: false,
      progress: 0,
      stage: 'preparing' as ProgressStage,
      statusMessage: '准备重试...',
      detailMessage: '',
      error: undefined,
      result: undefined
    });
  }, [uploadStates, updateUploadState]);

  /**
   * 获取上传状态
   */
  const getUploadState = useCallback((sessionId: string): UploadState | undefined => {
    return uploadStates[sessionId];
  }, [uploadStates]);

  /**
   * 获取所有上传状态
   */
  const getAllUploadStates = useCallback(() => {
    return uploadStates;
  }, [uploadStates]);

  /**
   * 计算全局状态
   */
  const getGlobalState = useCallback(() => {
    const states = Object.values(uploadStates);
    const totalUploads = states.length;
    const completedUploads = states.filter(s => s.isCompleted).length;
    const failedUploads = states.filter(s => s.hasError).length;
    const activeUploads = states.filter(s => s.isUploading).length;

    // 计算整体进度
    const overallProgress = totalUploads > 0
      ? Math.round(states.reduce((sum, state) => sum + state.progress, 0) / totalUploads)
      : 0;

    return {
      isAnyUploading: activeUploads > 0,
      totalUploads,
      completedUploads,
      failedUploads,
      overallProgress,
      health: globalHealth
    };
  }, [uploadStates, globalHealth]);

  /**
   * 更新健康状态
   */
  const updateHealthStatus = useCallback(() => {
    const states = Object.values(uploadStates);
    const totalUploads = states.length;
    const failedUploads = states.filter(s => s.hasError).length;
    const activeUploads = states.filter(s => s.isUploading).length;

    let newHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    if (totalUploads > 0) {
      const failureRate = failedUploads / totalUploads;

      if (failureRate > 0.5 || activeUploads > 10) {
        newHealth = 'CRITICAL';
      } else if (failureRate > 0.2 || activeUploads > 5) {
        newHealth = 'WARNING';
      }
    }

    if (newHealth !== globalHealth) {
      setGlobalHealth(newHealth);
    }
  }, [uploadStates, globalHealth]);

  /**
   * 清理完成的上传状态
   */
  const cleanupCompletedUploads = useCallback((olderThanMinutes: number = 30) => {
    const cutoffTime = Date.now() - (olderThanMinutes * 60 * 1000);

    setUploadStates(prev => {
      const filtered: Record<string, UploadState> = {};

      Object.entries(prev).forEach(([sessionId, state]) => {
        // 保留正在进行的上传和最近完成的上传
        if (
          state.isUploading ||
          !state.endTime ||
          state.endTime > cutoffTime
        ) {
          filtered[sessionId] = state;
        } else {
          // 清理相关的定时器和计数器
          const interval = progressIntervals.current.get(sessionId);
          if (interval) {
            clearInterval(interval);
            progressIntervals.current.delete(sessionId);
          }
          retryCounters.current.delete(sessionId);
        }
      });

      return filtered;
    });
  }, []);

  /**
   * 获取上传统计信息
   */
  const getUploadStatistics = useCallback(() => {
    const states = Object.values(uploadStates);
    const totalUploads = states.length;
    const successfulUploads = states.filter(s => s.isCompleted && !s.hasError).length;
    const failedUploads = states.filter(s => s.hasError).length;

    const completedStates = states.filter(s => s.endTime && s.startTime);
    const totalBytesUploaded = completedStates.reduce((sum, state) => sum + state.fileSize, 0);
    const totalUploadTime = completedStates.reduce((sum, state) =>
      sum + ((state.endTime || 0) - (state.startTime || 0)), 0
    );

    const averageUploadTime = completedStates.length > 0
      ? totalUploadTime / completedStates.length
      : 0;

    const successRate = totalUploads > 0 ? successfulUploads / totalUploads : 0;

    return {
      totalUploads,
      successfulUploads,
      failedUploads,
      totalBytesUploaded,
      averageUploadTime,
      successRate
    };
  }, [uploadStates]);

  return {
    // 状态
    uploadStates,
    globalHealth,

    // 状态创建和更新
    createInitialState,
    updateUploadState,
    setUploadStarted,
    updateProgress,
    setUploadCompleted,
    setUploadError,
    setUploadCancelled,
    resetUploadForRetry,

    // 状态查询
    getUploadState,
    getAllUploadStates,
    getGlobalState,
    getUploadStatistics,

    // 维护方法
    updateHealthStatus,
    cleanupCompletedUploads,

    // 引用
    progressIntervals,
    retryCounters
  };
}
