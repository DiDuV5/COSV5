/**
 * @fileoverview 文件生命周期管理服务（重构版）
 * @description 管理文件的自动清理、归档和版本控制
 * @author Augment AI
 * @date 2025-06-27
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @example
 * // 创建生命周期管理器
 * const lifecycleManager = new LifecycleManager(storageManager);
 *
 * // 设置清理规则
 * await lifecycleManager.addCleanupRule({
 *   name: 'temp-files',
 *   pattern: 'temp/**',
 *   maxAge: 24 * 60 * 60 * 1000, // 24小时
 *   action: 'delete'
 * });
 *
 * @dependencies
 * - StorageManager: 存储管理器
 * - FileProcessor: 文件处理器
 * - CleanupScheduler: 清理调度器
 * - LifecycleDatabase: 数据库操作
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-06-27: 模块化重构，拆分为独立组件
 */

import { EventEmitter } from 'events';
import { StorageManager } from '../object-storage/storage-manager';
import { type FileInfo, type ListParams } from '../object-storage/base-storage-provider';

// 导入重构后的模块
import { FilePatternMatcher, filePatternMatcher } from './file-pattern-matcher';
import { FileProcessor, createFileProcessor } from './file-processor';
import { CleanupScheduler, cleanupScheduler } from './cleanup-scheduler';
import { LifecycleDatabase, lifecycleDatabase } from './lifecycle-database';

// 导入类型定义
import type {
  CleanupRule,
  CleanupResult,
  ArchiveConfig,
  LifecycleManagerStatus,
  FileProcessingOptions
} from './lifecycle-types';

/**
 * 文件生命周期管理器（重构版）
 * 现在使用模块化的组件来处理不同的功能
 */
export class LifecycleManager extends EventEmitter {
  private storageManager: StorageManager;
  private cleanupRules = new Map<string, CleanupRule>();
  private archiveConfig: ArchiveConfig | null = null;
  private isRunning = false;

  // 使用重构后的模块化组件
  private patternMatcher: FilePatternMatcher;
  private fileProcessor: FileProcessor;
  private scheduler: CleanupScheduler;
  private database: LifecycleDatabase;

  constructor(storageManager: StorageManager) {
    super();
    this.storageManager = storageManager;

    // 初始化模块化组件
    this.patternMatcher = filePatternMatcher;
    this.fileProcessor = createFileProcessor(storageManager);
    this.scheduler = cleanupScheduler;
    this.database = lifecycleDatabase;

    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听调度器事件
    this.scheduler.on('ruleExecuted', (ruleName: string) => {
      this.emit('ruleExecuted', ruleName);
    });

    this.scheduler.on('ruleError', (ruleName: string, error: Error) => {
      this.emit('ruleError', ruleName, error);
    });
  }

  /**
   * 添加清理规则（重构版 - 使用模块化组件）
   */
  async addCleanupRule(rule: CleanupRule): Promise<void> {
    this.cleanupRules.set(rule.name, rule);

    // 如果有定时任务，设置定时器
    if (rule.schedule && rule.enabled) {
      this.scheduler.scheduleCleanupRule(rule, async (ruleName: string) => {
        await this.executeCleanupRule(ruleName);
      });
    }

    // 保存到数据库
    await this.database.saveCleanupRule(rule);

    this.emit('ruleAdded', rule);
    console.log(`✅ 添加清理规则: ${rule.name}`);
  }

  /**
   * 移除清理规则（重构版 - 使用模块化组件）
   */
  async removeCleanupRule(ruleName: string): Promise<void> {
    const rule = this.cleanupRules.get(ruleName);
    if (!rule) {
      throw new Error(`清理规则不存在: ${ruleName}`);
    }

    // 取消定时任务
    this.scheduler.unscheduleCleanupRule(ruleName);

    this.cleanupRules.delete(ruleName);

    // 从数据库删除
    await this.database.deleteCleanupRule(ruleName);

    this.emit('ruleRemoved', { ruleName });
    console.log(`🗑️ 移除清理规则: ${ruleName}`);
  }

  /**
   * 执行清理规则（重构版 - 使用模块化组件）
   */
  async executeCleanupRule(ruleName: string): Promise<CleanupResult> {
    const rule = this.cleanupRules.get(ruleName);
    if (!rule) {
      throw new Error(`清理规则不存在: ${ruleName}`);
    }

    if (!rule.enabled) {
      throw new Error(`清理规则已禁用: ${ruleName}`);
    }

    console.log(`🧹 开始执行清理规则: ${ruleName}`);

    try {
      // 获取匹配的文件列表
      const files = await this.getMatchingFiles(rule);
      console.log(`📁 找到 ${files.length} 个匹配文件`);

      // 按规则过滤文件
      const filesToProcess = this.patternMatcher.filterFilesByRule(files, rule);
      console.log(`🎯 需要处理 ${filesToProcess.length} 个文件`);

      // 使用文件处理器处理文件
      const result = await this.fileProcessor.processFiles(filesToProcess, rule, {
        parallel: true,
        concurrency: 5,
        skipErrors: true,
        onProgress: (processed, total) => {
          console.log(`📊 处理进度: ${processed}/${total}`);
        },
        onError: (error, file) => {
          console.error(`❌ 处理文件失败 ${file}:`, error);
        }
      });

      // 保存执行结果
      await this.database.saveCleanupResult(result);

      this.emit('cleanupCompleted', result);

      console.log(`✅ 清理规则执行完成: ${ruleName}`, {
        处理文件: result.processedFiles,
        删除文件: result.deletedFiles,
        释放空间: `${(Number(result.freedSpace) / 1024 / 1024).toFixed(2)} MB`,
        耗时: `${result.endTime.getTime() - result.startTime.getTime()}ms`,
      });

      return result;
    } catch (error) {
      console.error(`❌ 清理规则执行失败: ${ruleName}`, error);
      this.emit('cleanupFailed', { ruleName, error });

      throw error;
    }
  }

  /**
   * 执行所有启用的清理规则
   */
  async executeAllCleanupRules(): Promise<CleanupResult[]> {
    if (this.isRunning) {
      throw new Error('清理任务正在运行中');
    }

    this.isRunning = true;
    const results: CleanupResult[] = [];

    try {
      console.log('🚀 开始执行所有清理规则');

      for (const [ruleName, rule] of Array.from(this.cleanupRules.entries())) {
        if (!rule.enabled) {
          console.log(`⏭️ 跳过禁用的规则: ${ruleName}`);
          continue;
        }

        try {
          const result = await this.executeCleanupRule(ruleName);
          results.push(result);
        } catch (error) {
          console.error(`❌ 规则执行失败: ${ruleName}`, error);
        }
      }

      console.log('✅ 所有清理规则执行完成');
      this.emit('allCleanupCompleted', results);

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 设置归档配置
   */
  setArchiveConfig(config: ArchiveConfig): void {
    this.archiveConfig = config;
    this.fileProcessor.setArchiveConfig(config);
    console.log('📦 设置归档配置:', config);
  }

  /**
   * 获取归档配置
   */
  getArchiveConfig(): ArchiveConfig | null {
    return this.archiveConfig;
  }

  /**
   * 启动生命周期管理器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ 生命周期管理器已在运行');
      return;
    }

    this.isRunning = true;
    this.scheduler.start();

    // 从数据库加载规则
    try {
      const rules = await this.database.loadCleanupRules();
      for (const rule of rules) {
        this.cleanupRules.set(rule.name, rule);
        if (rule.schedule && rule.enabled) {
          this.scheduler.scheduleCleanupRule(rule, async (ruleName: string) => {
            await this.executeCleanupRule(ruleName);
          });
        }
      }
      console.log(`📋 加载了 ${rules.length} 个清理规则`);
    } catch (error) {
      console.error('❌ 加载清理规则失败:', error);
    }

    this.emit('started');
    console.log('🚀 生命周期管理器已启动');
  }

  /**
   * 停止生命周期管理器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('⚠️ 生命周期管理器未在运行');
      return;
    }

    this.scheduler.stop();
    this.isRunning = false;
    this.emit('stopped');
    console.log('🛑 生命周期管理器已停止');
  }

  /**
   * 获取清理规则列表
   */
  getCleanupRules(): CleanupRule[] {
    return Array.from(this.cleanupRules.values());
  }

  /**
   * 获取清理统计信息（重构版 - 使用数据库模块）
   */
  async getCleanupStats(ruleName?: string): Promise<any> {
    return await this.database.getCleanupStats(ruleName);
  }

  /**
   * 获取指定清理规则
   */
  getCleanupRule(ruleName: string): CleanupRule | undefined {
    return this.cleanupRules.get(ruleName);
  }

  /**
   * 获取匹配的文件列表（重构版 - 使用模式匹配器）
   */
  private async getMatchingFiles(rule: CleanupRule): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    let nextContinuationToken: string | undefined;

    do {
      const listParams: ListParams = {
        prefix: this.patternMatcher.extractPrefixFromPattern(rule.pattern),
        maxKeys: 1000,
        nextContinuationToken,
      };

      const result = await this.storageManager.listFiles(listParams);

      // 过滤匹配模式的文件
      const matchingFiles = result.files.filter(file =>
        this.patternMatcher.matchesPattern(file.key, rule.pattern) &&
        (!rule.excludePatterns || !this.patternMatcher.matchesExcludePatterns(file.key, rule.excludePatterns))
      );

      files.push(...matchingFiles);
      nextContinuationToken = result.nextContinuationToken;
    } while (nextContinuationToken);

    return files;
  }
}
