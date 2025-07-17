/**
 * @fileoverview 高级媒体上传钩子 (重构版)
 * @description 使用新的图片多尺寸处理和视频缩略图生成功能的上传钩子，采用模块化架构
 * @author Augment AI
 * @date 2025-06-15
 * @version 2.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - @/api/trpc: tRPC 客户端
 * - @/lib/media: 媒体处理系统
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，支持图片多尺寸和视频缩略图
 * - 2025-06-28: 重命名为use-advanced-upload.ts以符合命名规范
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

import { useCallback, useRef } from 'react';
import { api, getUploadClient } from '@/trpc/react';

// 导入拆分的模块
import { useUploadState } from './use-advanced-upload/hooks/use-upload-state';
import { useProgressTracking } from './use-advanced-upload/services/progress-tracking-service';
import {
  fileToBase64,
  validateFiles,
  createUploadError,
  getFriendlyErrorMessage,
  calculateRetryDelay,
  checkIsVideo,
} from './use-advanced-upload/utils/file-processing-utils';
import { checkNetworkStatus } from './use-advanced-upload/utils/network-utils';
import {
  AdvancedUploadResult,
  AdvancedUploadOptions,
  AdvancedUploadProgress,
  DEFAULT_UPLOAD_CONFIG,
} from "@/lib/upload/core/index";

// 重新导出类型以保持向后兼容
export type {
  ProcessedImage,
  VideoThumbnail,
  AdvancedUploadResult,
  AdvancedUploadProgress,
  AdvancedUploadOptions,
  DEFAULT_UPLOAD_CONFIG,
} from "@/lib/upload/core/index";

/**
 * 重构后的高级上传Hook
 */
export function useAdvancedUpload(options: AdvancedUploadOptions = {}) {
  const abortControllerRef = useRef<AbortController | null>(null);

  // 使用拆分的状态管理Hook
  const uploadState = useUploadState();

  // 使用拆分的进度跟踪服务
  const progressTracking = useProgressTracking({
    updateFileProgress: uploadState.updateFileProgress,
    updateTranscodingSession: uploadState.updateTranscodingSession,
  });

  // 使用统一上传API - 通过专用上传客户端解决HTTP/2问题
  const uploadMutation = api.upload.upload.useMutation();

  /**
   * 重置上传状态
   */
  const resetUpload = useCallback(() => {
    uploadState.resetUploadState();
    abortControllerRef.current = null;
    progressTracking.stopProgressTracking();
  }, [uploadState, progressTracking]);

  /**
   * 取消上传
   */
  const cancelUpload = useCallback(() => {
    console.log('🛑 取消上传操作');

    // 取消网络请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 停止进度跟踪
    progressTracking.stopProgressTracking();

    // 更新状态
    uploadState.setIsUploading(false);
    uploadState.setUploadProgress(0);
    uploadState.setTranscodingSessions(new Set());

    // 将所有进行中的文件标记为取消
    uploadState.fileProgresses.forEach(file => {
      if (file.status === 'uploading' || file.status === 'processing') {
        uploadState.updateFileProgress(file.fileName, {
          status: 'error',
          error: '用户取消上传',
          progress: 0
        });
      }
    });

    console.log('✅ 上传已取消');
  }, [uploadState, progressTracking]);

  /**
   * 带重试的上传单个文件
   */
  const uploadSingleFileWithRetry = useCallback(async (
    file: File,
    signal?: AbortSignal,
    retryCount = 0
  ): Promise<AdvancedUploadResult | null> => {
    const maxRetries = DEFAULT_UPLOAD_CONFIG.retryConfig.maxAttempts;

    try {
      return await uploadSingleFileInternal(file, signal);
    } catch (error) {
      const uploadError = createUploadError(error as Error, file.name);

      // 如果是网络错误且还有重试次数
      if (uploadError.retryable && retryCount < maxRetries) {
        console.log(`🔄 网络错误，准备重试 ${retryCount + 1}/${maxRetries}: ${file.name}`);

        // 更新状态为重试中
        uploadState.updateFileProgress(file.name, {
          status: 'uploading',
          progress: 0,
          error: `网络异常，重试中 (${retryCount + 1}/${maxRetries})...`
        });

        // 等待一段时间后重试
        const delay = calculateRetryDelay(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));

        // 检查网络状态
        const networkStatus = await checkNetworkStatus();
        if (!networkStatus.isOnline) {
          throw new Error('网络连接不可用，无法重试');
        }

        return await uploadSingleFileWithRetry(file, signal, retryCount + 1);
      }

      throw error;
    }
  }, [uploadState]);

  /**
   * 上传单个文件的内部实现
   */
  const uploadSingleFileInternal = useCallback(async (
    file: File,
    signal?: AbortSignal
  ): Promise<AdvancedUploadResult> => {
    console.log(`📤 开始上传文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    const isVideo = checkIsVideo(file);

    // 更新进度 - 开始上传
    uploadState.updateFileProgress(file.name, {
      status: 'uploading',
      progress: 0
    });

    try {
      // 转换文件为Base64
      const fileData = await fileToBase64(file);

      // 更新进度 - 文件转换完成
      uploadState.updateFileProgress(file.name, {
        status: 'uploading',
        progress: 10
      });

      // 使用专用上传客户端调用统一上传API（解决HTTP/2协议问题）
      const uploadClient = getUploadClient();
      const result = await uploadClient.upload.upload.mutate({
        fileData,
        filename: file.name,
        mimeType: file.type,
        postId: options.postId,
        metadata: options.metadata,
        enableDeduplication: DEFAULT_UPLOAD_CONFIG.enableDeduplication,
        generateThumbnails: DEFAULT_UPLOAD_CONFIG.generateThumbnails,
        autoTranscode: DEFAULT_UPLOAD_CONFIG.autoTranscode,
        generateMultipleSizes: DEFAULT_UPLOAD_CONFIG.generateMultipleSizes,
        imageQuality: DEFAULT_UPLOAD_CONFIG.imageQuality,
        // 新增的统一API参数
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        priority: 'normal',
        enableStreaming: true
      });

      console.log(`✅ 文件处理完成: ${file.name}`, result);

      // 更新进度 - 处理完成
      uploadState.updateFileProgress(file.name, {
        status: 'completed',
        progress: 100
      });

      // 调用回调
      options.onFileComplete?.(file.name, result as any);
      options.onFileProgress?.(file.name, 100);

      return result as any;

    } catch (error) {
      const uploadError = createUploadError(error as Error, file.name);
      const friendlyMessage = getFriendlyErrorMessage(uploadError);

      console.error(`❌ 文件上传失败: ${file.name}`, error);

      uploadState.updateFileProgress(file.name, {
        status: 'error',
        error: friendlyMessage,
        progress: 0
      });

      // 调用错误回调
      options.onFileError?.(file.name, friendlyMessage);
      options.onError?.(friendlyMessage, file.name);

      throw error;
    }
  }, [uploadState, uploadMutation, options]);

  /**
   * 批量上传文件
   */
  const uploadFiles = useCallback(async (
    files: File[]
  ): Promise<AdvancedUploadResult[]> => {
    if (files.length === 0) return [];

    console.log(`🚀 开始批量上传 ${files.length} 个文件`);

    // 验证文件
    const { validFiles, errors } = validateFiles(files);

    // 处理验证错误
    errors.forEach(error => {
      uploadState.addUploadError(error.message);
      options.onError?.(error.message, error.filename);
    });

    if (validFiles.length === 0) {
      console.warn('⚠️ 没有有效的文件可以上传');
      return [];
    }

    uploadState.setIsUploading(true);
    uploadState.setUploadProgress(0);
    uploadState.setUploadResults([]);
    uploadState.setUploadErrors([]);

    // 初始化文件进度
    const initialProgresses: AdvancedUploadProgress[] = validFiles.map(file => ({
      fileId: `temp-${Date.now()}-${file.name}`,
      fileName: file.name,
      filename: file.name, // 兼容性别名
      progress: 0,
      status: 'pending' as const,
    }));
    uploadState.setFileProgresses(initialProgresses);

    // 创建取消控制器
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const results: AdvancedUploadResult[] = [];
    let completedFiles = 0;

    try {
      // 串行上传文件（避免服务器压力过大）
      for (const file of validFiles) {
        if (abortController.signal.aborted) {
          console.log('🛑 上传被取消');
          break;
        }

        let result: AdvancedUploadResult | null = null;

        try {
          result = await uploadSingleFileWithRetry(file, abortController.signal);
          if (result) {
            results.push(result);
            uploadState.addUploadResult(result);
          }
        } catch (error) {
          console.error(`❌ 文件上传失败: ${file.name}`, error);
          uploadState.addUploadError(`${file.name}: ${(error as Error).message}`);
        }

        completedFiles++;
        const overallProgress = Math.round((completedFiles / validFiles.length) * 100);
        uploadState.setUploadProgress(overallProgress);

        // 调用进度回调，传递最后一个文件的进度信息
        if (options.onProgress && result) {
          options.onProgress({
            fileId: result.fileId || '',
            fileName: file.name,
            filename: file.name, // 兼容性别名
            progress: 100,
            status: 'completed'
          });
        }
      }

      console.log(`🎉 批量上传完成，成功: ${results.length}/${validFiles.length}`);
      return results;

    } finally {
      uploadState.setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [uploadState, uploadSingleFileWithRetry, options]);

  return {
    // 状态
    isUploading: uploadState.isUploading,
    uploadProgress: uploadState.uploadProgress,
    uploadResults: uploadState.uploadResults,
    uploadErrors: uploadState.uploadErrors,
    fileProgresses: uploadState.fileProgresses,

    // 操作
    uploadFiles,
    cancelUpload,
    resetUpload,

    // 扩展功能
    getUploadStats: uploadState.getUploadStats,
    getProcessingFiles: uploadState.getProcessingFiles,
    getFailedFiles: uploadState.getFailedFiles,
    getCompletedFiles: uploadState.getCompletedFiles,
    isAllFilesCompleted: uploadState.isAllFilesCompleted,
    hasProcessingFiles: uploadState.hasProcessingFiles,
  };
}
