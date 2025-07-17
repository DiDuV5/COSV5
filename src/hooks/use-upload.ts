/**
 * @fileoverview 文件上传钩子
 * @description 处理文件上传逻辑的自定义钩子，集成统一错误处理
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.1.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - @/api/trpc: tRPC 客户端
 * - @/lib/errors/recovery-manager: 错误恢复管理
 * - @/lib/errors/error-messages: 错误消息映射
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 集成统一错误处理和恢复机制 (v1.1.0)
 * - 2025-06-28: 重命名为use-upload.ts以符合命名规范
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/trpc/react';
import {
  handleClientUploadError,
  retryClientOperation,
  type ClientUploadError,
  type ClientErrorContext
} from '@/lib/errors/client-error-handler';
import { useSession } from 'next-auth/react';
import { UserLevel } from '@/types/user-level';

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GIF';
  width?: number;
  height?: number;
  duration?: number;
  fileSize: number;
  isDuplicate?: boolean;
}

export interface UploadError extends ClientUploadError {}

export interface FileUploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  onFileComplete?: (file: UploadedFile) => void;
  onError?: (error: UploadError) => void;
}

export function useUpload(options: UploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadedFile[]>([]);
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
  const [fileProgresses, setFileProgresses] = useState<FileUploadProgress[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取用户会话信息
  const { data: session } = useSession();

  // 获取统一用户上传配置
  const { data: uploadConfig } = api.upload.getUserUploadConfig.useQuery(undefined, {
    enabled: !!session?.user?.id, // 只有在用户登录时才获取配置
  });

  // 根据文件进度计算总进度
  useEffect(() => {
    if (fileProgresses.length === 0) {
      setUploadProgress(0);
      return;
    }

    const totalProgress = fileProgresses.reduce((sum, fp) => sum + fp.progress, 0);
    const averageProgress = totalProgress / fileProgresses.length;
    setUploadProgress(Math.round(averageProgress));
  }, [fileProgresses]);

  // 重置状态
  const resetUpload = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadResults([]);
    setUploadErrors([]);
    setFileProgresses([]);
    abortControllerRef.current = null;
  }, []);

  // 取消上传
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    // 将所有进行中的文件标记为取消
    setFileProgresses(prev => prev.map(fp =>
      fp.status === 'uploading' || fp.status === 'pending'
        ? { ...fp, status: 'error' as const, error: '上传已取消' }
        : fp
    ));
  }, []);

  // 更新单个文件进度
  const updateFileProgress = useCallback((filename: string, updates: Partial<FileUploadProgress>) => {
    setFileProgresses(prev => prev.map(fp =>
      fp.filename === filename ? { ...fp, ...updates } : fp
    ));
  }, []);

  // 处理错误并生成用户友好消息
  const handleUploadError = useCallback((error: unknown, filename: string): UploadError => {
    const userLevel = (session?.user?.userLevel as UserLevel) || 'GUEST';
    const context: ClientErrorContext = {
      userLevel,
      environment: process.env.NODE_ENV as 'development' | 'production',
      context: 'upload',
    };

    return handleClientUploadError(error, filename, context);
  }, [session]);

  // 上传单个文件（带重试机制）
  const uploadSingleFile = useCallback(async (
    file: File,
    postId?: string,
    signal?: AbortSignal
  ): Promise<UploadedFile | null> => {
    // 更新文件状态为上传中
    updateFileProgress(file.name, { status: 'uploading', progress: 0 });

    // 使用重试机制包装上传操作
    const uploadOperation = async (): Promise<UploadedFile | null> => {
      const formData = new FormData();
      formData.append('files', file);
      if (postId) {
        formData.append('postId', postId);
      }

      try {
        // 创建 XMLHttpRequest 以支持进度跟踪
        const xhr = new XMLHttpRequest();

        return new Promise<UploadedFile | null>((resolve, reject) => {
        // 监听上传进度
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateFileProgress(file.name, { progress });
          }
        });

        // 监听完成事件
        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);

              if (result.errors && result.errors.length > 0) {
                // 处理部分失败的情况
                const error = result.errors[0];
                const uploadError = handleUploadError(new Error(error.error), file.name);
                updateFileProgress(file.name, {
                  status: 'error',
                  error: uploadError.userMessage || error.error,
                  progress: 0
                });
                options.onError?.(uploadError);
                reject(new Error(error.error));
                return;
              }

              if (result.results && result.results.length > 0) {
                const uploadedFile = result.results[0];
                updateFileProgress(file.name, {
                  status: 'completed',
                  progress: 100,
                  uploadedFile
                });
                options.onFileComplete?.(uploadedFile);
                resolve(uploadedFile);
                return;
              }

              const uploadError = handleUploadError(new Error('上传失败：未返回结果'), file.name);
              updateFileProgress(file.name, {
                status: 'error',
                error: uploadError.userMessage || '上传失败：未返回结果',
                progress: 0
              });
              reject(new Error('上传失败：未返回结果'));
            } catch (parseError) {
              updateFileProgress(file.name, {
                status: 'error',
                error: '解析响应失败',
                progress: 0
              });
              reject(parseError);
            }
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              const errorMessage = errorData.error || '上传失败';
              updateFileProgress(file.name, {
                status: 'error',
                error: errorMessage,
                progress: 0
              });
              reject(new Error(errorMessage));
            } catch {
              updateFileProgress(file.name, {
                status: 'error',
                error: `上传失败 (${xhr.status})`,
                progress: 0
              });
              reject(new Error(`上传失败 (${xhr.status})`));
            }
          }
        });

        // 监听错误事件
        xhr.addEventListener('error', () => {
          updateFileProgress(file.name, {
            status: 'error',
            error: '网络错误',
            progress: 0
          });
          reject(new Error('网络错误'));
        });

        // 监听取消事件
        xhr.addEventListener('abort', () => {
          updateFileProgress(file.name, {
            status: 'error',
            error: '上传已取消',
            progress: 0
          });
          reject(new Error('上传已取消'));
        });

        // 如果有取消信号，监听取消事件
        if (signal) {
          signal.addEventListener('abort', () => {
            xhr.abort();
          });
        }

          // 开始上传
          xhr.open('POST', '/api/upload');
          xhr.send(formData);
        });
      } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateFileProgress(file.name, {
          status: 'error',
          error: '上传已取消',
          progress: 0
        });
        throw error;
      }

      const uploadError = handleUploadError(error, file.name);
      updateFileProgress(file.name, {
        status: 'error',
        error: uploadError.userMessage || (error instanceof Error ? error.message : '上传失败'),
        progress: 0
      });

      options.onError?.(uploadError);
      throw error;
    }
    };

    // 使用重试机制执行上传
    try {
      const retryResult = await retryClientOperation(uploadOperation, `上传文件: ${file.name}`);

      if (retryResult.success && retryResult.data) {
        return retryResult.data;
      } else {
        // 重试失败，处理最终错误
        const finalError = retryResult.error || new Error('上传失败');
        const uploadError = handleUploadError(finalError, file.name);

        updateFileProgress(file.name, {
          status: 'error',
          error: uploadError.userMessage || finalError.message,
          progress: 0
        });

        options.onError?.(uploadError);
        throw finalError;
      }
    } catch (error) {
      // 处理重试机制外的错误
      if (error instanceof Error && error.name === 'AbortError') {
        updateFileProgress(file.name, {
          status: 'error',
          error: '上传已取消',
          progress: 0
        });
        throw error;
      }

      const uploadError = handleUploadError(error, file.name);
      updateFileProgress(file.name, {
        status: 'error',
        error: uploadError.userMessage || '上传失败',
        progress: 0
      });

      options.onError?.(uploadError);
      throw error;
    }
  }, [options, updateFileProgress, handleUploadError]);

  // 批量上传文件
  const uploadFiles = useCallback(async (
    files: File[],
    postId?: string
  ): Promise<UploadedFile[]> => {
    if (files.length === 0) return [];

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResults([]);
    setUploadErrors([]);

    // 初始化文件进度
    const initialProgresses: FileUploadProgress[] = files.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'pending' as const,
    }));
    setFileProgresses(initialProgresses);

    // 创建取消控制器
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const results: UploadedFile[] = [];
    const errors: UploadError[] = [];

    try {
      // 并发上传文件（限制并发数）
      const concurrentLimit = 3;
      const chunks: File[][] = [];

      for (let i = 0; i < files.length; i += concurrentLimit) {
        chunks.push(files.slice(i, i + concurrentLimit));
      }

      let completedFiles = 0;

      for (const chunk of chunks) {
        if (abortController.signal.aborted) {
          break;
        }

        const chunkPromises = chunk.map(async (file) => {
          try {
            const result = await uploadSingleFile(file, postId, abortController.signal);
            if (result) {
              results.push(result);
            }
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              throw error;
            }
            const uploadError = handleUploadError(error, file.name);
            errors.push(uploadError);
          } finally {
            completedFiles++;
            // 进度现在由 useEffect 根据 fileProgresses 自动计算
            options.onProgress?.(Math.round((completedFiles / files.length) * 100));
          }
        });

        await Promise.allSettled(chunkPromises);
      }

      setUploadResults(results);
      setUploadErrors(errors);

      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('上传已取消');
        return results;
      }

      console.error('批量上传失败:', error);
      throw error;
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  }, [uploadSingleFile, options, handleUploadError]);

  // 上传单个文件（简化版本）
  const uploadFile = useCallback(async (
    file: File,
    postId?: string
  ): Promise<UploadedFile | null> => {
    return uploadFiles([file], postId).then(results => results[0] || null);
  }, [uploadFiles]);

  // 检查文件是否有效
  const validateFile = useCallback((file: File): string | null => {
    if (!uploadConfig) return null;

    // 检查文件大小
    if (file.size > uploadConfig.maxFileSize) {
      return `文件大小不能超过 ${Math.round(uploadConfig.maxFileSize / 1024 / 1024)}MB`;
    }

    // 检查文件类型
    if (!uploadConfig.allowedTypes.includes(file.type)) {
      return `不支持的文件类型: ${file.type}`;
    }

    // 检查权限（基于用户等级）
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const userLevel = uploadConfig.userLevel as UserLevel;

    // 基于用户等级的权限检查
    if (isVideo && !['CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userLevel)) {
      return '您没有上传视频的权限';
    }

    if (isImage && !['USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userLevel)) {
      return '您没有上传图片的权限';
    }

    return null;
  }, [uploadConfig]);

  // 获取上传限制信息 - 统一配置管理
  const getUploadLimits = useCallback(() => {
    if (!uploadConfig) {
      return {
        maxFileSize: 1000 * 1024 * 1024, // 默认1000MB (1GB)
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
        maxFilesPerPost: 800,
        canUploadImages: false,
        canUploadVideos: false,
        maxImagesPerUpload: 0,
        maxVideosPerUpload: 0,
      };
    }

    const userLevel = uploadConfig.userLevel as UserLevel;

    return {
      maxFileSize: uploadConfig.maxFileSize,
      allowedTypes: uploadConfig.allowedTypes,
      maxFilesPerPost: 10, // 默认值
      canUploadImages: ['USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userLevel),
      canUploadVideos: ['CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userLevel),
      maxImagesPerUpload: userLevel === 'VIP' ? 20 : userLevel === 'CREATOR' ? 50 : 10,
      maxVideosPerUpload: ['CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userLevel) ? 5 : 0,
      dailyPostsLimit: userLevel === 'VIP' ? 50 : userLevel === 'CREATOR' ? 100 : 20,
      dailyMomentsLimit: userLevel === 'VIP' ? 20 : userLevel === 'CREATOR' ? 50 : 10,
      streamThreshold: 50 * 1024 * 1024, // 50MB
      memorySafeThreshold: 100 * 1024 * 1024, // 100MB
      enableAdvancedFeatures: ['CREATOR', 'ADMIN', 'SUPER_ADMIN'].includes(userLevel),
    };
  }, [uploadConfig]);

  return {
    // 状态
    isUploading,
    uploadProgress,
    uploadResults,
    uploadErrors,
    fileProgresses,
    uploadConfig,

    // 方法
    uploadFile,
    uploadFiles,
    cancelUpload,
    resetUpload,
    validateFile,
    getUploadLimits,
  };
}
