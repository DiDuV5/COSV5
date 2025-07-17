/**
 * @fileoverview 流式上传Hook
 * @description 提供流式上传功能的React Hook，解决内存问题
 * @author Augment AI
 * @date 2025-06-30
 * @version 1.0.0 - 紧急修复版本
 */

import { useState, useCallback, useRef } from 'react';
import { api } from '@/trpc/react';

/**
 * 流式上传配置
 */
export interface StreamUploadConfig {
  chunkSize: number;           // 分片大小 (bytes)
  maxConcurrentChunks: number; // 最大并发分片数
  maxRetries: number;          // 最大重试次数
  enableMemoryMonitoring: boolean; // 启用内存监控
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: StreamUploadConfig = {
  chunkSize: 1024 * 1024,      // 1MB
  maxConcurrentChunks: 3,      // 3个并发
  maxRetries: 3,
  enableMemoryMonitoring: true,
};

/**
 * 上传状态
 */
export type StreamUploadStatus = 'idle' | 'initializing' | 'uploading' | 'paused' | 'completed' | 'failed';

/**
 * 分片信息
 */
export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  attempts: number;
  progress: number;
  error?: string;
}

/**
 * 上传会话状态
 */
export interface StreamUploadSession {
  sessionId: string;
  filename: string;
  fileSize: number;
  totalChunks: number;
  completedChunks: number;
  chunks: ChunkInfo[];
  status: StreamUploadStatus;
  progress: number;
  uploadedBytes: number;
  startTime: Date;
  error?: string;
  memoryUsage?: {
    percentage: number;
    warning: boolean;
  };
}

/**
 * Hook返回值
 */
export interface UseStreamUploadReturn {
  // 状态
  session: StreamUploadSession | null;
  isUploading: boolean;
  isCompleted: boolean;
  isFailed: boolean;

  // 操作
  uploadFile: (file: File, options?: Partial<StreamUploadConfig>) => Promise<void>;
  pauseUpload: () => void;
  resumeUpload: () => void;
  cancelUpload: () => Promise<void>;
  resetUpload: () => void;

  // 进度
  progress: number;
  uploadedBytes: number;
  totalBytes: number;

  // 内存监控
  memoryUsage: { percentage: number; warning: boolean } | null;

  // 错误
  error: string | null;
}

/**
 * 流式上传Hook
 */
export function useStreamUpload(): UseStreamUploadReturn {
  const [session, setSession] = useState<StreamUploadSession | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileRef = useRef<File | null>(null);
  const configRef = useRef<StreamUploadConfig>(DEFAULT_CONFIG);

  // tRPC mutations
  const initUploadMutation = api.upload.streamUploadInit.useMutation();
  const uploadChunkMutation = api.upload.streamUploadChunk.useMutation();
  const cancelUploadMutation = api.upload.streamUploadCancel.useMutation();
  const progressQuery = api.upload.streamUploadProgress.useQuery;

  /**
   * 创建分片信息
   */
  const createChunks = useCallback((file: File, chunkSize: number): ChunkInfo[] => {
    const chunks: ChunkInfo[] = [];
    const totalChunks = Math.ceil(file.size / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);

      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        status: 'pending',
        attempts: 0,
        progress: 0,
      });
    }

    return chunks;
  }, []);

  /**
   * 读取文件分片
   */
  const readChunk = useCallback(async (file: File, start: number, end: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resolve(btoa(binary));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(start, end));
    });
  }, []);

  /**
   * 上传单个分片
   */
  const uploadChunk = useCallback(async (
    chunk: ChunkInfo,
    sessionId: string,
    file: File,
    totalChunks: number
  ): Promise<boolean> => {
    if (chunk.status === 'completed') return true;

    try {
      chunk.status = 'uploading';
      setSession(prev => prev ? { ...prev, chunks: [...prev.chunks] } : null);

      // 读取分片数据
      const chunkData = await readChunk(file, chunk.start, chunk.end);

      // 上传分片
      const result = await uploadChunkMutation.mutateAsync({
        sessionId,
        chunkIndex: chunk.index,
        chunkData,
        isLastChunk: chunk.index === totalChunks - 1,
      });

      chunk.status = 'completed';
      chunk.progress = 100;

      // 更新会话状态
      setSession(prev => {
        if (!prev) return null;

        const completedChunks = prev.chunks.filter(c => c.status === 'completed').length;
        const progress = (completedChunks / prev.totalChunks) * 100;
        const uploadedBytes = prev.chunks
          .filter(c => c.status === 'completed')
          .reduce((sum, c) => sum + c.size, 0);

        return {
          ...prev,
          completedChunks,
          progress,
          uploadedBytes,
          chunks: [...prev.chunks],
          status: result.success ? 'completed' : 'uploading',
        };
      });

      return result.success;

    } catch (error) {
      console.error(`❌ 分片 ${chunk.index} 上传失败:`, error);
      chunk.attempts++;

      if (chunk.attempts >= configRef.current.maxRetries) {
        chunk.status = 'failed';
        chunk.error = error instanceof Error ? error.message : '上传失败';
        setError(`分片 ${chunk.index} 上传失败: ${chunk.error}`);
        return false;
      } else {
        chunk.status = 'pending';
        return false;
      }
    }
  }, [readChunk, uploadChunkMutation]);

  /**
   * 上传所有分片
   */
  const uploadAllChunks = useCallback(async (
    session: StreamUploadSession,
    file: File
  ): Promise<void> => {
    const { chunks, sessionId, totalChunks } = session;
    const config = configRef.current;

    // 创建上传队列
    const pendingChunks = chunks.filter(chunk => chunk.status === 'pending');
    const activeUploads = new Set<Promise<boolean>>();

    while (pendingChunks.length > 0 || activeUploads.size > 0) {
      // 检查是否暂停
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = () => {
            if (!isPaused) {
              resolve(void 0);
            } else {
              setTimeout(checkPause, 100);
            }
          };
          checkPause();
        });
      }

      // 启动新的上传任务
      while (pendingChunks.length > 0 && activeUploads.size < config.maxConcurrentChunks) {
        const chunk = pendingChunks.shift()!;
        const uploadPromise = uploadChunk(chunk, sessionId, file, totalChunks)
          .finally(() => {
            activeUploads.delete(uploadPromise);
          });
        activeUploads.add(uploadPromise);
      }

      // 等待至少一个任务完成
      if (activeUploads.size > 0) {
        const results = await Promise.allSettled(Array.from(activeUploads));

        // 检查是否有任务完成
        const completed = results.some(result =>
          result.status === 'fulfilled' && result.value === true
        );

        if (completed) {
          break; // 上传完成
        }

        // 检查是否有失败的分片需要重试
        const failedChunks = chunks.filter(chunk =>
          chunk.status === 'pending' && chunk.attempts < config.maxRetries
        );
        pendingChunks.push(...failedChunks);
      }
    }
  }, [uploadChunk, isPaused]);

  /**
   * 开始上传文件
   */
  const uploadFile = useCallback(async (
    file: File,
    options: Partial<StreamUploadConfig> = {}
  ): Promise<void> => {
    try {
      setError(null);
      configRef.current = { ...DEFAULT_CONFIG, ...options };
      fileRef.current = file;

      // 创建中止控制器
      abortControllerRef.current = new AbortController();

      console.log(`🚀 开始流式上传: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);

      // 初始化上传会话
      setSession(prev => prev ? { ...prev, status: 'initializing' } : null);

      const initResult = await initUploadMutation.mutateAsync({
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      // 创建分片
      const chunks = createChunks(file, configRef.current.chunkSize);

      // 创建会话
      const newSession: StreamUploadSession = {
        sessionId: initResult.sessionId,
        filename: file.name,
        fileSize: file.size,
        totalChunks: chunks.length,
        completedChunks: 0,
        chunks,
        status: 'uploading',
        progress: 0,
        uploadedBytes: 0,
        startTime: new Date(),
        // memoryUsage: initResult.memoryUsage, // 属性不存在，移除
      };

      setSession(newSession);

      // 开始上传分片
      await uploadAllChunks(newSession, file);

      console.log(`✅ 流式上传完成: ${file.name}`);

    } catch (error) {
      console.error('❌ 流式上传失败:', error);
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setError(errorMessage);
      setSession(prev => prev ? { ...prev, status: 'failed', error: errorMessage } : null);
    }
  }, [initUploadMutation, createChunks, uploadAllChunks]);

  /**
   * 暂停上传
   */
  const pauseUpload = useCallback(() => {
    setIsPaused(true);
    setSession(prev => prev ? { ...prev, status: 'paused' } : null);
    console.log('⏸️ 暂停流式上传');
  }, []);

  /**
   * 恢复上传
   */
  const resumeUpload = useCallback(() => {
    setIsPaused(false);
    setSession(prev => prev ? { ...prev, status: 'uploading' } : null);
    console.log('▶️ 恢复流式上传');
  }, []);

  /**
   * 取消上传
   */
  const cancelUpload = useCallback(async () => {
    try {
      if (session?.sessionId) {
        await cancelUploadMutation.mutateAsync({ sessionId: session.sessionId });
      }

      abortControllerRef.current?.abort();
      setSession(null);
      setError(null);
      setIsPaused(false);
      console.log('🚫 取消流式上传');
    } catch (error) {
      console.error('❌ 取消上传失败:', error);
    }
  }, [session, cancelUploadMutation]);

  /**
   * 重置上传状态
   */
  const resetUpload = useCallback(() => {
    setSession(null);
    setError(null);
    setIsPaused(false);
    fileRef.current = null;
    abortControllerRef.current = null;
  }, []);

  return {
    // 状态
    session,
    isUploading: session?.status === 'uploading' || session?.status === 'initializing',
    isCompleted: session?.status === 'completed',
    isFailed: session?.status === 'failed',

    // 操作
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    resetUpload,

    // 进度
    progress: session?.progress || 0,
    uploadedBytes: session?.uploadedBytes || 0,
    totalBytes: session?.fileSize || 0,

    // 内存监控
    memoryUsage: session?.memoryUsage || null,

    // 错误
    error,
  };
}
