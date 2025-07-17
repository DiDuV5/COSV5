/**
 * @fileoverview 临时文件清理服务
 * @description 定期清理临时文件和失败的上传文件，防止磁盘空间浪费
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - fs/promises: 文件系统操作
 * - path: 路径处理
 * - cron: 定时任务调度
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建
 */

import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export interface TempFileCleanupConfig {
  // 清理配置
  tempFileMaxAge: number;        // 临时文件最大保留时间（小时）
  uploadFileMaxAge: number;      // 上传文件最大保留时间（小时）
  failedFileMaxAge: number;      // 失败文件最大保留时间（小时）
  
  // 目录配置
  tempDirectories: string[];     // 需要清理的临时目录
  
  // 清理选项
  enableAutoCleanup: boolean;    // 启用自动清理
  cleanupInterval: number;       // 清理间隔（分钟）
  dryRun: boolean;              // 是否只是模拟运行
  maxFilesPerRun: number;       // 每次运行最大清理文件数
  
  // 安全选项
  enableSafetyCheck: boolean;    // 启用安全检查
  preserveRecentFiles: boolean;  // 保护最近的文件
  createBackup: boolean;         // 删除前创建备份
}

export interface CleanupResult {
  success: boolean;
  totalScanned: number;
  totalDeleted: number;
  totalSize: number;            // 释放的空间（字节）
  errors: CleanupError[];
  summary: string;
  duration: number;             // 清理耗时（毫秒）
  directories: DirectoryCleanupResult[];
}

export interface CleanupError {
  filePath: string;
  error: string;
  type: 'ACCESS_DENIED' | 'FILE_IN_USE' | 'UNKNOWN';
}

export interface DirectoryCleanupResult {
  directory: string;
  scanned: number;
  deleted: number;
  size: number;
  errors: number;
}

export class TempFileCleanupService {
  private static instance: TempFileCleanupService;
  private config: TempFileCleanupConfig;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;

  constructor(config?: Partial<TempFileCleanupConfig>) {
    this.config = {
      tempFileMaxAge: 2,           // 2小时
      uploadFileMaxAge: 24,        // 24小时
      failedFileMaxAge: 1,         // 1小时
      tempDirectories: [
        'temp/uploads',
        'temp/processed',
        'public/uploads/temp'
      ],
      enableAutoCleanup: true,
      cleanupInterval: 60,         // 60分钟
      dryRun: false,
      maxFilesPerRun: 1000,
      enableSafetyCheck: true,
      preserveRecentFiles: true,
      createBackup: false,
      ...config
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(config?: Partial<TempFileCleanupConfig>): TempFileCleanupService {
    if (!TempFileCleanupService.instance) {
      TempFileCleanupService.instance = new TempFileCleanupService(config);
    }
    return TempFileCleanupService.instance;
  }

  /**
   * 执行临时文件清理
   */
  async cleanup(options?: { dryRun?: boolean; force?: boolean }): Promise<CleanupResult> {
    if (this.isRunning && !options?.force) {
      throw new Error('清理任务正在运行中');
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('🧹 开始临时文件清理任务');
      
      const result: CleanupResult = {
        success: true,
        totalScanned: 0,
        totalDeleted: 0,
        totalSize: 0,
        errors: [],
        summary: '',
        duration: 0,
        directories: []
      };

      // 清理每个目录
      for (const directory of this.config.tempDirectories) {
        const dirResult = await this.cleanupDirectory(directory, options?.dryRun);
        result.directories.push(dirResult);
        result.totalScanned += dirResult.scanned;
        result.totalDeleted += dirResult.deleted;
        result.totalSize += dirResult.size;
      }

      // 清理失败的转码文件
      const failedTranscodeResult = await this.cleanupFailedTranscodeFiles(options?.dryRun);
      result.directories.push(failedTranscodeResult);
      result.totalScanned += failedTranscodeResult.scanned;
      result.totalDeleted += failedTranscodeResult.deleted;
      result.totalSize += failedTranscodeResult.size;

      result.duration = Date.now() - startTime;
      result.summary = this.generateCleanupSummary(result);
      
      this.lastRunTime = new Date();
      
      // 记录清理结果
      await this.logCleanupResult(result);
      
      console.log(`✅ 临时文件清理完成: ${result.summary}`);
      return result;

    } catch (error) {
      console.error('❌ 临时文件清理失败:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 清理指定目录
   */
  private async cleanupDirectory(
    directory: string, 
    dryRun: boolean = false
  ): Promise<DirectoryCleanupResult> {
    const result: DirectoryCleanupResult = {
      directory,
      scanned: 0,
      deleted: 0,
      size: 0,
      errors: 0
    };

    try {
      const fullPath = path.join(process.cwd(), directory);
      
      // 检查目录是否存在
      try {
        await fs.access(fullPath);
      } catch {
        console.log(`📁 目录不存在，跳过: ${directory}`);
        return result;
      }

      const files = await this.scanDirectory(fullPath);
      result.scanned = files.length;

      console.log(`📁 扫描目录: ${directory} (${files.length} 个文件)`);

      for (const file of files) {
        try {
          const shouldDelete = await this.shouldDeleteFile(file);
          
          if (shouldDelete) {
            const stats = await fs.stat(file.path);
            
            if (!dryRun) {
              await fs.unlink(file.path);
            }
            
            result.deleted++;
            result.size += stats.size;
            
            console.log(`🗑️ ${dryRun ? '[模拟]' : ''}删除文件: ${file.relativePath} (${Math.round(stats.size / 1024)}KB)`);
          }
        } catch (error) {
          result.errors++;
          console.error(`❌ 处理文件失败: ${file.path}`, error);
        }
      }

      return result;

    } catch (error) {
      console.error(`❌ 清理目录失败: ${directory}`, error);
      result.errors++;
      return result;
    }
  }

  /**
   * 扫描目录获取所有文件
   */
  private async scanDirectory(dirPath: string): Promise<Array<{ path: string; relativePath: string }>> {
    const files: Array<{ path: string; relativePath: string }> = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(process.cwd(), fullPath);
        
        if (item.isFile()) {
          files.push({ path: fullPath, relativePath });
        } else if (item.isDirectory()) {
          // 递归扫描子目录
          const subFiles = await this.scanDirectory(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.error(`扫描目录失败: ${dirPath}`, error);
    }
    
    return files;
  }

  /**
   * 判断文件是否应该被删除
   */
  private async shouldDeleteFile(file: { path: string; relativePath: string }): Promise<boolean> {
    try {
      const stats = await fs.stat(file.path);
      const now = Date.now();
      const fileAge = now - stats.mtime.getTime();
      
      // 根据文件类型和位置确定最大保留时间
      let maxAge = this.config.tempFileMaxAge * 60 * 60 * 1000; // 转换为毫秒
      
      if (file.relativePath.includes('failed') || file.relativePath.includes('error')) {
        maxAge = this.config.failedFileMaxAge * 60 * 60 * 1000;
      } else if (file.relativePath.includes('upload')) {
        maxAge = this.config.uploadFileMaxAge * 60 * 60 * 1000;
      }
      
      // 安全检查：保护最近的文件
      if (this.config.preserveRecentFiles && fileAge < 30 * 60 * 1000) { // 30分钟内的文件
        return false;
      }
      
      return fileAge > maxAge;
      
    } catch (error) {
      console.error(`检查文件失败: ${file.path}`, error);
      return false;
    }
  }

  /**
   * 清理失败的转码文件
   */
  private async cleanupFailedTranscodeFiles(dryRun: boolean = false): Promise<DirectoryCleanupResult> {
    const result: DirectoryCleanupResult = {
      directory: 'failed_transcoding',
      scanned: 0,
      deleted: 0,
      size: 0,
      errors: 0
    };

    try {
      // 查找失败的转码任务
      const failedTasks = await prisma.mediaProcessingTask.findMany({
        where: {
          status: 'FAILED',
          taskType: 'TRANSCODE',
          createdAt: {
            lt: new Date(Date.now() - this.config.failedFileMaxAge * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          inputPath: true,
          outputPath: true
        }
      });

      result.scanned = failedTasks.length;

      for (const task of failedTasks) {
        try {
          // 删除输入和输出文件
          const filesToDelete = [task.inputPath, task.outputPath].filter((path): path is string => Boolean(path));

          for (const filePath of filesToDelete) {
            try {
              const stats = await fs.stat(filePath);

              if (!dryRun) {
                await fs.unlink(filePath);
              }
              
              result.size += stats.size;
              console.log(`🗑️ ${dryRun ? '[模拟]' : ''}删除失败转码文件: ${filePath}`);
            } catch {
              // 文件可能已经不存在
            }
          }
          
          // 删除任务记录
          if (!dryRun) {
            await prisma.mediaProcessingTask.delete({
              where: { id: task.id }
            });
          }
          
          result.deleted++;
          
        } catch (error) {
          result.errors++;
          console.error(`清理失败转码任务失败: ${task.id}`, error);
        }
      }

      return result;

    } catch (error) {
      console.error('清理失败转码文件失败:', error);
      result.errors++;
      return result;
    }
  }

  /**
   * 生成清理摘要
   */
  private generateCleanupSummary(result: CleanupResult): string {
    const sizeInMB = Math.round(result.totalSize / 1024 / 1024);
    return `扫描 ${result.totalScanned} 个文件，删除 ${result.totalDeleted} 个文件，释放 ${sizeInMB}MB 空间`;
  }

  /**
   * 记录清理结果
   */
  private async logCleanupResult(result: CleanupResult): Promise<void> {
    try {
      // 这里可以集成到审计日志系统
      console.log(`📝 清理日志: ${result.summary}, 耗时: ${result.duration}ms`);
      
      // 如果有审计日志服务，可以在这里调用
      // await AuditLogger.log({
      //   action: 'TEMP_FILE_CLEANUP',
      //   level: 'INFO',
      //   details: result
      // });
      
    } catch (error) {
      console.error('记录清理日志失败:', error);
    }
  }

  /**
   * 获取清理状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      config: this.config
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<TempFileCleanupConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建默认清理服务实例
export const defaultTempFileCleanup = TempFileCleanupService.getInstance();
