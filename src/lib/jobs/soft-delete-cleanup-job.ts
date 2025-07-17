/**
 * @fileoverview 软删除清理定时任务
 * @description 定期清理过期的软删除记录
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { SoftDeleteService } from '@/lib/services/soft-delete-service';

/**
 * 软删除清理任务配置
 */
export interface SoftDeleteCleanupConfig {
  /** 清理间隔（毫秒） */
  interval: number;
  /** 记录保留天数 */
  retentionDays: number;
  /** 是否启用自动清理 */
  enabled: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: SoftDeleteCleanupConfig = {
  interval: 24 * 60 * 60 * 1000, // 24小时
  retentionDays: 30, // 30天
  enabled: process.env.NODE_ENV === 'production',
};

/**
 * 软删除清理任务类
 */
export class SoftDeleteCleanupJob {
  private config: SoftDeleteCleanupConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: Partial<SoftDeleteCleanupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 启动定时任务
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('软删除清理任务已禁用');
      return;
    }

    if (this.intervalId) {
      console.log('软删除清理任务已在运行');
      return;
    }

    console.log(`启动软删除清理任务，间隔: ${this.config.interval}ms，保留天数: ${this.config.retentionDays}`);

    // 立即执行一次
    this.executeCleanup();

    // 设置定时执行
    this.intervalId = setInterval(() => {
      this.executeCleanup();
    }, this.config.interval);
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('软删除清理任务已停止');
    }
  }

  /**
   * 执行清理操作
   */
  private async executeCleanup(): Promise<void> {
    if (this.isRunning) {
      console.log('软删除清理任务正在运行，跳过本次执行');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`开始执行软删除清理任务，清理 ${this.config.retentionDays} 天前的记录`);

      const result = await SoftDeleteService.cleanupExpired(this.config.retentionDays);
      
      const totalCleaned = result.posts + result.comments + result.users;
      const duration = Date.now() - startTime;

      console.log(`软删除清理任务完成，耗时: ${duration}ms`);
      console.log(`清理结果: 帖子 ${result.posts} 条，评论 ${result.comments} 条，用户 ${result.users} 条，总计 ${totalCleaned} 条`);

      // 如果清理了大量记录，记录警告
      if (totalCleaned > 1000) {
        console.warn(`本次清理了大量记录 (${totalCleaned} 条)，请检查是否正常`);
      }

    } catch (error) {
      console.error('软删除清理任务执行失败:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 手动执行清理
   */
  async manualCleanup(): Promise<{
    posts: number;
    comments: number;
    users: number;
    duration: number;
  }> {
    const startTime = Date.now();
    
    try {
      console.log('手动执行软删除清理任务');
      
      const result = await SoftDeleteService.cleanupExpired(this.config.retentionDays);
      const duration = Date.now() - startTime;
      
      console.log(`手动清理完成，耗时: ${duration}ms`);
      
      return {
        ...result,
        duration,
      };
    } catch (error) {
      console.error('手动清理失败:', error);
      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    config: SoftDeleteCleanupConfig;
  } {
    return {
      enabled: this.config.enabled,
      running: this.intervalId !== null,
      config: this.config,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SoftDeleteCleanupConfig>): void {
    const wasRunning = this.intervalId !== null;
    
    // 停止当前任务
    if (wasRunning) {
      this.stop();
    }
    
    // 更新配置
    this.config = { ...this.config, ...newConfig };
    
    // 如果之前在运行且新配置启用，重新启动
    if (wasRunning && this.config.enabled) {
      this.start();
    }
    
    console.log('软删除清理任务配置已更新:', this.config);
  }
}

/**
 * 全局软删除清理任务实例
 */
export const softDeleteCleanupJob = new SoftDeleteCleanupJob();

/**
 * 初始化软删除清理任务
 */
export function initializeSoftDeleteCleanup(): void {
  // 在应用启动时自动启动清理任务
  if (process.env.NODE_ENV === 'production') {
    softDeleteCleanupJob.start();
    
    // 监听进程退出事件，确保清理任务正确停止
    process.on('SIGINT', () => {
      console.log('收到 SIGINT 信号，停止软删除清理任务');
      softDeleteCleanupJob.stop();
    });
    
    process.on('SIGTERM', () => {
      console.log('收到 SIGTERM 信号，停止软删除清理任务');
      softDeleteCleanupJob.stop();
    });
  }
}

/**
 * 软删除清理任务工厂
 */
export class SoftDeleteCleanupJobFactory {
  /**
   * 创建开发环境清理任务
   */
  static createDevelopmentJob(): SoftDeleteCleanupJob {
    return new SoftDeleteCleanupJob({
      interval: 60 * 60 * 1000, // 1小时
      retentionDays: 7, // 7天
      enabled: true,
    });
  }

  /**
   * 创建测试环境清理任务
   */
  static createTestJob(): SoftDeleteCleanupJob {
    return new SoftDeleteCleanupJob({
      interval: 10 * 60 * 1000, // 10分钟
      retentionDays: 1, // 1天
      enabled: true,
    });
  }

  /**
   * 创建生产环境清理任务
   */
  static createProductionJob(): SoftDeleteCleanupJob {
    return new SoftDeleteCleanupJob({
      interval: 24 * 60 * 60 * 1000, // 24小时
      retentionDays: 30, // 30天
      enabled: true,
    });
  }

  /**
   * 根据环境创建合适的清理任务
   */
  static createForEnvironment(env: string = process.env.NODE_ENV || 'development'): SoftDeleteCleanupJob {
    switch (env) {
      case 'production':
        return this.createProductionJob();
      case 'test':
        return this.createTestJob();
      case 'development':
      default:
        return this.createDevelopmentJob();
    }
  }
}

/**
 * 软删除清理任务监控
 */
export class SoftDeleteCleanupMonitor {
  private static metrics = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    totalRecordsCleaned: 0,
    lastRunTime: null as Date | null,
    lastRunDuration: 0,
    averageRunDuration: 0,
  };

  /**
   * 记录任务执行
   */
  static recordRun(success: boolean, duration: number, recordsCleaned: number = 0): void {
    this.metrics.totalRuns++;
    this.metrics.lastRunTime = new Date();
    this.metrics.lastRunDuration = duration;
    
    if (success) {
      this.metrics.successfulRuns++;
      this.metrics.totalRecordsCleaned += recordsCleaned;
    } else {
      this.metrics.failedRuns++;
    }
    
    // 计算平均执行时间
    this.metrics.averageRunDuration = 
      (this.metrics.averageRunDuration * (this.metrics.totalRuns - 1) + duration) / this.metrics.totalRuns;
  }

  /**
   * 获取监控指标
   */
  static getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 重置监控指标
   */
  static resetMetrics(): void {
    this.metrics = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalRecordsCleaned: 0,
      lastRunTime: null,
      lastRunDuration: 0,
      averageRunDuration: 0,
    };
  }
}
