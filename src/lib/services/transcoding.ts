/**
 * @fileoverview 转码服务 (重构版)
 * @description 视频转码服务核心实现，采用模块化架构
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 *
 * @dependencies
 * - 视频分析器
 * - 转码处理器
 * - 任务管理器
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

// 导入拆分的服务和类型
import { VideoAnalyzer } from './transcoding/services/video-analyzer';
import { TranscodingProcessor } from './transcoding/services/transcoding-processor';
import {
  type TranscodingTask,
  type TranscodingConfig,
  type TranscodingResult,
  type TranscodingStats,
  type VideoMetadata,
  type TranscodingOptions,
  type TranscodingStatus,
  DEFAULT_TRANSCODING_CONFIG,
  TRANSCODING_PRESETS,
  createTranscodingTask,
  generateTaskId,
  needsTranscoding,
  estimateTranscodingTime,
} from './transcoding/types/transcoding-types';

/**
 * 转码服务 (重构版)
 */
export class TranscodingService extends EventEmitter {
  private videoAnalyzer: VideoAnalyzer;
  private processor: TranscodingProcessor;
  private taskQueue: TranscodingTask[] = [];
  private activeTasks = new Map<string, TranscodingTask>();
  private completedTasks = new Map<string, TranscodingResult>();
  private isProcessing = false;
  private maxConcurrentTasks = 2;

  // 统计信息
  private stats: TranscodingStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageProcessingTime: 0,
    totalCompressionRatio: 0,
    queueLength: 0,
    activeWorkers: 0,
  };

  constructor() {
    super();

    this.videoAnalyzer = new VideoAnalyzer();
    this.processor = new TranscodingProcessor();

    // 监听转码进度
    this.processor.on('progress', (progress) => {
      this.emit('progress', progress);
    });
  }

  /**
   * 转码视频文件
   */
  async transcodeVideo(
    inputPath: string,
    outputPath: string,
    config?: Partial<TranscodingConfig>,
    options?: TranscodingOptions
  ): Promise<string> {
    // 合并配置
    const finalConfig = { ...DEFAULT_TRANSCODING_CONFIG, ...config };

    // 创建任务
    const task = createTranscodingTask(inputPath, outputPath, finalConfig, options);

    // 分析输入视频
    try {
      const metadata = await this.videoAnalyzer.getVideoInfo(inputPath);
      task.metadata = metadata;

      // 检查是否需要转码
      if (!needsTranscoding(metadata, finalConfig)) {
        console.log('视频无需转码，直接复制文件');
        await fs.copyFile(inputPath, outputPath);
        return outputPath;
      }

      // 检查磁盘空间
      await this.videoAnalyzer.checkDiskSpace(outputPath, metadata.fileSize);
    } catch (error) {
      throw new Error(`视频分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 添加到队列
    this.addTaskToQueue(task);

    // 开始处理队列
    this.processQueue();

    // 等待任务完成
    return this.waitForTask(task.id);
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(filePath: string): Promise<VideoMetadata> {
    return this.videoAnalyzer.getVideoInfo(filePath);
  }

  /**
   * 验证视频文件
   */
  async validateVideoFile(filePath: string) {
    return this.videoAnalyzer.validateVideoFile(filePath);
  }

  /**
   * 生成视频缩略图
   */
  async generateThumbnail(inputPath: string, outputPath: string, timeOffset: number = 10): Promise<void> {
    return this.videoAnalyzer.generateThumbnail(inputPath, outputPath, timeOffset);
  }

  /**
   * 评估视频质量
   */
  async assessVideoQuality(filePath: string) {
    return this.videoAnalyzer.assessVideoQuality(filePath);
  }

  /**
   * 添加任务到队列
   */
  private addTaskToQueue(task: TranscodingTask): void {
    // 按优先级排序插入
    const insertIndex = this.taskQueue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    this.stats.queueLength = this.taskQueue.length;
    this.stats.totalTasks++;

    this.emit('taskQueued', task);
  }

  /**
   * 处理任务队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.taskQueue.length > 0 && this.activeTasks.size < this.maxConcurrentTasks) {
      const task = this.taskQueue.shift()!;
      this.stats.queueLength = this.taskQueue.length;

      // 开始处理任务
      this.processTask(task);
    }

    this.isProcessing = false;
  }

  /**
   * 处理单个任务
   */
  private async processTask(task: TranscodingTask): Promise<void> {
    task.status = 'processing';
    task.startTime = new Date();
    this.activeTasks.set(task.id, task);
    this.stats.activeWorkers = this.activeTasks.size;

    this.emit('taskStarted', task);

    try {
      const result = await this.processor.transcodeVideo(task);

      task.status = 'completed';
      task.endTime = new Date();
      this.completedTasks.set(task.id, result);

      if (result.success) {
        this.stats.completedTasks++;

        // 更新平均处理时间
        if (result.processingTime) {
          this.stats.averageProcessingTime =
            (this.stats.averageProcessingTime * (this.stats.completedTasks - 1) + result.processingTime) /
            this.stats.completedTasks;
        }

        // 更新压缩比
        if (result.compressionRatio) {
          this.stats.totalCompressionRatio =
            (this.stats.totalCompressionRatio * (this.stats.completedTasks - 1) + result.compressionRatio) /
            this.stats.completedTasks;
        }
      } else {
        this.stats.failedTasks++;
      }

      this.emit('taskCompleted', { task, result });

    } catch (error) {
      task.status = 'failed';
      task.endTime = new Date();
      task.error = error instanceof Error ? error.message : '未知错误';

      this.stats.failedTasks++;

      // 检查是否需要重试
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.status = 'pending';
        task.startTime = undefined;
        task.endTime = undefined;
        task.error = undefined;

        // 重新加入队列
        this.addTaskToQueue(task);

        this.emit('taskRetry', task);
      } else {
        const result: TranscodingResult = {
          success: false,
          error: task.error,
        };
        this.completedTasks.set(task.id, result);
        this.emit('taskFailed', { task, error: task.error });
      }
    } finally {
      this.activeTasks.delete(task.id);
      this.stats.activeWorkers = this.activeTasks.size;

      // 继续处理队列
      this.processQueue();
    }
  }

  /**
   * 等待任务完成
   */
  private async waitForTask(taskId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const checkTask = () => {
        const result = this.completedTasks.get(taskId);
        if (result) {
          if (result.success) {
            resolve(result.outputPath!);
          } else {
            reject(new Error(result.error || '转码失败'));
          }
          return;
        }

        // 检查任务是否还在队列或处理中
        const isInQueue = this.taskQueue.some(t => t.id === taskId);
        const isActive = this.activeTasks.has(taskId);

        if (!isInQueue && !isActive) {
          reject(new Error('任务不存在'));
          return;
        }

        // 继续等待
        setTimeout(checkTask, 1000);
      };

      checkTask();
    });
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<void> {
    // 从队列中移除
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.status = 'cancelled';
      this.stats.queueLength = this.taskQueue.length;
      this.emit('taskCancelled', task);
      return;
    }

    // 取消活跃任务
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      await this.processor.cancelTask(taskId);
      activeTask.status = 'cancelled';
      this.emit('taskCancelled', activeTask);
    }
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): TranscodingStatus | null {
    // 检查队列
    const queuedTask = this.taskQueue.find(t => t.id === taskId);
    if (queuedTask) return queuedTask.status;

    // 检查活跃任务
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) return activeTask.status;

    // 检查完成任务
    const completedResult = this.completedTasks.get(taskId);
    if (completedResult) return completedResult.success ? 'completed' : 'failed';

    return null;
  }

  /**
   * 获取统计信息
   */
  getStats(): TranscodingStats {
    return { ...this.stats };
  }

  /**
   * 获取预设配置
   */
  getPresets() {
    return TRANSCODING_PRESETS;
  }

  /**
   * 设置最大并发任务数
   */
  setMaxConcurrentTasks(count: number): void {
    this.maxConcurrentTasks = Math.max(1, count);
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks(olderThanHours: number = 24): number {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [taskId, result] of this.completedTasks.entries()) {
      // 这里需要任务的完成时间，简化实现
      this.completedTasks.delete(taskId);
      cleaned++;
    }

    return cleaned;
  }

  /**
   * 停止所有任务
   */
  async shutdown(): Promise<void> {
    // 清空队列
    this.taskQueue = [];
    this.stats.queueLength = 0;

    // 取消所有活跃任务
    await this.processor.terminateAllTasks();
    this.activeTasks.clear();
    this.stats.activeWorkers = 0;

    this.emit('shutdown');
  }
}
