/**
 * @fileoverview 并发上传控制器
 * @description 管理并发上传任务，控制并发数量和资源使用
 * @author Augment AI
 * @date 2025-07-05
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { UserLevel } from '@/types/user-level';
import type { UploadRequest, UploadResult } from './core/strategies/base-upload-strategy';

/**
 * 并发上传配置
 */
export interface ConcurrentUploadConfig {
  maxConcurrentUploads: number;
  maxConcurrentPerUser: number;
  queueTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * 上传任务状态
 */
export interface UploadTask {
  id: string;
  userId: string;
  filename: string;
  size: number;
  priority: 'low' | 'normal' | 'high';
  request?: UploadRequest;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: UploadResult;
  error?: Error;
  retryCount?: number;
  createdAt: Date;
  execute: () => Promise<string>;
}

/**
 * 并发上传控制器
 */
export class ConcurrentUploadController {
  private config: ConcurrentUploadConfig;
  private activeUploads = new Map<string, UploadTask>();
  private uploadQueue: UploadTask[] = [];
  private userUploadCounts = new Map<string, number>();

  constructor(config?: Partial<ConcurrentUploadConfig>) {
    this.config = {
      maxConcurrentUploads: 10,
      maxConcurrentPerUser: 3,
      queueTimeout: 30000, // 30秒
      retryAttempts: 3,
      retryDelay: 1000, // 1秒
      ...config
    };
  }

  /**
   * 添加上传任务
   */
  async addUploadTask(request: UploadRequest): Promise<string> {
    const taskId = this.generateTaskId();
    const task: UploadTask = {
      id: taskId,
      userId: request.userId,
      filename: request.filename,
      size: (request as any).fileSize || 0,
      priority: 'normal',
      request,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
      execute: async () => 'success',
    };

    // 检查用户并发限制
    const userActiveCount = this.userUploadCounts.get(request.userId) || 0;
    if (userActiveCount >= this.config.maxConcurrentPerUser) {
      throw TRPCErrorHandler.handleError(new Error('用户并发上传数量超限'), {
        code: 'TOO_MANY_REQUESTS',
        message: `用户并发上传数量不能超过 ${this.config.maxConcurrentPerUser} 个`
      });
    }

    this.uploadQueue.push(task);
    this.processQueue();

    return taskId;
  }

  /**
   * 处理上传队列
   */
  private async processQueue(): Promise<void> {
    while (
      this.uploadQueue.length > 0 &&
      this.activeUploads.size < this.config.maxConcurrentUploads
    ) {
      const task = this.uploadQueue.shift();
      if (!task) continue;

      // 检查用户并发限制
      const userActiveCount = this.userUploadCounts.get(task.request?.userId || task.userId) || 0;
      if (userActiveCount >= this.config.maxConcurrentPerUser) {
        // 重新放回队列
        this.uploadQueue.unshift(task);
        break;
      }

      this.startUploadTask(task);
    }
  }

  /**
   * 开始上传任务
   */
  private async startUploadTask(task: UploadTask): Promise<void> {
    try {
      task.status = 'running';
      task.startTime = Date.now();

      this.activeUploads.set(task.id, task);
      this.incrementUserCount(task.request?.userId || task.userId);

      // 这里应该调用实际的上传服务
      // 为了测试，我们模拟一个上传过程
      const result = await this.simulateUpload(task.request!);

      task.status = 'completed';
      task.endTime = Date.now();
      task.result = result;

    } catch (error) {
      task.status = 'failed';
      task.endTime = Date.now();
      task.error = error as Error;

      // 重试逻辑
      if ((task.retryCount || 0) < this.config.retryAttempts) {
        task.retryCount = (task.retryCount || 0) + 1;
        task.status = 'pending';

        setTimeout(() => {
          this.uploadQueue.push(task);
          this.processQueue();
        }, this.config.retryDelay * (task.retryCount || 1));
      }
    } finally {
      this.activeUploads.delete(task.id);
      this.decrementUserCount(task.request?.userId || task.userId);
      this.processQueue();
    }
  }

  /**
   * 模拟上传过程（实际应该调用真实的上传服务）
   */
  private async simulateUpload(request: UploadRequest): Promise<UploadResult> {
    // 模拟上传延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

    return {
      success: true,
      fileId: `file_${Date.now()}`,
      filename: request.filename,
      originalName: request.filename,
      url: `/uploads/${request.filename}`,
      cdnUrl: `/cdn/uploads/${request.filename}`,
      mediaType: 'IMAGE',
      fileSize: request.buffer.length,
      uploadedAt: new Date(),
      metadata: {}
    };
  }

  /**
   * 增加用户上传计数
   */
  private incrementUserCount(userId: string): void {
    const current = this.userUploadCounts.get(userId) || 0;
    this.userUploadCounts.set(userId, current + 1);
  }

  /**
   * 减少用户上传计数
   */
  private decrementUserCount(userId: string): void {
    const current = this.userUploadCounts.get(userId) || 0;
    if (current > 0) {
      this.userUploadCounts.set(userId, current - 1);
    }
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): UploadTask | undefined {
    return this.activeUploads.get(taskId);
  }

  /**
   * 获取统计信息
   */
  getStats(): any {
    return {
      activeUploads: this.activeUploads.size,
      queueLength: this.uploadQueue.length,
      userCounts: Object.fromEntries(this.userUploadCounts),
      config: this.config
    };
  }
}

// 创建默认实例
export const concurrentUploadController = new ConcurrentUploadController();

// 重新导出类型（避免重复导出）
export type {
  ConcurrentUploadConfig as ConcurrentConfig,
  UploadTask as UploadTaskType
};
