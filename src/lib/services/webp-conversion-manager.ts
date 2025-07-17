/**
 * @fileoverview WebP转换管理器
 * @description 管理WebP转换任务的调度、监控和统计
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { WebPConversionService } from './webp-conversion-service';
import { DEFAULT_WEBP_CONFIG, type WebPConversionConfig } from '@/lib/config/webp-conversion-config';

/**
 * WebP转换统计接口
 */
export interface WebPConversionStats {
  totalConversions: number;
  successfulConversions: number;
  failedConversions: number;
  totalOriginalSize: number;
  totalWebpSize: number;
  totalSavings: number;
  averageCompressionRatio: number;
  averageProcessingTime: number;
  queueLength: number;
  processingCount: number;
}

/**
 * WebP转换任务状态
 */
export enum WebPTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * WebP转换任务接口
 */
export interface WebPConversionTask {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  status: WebPTaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: {
    webpSize: number;
    compressionRatio: number;
    processingTime: number;
  };
}

/**
 * WebP转换管理器类
 */
export class WebPConversionManager {
  private static instance: WebPConversionManager;
  private conversionService: WebPConversionService;
  private tasks: Map<string, WebPConversionTask> = new Map();
  private stats: WebPConversionStats;
  private config: WebPConversionConfig;

  private constructor(config: WebPConversionConfig = DEFAULT_WEBP_CONFIG) {
    this.config = config;
    this.conversionService = new WebPConversionService(config);
    this.stats = this.initializeStats();
    
    // 启动定期清理任务
    this.startCleanupScheduler();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: WebPConversionConfig): WebPConversionManager {
    if (!WebPConversionManager.instance) {
      WebPConversionManager.instance = new WebPConversionManager(config);
    }
    return WebPConversionManager.instance;
  }

  /**
   * 初始化统计数据
   */
  private initializeStats(): WebPConversionStats {
    return {
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      totalOriginalSize: 0,
      totalWebpSize: 0,
      totalSavings: 0,
      averageCompressionRatio: 0,
      averageProcessingTime: 0,
      queueLength: 0,
      processingCount: 0,
    };
  }

  /**
   * 提交WebP转换任务
   */
  public async submitConversionTask(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    storageKey: string,
    uploadResult: any
  ): Promise<string> {
    const taskId = `webp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: WebPConversionTask = {
      id: taskId,
      filename,
      mimeType,
      fileSize: buffer.length,
      status: WebPTaskStatus.PENDING,
      createdAt: new Date(),
    };

    this.tasks.set(taskId, task);
    this.updateStats();

    console.log(`📋 WebP转换任务已提交: ${taskId} (${filename})`);

    // 异步执行转换
    this.executeConversionTask(taskId, {
      buffer,
      originalFilename: filename,
      mimeType,
      fileSize: buffer.length,
      storageKey,
      uploadResult,
    });

    return taskId;
  }

  /**
   * 执行转换任务
   */
  private async executeConversionTask(taskId: string, request: any): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      // 更新任务状态
      task.status = WebPTaskStatus.PROCESSING;
      task.startedAt = new Date();
      this.updateStats();

      console.log(`🔄 开始执行WebP转换任务: ${taskId}`);

      // 执行转换
      const result = await this.conversionService.convertToWebP(request);

      if (result.success) {
        // 转换成功
        task.status = WebPTaskStatus.COMPLETED;
        task.completedAt = new Date();
        task.result = {
          webpSize: result.webpSize,
          compressionRatio: result.compressionRatio,
          processingTime: result.processingTime,
        };

        this.stats.successfulConversions++;
        this.stats.totalOriginalSize += result.originalSize;
        this.stats.totalWebpSize += result.webpSize;
        this.stats.totalSavings += (result.originalSize - result.webpSize);

        console.log(`✅ WebP转换任务完成: ${taskId}`);

        // 如果配置允许，删除原始文件
        if (!this.config.keepOriginal) {
          await this.deleteOriginalFile(request.storageKey);
        }

      } else {
        // 转换失败
        task.status = WebPTaskStatus.FAILED;
        task.completedAt = new Date();
        task.error = result.error;
        this.stats.failedConversions++;

        console.error(`❌ WebP转换任务失败: ${taskId} - ${result.error}`);
      }

    } catch (error) {
      // 异常处理
      task.status = WebPTaskStatus.FAILED;
      task.completedAt = new Date();
      task.error = error instanceof Error ? error.message : '未知错误';
      this.stats.failedConversions++;

      console.error(`❌ WebP转换任务异常: ${taskId}`, error);
    } finally {
      this.updateStats();
    }
  }

  /**
   * 删除原始文件
   */
  private async deleteOriginalFile(storageKey: string): Promise<void> {
    try {
      const { UnifiedR2Storage } = await import('@/lib/storage/unified-r2-storage');
      const storage = UnifiedR2Storage.getInstance();
      await storage.deleteFile(storageKey);
      console.log(`🗑️ 原始文件已删除: ${storageKey}`);
    } catch (error) {
      console.error(`❌ 删除原始文件失败: ${storageKey}`, error);
    }
  }

  /**
   * 更新统计数据
   */
  private updateStats(): void {
    const queueStatus = this.conversionService.getQueueStatus();
    this.stats.queueLength = queueStatus.queueLength;
    this.stats.processingCount = queueStatus.processing;
    this.stats.totalConversions = this.stats.successfulConversions + this.stats.failedConversions;

    // 计算平均值
    if (this.stats.successfulConversions > 0) {
      this.stats.averageCompressionRatio = 
        ((this.stats.totalOriginalSize - this.stats.totalWebpSize) / this.stats.totalOriginalSize) * 100;
    }

    // 计算平均处理时间
    const completedTasks = Array.from(this.tasks.values()).filter(
      task => task.status === WebPTaskStatus.COMPLETED && task.result
    );
    
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => sum + (task.result?.processingTime || 0), 0);
      this.stats.averageProcessingTime = totalTime / completedTasks.length;
    }
  }

  /**
   * 获取转换统计
   */
  public getStats(): WebPConversionStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 获取任务列表
   */
  public getTasks(status?: WebPTaskStatus): WebPConversionTask[] {
    const tasks = Array.from(this.tasks.values());
    return status ? tasks.filter(task => task.status === status) : tasks;
  }

  /**
   * 获取任务详情
   */
  public getTask(taskId: string): WebPConversionTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 取消任务
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === WebPTaskStatus.PENDING) {
      task.status = WebPTaskStatus.CANCELLED;
      task.completedAt = new Date();
      this.updateStats();
      console.log(`🚫 WebP转换任务已取消: ${taskId}`);
      return true;
    }
    return false;
  }

  /**
   * 清理已完成的任务
   */
  public cleanupCompletedTasks(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (
        (task.status === WebPTaskStatus.COMPLETED || 
         task.status === WebPTaskStatus.FAILED || 
         task.status === WebPTaskStatus.CANCELLED) &&
        task.completedAt &&
        task.completedAt < cutoffTime
      ) {
        this.tasks.delete(taskId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 已清理 ${cleanedCount} 个WebP转换任务记录`);
      this.updateStats();
    }

    return cleanedCount;
  }

  /**
   * 启动定期清理调度器
   */
  private startCleanupScheduler(): void {
    // 每小时清理一次已完成的任务
    setInterval(() => {
      this.cleanupCompletedTasks(24); // 清理24小时前的任务
    }, 60 * 60 * 1000); // 1小时

    console.log('🕐 WebP转换任务清理调度器已启动');
  }

  /**
   * 重置统计数据
   */
  public resetStats(): void {
    this.stats = this.initializeStats();
    console.log('🔄 WebP转换统计数据已重置');
  }

  /**
   * 获取配置
   */
  public getConfig(): WebPConversionConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<WebPConversionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.conversionService = new WebPConversionService(this.config);
    console.log('⚙️ WebP转换配置已更新');
  }
}
