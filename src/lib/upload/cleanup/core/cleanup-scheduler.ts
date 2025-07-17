/**
 * @fileoverview 清理任务调度器
 * @description 管理清理任务的定时调度
 * @author Augment AI
 * @date 2025-07-03
 */

import * as cron from 'node-cron';
import { EventEmitter } from 'events';
import {
  CleanupTaskType,
  CleanupConfig,
  CleanupServiceStatus,
  CleanupTaskResult
} from '../types/cleanup-service-types';

/**
 * 清理任务调度器类
 */
export class CleanupScheduler extends EventEmitter {
  private isRunning = false;
  private scheduledTasks = new Map<string, cron.ScheduledTask>();
  private lastRunTimes = new Map<CleanupTaskType, Date>();
  private nextRunTimes = new Map<CleanupTaskType, Date>();
  private totalRuns = new Map<CleanupTaskType, number>();
  private successCounts = new Map<CleanupTaskType, number>();

  constructor(private config: CleanupConfig) {
    super();
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ 清理调度器已在运行');
      return;
    }

    this.isRunning = true;
    console.log('🚀 启动清理任务调度器');

    this.setupScheduledTasks();
    this.emit('scheduler_started');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('🛑 停止清理任务调度器');

    // 停止所有定时任务
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`停止定时任务: ${name}`);
    });

    this.scheduledTasks.clear();
    this.emit('scheduler_stopped');
  }

  /**
   * 设置定时任务
   */
  private setupScheduledTasks(): void {
    // 每日清理任务 (默认每天凌晨2点)
    const dailyTask = cron.schedule(this.config.schedules.daily, async () => {
      await this.executeDailyCleanup();
    });

    // 每周清理任务 (默认每周日凌晨3点)
    const weeklyTask = cron.schedule(this.config.schedules.weekly, async () => {
      await this.executeWeeklyCleanup();
    });

    // 每月清理任务 (默认每月1号凌晨4点)
    const monthlyTask = cron.schedule(this.config.schedules.monthly, async () => {
      await this.executeMonthlyCleanup();
    });

    // 启动定时任务
    dailyTask.start();
    weeklyTask.start();
    monthlyTask.start();

    // 保存任务引用
    this.scheduledTasks.set('daily', dailyTask);
    this.scheduledTasks.set('weekly', weeklyTask);
    this.scheduledTasks.set('monthly', monthlyTask);

    // 计算下次运行时间
    this.calculateNextRunTimes();

    console.log('✅ 定时任务设置完成');
  }

  /**
   * 执行每日清理
   */
  private async executeDailyCleanup(): Promise<void> {
    console.log('🗓️ 执行每日清理任务');

    try {
      // 清理过期事务
      await this.executeTask(CleanupTaskType.EXPIRED_TRANSACTIONS);

      // 清理未完成上传
      await this.executeTask(CleanupTaskType.INCOMPLETE_UPLOADS);

      console.log('✅ 每日清理任务完成');
    } catch (error) {
      console.error('❌ 每日清理任务失败:', error);
      this.emit('daily_cleanup_failed', error);
    }
  }

  /**
   * 执行每周清理
   */
  private async executeWeeklyCleanup(): Promise<void> {
    console.log('📅 执行每周清理任务');

    try {
      // 检测和清理孤儿文件
      await this.executeTask(CleanupTaskType.ORPHAN_FILES);

      console.log('✅ 每周清理任务完成');
    } catch (error) {
      console.error('❌ 每周清理任务失败:', error);
      this.emit('weekly_cleanup_failed', error);
    }
  }

  /**
   * 执行每月清理
   */
  private async executeMonthlyCleanup(): Promise<void> {
    console.log('📆 执行每月清理任务');

    try {
      // 清理临时文件
      await this.executeTask(CleanupTaskType.TEMP_FILES);

      console.log('✅ 每月清理任务完成');
    } catch (error) {
      console.error('❌ 每月清理任务失败:', error);
      this.emit('monthly_cleanup_failed', error);
    }
  }

  /**
   * 执行单个清理任务
   */
  private async executeTask(taskType: CleanupTaskType): Promise<void> {
    const startTime = new Date();

    try {
      console.log(`🧹 开始执行清理任务: ${taskType}`);

      // 更新运行统计
      this.lastRunTimes.set(taskType, startTime);
      this.totalRuns.set(taskType, (this.totalRuns.get(taskType) || 0) + 1);

      // 发出任务开始事件
      this.emit('task_started', { taskType, startTime });

      // 这里应该调用具体的清理任务执行器
      // 暂时模拟执行
      await this.simulateTaskExecution(taskType);

      // 更新成功统计
      this.successCounts.set(taskType, (this.successCounts.get(taskType) || 0) + 1);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.log(`✅ 清理任务完成: ${taskType} (耗时: ${duration}ms)`);

      // 发出任务完成事件
      this.emit('task_completed', {
        taskType,
        startTime,
        endTime,
        duration,
        success: true
      });

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      console.error(`❌ 清理任务失败: ${taskType}`, error);

      // 发出任务失败事件
      this.emit('task_failed', {
        taskType,
        startTime,
        endTime,
        duration,
        error
      });

      throw error;
    }
  }

  /**
   * 模拟任务执行
   */
  private async simulateTaskExecution(taskType: CleanupTaskType): Promise<void> {
    // 模拟不同任务的执行时间
    const executionTimes = {
      [CleanupTaskType.EXPIRED_TRANSACTIONS]: 5000,
      [CleanupTaskType.ORPHAN_FILES]: 15000,
      [CleanupTaskType.INCOMPLETE_UPLOADS]: 8000,
      [CleanupTaskType.TEMP_FILES]: 3000
    };

    const delay = executionTimes[taskType] || 5000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 手动执行清理任务
   */
  async executeTaskManually(taskType: CleanupTaskType): Promise<void> {
    if (!this.isRunning) {
      throw new Error('调度器未运行');
    }

    console.log(`🔧 手动执行清理任务: ${taskType}`);
    await this.executeTask(taskType);
  }

  /**
   * 获取调度器状态
   */
  getStatus(): CleanupServiceStatus {
    const activeTasks: string[] = [];

    // 检查正在运行的任务（这里简化处理）
    // 实际实现中应该跟踪正在执行的任务

    const lastRunTimes = {} as Record<CleanupTaskType, Date | null>;
    const nextRunTimes = {} as Record<CleanupTaskType, Date | null>;
    const totalRunsRecord = {} as Record<CleanupTaskType, number>;
    const successRates = {} as Record<CleanupTaskType, number>;

    Object.values(CleanupTaskType).forEach(taskType => {
      lastRunTimes[taskType] = this.lastRunTimes.get(taskType) || null;
      nextRunTimes[taskType] = this.nextRunTimes.get(taskType) || null;
      totalRunsRecord[taskType] = this.totalRuns.get(taskType) || 0;

      const total = this.totalRuns.get(taskType) || 0;
      const success = this.successCounts.get(taskType) || 0;
      successRates[taskType] = total > 0 ? success / total : 0;
    });

    return {
      isRunning: this.isRunning,
      activeTasks,
      lastRunTimes,
      nextRunTimes,
      totalRuns: totalRunsRecord,
      successRates
    };
  }

  /**
   * 计算下次运行时间
   */
  private calculateNextRunTimes(): void {
    // 这里应该根据cron表达式计算下次运行时间
    // 简化实现，使用固定的时间间隔
    const now = new Date();

    // 每日任务：下一个凌晨2点
    const nextDaily = new Date(now);
    nextDaily.setHours(2, 0, 0, 0);
    if (nextDaily <= now) {
      nextDaily.setDate(nextDaily.getDate() + 1);
    }
    this.nextRunTimes.set(CleanupTaskType.EXPIRED_TRANSACTIONS, nextDaily);
    this.nextRunTimes.set(CleanupTaskType.INCOMPLETE_UPLOADS, nextDaily);

    // 每周任务：下一个周日凌晨3点
    const nextWeekly = new Date(now);
    nextWeekly.setHours(3, 0, 0, 0);
    const daysUntilSunday = (7 - nextWeekly.getDay()) % 7;
    nextWeekly.setDate(nextWeekly.getDate() + daysUntilSunday);
    if (nextWeekly <= now) {
      nextWeekly.setDate(nextWeekly.getDate() + 7);
    }
    this.nextRunTimes.set(CleanupTaskType.ORPHAN_FILES, nextWeekly);

    // 每月任务：下个月1号凌晨4点
    const nextMonthly = new Date(now);
    nextMonthly.setMonth(nextMonthly.getMonth() + 1, 1);
    nextMonthly.setHours(4, 0, 0, 0);
    this.nextRunTimes.set(CleanupTaskType.TEMP_FILES, nextMonthly);
  }

  /**
   * 更新调度配置
   */
  updateSchedules(newSchedules: CleanupConfig['schedules']): void {
    console.log('🔄 更新清理任务调度配置');

    // 停止现有任务
    this.scheduledTasks.forEach(task => task.stop());
    this.scheduledTasks.clear();

    // 更新配置
    this.config.schedules = newSchedules;

    // 重新设置任务
    if (this.isRunning) {
      this.setupScheduledTasks();
    }
  }

  /**
   * 获取任务统计
   */
  getTaskStatistics(): Record<CleanupTaskType, {
    totalRuns: number;
    successfulRuns: number;
    successRate: number;
    lastRun: Date | null;
    nextRun: Date | null;
  }> {
    const stats: any = {};

    Object.values(CleanupTaskType).forEach(taskType => {
      const total = this.totalRuns.get(taskType) || 0;
      const success = this.successCounts.get(taskType) || 0;

      stats[taskType] = {
        totalRuns: total,
        successfulRuns: success,
        successRate: total > 0 ? success / total : 0,
        lastRun: this.lastRunTimes.get(taskType) || null,
        nextRun: this.nextRunTimes.get(taskType) || null
      };
    });

    return stats;
  }
}
