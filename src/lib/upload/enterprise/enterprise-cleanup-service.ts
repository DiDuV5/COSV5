/**
 * @fileoverview 企业级清理服务 - 重构版本
 * @description 提供全面的系统清理和维护功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 3.0.0 - 重构版（模块化架构）
 */

import { EventEmitter } from 'events';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';

// 导入重构后的模块
import {
  CleanupTaskType,
  CleanupStatus,
  CleanupResult,
  CleanupConfig,
  CleanupReport,
  ICleanupExecutor
} from './types/cleanup-types';

import { CleanupExecutor } from './core/cleanup-executor';
import { TaskManager } from './managers/task-manager';
import { CleanupReporter } from './reporters/cleanup-reporter';
import { CleanupConfigManager } from './config/cleanup-config';

/**
 * 企业级清理服务主类 - 重构版
 */
export class EnterpriseCleanupService extends EventEmitter implements ICleanupExecutor {
  private static instance: EnterpriseCleanupService;
  private initialized = false;

  // 核心组件
  private cleanupExecutor?: CleanupExecutor;
  private taskManager?: TaskManager;
  private reporter?: CleanupReporter;
  private configManager?: CleanupConfigManager;

  // 基础组件
  private s3Client?: S3Client;
  private prisma?: PrismaClient;
  private config: CleanupConfig;

  private constructor() {
    super();
    this.config = CleanupConfigManager.getDefaultConfig();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): EnterpriseCleanupService {
    if (!EnterpriseCleanupService.instance) {
      EnterpriseCleanupService.instance = new EnterpriseCleanupService();
    }
    return EnterpriseCleanupService.instance;
  }

  /**
   * 初始化清理服务
   */
  public async initialize(config?: Partial<CleanupConfig>): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🚀 初始化企业级清理服务...');

      // 合并配置
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // 初始化配置管理器
      this.configManager = new CleanupConfigManager(this.config);

      // 初始化基础客户端
      await this.initializeClients();

      // 初始化核心组件
      this.taskManager = new TaskManager();
      this.cleanupExecutor = new CleanupExecutor(this.config as any);
      this.reporter = new CleanupReporter(this.taskManager);

      // 初始化执行器
      await this.cleanupExecutor.initialize();

      // 设置事件转发
      this.setupEventForwarding();

      this.initialized = true;
      console.log('✅ 企业级清理服务初始化完成');

    } catch (error) {
      console.error('❌ 企业级清理服务初始化失败:', error);
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.SERVICE_UNAVAILABLE,
        `清理服务初始化失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * 执行单个清理任务
   */
  public async executeTask(taskType: CleanupTaskType, options?: any): Promise<CleanupResult> {
    if (!this.initialized) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.SERVICE_UNAVAILABLE,
        '清理服务未初始化'
      );
    }

    if (!this.cleanupExecutor || !this.taskManager) {
      throw TRPCErrorHandler.internalError('清理组件未初始化');
    }

    console.log(`🧹 开始执行清理任务: ${taskType}`);

    try {
      // 检查任务是否已在运行
      if (this.taskManager.isTaskRunning(taskType)) {
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.OPERATION_IN_PROGRESS,
          `清理任务 ${taskType} 正在运行中`
        );
      }

      // 添加到运行列表
      this.taskManager.addRunningTask(taskType);

      // 执行任务
      const result = await this.cleanupExecutor.executeTask(taskType as any, options);

      // 添加到历史记录
      this.taskManager.addTaskResult(result as any);

      console.log(`✅ 清理任务完成: ${taskType}`, {
        itemsDeleted: (result as any).stats?.cleanedCount || 0,
        bytesFreed: 0, // 从stats中获取，如果有的话
        duration: (result as any).duration || 0
      });

      return result as any;

    } catch (error) {
      console.error(`❌ 清理任务失败: ${taskType}`, error);
      throw error;
    } finally {
      // 从运行列表移除
      this.taskManager.removeRunningTask(taskType as any);
    }
  }

  /**
   * 执行批量清理任务
   */
  public async executeBatch(taskTypes: CleanupTaskType[]): Promise<CleanupResult[]> {
    if (!this.cleanupExecutor) {
      throw TRPCErrorHandler.internalError('清理执行器未初始化');
    }

    console.log(`🧹 开始执行批量清理: ${taskTypes.length} 个任务`);

    const results = await this.cleanupExecutor.executeBatch(taskTypes as any);

    // 添加所有结果到历史记录
    if (this.taskManager) {
      results.forEach(result => this.taskManager!.addTaskResult(result as any));
    }

    console.log(`✅ 批量清理完成: ${results.length}/${taskTypes.length} 个任务成功`);
    return results as any;
  }

  /**
   * 取消正在运行的任务
   */
  public async cancelTask(taskType: CleanupTaskType): Promise<boolean> {
    if (!this.cleanupExecutor || !this.taskManager) {
      return false;
    }

    const cancelled = await this.cleanupExecutor.cancelTask(taskType as any);
    if (cancelled) {
      this.taskManager.removeRunningTask(taskType as any);
    }

    return cancelled;
  }

  /**
   * 获取正在运行的任务
   */
  public getRunningTasks(): CleanupTaskType[] {
    return this.taskManager?.getRunningTasks() || [];
  }

  /**
   * 获取任务历史
   */
  public getTaskHistory(limit?: number): CleanupResult[] {
    return this.taskManager?.getTaskHistory(limit) || [];
  }

  /**
   * 生成清理报告
   */
  public async generateCleanupReport(period?: { start: Date; end: Date }): Promise<CleanupReport> {
    if (!this.reporter) {
      throw TRPCErrorHandler.internalError('报告生成器未初始化');
    }

    return await this.reporter.generateReport(period);
  }

  /**
   * 获取服务统计
   */
  public getServiceStats(): {
    initialized: boolean;
    runningTasks: number;
    totalTasksExecuted: number;
    configSummary: any;
  } {
    const taskStats = this.taskManager?.getTaskStats();

    return {
      initialized: this.initialized,
      runningTasks: this.getRunningTasks().length,
      totalTasksExecuted: taskStats?.totalTasksExecuted || 0,
      configSummary: {
        enabled: this.config.enabled,
        maxConcurrentTasks: this.config.globalSettings.maxConcurrentTasks,
        enabledTasks: Object.values(this.config.tasks).filter(t => t.enabled).length,
        totalTasks: Object.keys(this.config.tasks).length
      }
    };
  }

  /**
   * 获取服务健康状态
   */
  public async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: any;
  }> {
    const issues: string[] = [];

    if (!this.initialized) {
      issues.push('服务未初始化');
    }

    if (!this.cleanupExecutor) {
      issues.push('清理执行器未初始化');
    }

    if (!this.taskManager) {
      issues.push('任务管理器未初始化');
    }

    if (!this.reporter) {
      issues.push('报告生成器未初始化');
    }

    const stats = this.getServiceStats();

    return {
      healthy: issues.length === 0,
      issues,
      stats
    };
  }

  /**
   * 重新初始化服务
   */
  public async reinitialize(config?: Partial<CleanupConfig>): Promise<void> {
    console.log('🔄 重新初始化企业级清理服务...');

    this.initialized = false;

    // 清理现有组件
    this.cleanupExecutor = undefined;
    this.taskManager = undefined;
    this.reporter = undefined;
    this.configManager = undefined;

    // 重新初始化
    await this.initialize(config);
  }

  // 私有方法

  /**
   * 初始化客户端
   */
  private async initializeClients(): Promise<void> {
    // 初始化S3客户端
    this.s3Client = new S3Client({
      region: this.config.storage.region,
      endpoint: this.config.storage.endpoint,
      credentials: {
        accessKeyId: this.config.storage.accessKeyId,
        secretAccessKey: this.config.storage.secretAccessKey,
      },
    });

    // 初始化Prisma客户端
    this.prisma = new PrismaClient();
  }

  /**
   * 设置事件转发
   */
  private setupEventForwarding(): void {
    // 转发任务管理器事件
    if (this.taskManager) {
      this.taskManager.on('taskAdded', (data) => this.emit('taskStarted', data));
      this.taskManager.on('taskCompleted', (data) => this.emit('taskCompleted', data));
      this.taskManager.on('progressUpdated', (data) => this.emit('progressUpdate', data));
    }

    // 转发执行器事件
    if (this.cleanupExecutor) {
      this.cleanupExecutor.on('taskStarted', (data) => this.emit('taskStarted', data));
      this.cleanupExecutor.on('taskCompleted', (data) => this.emit('taskCompleted', data));
      this.cleanupExecutor.on('taskFailed', (data) => this.emit('taskFailed', data));
      this.cleanupExecutor.on('progressUpdate', (data) => this.emit('progressUpdate', data));
    }
  }
}

// 导出单例获取函数
export const getEnterpriseCleanupService = () => EnterpriseCleanupService.getInstance();

// 导出单例实例（向后兼容）
export const enterpriseCleanupService = EnterpriseCleanupService.getInstance();
