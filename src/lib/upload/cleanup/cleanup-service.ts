/**
 * @fileoverview 清理服务 - 重构版本
 * @description 提供文件和数据清理功能的统一服务
 * @author Augment AI
 * @date 2025-07-03
 * @version 3.0.0 - 重构版（模块化架构）
 */

import { EventEmitter } from 'events';

// 导入重构后的模块
import {
  CleanupTaskType,
  CleanupConfig,
  CleanupServiceStatus,
  CleanupTaskResult,
  CleanupStats,
  CleanupReport
} from './types/cleanup-service-types';

import { CleanupScheduler } from './core/cleanup-scheduler';
import { TransactionCleaner } from './tasks/transaction-cleaner';
import { OrphanFileCleaner } from './tasks/orphan-file-cleaner';

/**
 * 清理服务主类 - 重构版
 */
export class CleanupService extends EventEmitter {
  private static instance: CleanupService;
  private isInitialized = false;

  // 核心组件
  private scheduler?: CleanupScheduler;
  private transactionCleaner?: TransactionCleaner;
  private orphanFileCleaner?: OrphanFileCleaner;

  // 配置
  private config: CleanupConfig;

  private constructor() {
    super();
    this.config = this.getDefaultConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService();
    }
    return CleanupService.instance;
  }

  /**
   * 初始化清理服务
   */
  public async initialize(config?: Partial<CleanupConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('🔒 清理服务已初始化，跳过重复初始化');
      return;
    }

    try {
      console.log('🚀 初始化清理服务...');

      // 合并配置
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // 初始化组件
      this.scheduler = new CleanupScheduler(this.config);
      this.transactionCleaner = new TransactionCleaner(this.config);
      this.orphanFileCleaner = new OrphanFileCleaner(this.config);

      // 设置事件转发
      this.setupEventForwarding();

      this.isInitialized = true;
      console.log('✅ 清理服务初始化完成');

    } catch (error) {
      console.error('❌ 清理服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 启动清理服务
   */
  public start(): void {
    if (!this.isInitialized) {
      throw new Error('清理服务未初始化');
    }

    if (!this.scheduler) {
      throw new Error('调度器未初始化');
    }

    console.log('🚀 启动清理服务');
    this.scheduler.start();
    this.emit('service_started');
  }

  /**
   * 停止清理服务
   */
  public stop(): void {
    if (!this.scheduler) {
      return;
    }

    console.log('🛑 停止清理服务');
    this.scheduler.stop();
    this.emit('service_stopped');
  }

  /**
   * 执行每日清理
   */
  public async executeDailyCleanup(): Promise<CleanupTaskResult[]> {
    console.log('🗓️ 执行每日清理任务');
    
    const results: CleanupTaskResult[] = [];

    try {
      // 清理过期事务
      const transactionResult = await this.executeTransactionCleanup();
      results.push(transactionResult);

      console.log('✅ 每日清理任务完成');
      return results;

    } catch (error) {
      console.error('❌ 每日清理任务失败:', error);
      throw error;
    }
  }

  /**
   * 执行每周清理
   */
  public async executeWeeklyCleanup(): Promise<CleanupTaskResult[]> {
    console.log('📅 执行每周清理任务');
    
    const results: CleanupTaskResult[] = [];

    try {
      // 清理孤儿文件
      const orphanResult = await this.executeOrphanFileCleanup();
      results.push(orphanResult);

      console.log('✅ 每周清理任务完成');
      return results;

    } catch (error) {
      console.error('❌ 每周清理任务失败:', error);
      throw error;
    }
  }

  /**
   * 执行事务清理
   */
  public async executeTransactionCleanup(): Promise<CleanupTaskResult> {
    if (!this.transactionCleaner) {
      throw new Error('事务清理器未初始化');
    }

    const startTime = new Date();
    
    try {
      console.log('🧹 开始执行事务清理');
      
      const stats = await this.transactionCleaner.cleanupExpiredTransactions();
      const endTime = new Date();
      
      const result: CleanupTaskResult = {
        taskType: CleanupTaskType.EXPIRED_TRANSACTIONS,
        success: true,
        stats,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      };

      console.log('✅ 事务清理完成');
      this.emit('task_completed', result);
      
      return result;

    } catch (error) {
      const endTime = new Date();
      
      const result: CleanupTaskResult = {
        taskType: CleanupTaskType.EXPIRED_TRANSACTIONS,
        success: false,
        stats: {
          taskType: CleanupTaskType.EXPIRED_TRANSACTIONS,
          processedCount: 0,
          cleanedCount: 0,
          failedCount: 0,
          executionTimeMs: endTime.getTime() - startTime.getTime(),
          errors: [error instanceof Error ? error.message : '未知错误']
        },
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      };

      console.error('❌ 事务清理失败:', error);
      this.emit('task_failed', result);
      
      throw error;
    }
  }

  /**
   * 执行孤儿文件清理
   */
  public async executeOrphanFileCleanup(): Promise<CleanupTaskResult> {
    if (!this.orphanFileCleaner) {
      throw new Error('孤儿文件清理器未初始化');
    }

    const startTime = new Date();
    
    try {
      console.log('🧹 开始执行孤儿文件清理');
      
      const stats = await this.orphanFileCleaner.detectAndCleanupOrphanFiles();
      const endTime = new Date();
      
      const result: CleanupTaskResult = {
        taskType: CleanupTaskType.ORPHAN_FILES,
        success: true,
        stats,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      };

      console.log('✅ 孤儿文件清理完成');
      this.emit('task_completed', result);
      
      return result;

    } catch (error) {
      const endTime = new Date();
      
      const result: CleanupTaskResult = {
        taskType: CleanupTaskType.ORPHAN_FILES,
        success: false,
        stats: {
          taskType: CleanupTaskType.ORPHAN_FILES,
          processedCount: 0,
          cleanedCount: 0,
          failedCount: 0,
          executionTimeMs: endTime.getTime() - startTime.getTime(),
          errors: [error instanceof Error ? error.message : '未知错误']
        },
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      };

      console.error('❌ 孤儿文件清理失败:', error);
      this.emit('task_failed', result);
      
      throw error;
    }
  }

  /**
   * 获取服务状态
   */
  public getStatus(): CleanupServiceStatus {
    if (!this.scheduler) {
      return {
        isRunning: false,
        activeTasks: [],
        lastRunTimes: {} as any,
        nextRunTimes: {} as any,
        totalRuns: {} as any,
        successRates: {} as any
      };
    }

    return this.scheduler.getStatus();
  }

  /**
   * 获取清理统计
   */
  public async getCleanupStatistics(): Promise<{
    transactions: any;
    orphanFiles: any;
  }> {
    const [transactionStats, orphanStats] = await Promise.all([
      this.transactionCleaner?.getCleanupStatistics(),
      this.orphanFileCleaner?.getOrphanFileStatistics()
    ]);

    return {
      transactions: transactionStats || {},
      orphanFiles: orphanStats || {}
    };
  }

  /**
   * 手动执行清理任务
   */
  public async executeTaskManually(taskType: CleanupTaskType): Promise<CleanupTaskResult> {
    console.log(`🔧 手动执行清理任务: ${taskType}`);

    switch (taskType) {
      case CleanupTaskType.EXPIRED_TRANSACTIONS:
        return await this.executeTransactionCleanup();
      
      case CleanupTaskType.ORPHAN_FILES:
        return await this.executeOrphanFileCleanup();
      
      default:
        throw new Error(`不支持的清理任务类型: ${taskType}`);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): CleanupConfig {
    return {
      schedules: {
        daily: '0 2 * * *',    // 每天凌晨2点
        weekly: '0 3 * * 0',   // 每周日凌晨3点
        monthly: '0 4 1 * *'   // 每月1号凌晨4点
      },
      thresholds: {
        transactionExpireDays: 7,
        orphanFileRetentionDays: 30,
        incompleteUploadDays: 3,
        tempFileRetentionDays: 1,
        logRetentionDays: 90
      },
      batchSizes: {
        transactionBatch: 100,
        fileBatch: 50,
        uploadBatch: 20
      },
      safety: {
        enableDryRun: false,
        maxDeletesPerRun: 1000,
        requireConfirmation: false
      }
    };
  }

  /**
   * 设置事件转发
   */
  private setupEventForwarding(): void {
    if (this.scheduler) {
      this.scheduler.on('task_started', (data) => this.emit('task_started', data));
      this.scheduler.on('task_completed', (data) => this.emit('task_completed', data));
      this.scheduler.on('task_failed', (data) => this.emit('task_failed', data));
    }
  }

  /**
   * 关闭服务
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 关闭清理服务...');
    
    this.stop();
    
    await Promise.all([
      this.transactionCleaner?.disconnect(),
      this.orphanFileCleaner?.disconnect()
    ]);
    
    console.log('✅ 清理服务已关闭');
  }
}

// 导出单例实例
export const cleanupService = CleanupService.getInstance();
