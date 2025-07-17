/**
 * @fileoverview 视频转码Hook
 * @description 提供视频转码功能的React Hook
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - VideoTranscodingService
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-28: 重命名为use-video-transcoding.ts以符合命名规范
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface TranscodingProgress {
  percent: number;
  currentFps: number;
  currentKbps: number;
  targetSize: string;
  timemark: string;
}

export interface TranscodingJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: TranscodingProgress;
  result?: any;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface UseVideoTranscodingReturn {
  jobs: TranscodingJob[];
  isProcessing: boolean;
  addJob: (file: File, options?: any) => string;
  removeJob: (jobId: string) => void;
  clearJobs: () => void;
  startProcessing: () => Promise<void>;
  cancelProcessing: () => void;
  getJobById: (jobId: string) => TranscodingJob | undefined;
  getCompletedJobs: () => TranscodingJob[];
  getFailedJobs: () => TranscodingJob[];
  getTotalProgress: () => number;
}

export function useVideoTranscoding(): UseVideoTranscodingReturn {
  const [jobs, setJobs] = useState<TranscodingJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const jobIdCounterRef = useRef(0);

  // 生成唯一的任务ID
  const generateJobId = useCallback(() => {
    jobIdCounterRef.current += 1;
    return `job_${Date.now()}_${jobIdCounterRef.current}`;
  }, []);

  // 添加转码任务
  const addJob = useCallback((file: File, options?: any): string => {
    const jobId = generateJobId();
    const newJob: TranscodingJob = {
      id: jobId,
      filename: file.name,
      status: 'pending',
      progress: {
        percent: 0,
        currentFps: 0,
        currentKbps: 0,
        targetSize: '0kB',
        timemark: '00:00:00'
      }
    };

    setJobs(prev => [...prev, newJob]);
    return jobId;
  }, [generateJobId]);

  // 移除任务
  const removeJob = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  // 清空所有任务
  const clearJobs = useCallback(() => {
    setJobs([]);
  }, []);

  // 更新任务状态
  const updateJob = useCallback((jobId: string, updates: Partial<TranscodingJob>) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  }, []);

  // 更新任务进度
  const updateJobProgress = useCallback((jobId: string, progress: TranscodingProgress) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, progress, status: 'processing' } : job
    ));
  }, []);

  // 开始处理所有任务
  const startProcessing = useCallback(async () => {
    if (isProcessing) return;

    const pendingJobs = jobs.filter(job => job.status === 'pending');
    if (pendingJobs.length === 0) return;

    setIsProcessing(true);
    abortControllerRef.current = new AbortController();

    try {
      for (const job of pendingJobs) {
        if (abortControllerRef.current?.signal.aborted) break;

        updateJob(job.id, { 
          status: 'processing', 
          startTime: Date.now() 
        });

        try {
          // 这里应该调用实际的转码API
          // 为了演示，我们使用模拟的进度更新
          await simulateTranscoding(job.id, updateJobProgress);

          updateJob(job.id, { 
            status: 'completed', 
            endTime: Date.now(),
            result: {
              success: true,
              message: '转码完成'
            }
          });

        } catch (error) {
          updateJob(job.id, { 
            status: 'failed', 
            endTime: Date.now(),
            error: error instanceof Error ? error.message : '转码失败'
          });
        }
      }
    } catch (error) {
      console.error('批量转码失败:', error);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [jobs, isProcessing, updateJob, updateJobProgress]);

  // 取消处理
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    
    // 将正在处理的任务标记为失败
    setJobs(prev => prev.map(job => 
      job.status === 'processing' 
        ? { ...job, status: 'failed', error: '用户取消', endTime: Date.now() }
        : job
    ));
  }, []);

  // 根据ID获取任务
  const getJobById = useCallback((jobId: string) => {
    return jobs.find(job => job.id === jobId);
  }, [jobs]);

  // 获取已完成的任务
  const getCompletedJobs = useCallback(() => {
    return jobs.filter(job => job.status === 'completed');
  }, [jobs]);

  // 获取失败的任务
  const getFailedJobs = useCallback(() => {
    return jobs.filter(job => job.status === 'failed');
  }, [jobs]);

  // 获取总体进度
  const getTotalProgress = useCallback(() => {
    if (jobs.length === 0) return 0;
    
    const totalProgress = jobs.reduce((sum, job) => {
      if (job.status === 'completed') return sum + 100;
      if (job.status === 'failed') return sum + 100;
      if (job.status === 'processing') return sum + job.progress.percent;
      return sum;
    }, 0);
    
    return Math.round(totalProgress / jobs.length);
  }, [jobs]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    jobs,
    isProcessing,
    addJob,
    removeJob,
    clearJobs,
    startProcessing,
    cancelProcessing,
    getJobById,
    getCompletedJobs,
    getFailedJobs,
    getTotalProgress
  };
}

// 模拟转码进度（实际使用时应该连接到真实的转码服务）
async function simulateTranscoding(
  jobId: string, 
  onProgress: (jobId: string, progress: TranscodingProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        onProgress(jobId, {
          percent: 100,
          currentFps: 30,
          currentKbps: 1500,
          targetSize: '50MB',
          timemark: '00:02:30'
        });
        
        resolve();
      } else {
        onProgress(jobId, {
          percent: Math.round(progress),
          currentFps: 25 + Math.random() * 10,
          currentKbps: 1000 + Math.random() * 1000,
          targetSize: `${Math.round(progress * 0.5)}MB`,
          timemark: `00:${Math.floor(progress / 100 * 150 / 60).toString().padStart(2, '0')}:${Math.floor(progress / 100 * 150 % 60).toString().padStart(2, '0')}`
        });
      }
    }, 200);

    // 模拟可能的失败
    if (Math.random() < 0.1) { // 10% 失败率
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('模拟转码失败'));
      }, 2000);
    }
  });
}

export default useVideoTranscoding;
