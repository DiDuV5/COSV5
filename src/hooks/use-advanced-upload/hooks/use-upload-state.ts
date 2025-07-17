/**
 * @fileoverview 上传状态管理Hook
 * @description 管理上传过程中的所有状态和状态更新操作
 */

import { useState, useCallback } from 'react';
import {
  UploadState,
  UploadStateActions,
  AdvancedUploadResult,
  AdvancedUploadProgress,
} from "@/lib/upload/core/index";

export interface UseUploadStateReturn extends UploadState, UploadStateActions {
  // 扩展功能
  calculateOverallProgress: () => number;
  getUploadStats: () => {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    pending: number;
    successRate: number;
    failureRate: number;
  };
  getProcessingFiles: () => AdvancedUploadProgress[];
  getFailedFiles: () => AdvancedUploadProgress[];
  getCompletedFiles: () => AdvancedUploadProgress[];
  isAllFilesCompleted: () => boolean;
  hasProcessingFiles: () => boolean;
  getFileProgress: (filename: string) => AdvancedUploadProgress | undefined;
  updateTranscodingSession: (sessionId: string, action: 'add' | 'remove') => void;
  batchUpdateFileProgress: (updates: Array<{ filename: string; update: Partial<AdvancedUploadProgress> }>) => void;
  clearFilesByStatus: (status: AdvancedUploadProgress['status']) => void;
}

/**
 * 上传状态管理Hook
 */
export function useUploadState(): UseUploadStateReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<AdvancedUploadResult[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [fileProgresses, setFileProgresses] = useState<AdvancedUploadProgress[]>([]);
  const [transcodingSessions, setTranscodingSessions] = useState<Set<string>>(new Set());

  /**
   * 更新单个文件的进度
   */
  const updateFileProgress = useCallback((
    filename: string,
    update: Partial<AdvancedUploadProgress>
  ) => {
    setFileProgresses(prev => {
      const index = prev.findIndex(p => p.filename === filename);
      if (index === -1) {
        // 如果文件不存在，创建新的进度记录
        const newProgress: AdvancedUploadProgress = {
          fileId: update.fileId || `temp-${Date.now()}-${filename}`,
          fileName: update.fileName || filename,
          filename,
          progress: 0,
          status: 'pending',
          ...update
        };
        return [...prev, newProgress];
      }

      // 更新现有文件的进度
      const newProgresses = [...prev];
      newProgresses[index] = { ...newProgresses[index], ...update };
      return newProgresses;
    });
  }, []);

  /**
   * 添加上传结果
   */
  const addUploadResult = useCallback((result: AdvancedUploadResult) => {
    setUploadResults(prev => [...prev, result]);
  }, []);

  /**
   * 添加上传错误
   */
  const addUploadError = useCallback((error: string) => {
    setUploadErrors(prev => [...prev, error]);
  }, []);

  /**
   * 重置所有上传状态
   */
  const resetUploadState = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadResults([]);
    setUploadErrors([]);
    setFileProgresses([]);
    setTranscodingSessions(new Set());
  }, []);

  /**
   * 计算总体上传进度
   */
  const calculateOverallProgress = useCallback(() => {
    if (fileProgresses.length === 0) return 0;

    const totalProgress = fileProgresses.reduce((sum, file) => sum + file.progress, 0);
    return Math.round(totalProgress / fileProgresses.length);
  }, [fileProgresses]);

  /**
   * 获取上传统计信息
   */
  const getUploadStats = useCallback(() => {
    const total = fileProgresses.length;
    const completed = fileProgresses.filter(f => f.status === 'completed').length;
    const failed = fileProgresses.filter(f => f.status === 'error').length;
    const processing = fileProgresses.filter(f =>
      f.status === 'uploading' || f.status === 'processing' || f.status === 'transcoding'
    ).length;
    const pending = fileProgresses.filter(f => f.status === 'pending').length;

    return {
      total,
      completed,
      failed,
      processing,
      pending,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
    };
  }, [fileProgresses]);

  /**
   * 获取正在处理的文件列表
   */
  const getProcessingFiles = useCallback(() => {
    return fileProgresses.filter(f =>
      f.status === 'uploading' || f.status === 'processing' || f.status === 'transcoding'
    );
  }, [fileProgresses]);

  /**
   * 获取失败的文件列表
   */
  const getFailedFiles = useCallback(() => {
    return fileProgresses.filter(f => f.status === 'error');
  }, [fileProgresses]);

  /**
   * 获取完成的文件列表
   */
  const getCompletedFiles = useCallback(() => {
    return fileProgresses.filter(f => f.status === 'completed');
  }, [fileProgresses]);

  /**
   * 检查是否所有文件都已完成（成功或失败）
   */
  const isAllFilesCompleted = useCallback(() => {
    return fileProgresses.length > 0 && fileProgresses.every(f =>
      f.status === 'completed' || f.status === 'error'
    );
  }, [fileProgresses]);

  /**
   * 检查是否有文件正在处理
   */
  const hasProcessingFiles = useCallback(() => {
    return fileProgresses.some(f =>
      f.status === 'uploading' || f.status === 'processing' || f.status === 'transcoding'
    );
  }, [fileProgresses]);

  /**
   * 获取特定文件的进度
   */
  const getFileProgress = useCallback((filename: string) => {
    return fileProgresses.find(f => f.filename === filename);
  }, [fileProgresses]);

  /**
   * 更新转码会话
   */
  const updateTranscodingSession = useCallback((sessionId: string, action: 'add' | 'remove') => {
    setTranscodingSessions(prev => {
      const newSessions = new Set(prev);
      if (action === 'add') {
        newSessions.add(sessionId);
      } else {
        newSessions.delete(sessionId);
      }
      return newSessions;
    });
  }, []);

  /**
   * 批量更新文件进度
   */
  const batchUpdateFileProgress = useCallback((
    updates: Array<{ filename: string; update: Partial<AdvancedUploadProgress> }>
  ) => {
    setFileProgresses(prev => {
      const newProgresses = [...prev];

      updates.forEach(({ filename, update }) => {
        const index = newProgresses.findIndex(p => p.filename === filename);
        if (index !== -1) {
          newProgresses[index] = { ...newProgresses[index], ...update };
        } else {
          const newProgress: AdvancedUploadProgress = {
            fileId: update.fileId || `temp-${Date.now()}-${filename}`,
            fileName: update.fileName || filename,
            filename,
            progress: 0,
            status: 'pending',
            ...update
          };
          newProgresses.push(newProgress);
        }
      });

      return newProgresses;
    });
  }, []);

  /**
   * 清除特定状态的文件
   */
  const clearFilesByStatus = useCallback((status: AdvancedUploadProgress['status']) => {
    setFileProgresses(prev => prev.filter(f => f.status !== status));
  }, []);

  return {
    // 状态
    isUploading,
    uploadProgress,
    uploadResults,
    uploadErrors,
    fileProgresses,
    transcodingSessions,

    // 基本操作
    setIsUploading,
    setUploadProgress,
    setUploadResults,
    setUploadErrors,
    setFileProgresses,
    setTranscodingSessions,
    updateFileProgress,
    addUploadResult,
    addUploadError,
    resetUploadState,

    // 扩展功能
    calculateOverallProgress,
    getUploadStats,
    getProcessingFiles,
    getFailedFiles,
    getCompletedFiles,
    isAllFilesCompleted,
    hasProcessingFiles,
    getFileProgress,
    updateTranscodingSession,
    batchUpdateFileProgress,
    clearFilesByStatus,
  };
}
