/**
 * @fileoverview 自动清理服务
 * @description 扩展临时文件清理功能，增加智能清理策略和定时任务
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0 - 重构为模块化结构
 * @since 1.0.0
 *
 * @dependencies
 * - EventEmitter: 事件发射器
 * - @/lib/cleanup/temp-file-cleanup: 基础清理服务
 * - 模块化的清理组件
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持智能清理和定时任务
 * - 2025-06-20: 重构为模块化结构，拆分为多个子模块
 */

import { EventEmitter } from 'events';
// import { TempFileCleanupService } from '@/lib/cleanup/temp-file-cleanup';

// 导入模块化组件
import { CleanupStrategyManager, DEFAULT_CLEANUP_STRATEGY } from './auto-cleanup/strategies/cleanup-strategy';
import { FileLockManager } from './auto-cleanup/utils/file-lock-manager';
import { ReportManager } from './auto-cleanup/utils/report-manager';
import { CleanupTaskFactory } from './auto-cleanup/tasks/cleanup-tasks';

// 导入类型
import type {
  CleanupStrategy,
  CleanupReport,
  CleanupTaskContext,
  ServiceStatus
} from './auto-cleanup/types';



/**
 * 自动清理服务
 */
export class AutoCleanupService extends EventEmitter {
  private static instance: AutoCleanupService;
  private strategyManager: CleanupStrategyManager;
  private fileLockManager: FileLockManager;
  private reportManager: ReportManager;
  // private tempCleanupService: TempFileCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor(strategy?: Partial<CleanupStrategy>) {
    super();

    // 初始化管理器
    this.strategyManager = new CleanupStrategyManager(strategy);
    this.fileLockManager = FileLockManager.getInstance();
    this.reportManager = ReportManager.getInstance();
    // this.tempCleanupService = TempFileCleanupService.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(strategy?: Partial<CleanupStrategy>): AutoCleanupService {
    if (!AutoCleanupService.instance) {
      AutoCleanupService.instance = new AutoCleanupService(strategy);
    }
    return AutoCleanupService.instance;
  }

  /**
   * 启动自动清理
   */
  public startAutoCleanup(): void {
    if (this.cleanupInterval) {
      console.log('🧹 自动清理已在运行中');
      return;
    }

    console.log('🚀 启动自动清理服务');

    // 每天凌晨2点执行清理
    const scheduleCleanup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0); // 凌晨2点

      const timeUntilCleanup = tomorrow.getTime() - now.getTime();

      setTimeout(async () => {
        try {
          await this.performFullCleanup();
        } catch (error) {
          console.error('❌ 自动清理失败:', error);
          this.emit('error', error);
        }

        // 设置下一次清理
        scheduleCleanup();
      }, timeUntilCleanup);

      console.log(`⏰ 下次自动清理时间: ${tomorrow.toLocaleString()}`);
    };

    scheduleCleanup();
    console.log('✅ 自动清理服务已启动');
  }

  /**
   * 停止自动清理
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearTimeout(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('⏹️ 自动清理服务已停止');
  }

  /**
   * 执行完整清理
   */
  public async performFullCleanup(dryRun: boolean = false): Promise<CleanupReport> {
    if (this.isRunning) {
      throw new Error('清理任务正在运行中');
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log(`🧹 开始执行${dryRun ? '模拟' : '实际'}清理任务`);

    const report: CleanupReport = {
      totalFilesScanned: 0,
      totalFilesDeleted: 0,
      totalSpaceFreed: 0,
      taskResults: [],
      duration: 0,
      timestamp: new Date(),
      success: true,
    };

    try {
      // 获取启用的任务配置
      const taskConfigs = this.strategyManager.getEnabledTaskConfigs();

      // 创建任务执行上下文
      const context: CleanupTaskContext = {
        dryRun,
        strategy: this.strategyManager.getStrategy(),
        fileLockManager: this.fileLockManager,
        reportManager: this.reportManager,
      };

      // 执行所有启用的清理任务
      for (const config of taskConfigs) {
        const task = CleanupTaskFactory.createTask(config);
        if (task) {
          const result = await task.execute(context);
          report.taskResults.push(result);
          this.updateReport(report, result);
        }
      }

      report.duration = Date.now() - startTime;

      // 保存清理报告
      if (!dryRun) {
        await this.reportManager.saveReport(report);
      }

      // 发出清理完成事件
      this.emit('cleanupComplete', report);

      console.log(`✅ 清理任务完成 - 扫描: ${report.totalFilesScanned}, 删除: ${report.totalFilesDeleted}, 释放: ${this.formatBytes(report.totalSpaceFreed)}`);

      return report;
    } catch (error) {
      report.success = false;
      report.duration = Date.now() - startTime;
      console.error('❌ 清理任务失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 更新报告统计
   */
  private updateReport(report: CleanupReport, result: any): void {
    report.totalFilesScanned += result.filesScanned;
    report.totalFilesDeleted += result.filesDeleted;
    report.totalSpaceFreed += result.spaceFreed;

    if (!result.success) {
      report.success = false;
    }
  }

  /**
   * 更新清理策略
   */
  public updateStrategy(newStrategy: Partial<CleanupStrategy>): void {
    this.strategyManager.updateStrategy(newStrategy);
    console.log('🔧 清理策略已更新');
  }

  /**
   * 获取当前策略
   */
  public getStrategy(): CleanupStrategy {
    return this.strategyManager.getStrategy();
  }

  /**
   * 获取服务状态
   */
  public getStatus(): ServiceStatus {
    return {
      isRunning: this.isRunning,
      strategy: this.strategyManager.getStrategy(),
      lockedFiles: this.fileLockManager.getLockedFiles(),
      lastExecutionTime: undefined, // 可以从报告管理器获取
      nextExecutionTime: undefined, // 可以计算下次执行时间
    };
  }

  /**
   * 获取清理历史
   */
  public async getCleanupHistory(limit?: number): Promise<CleanupReport[]> {
    return await this.reportManager.getHistory(limit);
  }

  /**
   * 获取清理统计
   */
  public async getStatistics() {
    return await this.reportManager.getStatistics();
  }

  /**
   * 锁定文件
   */
  public lockFile(filePath: string): void {
    this.fileLockManager.lockFile(filePath);
  }

  /**
   * 解锁文件
   */
  public unlockFile(filePath: string): void {
    this.fileLockManager.unlockFile(filePath);
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 导出默认实例
export const autoCleanupService = AutoCleanupService.getInstance();
