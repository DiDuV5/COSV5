/**
 * @fileoverview 统一上传Hook - 重构版本
 * @description 提供统一的文件上传功能，支持单文件和批量上传
 * @author Augment AI
 * @date 2025-07-03
 * @version 3.0.0 - 重构版（模块化架构）
 */

import { useCallback, useEffect } from 'react';

// 导入重构后的模块
import type {
  UploadFile,
  UseUnifiedUploadReturn,
  UseUnifiedUploadConfig
} from './types/upload-hook-types';

import { useUploadStateManager } from './core/upload-state-manager';
import { useSingleUploadHandler } from './handlers/single-upload-handler';
import { useBatchUploadHandler } from './handlers/batch-upload-handler';

/**
 * 统一上传Hook - 重构版
 */
export function useUnifiedUpload(
  config: UseUnifiedUploadConfig = {}
): UseUnifiedUploadReturn {
  // 默认配置
  const mergedConfig: UseUnifiedUploadConfig = {
    enableAutoRetry: true,
    maxRetries: 3,
    retryDelay: 2000,
    progressUpdateInterval: 1000,
    enableDetailedProgress: true,
    enableUserFriendlyErrors: true,
    showErrorNotifications: false,
    maxConcurrentUploads: 3,
    enableProgressOptimization: true,
    ...config
  };

  // 状态管理器
  const stateManager = useUploadStateManager(mergedConfig);

  // 处理器
  const singleUploadHandler = useSingleUploadHandler(stateManager, mergedConfig);
  const batchUploadHandler = useBatchUploadHandler(stateManager, mergedConfig);

  /**
   * 上传单个文件
   */
  const uploadFile = useCallback(async (uploadFile: UploadFile) => {
    console.log(`📤 开始上传文件: ${uploadFile.file.name}`);
    
    try {
      // 验证文件
      const validation = singleUploadHandler.validateUploadFile(uploadFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 执行上传
      await singleUploadHandler.handleSingleUpload(uploadFile);
      
      console.log(`✅ 文件上传完成: ${uploadFile.file.name}`);
      
    } catch (error) {
      console.error(`❌ 文件上传失败: ${uploadFile.file.name}`, error);
      throw error;
    }
  }, [singleUploadHandler]);

  /**
   * 批量上传文件
   */
  const uploadFiles = useCallback(async (files: UploadFile[]) => {
    console.log(`📤 开始批量上传: ${files.length} 个文件`);
    
    try {
      // 优化上传顺序
      const optimizedFiles = batchUploadHandler.optimizeUploadOrder(files);
      
      // 执行批量上传
      await batchUploadHandler.handleBatchUpload(optimizedFiles);
      
      console.log(`✅ 批量上传完成: ${files.length} 个文件`);
      
    } catch (error) {
      console.error(`❌ 批量上传失败:`, error);
      throw error;
    }
  }, [batchUploadHandler]);

  /**
   * 取消单个上传
   */
  const cancelUpload = useCallback(async (sessionId: string) => {
    console.log(`🛑 取消上传: ${sessionId}`);
    
    try {
      await singleUploadHandler.cancelUpload(sessionId);
      console.log(`✅ 上传已取消: ${sessionId}`);
    } catch (error) {
      console.error(`❌ 取消上传失败: ${sessionId}`, error);
      throw error;
    }
  }, [singleUploadHandler]);

  /**
   * 取消所有上传
   */
  const cancelAllUploads = useCallback(async () => {
    console.log('🛑 取消所有上传');
    
    try {
      const allStates = stateManager.getAllUploadStates();
      const activeSessionIds = Object.keys(allStates).filter(
        sessionId => allStates[sessionId].isUploading
      );

      if (activeSessionIds.length === 0) {
        console.log('没有正在进行的上传');
        return;
      }

      await batchUploadHandler.cancelBatchUpload(activeSessionIds);
      console.log(`✅ 已取消 ${activeSessionIds.length} 个上传`);
      
    } catch (error) {
      console.error('❌ 取消所有上传失败:', error);
      throw error;
    }
  }, [stateManager, batchUploadHandler]);

  /**
   * 重试上传
   */
  const retryUpload = useCallback(async (sessionId: string) => {
    console.log(`🔄 重试上传: ${sessionId}`);
    
    try {
      const uploadState = stateManager.getUploadState(sessionId);
      if (!uploadState) {
        throw new Error('找不到上传状态');
      }

      if (!uploadState.hasError || !uploadState.canRetry) {
        throw new Error('该上传不能重试');
      }

      // 重新构造UploadFile对象（实际实现中应该保存原始对象）
      const uploadFile: UploadFile = {
        file: new File([], uploadState.fileName, { type: uploadState.fileType }),
        sessionId,
        metadata: {},
        options: {}
      };

      await singleUploadHandler.handleRetryUpload(sessionId, uploadFile);
      console.log(`✅ 重试上传完成: ${sessionId}`);
      
    } catch (error) {
      console.error(`❌ 重试上传失败: ${sessionId}`, error);
      throw error;
    }
  }, [stateManager, singleUploadHandler]);

  /**
   * 获取上传状态
   */
  const getUploadState = useCallback((sessionId: string) => {
    return stateManager.getUploadState(sessionId);
  }, [stateManager]);

  /**
   * 获取所有上传状态
   */
  const getAllUploadStates = useCallback(() => {
    return stateManager.getAllUploadStates();
  }, [stateManager]);

  /**
   * 获取全局状态
   */
  const globalState = stateManager.getGlobalState();

  // 定期更新健康状态
  useEffect(() => {
    const interval = setInterval(() => {
      stateManager.updateHealthStatus();
    }, 5000); // 每5秒更新一次

    return () => clearInterval(interval);
  }, [stateManager]);

  // 定期清理完成的上传
  useEffect(() => {
    const interval = setInterval(() => {
      stateManager.cleanupCompletedUploads(30); // 清理30分钟前完成的上传
    }, 10 * 60 * 1000); // 每10分钟清理一次

    return () => clearInterval(interval);
  }, [stateManager]);

  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      // 清理所有进度监控定时器
      stateManager.progressIntervals.current.forEach((interval) => {
        clearInterval(interval);
      });
      stateManager.progressIntervals.current.clear();
    };
  }, [stateManager]);

  return {
    // 上传方法
    uploadFile,
    uploadFiles,
    
    // 控制方法
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    
    // 状态获取
    getUploadState,
    getAllUploadStates,
    
    // 全局状态
    globalState
  };
}

// 重新导出类型以保持向后兼容
export type {
  UploadFile,
  UploadState,
  UseUnifiedUploadReturn,
  UseUnifiedUploadConfig,
  UploadProgressEvent,
  UploadCompleteEvent,
  UploadErrorEvent,
  BatchUploadState,
  UploadStatistics,
  UploadHealthStatus
} from './types/upload-hook-types';
