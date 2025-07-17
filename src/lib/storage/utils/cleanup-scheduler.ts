/**
 * @fileoverview 清理调度器
 * @description 处理定时清理任务的调度和管理
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import type { CleanupRule, ScheduleConfig, TIME_UNITS } from './lifecycle-types';

/**
 * 清理调度器
 */
export class CleanupScheduler extends EventEmitter {
  private scheduledJobs = new Map<string, NodeJS.Timeout>();
  private scheduleConfigs = new Map<string, ScheduleConfig>();
  private isRunning = false;

  constructor() {
    super();
  }

  /**
   * 启动调度器
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('Cleanup scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.emit('started');
    console.log('🚀 Cleanup scheduler started');
  }

  /**
   * 停止调度器
   */
  public stop(): void {
    if (!this.isRunning) {
      console.warn('Cleanup scheduler is not running');
      return;
    }

    // 清除所有定时任务
    this.scheduledJobs.forEach((timeout, ruleName) => {
      clearTimeout(timeout);
      console.log(`⏹️ Stopped scheduled job for rule: ${ruleName}`);
    });

    this.scheduledJobs.clear();
    this.isRunning = false;
    this.emit('stopped');
    console.log('🛑 Cleanup scheduler stopped');
  }

  /**
   * 添加定时清理规则
   */
  public scheduleCleanupRule(
    rule: CleanupRule,
    callback: (ruleName: string) => Promise<void>
  ): void {
    if (!rule.schedule || !rule.enabled) {
      return;
    }

    // 如果已存在，先移除
    this.unscheduleCleanupRule(rule.name);

    const interval = this.parseSchedule(rule.schedule);
    if (interval <= 0) {
      console.warn(`Invalid schedule for rule ${rule.name}: ${rule.schedule}`);
      return;
    }

    // 创建定时任务
    const timeout = setInterval(async () => {
      try {
        console.log(`⏰ Executing scheduled cleanup for rule: ${rule.name}`);
        await callback(rule.name);
        this.emit('ruleExecuted', rule.name);
      } catch (error) {
        console.error(`Failed to execute scheduled cleanup for rule ${rule.name}:`, error);
        this.emit('ruleError', rule.name, error);
      }
    }, interval);

    this.scheduledJobs.set(rule.name, timeout);

    // 保存调度配置
    const scheduleConfig: ScheduleConfig = {
      ruleName: rule.name,
      schedule: rule.schedule,
      enabled: rule.enabled,
      nextExecution: new Date(Date.now() + interval),
      jobId: String(timeout)
    };
    this.scheduleConfigs.set(rule.name, scheduleConfig);

    console.log(`📅 Scheduled cleanup rule: ${rule.name} (interval: ${interval}ms)`);
    this.emit('ruleScheduled', rule.name, scheduleConfig);
  }

  /**
   * 移除定时清理规则
   */
  public unscheduleCleanupRule(ruleName: string): void {
    const timeout = this.scheduledJobs.get(ruleName);
    if (timeout) {
      clearInterval(timeout);
      this.scheduledJobs.delete(ruleName);
      this.scheduleConfigs.delete(ruleName);
      console.log(`🗑️ Unscheduled cleanup rule: ${ruleName}`);
      this.emit('ruleUnscheduled', ruleName);
    }
  }

  /**
   * 解析定时表达式
   */
  public parseSchedule(schedule: string): number {
    // 简单的解析实现，支持基本格式
    const patterns: Record<string, number> = {
      '@hourly': 60 * 60 * 1000,
      '@daily': 24 * 60 * 60 * 1000,
      '@weekly': 7 * 24 * 60 * 60 * 1000,
      '@monthly': 30 * 24 * 60 * 60 * 1000,
      '@yearly': 365 * 24 * 60 * 60 * 1000
    };

    // 检查预定义模式
    if (patterns[schedule]) {
      return patterns[schedule];
    }

    // 解析数字+单位格式 (如 "5m", "2h", "1d")
    const unitMatch = schedule.match(/^(\d+)([smhd])$/);
    if (unitMatch) {
      const value = parseInt(unitMatch[1]);
      const unit = unitMatch[2];

      const unitMultipliers: Record<string, number> = {
        's': 1000,           // 秒
        'm': 60 * 1000,      // 分钟
        'h': 60 * 60 * 1000, // 小时
        'd': 24 * 60 * 60 * 1000 // 天
      };

      return value * (unitMultipliers[unit] || 0);
    }

    // 解析毫秒数
    const milliseconds = parseInt(schedule);
    if (!isNaN(milliseconds) && milliseconds > 0) {
      return milliseconds;
    }

    console.warn(`Unsupported schedule format: ${schedule}`);
    return 0;
  }

  /**
   * 获取所有调度配置
   */
  public getScheduleConfigs(): ScheduleConfig[] {
    return Array.from(this.scheduleConfigs.values());
  }

  /**
   * 获取特定规则的调度配置
   */
  public getScheduleConfig(ruleName: string): ScheduleConfig | undefined {
    return this.scheduleConfigs.get(ruleName);
  }

  /**
   * 更新规则的调度配置
   */
  public updateSchedule(ruleName: string, newSchedule: string): void {
    const config = this.scheduleConfigs.get(ruleName);
    if (!config) {
      console.warn(`No schedule config found for rule: ${ruleName}`);
      return;
    }

    // 移除旧的调度
    this.unscheduleCleanupRule(ruleName);

    // 创建新的调度（需要外部提供callback）
    console.log(`📝 Schedule updated for rule: ${ruleName} (${config.schedule} -> ${newSchedule})`);
  }

  /**
   * 检查调度器状态
   */
  public getStatus(): {
    isRunning: boolean;
    scheduledRules: number;
    activeJobs: string[];
    nextExecutions: Array<{ ruleName: string; nextExecution: Date }>;
  } {
    const activeJobs = Array.from(this.scheduledJobs.keys());
    const nextExecutions = Array.from(this.scheduleConfigs.values())
      .filter(config => config.nextExecution)
      .map(config => ({
        ruleName: config.ruleName,
        nextExecution: config.nextExecution!
      }))
      .sort((a, b) => a.nextExecution.getTime() - b.nextExecution.getTime());

    return {
      isRunning: this.isRunning,
      scheduledRules: this.scheduledJobs.size,
      activeJobs,
      nextExecutions
    };
  }

  /**
   * 立即执行指定规则
   */
  public async executeRuleNow(
    ruleName: string,
    callback: (ruleName: string) => Promise<void>
  ): Promise<void> {
    try {
      console.log(`🚀 Manually executing rule: ${ruleName}`);
      await callback(ruleName);
      this.emit('ruleExecuted', ruleName);
      console.log(`✅ Manual execution completed for rule: ${ruleName}`);
    } catch (error) {
      console.error(`❌ Manual execution failed for rule ${ruleName}:`, error);
      this.emit('ruleError', ruleName, error);
      throw error;
    }
  }

  /**
   * 暂停指定规则的调度
   */
  public pauseRule(ruleName: string): void {
    const config = this.scheduleConfigs.get(ruleName);
    if (config) {
      config.enabled = false;
      this.unscheduleCleanupRule(ruleName);
      console.log(`⏸️ Paused rule: ${ruleName}`);
      this.emit('rulePaused', ruleName);
    }
  }

  /**
   * 恢复指定规则的调度
   */
  public resumeRule(
    ruleName: string,
    callback: (ruleName: string) => Promise<void>
  ): void {
    const config = this.scheduleConfigs.get(ruleName);
    if (config) {
      config.enabled = true;

      // 重新创建调度
      const rule: CleanupRule = {
        name: config.ruleName,
        pattern: '', // 这里需要从外部获取完整的规则信息
        action: 'delete',
        enabled: true,
        schedule: config.schedule
      };

      this.scheduleCleanupRule(rule, callback);
      console.log(`▶️ Resumed rule: ${ruleName}`);
      this.emit('ruleResumed', ruleName);
    }
  }

  /**
   * 获取下次执行时间
   */
  public getNextExecutionTime(ruleName: string): Date | null {
    const config = this.scheduleConfigs.get(ruleName);
    return config?.nextExecution || null;
  }

  /**
   * 验证调度表达式
   */
  public validateSchedule(schedule: string): { isValid: boolean; error?: string } {
    try {
      const interval = this.parseSchedule(schedule);
      if (interval <= 0) {
        return { isValid: false, error: 'Invalid schedule format' };
      }

      // 检查最小间隔（防止过于频繁的执行）
      const minInterval = 60 * 1000; // 1分钟
      if (interval < minInterval) {
        return {
          isValid: false,
          error: `Schedule interval too short (minimum: ${minInterval}ms)`
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Schedule validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 获取调度统计信息
   */
  public getScheduleStats(): {
    totalRules: number;
    activeRules: number;
    pausedRules: number;
    averageInterval: number;
    nextExecution?: Date;
  } {
    const configs = Array.from(this.scheduleConfigs.values());
    const activeRules = configs.filter(c => c.enabled).length;
    const pausedRules = configs.length - activeRules;

    const intervals = configs
      .map(c => this.parseSchedule(c.schedule))
      .filter(interval => interval > 0);

    const averageInterval = intervals.length > 0
      ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      : 0;

    const nextExecutions = configs
      .filter(c => c.nextExecution && c.enabled)
      .map(c => c.nextExecution!)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalRules: configs.length,
      activeRules,
      pausedRules,
      averageInterval,
      nextExecution: nextExecutions[0]
    };
  }
}

/**
 * 导出单例实例
 */
export const cleanupScheduler = new CleanupScheduler();
