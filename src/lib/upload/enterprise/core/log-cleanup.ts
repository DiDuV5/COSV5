/**
 * @fileoverview 日志清理器 - CoserEden平台
 * @description 处理日志文件相关的清理操作
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 3.0.0 - 重构版（模块化架构）
 * @since 1.0.0
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import {
  CleanupTaskType,
  type CleanupStats,
  type LogCleanupOptions,
  type ILogCleanup,
  type CleanupContext,
} from './cleanup-types';

/**
 * 日志清理器类
 * 负责处理日志文件相关的清理操作
 */
export class LogCleanup extends EventEmitter implements ILogCleanup {
  private logDirectory: string;
  private archiveDirectory: string;

  constructor(context: CleanupContext) {
    super();
    this.logDirectory = process.env.COSEREEDEN_LOG_DIRECTORY || './logs';
    this.archiveDirectory = process.env.COSEREEDEN_LOG_ARCHIVE_DIRECTORY || './logs/archive';
  }

  /**
   * 清理旧日志文件
   */
  public async cleanupOldLogs(options?: LogCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.LOG_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🧹 开始清理旧日志文件');
      this.emit('taskStarted', { taskType: CleanupTaskType.LOG_CLEANUP });

      const retentionDays = options?.retentionDays || 30;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // 获取所有日志文件
      const logFiles = await this.getLogFiles();
      stats.processedCount = logFiles.length;

      for (const logFile of logFiles) {
        try {
          const filePath = join(this.logDirectory, logFile);
          const fileStat = await fs.stat(filePath);

          // 检查文件是否超过保留期
          if (fileStat.mtime < cutoffDate) {
            // 检查日志级别过滤
            if (this.shouldProcessLogFile(logFile, options?.logLevels)) {
              if (options?.compressOld) {
                // 压缩旧日志
                await this.compressLogFile(filePath);
                console.log(`✅ 压缩旧日志: ${logFile}`);
              } else {
                // 直接删除
                await fs.unlink(filePath);
                console.log(`✅ 删除旧日志: ${logFile}`);
              }

              stats.cleanedCount++;
            } else {
              stats.skippedCount++;
            }
          } else {
            stats.skippedCount++;
          }

        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`文件${logFile}: ${error instanceof Error ? error.message : '未知错误'}`);
          console.error(`❌ 处理日志文件失败: ${logFile}`, error);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 旧日志清理完成: 处理${stats.processedCount}个，清理${stats.cleanedCount}个`);
      this.emit('taskCompleted', { taskType: CleanupTaskType.LOG_CLEANUP, stats });

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 清理旧日志失败:', error);
      this.emit('taskFailed', { taskType: CleanupTaskType.LOG_CLEANUP, error });
    }

    return stats;
  }

  /**
   * 归档日志文件
   */
  public async archiveLogs(options?: LogCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.LOG_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('📦 开始归档日志文件');

      const retentionDays = options?.retentionDays || 7;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const archivePath = options?.archivePath || this.archiveDirectory;

      // 确保归档目录存在
      await this.ensureDirectoryExists(archivePath);

      // 获取需要归档的日志文件
      const logFiles = await this.getLogFiles();
      stats.processedCount = logFiles.length;

      for (const logFile of logFiles) {
        try {
          const filePath = join(this.logDirectory, logFile);
          const fileStat = await fs.stat(filePath);

          if (fileStat.mtime < cutoffDate) {
            // 生成归档文件名
            const archiveFileName = this.generateArchiveFileName(logFile);
            const archiveFilePath = join(archivePath, archiveFileName);

            // 移动文件到归档目录
            await fs.rename(filePath, archiveFilePath);

            // 如果需要压缩
            if (options?.compressOld) {
              await this.compressLogFile(archiveFilePath);
            }

            stats.cleanedCount++;
            console.log(`✅ 归档日志: ${logFile} -> ${archiveFileName}`);
          } else {
            stats.skippedCount++;
          }

        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`文件${logFile}: ${error instanceof Error ? error.message : '未知错误'}`);
          console.error(`❌ 归档日志文件失败: ${logFile}`, error);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 日志归档完成: 处理${stats.processedCount}个，归档${stats.cleanedCount}个`);

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 日志归档失败:', error);
    }

    return stats;
  }

  /**
   * 压缩日志文件
   */
  public async compressLogs(options?: LogCleanupOptions): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      taskType: CleanupTaskType.LOG_CLEANUP,
      processedCount: 0,
      cleanedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      executionTimeMs: 0,
      errors: [],
    };

    try {
      console.log('🗜️ 开始压缩日志文件');

      const retentionDays = options?.retentionDays || 3;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // 获取需要压缩的日志文件
      const logFiles = await this.getLogFiles();
      const uncompressedFiles = logFiles.filter(file => !file.endsWith('.gz'));
      stats.processedCount = uncompressedFiles.length;

      for (const logFile of uncompressedFiles) {
        try {
          const filePath = join(this.logDirectory, logFile);
          const fileStat = await fs.stat(filePath);

          if (fileStat.mtime < cutoffDate) {
            await this.compressLogFile(filePath);
            stats.cleanedCount++;
            console.log(`✅ 压缩日志: ${logFile}`);
          } else {
            stats.skippedCount++;
          }

        } catch (error) {
          stats.failedCount++;
          stats.errors.push(`文件${logFile}: ${error instanceof Error ? error.message : '未知错误'}`);
          console.error(`❌ 压缩日志文件失败: ${logFile}`, error);
        }
      }

      stats.executionTimeMs = Date.now() - startTime;
      console.log(`✅ 日志压缩完成: 处理${stats.processedCount}个，压缩${stats.cleanedCount}个`);

    } catch (error) {
      stats.executionTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : '未知错误');
      console.error('❌ 日志压缩失败:', error);
    }

    return stats;
  }

  /**
   * 获取日志统计
   */
  public async getLogStats(): Promise<Record<string, any>> {
    try {
      const logFiles = await this.getLogFiles();
      let totalSize = 0;
      let compressedCount = 0;
      const filesByType: Record<string, number> = {};

      for (const logFile of logFiles) {
        try {
          const filePath = join(this.logDirectory, logFile);
          const fileStat = await fs.stat(filePath);
          totalSize += fileStat.size;

          if (logFile.endsWith('.gz')) {
            compressedCount++;
          }

          // 按文件类型分类
          const fileType = this.getLogFileType(logFile);
          filesByType[fileType] = (filesByType[fileType] || 0) + 1;

        } catch (error) {
          console.error(`获取文件统计失败: ${logFile}`, error);
        }
      }

      return {
        totalFiles: logFiles.length,
        totalSize,
        compressedFiles: compressedCount,
        uncompressedFiles: logFiles.length - compressedCount,
        filesByType,
        directory: this.logDirectory,
        archiveDirectory: this.archiveDirectory,
      };

    } catch (error) {
      console.error('获取日志统计失败:', error);
      return { error: '无法获取日志统计' };
    }
  }

  // 私有方法

  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDirectory);
      return files.filter(file => this.isLogFile(file));
    } catch (error) {
      console.error('读取日志目录失败:', error);
      return [];
    }
  }

  private isLogFile(fileName: string): boolean {
    const logExtensions = ['.log', '.log.gz', '.txt', '.out', '.err'];
    return logExtensions.some(ext => fileName.endsWith(ext));
  }

  private shouldProcessLogFile(fileName: string, logLevels?: string[]): boolean {
    if (!logLevels || logLevels.length === 0) {
      return true;
    }

    return logLevels.some(level =>
      fileName.toLowerCase().includes(level.toLowerCase())
    );
  }

  private async compressLogFile(filePath: string): Promise<void> {
    const compressedPath = `${filePath}.gz`;

    const readStream = await fs.open(filePath, 'r');
    const writeStream = await fs.open(compressedPath, 'w');
    const gzipStream = createGzip();

    try {
      await pipeline(
        readStream.createReadStream(),
        gzipStream,
        writeStream.createWriteStream()
      );

      // 删除原文件
      await fs.unlink(filePath);
    } finally {
      await readStream.close();
      await writeStream.close();
    }
  }

  private generateArchiveFileName(originalFileName: string): string {
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
    const extension = originalFileName.split('.').pop();

    return `${nameWithoutExt}_${timestamp}.${extension}`;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private getLogFileType(fileName: string): string {
    if (fileName.includes('error')) return 'error';
    if (fileName.includes('access')) return 'access';
    if (fileName.includes('debug')) return 'debug';
    if (fileName.includes('audit')) return 'audit';
    if (fileName.includes('cleanup')) return 'cleanup';
    return 'general';
  }
}
