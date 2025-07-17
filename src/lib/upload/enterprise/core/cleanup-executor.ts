/**
 * @fileoverview 清理任务执行器
 * @description 负责执行具体的清理任务
 * @author Augment AI
 * @date 2025-07-03
 */

import { EventEmitter } from 'events';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import {
  CleanupTaskType,
  CleanupStatus,
  CleanupResult,
  CleanupConfig,
  CleanupContext,
  ICleanupExecutor
} from './cleanup-types';

// 定义任务进度接口
interface TaskProgress {
  taskType: CleanupTaskType;
  status: CleanupStatus;
  progress: number;
  currentStep: string;
  itemsProcessed: number;
  estimatedTotal: number;
  startTime: Date;
}

// 导入具体的清理器
import { FileCleanup } from './file-cleanup';
import { DatabaseCleanup } from './database-cleanup';
import { CacheCleanup } from './cache-cleanup';
import { LogCleanup } from './log-cleanup';

/**
 * 清理任务执行器类
 */
export class CleanupExecutor extends EventEmitter implements ICleanupExecutor {
  private fileCleanup?: FileCleanup;
  private databaseCleanup?: DatabaseCleanup;
  private cacheCleanup?: CacheCleanup;
  private logCleanup?: LogCleanup;

  private runningTasks = new Set<CleanupTaskType>();
  private taskProgress = new Map<CleanupTaskType, TaskProgress>();

  constructor(private config: CleanupConfig) {
    super();
  }

  /**
   * 初始化执行器
   */
  async initialize(): Promise<void> {
    console.log('🔧 初始化清理执行器...');

    try {
      // 创建清理上下文
      const { S3Client } = await import('@aws-sdk/client-s3');
      const { prisma } = await import('@/lib/prisma');

      const s3Client = new S3Client({
        region: this.config.storage.region,
        endpoint: this.config.storage.endpoint,
        credentials: {
          accessKeyId: this.config.storage.accessKeyId,
          secretAccessKey: this.config.storage.secretAccessKey,
        },
      });

      const context: CleanupContext = {
        s3Client,
        prisma,
        config: this.config,
        logger: console,
      };

      // 初始化各个清理器
      this.fileCleanup = new FileCleanup(context);
      this.databaseCleanup = new DatabaseCleanup(context);
      this.cacheCleanup = new CacheCleanup(context);
      this.logCleanup = new LogCleanup(context);

      // 设置事件转发
      this.setupEventForwarding();

      console.log('✅ 清理执行器初始化完成');
    } catch (error) {
      console.error('❌ 清理执行器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 执行单个清理任务
   */
  async executeTask(taskType: CleanupTaskType, options?: any): Promise<CleanupResult> {
    if (this.runningTasks.has(taskType)) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.OPERATION_IN_PROGRESS,
        `清理任务 ${taskType} 正在运行中`
      );
    }

    const taskConfig = this.config.tasks[taskType];
    if (!taskConfig?.enabled) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.FEATURE_DISABLED,
        `清理任务 ${taskType} 已禁用`
      );
    }

    console.log(`🧹 开始执行清理任务: ${taskType}`);

    const startTime = new Date();
    this.runningTasks.add(taskType);

    // 初始化进度跟踪
    const progress: TaskProgress = {
      taskType,
      status: CleanupStatus.IN_PROGRESS,
      progress: 0,
      currentStep: '准备执行',
      itemsProcessed: 0,
      estimatedTotal: 0,
      startTime
    };
    this.taskProgress.set(taskType, progress);
    this.emit('taskStarted', { taskType, startTime });

    try {
      const result = await this.executeSpecificTask(taskType, options);

      // 更新进度为完成
      progress.status = CleanupStatus.COMPLETED;
      progress.progress = 100;
      progress.currentStep = '任务完成';
      this.emit('taskCompleted', { taskType, result });

      console.log(`✅ 清理任务完成: ${taskType}`, {
        itemsDeleted: result.stats.cleanedCount,
        bytesFreed: 0, // 从stats中获取，如果有的话
        duration: result.duration
      });

      return result;

    } catch (error) {
      // 更新进度为失败
      progress.status = CleanupStatus.FAILED;
      this.emit('taskFailed', { taskType, error });

      console.error(`❌ 清理任务失败: ${taskType}`, error);

      const failedResult: CleanupResult = {
        taskType,
        status: CleanupStatus.FAILED,
        stats: {
          taskType,
          processedCount: 0,
          cleanedCount: 0,
          failedCount: 1,
          skippedCount: 0,
          executionTimeMs: Date.now() - startTime.getTime(),
          errors: [error instanceof Error ? error.message : String(error)]
        },
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime()
      };

      return failedResult;

    } finally {
      this.runningTasks.delete(taskType);
      this.taskProgress.delete(taskType);
    }
  }

  /**
   * 执行批量清理任务
   */
  async executeBatch(taskTypes: CleanupTaskType[]): Promise<CleanupResult[]> {
    console.log(`🧹 开始执行批量清理: ${taskTypes.length} 个任务`);

    const results: CleanupResult[] = [];
    const maxConcurrent = this.config.globalSettings.maxConcurrentTasks;

    // 分批执行任务
    for (let i = 0; i < taskTypes.length; i += maxConcurrent) {
      const batch = taskTypes.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (taskType) => {
        try {
          return await this.executeTask(taskType);
        } catch (error) {
          console.error(`批量清理任务失败: ${taskType}`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as CleanupResult[]);
    }

    console.log(`✅ 批量清理完成: ${results.length}/${taskTypes.length} 个任务成功`);
    return results;
  }

  /**
   * 取消正在运行的任务
   */
  async cancelTask(taskType: CleanupTaskType): Promise<boolean> {
    if (!this.runningTasks.has(taskType)) {
      return false;
    }

    // 更新进度状态
    const progress = this.taskProgress.get(taskType);
    if (progress) {
      progress.status = CleanupStatus.CANCELLED;
      this.emit('taskCancelled', { taskType });
    }

    // 这里应该实现具体的任务取消逻辑
    console.log(`🛑 取消清理任务: ${taskType}`);
    this.runningTasks.delete(taskType);
    this.taskProgress.delete(taskType);

    return true;
  }

  /**
   * 获取正在运行的任务
   */
  getRunningTasks(): CleanupTaskType[] {
    return Array.from(this.runningTasks);
  }

  /**
   * 获取任务历史（这里返回空数组，实际应该从存储中获取）
   */
  getTaskHistory(limit?: number): CleanupResult[] {
    // 这里应该从数据库或其他存储中获取历史记录
    return [];
  }

  /**
   * 获取任务进度
   */
  getTaskProgress(taskType: CleanupTaskType): TaskProgress | undefined {
    return this.taskProgress.get(taskType);
  }

  /**
   * 获取所有任务进度
   */
  getAllTaskProgress(): TaskProgress[] {
    return Array.from(this.taskProgress.values());
  }

  /**
   * 执行具体的清理任务
   */
  private async executeSpecificTask(taskType: CleanupTaskType, options?: any): Promise<CleanupResult> {
    const taskConfig = this.config.tasks[taskType];
    const mergedOptions = {
      retentionDays: taskConfig.retentionDays,
      batchSize: taskConfig.batchSize,
      dryRun: taskConfig.dryRun,
      ...options
    };

    switch (taskType) {
      case CleanupTaskType.ORPHAN_FILES:
      case CleanupTaskType.TEMP_FILES:
        if (!this.fileCleanup) {
          throw new Error('文件清理器未初始化');
        }
        const stats = await this.fileCleanup.cleanupOrphanFiles(mergedOptions);
        return {
          taskType,
          status: CleanupStatus.COMPLETED,
          stats,
          startTime: new Date(),
          endTime: new Date(),
          duration: stats.executionTimeMs,
        };

      case CleanupTaskType.EXPIRED_TRANSACTIONS:
        if (!this.databaseCleanup) {
          throw new Error('数据库清理器未初始化');
        }
        const expiredStats = await this.databaseCleanup.cleanupExpiredTransactions(mergedOptions);
        return {
          taskType,
          status: CleanupStatus.COMPLETED,
          stats: expiredStats,
          startTime: new Date(),
          endTime: new Date(),
          duration: expiredStats.executionTimeMs,
        };

      case CleanupTaskType.LOG_CLEANUP:
        if (!this.databaseCleanup) {
          throw new Error('数据库清理器未初始化');
        }
        const logStats = await this.databaseCleanup.cleanupOldLogs(mergedOptions);
        return {
          taskType,
          status: CleanupStatus.COMPLETED,
          stats: logStats,
          startTime: new Date(),
          endTime: new Date(),
          duration: logStats.executionTimeMs,
        };

      case CleanupTaskType.CACHE_CLEANUP:
        if (!this.cacheCleanup) {
          throw new Error('缓存清理器未初始化');
        }
        const cacheStats = await this.cacheCleanup.cleanupExpiredCache(mergedOptions);
        return {
          taskType,
          status: CleanupStatus.COMPLETED,
          stats: cacheStats,
          startTime: new Date(),
          endTime: new Date(),
          duration: cacheStats.executionTimeMs,
        };

      default:
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.INVALID_OPERATION,
          `不支持的清理任务类型: ${taskType}`
        );
    }
  }

  /**
   * 设置事件转发
   */
  private setupEventForwarding(): void {
    const cleanupHandlers = [
      this.fileCleanup,
      this.databaseCleanup,
      this.cacheCleanup,
      this.logCleanup
    ];

    cleanupHandlers.forEach(cleanup => {
      if (cleanup) {
        cleanup.on('progress', (data) => {
          const progress = this.taskProgress.get(data.taskType);
          if (progress) {
            progress.progress = data.progress;
            progress.currentStep = data.currentStep;
            progress.itemsProcessed = data.itemsProcessed;
            progress.estimatedTotal = data.estimatedTotal;
            this.emit('progressUpdate', progress);
          }
        });

        cleanup.on('warning', (data) => this.emit('warning', data));
        cleanup.on('error', (data) => this.emit('error', data));
      }
    });
  }

  /**
   * 估算任务影响
   */
  async estimateTaskImpact(taskType: CleanupTaskType, options?: any): Promise<{
    estimatedItems: number;
    estimatedBytes: number;
    estimatedDuration: number;
  }> {
    const taskConfig = this.config.tasks[taskType];
    const mergedOptions = {
      retentionDays: taskConfig.retentionDays,
      batchSize: taskConfig.batchSize,
      dryRun: taskConfig.dryRun,
      ...options
    };

    switch (taskType) {
      case CleanupTaskType.ORPHAN_FILES:
      case CleanupTaskType.TEMP_FILES:
        // 简单估算逻辑
        return {
          estimatedItems: 100, // 估算值
          estimatedBytes: 1024 * 1024 * 100, // 100MB
          estimatedDuration: 30000 // 30秒
        };

      case CleanupTaskType.EXPIRED_TRANSACTIONS:
        return {
          estimatedItems: 50,
          estimatedBytes: 1024 * 50, // 50KB
          estimatedDuration: 10000 // 10秒
        };

      case CleanupTaskType.CACHE_CLEANUP:
        return {
          estimatedItems: 200,
          estimatedBytes: 1024 * 1024 * 10, // 10MB
          estimatedDuration: 15000 // 15秒
        };

      case CleanupTaskType.LOG_CLEANUP:
        return {
          estimatedItems: 30,
          estimatedBytes: 1024 * 1024 * 5, // 5MB
          estimatedDuration: 20000 // 20秒
        };

      default:
        return {
          estimatedItems: 0,
          estimatedBytes: 0,
          estimatedDuration: 0
        };
    }
  }
}
