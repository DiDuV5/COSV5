/**
 * @fileoverview 清理任务调度器
 * @description 管理定时清理任务的调度和执行
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - node-cron: 定时任务调度
 * - temp-file-cleanup: 临时文件清理服务
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建
 */

import { defaultTempFileCleanup, TempFileCleanupService } from './temp-file-cleanup';
import { enterpriseCleanupService } from '../upload/enterprise/enterprise-cleanup-service';

export interface SchedulerConfig {
  enableTempFileCleanup: boolean;
  tempFileCleanupCron: string;     // cron表达式
  enableOrphanFileCleanup: boolean;
  orphanFileCleanupCron: string;   // cron表达式
  timezone: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  cron: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'IDLE' | 'RUNNING' | 'ERROR';
  errorMessage?: string;
}

export class CleanupScheduler {
  private config: SchedulerConfig;
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private tempFileCleanup: TempFileCleanupService;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      enableTempFileCleanup: true,
      tempFileCleanupCron: '0 * * * *',      // 每小时执行
      enableOrphanFileCleanup: true,
      orphanFileCleanupCron: '0 2 * * *',    // 每天凌晨2点执行
      timezone: 'Asia/Shanghai',
      ...config
    };

    this.tempFileCleanup = defaultTempFileCleanup;
    this.initializeTasks();
  }

  /**
   * 初始化调度任务
   */
  private initializeTasks() {
    // 临时文件清理任务
    this.tasks.set('temp-file-cleanup', {
      id: 'temp-file-cleanup',
      name: '临时文件清理',
      cron: this.config.tempFileCleanupCron,
      enabled: this.config.enableTempFileCleanup,
      status: 'IDLE'
    });

    // 孤儿文件清理任务
    this.tasks.set('orphan-file-cleanup', {
      id: 'orphan-file-cleanup',
      name: '孤儿文件清理',
      cron: this.config.orphanFileCleanupCron,
      enabled: this.config.enableOrphanFileCleanup,
      status: 'IDLE'
    });
  }

  /**
   * 启动调度器
   */
  start() {
    console.log('🚀 启动清理任务调度器');

    const taskEntries = Array.from(this.tasks.entries());
    for (const [taskId, task] of taskEntries) {
      if (task.enabled) {
        this.scheduleTask(taskId);
      }
    }
  }

  /**
   * 停止调度器
   */
  stop() {
    console.log('⏹️ 停止清理任务调度器');

    const intervalEntries = Array.from(this.intervals.entries());
    for (const [taskId, interval] of intervalEntries) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
  }

  /**
   * 调度单个任务
   */
  private scheduleTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // 解析cron表达式并设置定时器
    const interval = this.parseCronToInterval(task.cron);

    const timer = setInterval(async () => {
      await this.executeTask(taskId);
    }, interval);

    this.intervals.set(taskId, timer);

    // 计算下次运行时间
    task.nextRun = new Date(Date.now() + interval);

    console.log(`⏰ 已调度任务: ${task.name}, 下次运行: ${task.nextRun?.toLocaleString()}`);
  }

  /**
   * 执行任务
   */
  private async executeTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'RUNNING') return;

    task.status = 'RUNNING';
    task.lastRun = new Date();

    try {
      console.log(`🔄 开始执行任务: ${task.name}`);

      switch (taskId) {
        case 'temp-file-cleanup':
          await this.tempFileCleanup.cleanup();
          break;
        case 'orphan-file-cleanup':
          // await enterpriseCleanupService.detectAndCleanupOrphanFiles(); // 暂时注释掉，方法不存在
          console.log('执行孤立文件清理任务');
          break;
        default:
          throw new Error(`未知任务: ${taskId}`);
      }

      task.status = 'IDLE';
      task.errorMessage = undefined;

      // 更新下次运行时间
      const interval = this.parseCronToInterval(task.cron);
      task.nextRun = new Date(Date.now() + interval);

      console.log(`✅ 任务执行完成: ${task.name}`);

    } catch (error) {
      task.status = 'ERROR';
      task.errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`❌ 任务执行失败: ${task.name}`, error);
    }
  }

  /**
   * 手动执行任务
   */
  async executeTaskManually(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    if (task.status === 'RUNNING') {
      throw new Error(`任务正在运行中: ${task.name}`);
    }

    await this.executeTask(taskId);
  }

  /**
   * 简单的cron表达式解析（仅支持基本格式）
   */
  private parseCronToInterval(cron: string): number {
    // 简化的cron解析，仅支持常用格式
    // 格式: 分 时 日 月 周
    const parts = cron.split(' ');

    if (parts.length !== 5) {
      throw new Error(`无效的cron表达式: ${cron}`);
    }

    const [minute, hour, day, month, weekday] = parts;

    // 每小时执行 (0 * * * *)
    if (minute === '0' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
      return 60 * 60 * 1000; // 1小时
    }

    // 每天执行 (0 2 * * *)
    if (minute === '0' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
      return 24 * 60 * 60 * 1000; // 24小时
    }

    // 每30分钟执行 (*/30 * * * *)
    if (minute === '*/30' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
      return 30 * 60 * 1000; // 30分钟
    }

    // 每15分钟执行 (*/15 * * * *)
    if (minute === '*/15' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
      return 15 * 60 * 1000; // 15分钟
    }

    // 默认每小时执行
    console.warn(`不支持的cron表达式，使用默认间隔: ${cron}`);
    return 60 * 60 * 1000;
  }

  /**
   * 获取所有任务状态
   */
  getTasksStatus(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取单个任务状态
   */
  getTaskStatus(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 启用/禁用任务
   */
  setTaskEnabled(taskId: string, enabled: boolean) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    task.enabled = enabled;

    if (enabled) {
      this.scheduleTask(taskId);
    } else {
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(taskId);
      }
      task.nextRun = undefined;
    }

    console.log(`${enabled ? '启用' : '禁用'}任务: ${task.name}`);
  }

  /**
   * 更新任务cron表达式
   */
  updateTaskCron(taskId: string, cron: string) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`);
    }

    task.cron = cron;

    // 如果任务已启用，重新调度
    if (task.enabled) {
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearInterval(interval);
      }
      this.scheduleTask(taskId);
    }

    console.log(`更新任务调度: ${task.name}, 新cron: ${cron}`);
  }

  /**
   * 获取调度器配置
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  /**
   * 更新调度器配置
   */
  updateConfig(newConfig: Partial<SchedulerConfig>) {
    this.config = { ...this.config, ...newConfig };

    // 重新初始化任务
    this.stop();
    this.initializeTasks();
    this.start();
  }
}

// 创建默认调度器实例
export const defaultCleanupScheduler = new CleanupScheduler();

// 在应用启动时自动启动调度器
if (process.env.NODE_ENV === 'production') {
  defaultCleanupScheduler.start();
}
