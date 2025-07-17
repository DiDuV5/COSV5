/**
 * @fileoverview 具体清理任务实现
 * @description 实现各种具体的清理任务
 */

import * as path from 'path';
import { prismaMock as prisma } from '../utils/prisma-mock';
import { BaseCleanupTask } from './base-cleanup-task';

import type { 
  CleanupTaskResult, 
  CleanupTaskContext, 
  CleanupTaskConfig,
  CleanupResultDetail
} from '../types';

/**
 * 分片文件清理任务
 */
export class ChunkFilesCleanupTask extends BaseCleanupTask {
  public get name(): string {
    return '分片文件清理';
  }

  public get type(): string {
    return 'chunkFiles';
  }

  public getDescription(): string {
    return '清理过期的分片上传临时文件';
  }

  protected async performCleanup(
    context: CleanupTaskContext, 
    result: CleanupTaskResult
  ): Promise<CleanupResultDetail[]> {
    const files = await this.scanTargetDirectory();
    result.filesScanned = files.length;

    const filesInfo = await this.fileScanner.getFilesInfo(files);
    const expiredFiles = this.filterExpiredFiles(filesInfo);

    const details: CleanupResultDetail[] = [];
    
    for (const fileInfo of expiredFiles) {
      if (!this.shouldSkipFile(fileInfo.path, context)) {
        const detail = await this.safeDeleteFile(fileInfo.path, context);
        details.push(detail);
      }
    }

    this.updateResult(result, details);
    return details;
  }
}

/**
 * 孤儿文件清理任务
 */
export class OrphanFilesCleanupTask extends BaseCleanupTask {
  public get name(): string {
    return '孤儿文件清理';
  }

  public get type(): string {
    return 'orphanFiles';
  }

  public getDescription(): string {
    return '清理数据库中不存在记录的孤儿文件';
  }

  protected async performCleanup(
    context: CleanupTaskContext, 
    result: CleanupTaskResult
  ): Promise<CleanupResultDetail[]> {
    // 获取文件系统中的所有文件
    const fsFiles = await this.scanTargetDirectory();
    result.filesScanned = fsFiles.length;

    // 获取数据库中的文件记录
    const dbFiles = await this.getDatabaseFiles();
    const dbFileSet = new Set(dbFiles);

    const filesInfo = await this.fileScanner.getFilesInfo(fsFiles);
    const expiredFiles = this.filterExpiredFiles(filesInfo);

    const details: CleanupResultDetail[] = [];

    for (const fileInfo of expiredFiles) {
      const filename = path.basename(fileInfo.path);
      
      // 检查是否为孤儿文件
      if (!dbFileSet.has(filename)) {
        if (!this.shouldSkipFile(fileInfo.path, context)) {
          const detail = await this.safeDeleteFile(fileInfo.path, context);
          details.push(detail);
        }
      }
    }

    this.updateResult(result, details);
    return details;
  }

  private async getDatabaseFiles(): Promise<string[]> {
    try {
      const mediaRecords = await prisma.postMedia.findMany({
        select: { filename: true },
      });
      return mediaRecords.map(record => (record as any).filename);
    } catch (error) {
      console.error('获取数据库文件记录失败:', error);
      return [];
    }
  }
}

/**
 * 日志文件清理任务
 */
export class LogFilesCleanupTask extends BaseCleanupTask {
  public get name(): string {
    return '日志文件清理';
  }

  public get type(): string {
    return 'logFiles';
  }

  public getDescription(): string {
    return '清理过期的日志文件，保留指定数量的最新文件';
  }

  protected async performCleanup(
    context: CleanupTaskContext, 
    result: CleanupTaskResult
  ): Promise<CleanupResultDetail[]> {
    const files = await this.scanTargetDirectory();
    result.filesScanned = files.length;

    const filesInfo = await this.fileScanner.getFilesInfo(files);
    
    // 先应用保留数量限制，再应用时间限制
    let filesToDelete = this.applyKeepCountLimit(filesInfo);
    filesToDelete = this.filterExpiredFiles(filesToDelete);

    const details: CleanupResultDetail[] = [];

    for (const fileInfo of filesToDelete) {
      if (!this.shouldSkipFile(fileInfo.path, context)) {
        const detail = await this.safeDeleteFile(fileInfo.path, context);
        details.push(detail);
      }
    }

    this.updateResult(result, details);
    return details;
  }
}

/**
 * 备份文件清理任务
 */
export class BackupFilesCleanupTask extends BaseCleanupTask {
  public get name(): string {
    return '备份文件清理';
  }

  public get type(): string {
    return 'backupFiles';
  }

  public getDescription(): string {
    return '清理过期的备份文件，保留指定数量的最新备份';
  }

  protected async performCleanup(
    context: CleanupTaskContext, 
    result: CleanupTaskResult
  ): Promise<CleanupResultDetail[]> {
    const files = await this.scanTargetDirectory();
    result.filesScanned = files.length;

    const filesInfo = await this.fileScanner.getFilesInfo(files);
    
    // 先应用保留数量限制，再应用时间限制
    let filesToDelete = this.applyKeepCountLimit(filesInfo);
    filesToDelete = this.filterExpiredFiles(filesToDelete);

    const details: CleanupResultDetail[] = [];

    for (const fileInfo of filesToDelete) {
      if (!this.shouldSkipFile(fileInfo.path, context)) {
        const detail = await this.safeDeleteFile(fileInfo.path, context);
        details.push(detail);
      }
    }

    this.updateResult(result, details);
    return details;
  }
}

/**
 * 失败上传文件清理任务
 */
export class FailedUploadsCleanupTask extends BaseCleanupTask {
  public get name(): string {
    return '失败上传文件清理';
  }

  public get type(): string {
    return 'failedUploads';
  }

  public getDescription(): string {
    return '清理失败的上传会话和相关临时文件';
  }

  protected async performCleanup(
    context: CleanupTaskContext, 
    result: CleanupTaskResult
  ): Promise<CleanupResultDetail[]> {
    const cutoffTime = new Date(Date.now() - this.config.maxAge);
    const details: CleanupResultDetail[] = [];

    try {
      // 查找失败的上传会话
      const failedSessions = await prisma.uploadSession.findMany({
        where: {
          status: 'FAILED',
          lastActivity: {
            lt: cutoffTime,
          },
        },
      });

      for (const session of failedSessions) {
        try {
          // 清理会话相关的临时文件
          const sessionDir = path.join(this.getTargetPath(), 'chunks', (session as any).sessionId);
          const files = await this.fileScanner.scanDirectory(sessionDir);

          result.filesScanned += files.length;

          for (const file of files) {
            if (!this.shouldSkipFile(file, context)) {
              const detail = await this.safeDeleteFile(file, context);
              details.push(detail);
            }
          }

          // 删除会话目录
          if (!context.dryRun && files.length > 0) {
            try {
              const { promises: fs } = await import('fs');
              await fs.rmdir(sessionDir);
            } catch (error) {
              console.warn(`删除会话目录 ${sessionDir} 失败:`, error);
            }
          }

          // 删除数据库记录
          if (!context.dryRun) {
            await prisma.uploadSession.delete({
              where: { id: (session as any).id },
            });
          }
        } catch (error) {
          details.push({
            filePath: (session as any).sessionId,
            operation: 'failed',
            fileSize: 0,
            error: `处理失败上传会话失败: ${error}`,
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('查询失败上传会话失败:', error);
    }

    this.updateResult(result, details);
    return details;
  }
}

/**
 * 临时处理文件清理任务
 */
export class TempProcessingFilesCleanupTask extends BaseCleanupTask {
  public get name(): string {
    return '临时处理文件清理';
  }

  public get type(): string {
    return 'tempProcessingFiles';
  }

  public getDescription(): string {
    return '清理临时处理文件，如转码、压缩等产生的临时文件';
  }

  protected async performCleanup(
    context: CleanupTaskContext, 
    result: CleanupTaskResult
  ): Promise<CleanupResultDetail[]> {
    const files = await this.scanTargetDirectory();
    result.filesScanned = files.length;

    const filesInfo = await this.fileScanner.getFilesInfo(files);
    const expiredFiles = this.filterExpiredFiles(filesInfo);

    const details: CleanupResultDetail[] = [];

    for (const fileInfo of expiredFiles) {
      // 检查是否为临时处理文件
      if (this.fileScanner.isTempProcessingFile(fileInfo.name)) {
        if (!this.shouldSkipFile(fileInfo.path, context)) {
          const detail = await this.safeDeleteFile(fileInfo.path, context);
          details.push(detail);
        }
      }
    }

    this.updateResult(result, details);
    return details;
  }
}

/**
 * 清理任务工厂
 */
export class CleanupTaskFactory {
  private static taskClasses = new Map<string, typeof BaseCleanupTask>([
    ['chunkFiles', ChunkFilesCleanupTask],
    ['orphanFiles', OrphanFilesCleanupTask],
    ['logFiles', LogFilesCleanupTask],
    ['backupFiles', BackupFilesCleanupTask],
    ['failedUploads', FailedUploadsCleanupTask],
    ['tempProcessingFiles', TempProcessingFilesCleanupTask],
  ]);

  /**
   * 创建清理任务
   */
  public static createTask(config: CleanupTaskConfig): BaseCleanupTask | null {
    const TaskClass = this.taskClasses.get(config.type);
    if (!TaskClass) {
      console.error(`未知的清理任务类型: ${config.type}`);
      return null;
    }

    return new (TaskClass as any)(config);
  }

  /**
   * 获取所有支持的任务类型
   */
  public static getSupportedTaskTypes(): string[] {
    return Array.from(this.taskClasses.keys()) as string[];
  }

  /**
   * 批量创建任务
   */
  public static createTasks(configs: CleanupTaskConfig[]): BaseCleanupTask[] {
    return configs
      .map(config => this.createTask(config))
      .filter((task): task is BaseCleanupTask => task !== null);
  }
}
