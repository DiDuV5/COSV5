/**
 * @fileoverview 审批超时管理器 - 重构版本
 * @description 管理用户审批超时的检测、处理和通知
 * @author Augment AI
 * @date 2025-07-03
 * @version 3.0.0 - 重构版（模块化架构）
 */

import * as cron from 'node-cron';

// 导入重构后的模块
import {
  TimeoutUser,
  TimeoutProcessingResult,
  TimeoutProcessingOptions,
  TimeoutDetectionConfig,
  TimeoutStatistics
} from './types/timeout-types';

import { TimeoutDetector } from './core/timeout-detector';
import { TimeoutProcessor } from './handlers/timeout-processor';
import { TimeoutNotifier } from './notifications/timeout-notifier';

/**
 * 审批超时管理器主类 - 重构版
 */
export class ApprovalTimeoutManager {
  private static instance: ApprovalTimeoutManager;
  private isRunning = false;
  private scheduledTask?: cron.ScheduledTask;

  // 默认配置
  private config: TimeoutDetectionConfig = {
    timeoutHours: 72,
    reminderHours: 24,
    enableAutoRejection: true,
    enableNotifications: true,
    batchSize: 50
  };

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ApprovalTimeoutManager {
    if (!ApprovalTimeoutManager.instance) {
      ApprovalTimeoutManager.instance = new ApprovalTimeoutManager();
    }
    return ApprovalTimeoutManager.instance;
  }

  /**
   * 启动超时管理器
   */
  public start(config?: Partial<TimeoutDetectionConfig>): void {
    if (this.isRunning) {
      console.log('⚠️ 超时管理器已在运行');
      return;
    }

    // 合并配置
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.isRunning = true;
    console.log('🚀 启动审批超时管理器');

    // 设置定时任务 (每小时检查一次)
    this.scheduledTask = cron.schedule('0 * * * *', async () => {
      await this.performScheduledCheck();
    });

    console.log('✅ 超时管理器启动完成');
  }

  /**
   * 停止超时管理器
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = undefined;
    }

    console.log('🛑 超时管理器已停止');
  }

  /**
   * 手动检查和处理超时用户
   */
  public async checkAndProcessTimeouts(
    options: TimeoutProcessingOptions = {}
  ): Promise<TimeoutProcessingResult> {
    console.log('🔍 开始检查和处理超时用户');

    try {
      const result: TimeoutProcessingResult = {
        processedCount: 0,
        autoRejectedCount: 0,
        notifiedCount: 0,
        errors: []
      };

      // 获取超时用户
      const timeoutUsers = await TimeoutDetector.getTimeoutUsers(this.config.timeoutHours);
      result.processedCount = timeoutUsers.length;

      if (timeoutUsers.length === 0) {
        console.log('✅ 没有发现超时用户');
        return result;
      }

      console.log(`📊 发现 ${timeoutUsers.length} 个超时用户`);

      // 自动拒绝超时用户
      if (this.config.enableAutoRejection && options.enableAutoRejection !== false) {
        try {
          const rejectedCount = await TimeoutProcessor.autoRejectTimeoutUsers(timeoutUsers, options);
          result.autoRejectedCount = rejectedCount;
          console.log(`🚫 已自动拒绝 ${rejectedCount} 个用户`);
        } catch (error) {
          const errorMsg = `自动拒绝失败: ${error instanceof Error ? error.message : '未知错误'}`;
          result.errors.push(errorMsg);
          console.error('❌ 自动拒绝失败:', error);
        }
      }

      // 发送通知
      if (this.config.enableNotifications && options.enableNotifications !== false) {
        try {
          const notifiedCount = await TimeoutNotifier.sendTimeoutNotifications(timeoutUsers);
          result.notifiedCount = notifiedCount;
          console.log(`📧 已发送 ${notifiedCount} 个通知`);
        } catch (error) {
          const errorMsg = `发送通知失败: ${error instanceof Error ? error.message : '未知错误'}`;
          result.errors.push(errorMsg);
          console.error('❌ 发送通知失败:', error);
        }
      }

      console.log('✅ 超时用户处理完成');
      return result;

    } catch (error) {
      console.error('❌ 检查和处理超时用户失败:', error);
      throw error;
    }
  }

  /**
   * 发送即将超时提醒
   */
  public async sendUpcomingTimeoutReminders(): Promise<number> {
    console.log('📧 发送即将超时提醒');

    try {
      const upcomingTimeoutUsers = await TimeoutDetector.getUpcomingTimeoutUsers(
        this.config.timeoutHours,
        this.config.reminderHours
      );

      if (upcomingTimeoutUsers.length === 0) {
        console.log('✅ 没有即将超时的用户');
        return 0;
      }

      const notifiedCount = await TimeoutNotifier.sendUpcomingTimeoutNotifications(upcomingTimeoutUsers);
      console.log(`✅ 已发送 ${notifiedCount} 个即将超时提醒`);

      return notifiedCount;

    } catch (error) {
      console.error('❌ 发送即将超时提醒失败:', error);
      throw error;
    }
  }

  /**
   * 发送管理员提醒
   */
  public async sendAdminReminders(): Promise<void> {
    console.log('📧 发送管理员提醒');

    try {
      const [timeoutUsers, upcomingTimeoutUsers] = await Promise.all([
        TimeoutDetector.getTimeoutUsers(this.config.timeoutHours),
        TimeoutDetector.getUpcomingTimeoutUsers(this.config.timeoutHours, this.config.reminderHours)
      ]);

      if (timeoutUsers.length === 0 && upcomingTimeoutUsers.length === 0) {
        console.log('✅ 没有需要提醒管理员的情况');
        return;
      }

      await TimeoutNotifier.sendAdminTimeoutReminders(timeoutUsers, upcomingTimeoutUsers);
      console.log('✅ 管理员提醒发送完成');

    } catch (error) {
      console.error('❌ 发送管理员提醒失败:', error);
      throw error;
    }
  }

  /**
   * 获取超时统计信息
   */
  public async getTimeoutStatistics(): Promise<TimeoutStatistics> {
    try {
      return await TimeoutDetector.getTimeoutStatistics(this.config.timeoutHours);
    } catch (error) {
      console.error('❌ 获取超时统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取超时用户列表
   */
  public async getTimeoutUsers(): Promise<TimeoutUser[]> {
    try {
      return await TimeoutDetector.getTimeoutUsers(this.config.timeoutHours);
    } catch (error) {
      console.error('❌ 获取超时用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取即将超时的用户列表
   */
  public async getUpcomingTimeoutUsers(): Promise<TimeoutUser[]> {
    try {
      return await TimeoutDetector.getUpcomingTimeoutUsers(
        this.config.timeoutHours,
        this.config.reminderHours
      );
    } catch (error) {
      console.error('❌ 获取即将超时用户失败:', error);
      throw error;
    }
  }

  /**
   * 撤销超时处理
   */
  public async undoTimeoutProcessing(userIds: string[], reason: string): Promise<number> {
    try {
      return await TimeoutProcessor.undoTimeoutProcessing(userIds, reason);
    } catch (error) {
      console.error('❌ 撤销超时处理失败:', error);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<TimeoutDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 超时管理器配置已更新');
  }

  /**
   * 获取当前配置
   */
  public getConfig(): TimeoutDetectionConfig {
    return { ...this.config };
  }

  /**
   * 检查管理器状态
   */
  public getStatus(): {
    isRunning: boolean;
    config: TimeoutDetectionConfig;
    lastCheckTime?: Date;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastCheckTime: this.lastCheckTime
    };
  }

  // 私有方法

  private lastCheckTime?: Date;

  /**
   * 执行定时检查
   */
  private async performScheduledCheck(): Promise<void> {
    try {
      console.log('⏰ 执行定时超时检查');
      this.lastCheckTime = new Date();

      // 检查和处理超时用户
      await this.checkAndProcessTimeouts();

      // 发送即将超时提醒
      await this.sendUpcomingTimeoutReminders();

      // 每天发送一次管理员提醒
      const hour = new Date().getHours();
      if (hour === 9) { // 每天上午9点发送管理员提醒
        await this.sendAdminReminders();
      }

      console.log('✅ 定时检查完成');

    } catch (error) {
      console.error('❌ 定时检查失败:', error);
    }
  }
}

/**
 * 超时调度器类 - 简化版
 */
export class TimeoutScheduler {
  private static instance: TimeoutScheduler;
  private manager: ApprovalTimeoutManager;

  private constructor() {
    this.manager = ApprovalTimeoutManager.getInstance();
  }

  public static getInstance(): TimeoutScheduler {
    if (!TimeoutScheduler.instance) {
      TimeoutScheduler.instance = new TimeoutScheduler();
    }
    return TimeoutScheduler.instance;
  }

  /**
   * 启动调度器
   */
  public start(): void {
    this.manager.start();
  }

  /**
   * 停止调度器
   */
  public stop(): void {
    this.manager.stop();
  }

  /**
   * 获取状态
   */
  public getStatus() {
    return this.manager.getStatus();
  }
}

// 导出单例实例
export const approvalTimeoutManager = ApprovalTimeoutManager.getInstance();
export const timeoutScheduler = TimeoutScheduler.getInstance();
