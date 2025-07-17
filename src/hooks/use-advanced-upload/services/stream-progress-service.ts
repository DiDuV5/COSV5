/**
 * @fileoverview 流式上传进度追踪服务
 * @description 使用tRPC subscription实现实时进度追踪
 * @author Augment AI
 * @date 2025-06-30
 * @version 1.0.0
 */

import { useCallback, useRef, useEffect } from 'react';
import { api } from '@/trpc/react';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/api/root';

// 创建vanilla tRPC客户端用于非Hook环境
const vanillaApi = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      transformer: superjson,
      headers: () => ({
        'x-trpc-source': 'vanilla-client',
      }),
    }),
  ],
});
import {
  AdvancedUploadProgress,
  DEFAULT_UPLOAD_CONFIG,
} from "@/lib/upload/core/index";

export interface StreamProgressServiceProps {
  updateFileProgress: (filename: string, update: Partial<AdvancedUploadProgress>) => void;
  onUploadComplete?: (filename: string, result: any) => void;
  onUploadError?: (filename: string, error: string) => void;
}

export interface UseStreamProgressReturn {
  startStreamProgress: (sessionId: string, filename: string) => void;
  stopStreamProgress: (sessionId: string) => void;
  startBatchStreamProgress: (sessions: Array<{ sessionId: string; filename: string }>) => void;
  stopAllStreamProgress: () => void;
  getActiveStreamCount: () => number;
  isStreamActive: (sessionId: string) => boolean;
  createUploadSession: (sessionId: string, filename: string, totalBytes: number) => Promise<void>;
  updateProgress: (sessionId: string, uploadedBytes: number, stage?: string) => Promise<void>;
}

/**
 * 流式进度追踪服务Hook
 */
export function useStreamProgress({
  updateFileProgress,
  onUploadComplete,
  onUploadError,
}: StreamProgressServiceProps): UseStreamProgressReturn {
  const activeStreamsRef = useRef<Map<string, { filename: string; unsubscribe: () => void }>>(new Map());
  const batchStreamRef = useRef<{ unsubscribe: () => void } | null>(null);

  // tRPC mutations和subscriptions
  const createSessionMutation = api.upload.createUploadSession.useMutation();
  const updateProgressMutation = api.upload.updateUploadProgress.useMutation();

  /**
   * 创建上传会话
   */
  const createUploadSession = useCallback(async (
    sessionId: string,
    filename: string,
    totalBytes: number
  ): Promise<void> => {
    try {
      await createSessionMutation.mutateAsync({
        sessionId,
        filename,
        totalBytes
      });
      console.log(`📊 创建上传会话: ${sessionId} (${filename})`);
    } catch (error) {
      console.error('创建上传会话失败:', error);
      throw error;
    }
  }, [createSessionMutation]);

  /**
   * 更新上传进度
   */
  const updateProgress = useCallback(async (
    sessionId: string,
    uploadedBytes: number,
    stage?: string
  ): Promise<void> => {
    try {
      await updateProgressMutation.mutateAsync({
        sessionId,
        uploadedBytes,
        stage: stage as 'upload' | 'thumbnail' | 'transcode' | 'finalize'
      });
    } catch (error) {
      console.error('更新上传进度失败:', error);
    }
  }, [updateProgressMutation]);

  /**
   * 开始单个文件的流式进度追踪
   */
  const startStreamProgress = useCallback((sessionId: string, filename: string) => {
    // 如果已经在追踪，先停止
    if (activeStreamsRef.current.has(sessionId)) {
      stopStreamProgress(sessionId);
    }

    console.log(`🌊 开始流式进度追踪: ${sessionId} (${filename})`);

    // 使用轮询方式替代订阅
    const pollProgress = async () => {
      try {
        const progressData = await vanillaApi.upload.streamUploadProgress.query({ sessionId });
        console.log(`📊 收到进度更新: ${sessionId}`, progressData);

        if (progressData) {
          const { progress, status, filename: sessionFilename } = progressData;

          updateFileProgress(filename, {
            progress,
            status: status as any
          });

          if (status === 'completed') {
            onUploadComplete?.(filename, progressData);
            stopStreamProgress(sessionId);
            return;
          } else if (status === 'error') {
            onUploadError?.(filename, '上传失败');
            stopStreamProgress(sessionId);
            return;
          }

          // 继续轮询
          if (activeStreamsRef.current.has(sessionId)) {
            setTimeout(pollProgress, 1000); // 每秒轮询一次
          }
        }
      } catch (error) {
        console.error(`❌ 流式进度错误: ${sessionId}`, error);
        onUploadError?.(filename, error instanceof Error ? error.message : '获取进度失败');
        stopStreamProgress(sessionId);
      }
    };

    // 开始轮询
    pollProgress();

    // 保存轮询引用
    activeStreamsRef.current.set(sessionId, {
      filename,
      unsubscribe: () => {
        console.log(`🔌 停止轮询: ${sessionId}`);
      }
    });
  }, [updateFileProgress, onUploadComplete, onUploadError]);

  /**
   * 停止单个文件的流式进度追踪
   */
  const stopStreamProgress = useCallback((sessionId: string) => {
    const stream = activeStreamsRef.current.get(sessionId);
    if (stream) {
      stream.unsubscribe();
      activeStreamsRef.current.delete(sessionId);
      console.log(`🛑 停止流式进度追踪: ${sessionId}`);
    }
  }, []);

  /**
   * 开始批量文件的流式进度追踪
   */
  const startBatchStreamProgress = useCallback((
    sessions: Array<{ sessionId: string; filename: string }>
  ) => {
    // 停止现有的批量追踪
    if (batchStreamRef.current) {
      batchStreamRef.current.unsubscribe();
    }

    const sessionIds = sessions.map(s => s.sessionId);
    console.log(`🌊 开始批量流式进度追踪: ${sessionIds.length}个会话`);

    // 使用轮询方式替代批量订阅
    const pollBatchProgress = async () => {
      try {
        // 为每个会话查询进度
        const progressPromises = sessionIds.map(sessionId =>
          vanillaApi.upload.streamUploadProgress.query({ sessionId })
        );

        const progressResults = await Promise.all(progressPromises);

        progressResults.forEach((progressData: any, index: number) => {
          if (progressData) {
            const session = sessions[index];
            if (session) {
              const { progress, status } = progressData;

              updateFileProgress(session.filename, {
                progress,
                status: status as any
              });

              if (status === 'completed') {
                onUploadComplete?.(session.filename, progressData);
              } else if (status === 'error') {
                onUploadError?.(session.filename, '上传失败');
              }
            }
          }
        });

        // 检查是否所有上传都完成
        const allCompleted = progressResults.every((result: any) =>
          result && (result.status === 'completed' || result.status === 'error')
        );

        if (allCompleted) {
          console.log(`✅ 批量流式进度完成`);
          batchStreamRef.current = null;
        } else if (batchStreamRef.current) {
          // 继续轮询
          setTimeout(pollBatchProgress, 1000);
        }
      } catch (error) {
        console.error(`❌ 批量流式进度错误:`, error);
        sessions.forEach(session => {
          onUploadError?.(session.filename, error instanceof Error ? error.message : '获取进度失败');
        });
        batchStreamRef.current = null;
      }
    };

    // 开始轮询
    pollBatchProgress();

    batchStreamRef.current = {
      unsubscribe: () => {
        console.log(`🔌 停止批量轮询`);
      }
    };
  }, [updateFileProgress, onUploadComplete, onUploadError]);

  /**
   * 停止所有流式进度追踪
   */
  const stopAllStreamProgress = useCallback(() => {
    // 停止所有单个流
    for (const [sessionId] of activeStreamsRef.current) {
      stopStreamProgress(sessionId);
    }

    // 停止批量流
    if (batchStreamRef.current) {
      batchStreamRef.current.unsubscribe();
      batchStreamRef.current = null;
    }

    console.log(`🛑 停止所有流式进度追踪`);
  }, [stopStreamProgress]);

  /**
   * 获取活跃流数量
   */
  const getActiveStreamCount = useCallback(() => {
    return activeStreamsRef.current.size + (batchStreamRef.current ? 1 : 0);
  }, []);

  /**
   * 检查流是否活跃
   */
  const isStreamActive = useCallback((sessionId: string) => {
    return activeStreamsRef.current.has(sessionId);
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopAllStreamProgress();
    };
  }, [stopAllStreamProgress]);

  return {
    startStreamProgress,
    stopStreamProgress,
    startBatchStreamProgress,
    stopAllStreamProgress,
    getActiveStreamCount,
    isStreamActive,
    createUploadSession,
    updateProgress,
  };
}
