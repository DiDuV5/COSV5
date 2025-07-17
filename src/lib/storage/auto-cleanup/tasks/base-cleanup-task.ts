/**
 * @fileoverview 清理任务基类
 * @description 提供清理任务的基础功能和通用方法
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { pathManager } from '../utils/path-manager-mock';

import type { 
  ICleanupTask, 
  CleanupTaskResult, 
  CleanupTaskContext, 
  CleanupTaskConfig,
  FileInfo,
  CleanupResultDetail
} from '../types';

import { FileScanner } from '../utils/file-scanner';

/**
 * 清理任务基类
 */
export abstract class BaseCleanupTask implements ICleanupTask {
  protected fileScanner: FileScanner;
  protected config: CleanupTaskConfig;

  constructor(config: CleanupTaskConfig) {
    this.config = config;
    this.fileScanner = FileScanner.getInstance();
  }

  /**
   * 任务名称
   */
  public abstract get name(): string;

  /**
   * 任务类型
   */
  public abstract get type(): string;

  /**
   * 执行清理任务
   */
  public async execute(context: CleanupTaskContext): Promise<CleanupTaskResult> {
    const taskStart = Date.now();
    const result: CleanupTaskResult = {
      taskType: this.type,
      success: true,
      filesScanned: 0,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      console.log(`🔍 开始执行清理任务: ${this.name}`);

      // 验证配置
      if (!this.validate(this.config)) {
        throw new Error(`任务配置验证失败: ${this.name}`);
      }

      // 执行具体的清理逻辑
      const details = await this.performCleanup(context, result);
      
      // 记录详细结果
      if (details.length > 0) {
        console.log(`📋 ${this.name} 处理详情:`);
        details.forEach(detail => {
          console.log(`  ${detail.operation}: ${path.basename(detail.filePath)} (${this.formatBytes(detail.fileSize)})`);
        });
      }

      console.log(`✅ ${this.name} 完成 - 扫描: ${result.filesScanned}, 删除: ${result.filesDeleted}, 释放: ${this.formatBytes(result.spaceFreed)}`);
    } catch (error) {
      result.success = false;
      result.errors.push(`${this.name} 执行失败: ${error}`);
      console.error(`❌ ${this.name} 执行失败:`, error);
    }

    result.duration = Date.now() - taskStart;
    return result;
  }

  /**
   * 验证任务配置
   */
  public validate(config: CleanupTaskConfig): boolean {
    if (!config.enabled) {
      return false;
    }

    if (config.maxAge < 0) {
      console.error(`${this.name}: maxAge 不能为负数`);
      return false;
    }

    if (config.keepCount !== undefined && config.keepCount < 0) {
      console.error(`${this.name}: keepCount 不能为负数`);
      return false;
    }

    return this.validateSpecific(config);
  }

  /**
   * 获取任务描述
   */
  public abstract getDescription(): string;

  /**
   * 执行具体的清理逻辑（子类实现）
   */
  protected abstract performCleanup(
    context: CleanupTaskContext, 
    result: CleanupTaskResult
  ): Promise<CleanupResultDetail[]>;

  /**
   * 特定任务的配置验证（子类可重写）
   */
  protected validateSpecific(config: CleanupTaskConfig): boolean {
    return true;
  }

  /**
   * 安全删除文件
   */
  protected async safeDeleteFile(
    filePath: string, 
    context: CleanupTaskContext
  ): Promise<CleanupResultDetail> {
    const detail: CleanupResultDetail = {
      filePath,
      operation: 'failed',
      fileSize: 0,
      timestamp: new Date(),
    };

    try {
      // 获取文件信息
      const stats = await fs.stat(filePath);
      detail.fileSize = stats.size;

      // 检查文件是否被锁定
      if (context.fileLockManager.isFileLocked(filePath)) {
        detail.operation = 'skipped';
        detail.reason = '文件被锁定';
        return detail;
      }

      // 安全检查
      if (this.config.safetyCheck && !this.fileScanner.isSafeToDelete(filePath)) {
        detail.operation = 'skipped';
        detail.reason = '安全检查失败';
        return detail;
      }

      // 创建备份（如果需要）
      await this.createBackupIfNeeded(filePath, stats.size);

      // 删除文件
      if (!context.dryRun) {
        await fs.unlink(filePath);
      }

      detail.operation = 'deleted';
      console.log(`🗑️ 已删除文件: ${path.basename(filePath)}`);
    } catch (error) {
      detail.operation = 'failed';
      detail.error = String(error);
      console.error(`删除文件 ${filePath} 失败:`, error);
    }

    return detail;
  }

  /**
   * 批量删除文件
   */
  protected async batchDeleteFiles(
    filePaths: string[], 
    context: CleanupTaskContext
  ): Promise<CleanupResultDetail[]> {
    const details: CleanupResultDetail[] = [];
    
    for (const filePath of filePaths) {
      const detail = await this.safeDeleteFile(filePath, context);
      details.push(detail);
    }

    return details;
  }

  /**
   * 过滤过期文件
   */
  protected filterExpiredFiles(files: FileInfo[]): FileInfo[] {
    const cutoffTime = new Date(Date.now() - this.config.maxAge);
    return files.filter(file => file.mtime < cutoffTime);
  }

  /**
   * 应用保留数量限制
   */
  protected applyKeepCountLimit(files: FileInfo[]): FileInfo[] {
    if (!this.config.keepCount || this.config.keepCount <= 0) {
      return files;
    }

    // 按修改时间排序，保留最新的文件
    const sorted = this.fileScanner.sortFilesByModTime(files, false);
    return sorted.slice(this.config.keepCount);
  }

  /**
   * 创建备份（如果需要）
   */
  protected async createBackupIfNeeded(filePath: string, fileSize: number): Promise<void> {
    try {
      // 只为大文件创建备份（超过10MB）
      if (fileSize > 10 * 1024 * 1024) {
        const backupDir = path.join(pathManager.getConfig().backupDir, 'cleanup');
        await pathManager.ensureDir(backupDir);

        const filename = path.basename(filePath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `${timestamp}_${filename}`);

        await fs.copyFile(filePath, backupPath);
        console.log(`💾 已创建备份: ${path.basename(backupPath)}`);
      }
    } catch (error) {
      console.warn(`创建备份失败: ${error}`);
      // 不抛出错误，允许继续删除
    }
  }

  /**
   * 扫描目标目录
   */
  protected async scanTargetDirectory(): Promise<string[]> {
    const targetPath = this.getTargetPath();
    return await this.fileScanner.scanDirectory(targetPath);
  }

  /**
   * 获取目标路径
   */
  protected getTargetPath(): string {
    // 根据配置的目标目录获取完整路径
    const dirMap: Record<string, () => string> = {
      chunks: () => pathManager.getChunksDir(),
      media: () => pathManager.getMediaDir(),
      logs: () => pathManager.getConfig().logsDir,
      backups: () => pathManager.getConfig().backupDir,
      temp: () => pathManager.getTempDir(),
    };

    const getPath = dirMap[this.config.targetDir];
    if (getPath) {
      return getPath();
    }

    // 如果是绝对路径，直接使用
    if (path.isAbsolute(this.config.targetDir)) {
      return this.config.targetDir;
    }

    // 否则相对于临时目录
    return path.join(pathManager.getTempDir(), this.config.targetDir);
  }

  /**
   * 更新结果统计
   */
  protected updateResult(
    result: CleanupTaskResult, 
    details: CleanupResultDetail[]
  ): void {
    result.filesScanned += details.length;
    
    details.forEach(detail => {
      if (detail.operation === 'deleted') {
        result.filesDeleted++;
        result.spaceFreed += detail.fileSize;
      } else if (detail.operation === 'failed') {
        result.errors.push(detail.error || `处理文件失败: ${detail.filePath}`);
      }
    });
  }

  /**
   * 格式化字节数
   */
  protected formatBytes(bytes: number): string {
    return this.fileScanner.formatFileSize(bytes);
  }

  /**
   * 记录任务进度
   */
  protected logProgress(current: number, total: number, operation: string): void {
    const percentage = Math.round((current / total) * 100);
    console.log(`📊 ${this.name} ${operation}: ${current}/${total} (${percentage}%)`);
  }

  /**
   * 检查是否应该跳过文件
   */
  protected shouldSkipFile(filePath: string, context: CleanupTaskContext): boolean {
    // 检查文件锁
    if (context.fileLockManager.isFileLocked(filePath)) {
      return true;
    }

    // 安全检查
    if (this.config.safetyCheck && !this.fileScanner.isSafeToDelete(filePath)) {
      return true;
    }

    return false;
  }

  /**
   * 获取任务配置摘要
   */
  public getConfigSummary(): string {
    const maxAgeStr = this.formatDuration(this.config.maxAge);
    const keepCountStr = this.config.keepCount ? `, 保留${this.config.keepCount}个` : '';
    const safetyStr = this.config.safetyCheck ? ', 启用安全检查' : '';
    
    return `${this.name}: ${maxAgeStr}${keepCountStr}${safetyStr}`;
  }

  /**
   * 格式化时长
   */
  private formatDuration(ms: number): string {
    const hours = ms / (60 * 60 * 1000);
    
    if (hours < 24) {
      return `${hours}小时`;
    }
    
    const days = Math.floor(hours / 24);
    return `${days}天`;
  }
}
