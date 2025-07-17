/**
 * @fileoverview 上传进度跟踪服务
 * @description 处理转码进度轮询和状态更新
 */

import { useCallback, useRef } from 'react';
import { api } from '@/trpc/react';
import {
  AdvancedUploadProgress,
  TranscodingSession,
  TRANSCODING_STATUS_TEXT,
  DEFAULT_UPLOAD_CONFIG,
} from "@/lib/upload/core/index";

export interface ProgressTrackingServiceProps {
  updateFileProgress: (filename: string, update: Partial<AdvancedUploadProgress>) => void;
  updateTranscodingSession: (sessionId: string, action: 'add' | 'remove') => void;
}

export interface UseProgressTrackingReturn {
  startProgressTracking: (sessionId: string, filename: string) => void;
  stopProgressTracking: () => void;
  getTranscodingStatusText: (stage: string, progress: number) => string;
  startBatchProgressTracking: (sessions: Array<{ sessionId: string; filename: string }>) => void;
  getActiveSessionCount: () => number;
  isSessionActive: (sessionId: string) => boolean;
  stopSessionTracking: (sessionId: string) => void;
  cleanupCompletedSessions: () => void;
}

/**
 * 进度跟踪服务Hook
 */
export function useProgressTracking({
  updateFileProgress,
  updateTranscodingSession,
}: ProgressTrackingServiceProps): UseProgressTrackingReturn {
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionsRef = useRef<Set<string>>(new Set());

  // 转码进度相关API
  const getProgressQuery = api.transcodingProgress.getProgress.useQuery;

  /**
   * 轮询转码进度
   */
  const pollTranscodingProgress = useCallback(async (
    sessionId: string,
    filename: string
  ): Promise<boolean> => {
    try {
      const progressData = await getProgressQuery({ sessionId }).refetch();

      if (!progressData.data) {
        console.warn(`⚠️ 无法获取转码进度: ${sessionId}`);
        return false;
      }

      const { stage, progress, isCompleted, error } = progressData.data as TranscodingSession;

      if (error) {
        console.error(`❌ 转码失败: ${filename}`, error);
        updateFileProgress(filename, {
          status: 'error',
          error: error,
          progress: 0,
          statusText: '转码失败'
        });
        updateTranscodingSession(sessionId, 'remove');
        return false;
      }

      if (isCompleted) {
        console.log(`✅ 转码完成: ${filename}`);
        updateFileProgress(filename, {
          status: 'completed',
          progress: 100,
          statusText: '转码完成'
        });
        updateTranscodingSession(sessionId, 'remove');
        return false;
      }

      // 更新进度
      const statusText = getTranscodingStatusText(stage, progress);
      updateFileProgress(filename, {
        status: 'transcoding',
        progress: Math.max(0, Math.min(100, progress)),
        statusText,
        fileId: sessionId,
        fileName: filename,
        filename
      });

      return true; // 继续轮询
    } catch (error) {
      console.error(`❌ 轮询转码进度失败: ${filename}`, error);
      updateFileProgress(filename, {
        status: 'error',
        error: '获取转码进度失败',
        progress: 0
      });
      updateTranscodingSession(sessionId, 'remove');
      return false;
    }
  }, [getProgressQuery, updateFileProgress, updateTranscodingSession]);

  /**
   * 开始进度跟踪
   */
  const startProgressTracking = useCallback((sessionId: string, filename: string) => {
    console.log(`🔄 开始跟踪转码进度: ${filename} (${sessionId})`);

    // 添加到活动会话
    activeSessionsRef.current.add(sessionId);
    updateTranscodingSession(sessionId, 'add');

    // 轮询进度的内部函数
    const pollProgress = async (): Promise<boolean> => {
      try {
        // 检查会话是否仍然活动
        if (!activeSessionsRef.current.has(sessionId)) {
          return false;
        }

        return await pollTranscodingProgress(sessionId, filename);
      } catch (error) {
        console.error(`❌ 轮询进度时发生错误: ${filename}`, error);
        activeSessionsRef.current.delete(sessionId);
        updateTranscodingSession(sessionId, 'remove');
        return false;
      }
    };

    // 立即执行一次，然后每2秒轮询
    pollProgress().then(shouldContinue => {
      if (shouldContinue && activeSessionsRef.current.has(sessionId)) {
        const interval = setInterval(async () => {
          const shouldContinue = await pollProgress();
          if (!shouldContinue) {
            clearInterval(interval);
            activeSessionsRef.current.delete(sessionId);
          }
        }, DEFAULT_UPLOAD_CONFIG.progressPollInterval);

        // 保存interval引用以便清理
        progressIntervalRef.current = interval;
      } else {
        activeSessionsRef.current.delete(sessionId);
      }
    });
  }, [pollTranscodingProgress, updateTranscodingSession]);

  /**
   * 停止进度跟踪
   */
  const stopProgressTracking = useCallback(() => {
    console.log('🛑 停止所有进度跟踪');

    // 清除定时器
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // 清除所有活动会话
    activeSessionsRef.current.clear();
  }, []);

  /**
   * 获取转码状态文本
   */
  const getTranscodingStatusText = useCallback((stage: string, progress: number): string => {
    switch (stage) {
      case 'uploading':
        return TRANSCODING_STATUS_TEXT.uploading;
      case 'transcoding':
        return `${TRANSCODING_STATUS_TEXT.transcoding.replace('...', '')} ${progress}%`;
      case 'finalizing':
        return TRANSCODING_STATUS_TEXT.finalizing;
      case 'completed':
        return TRANSCODING_STATUS_TEXT.completed;
      case 'failed':
        return TRANSCODING_STATUS_TEXT.failed;
      default:
        return TRANSCODING_STATUS_TEXT.default;
    }
  }, []);

  /**
   * 批量开始进度跟踪
   */
  const startBatchProgressTracking = useCallback((
    sessions: Array<{ sessionId: string; filename: string }>
  ) => {
    sessions.forEach(({ sessionId, filename }) => {
      startProgressTracking(sessionId, filename);
    });
  }, [startProgressTracking]);

  /**
   * 获取活动会话数量
   */
  const getActiveSessionCount = useCallback(() => {
    return activeSessionsRef.current.size;
  }, []);

  /**
   * 检查特定会话是否活动
   */
  const isSessionActive = useCallback((sessionId: string) => {
    return activeSessionsRef.current.has(sessionId);
  }, []);

  /**
   * 停止特定会话的跟踪
   */
  const stopSessionTracking = useCallback((sessionId: string) => {
    activeSessionsRef.current.delete(sessionId);
    updateTranscodingSession(sessionId, 'remove');
  }, [updateTranscodingSession]);

  /**
   * 清理已完成的会话
   */
  const cleanupCompletedSessions = useCallback(() => {
    // 这个方法可以用来清理已经完成但可能没有正确移除的会话
    // 在实际使用中，可以定期调用这个方法来确保内存不会泄漏
    console.log('🧹 清理已完成的转码会话');

    // 这里可以添加额外的清理逻辑
    // 比如检查数据库中的会话状态，移除已完成的会话等
  }, []);

  return {
    startProgressTracking,
    stopProgressTracking,
    getTranscodingStatusText,
    startBatchProgressTracking,
    getActiveSessionCount,
    isSessionActive,
    stopSessionTracking,
    cleanupCompletedSessions,
  };
}
