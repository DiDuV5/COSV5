/**
 * @fileoverview 孤儿文件清理器
 * @description 扫描和清理没有数据库记录的孤儿文件
 */

import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export interface OrphanCleanupOptions {
  dryRun?: boolean;           // 是否只是模拟运行
  maxAge?: number;            // 文件最大保留时间（毫秒）
  batchSize?: number;         // 批处理大小
  enableSafetyCheck?: boolean; // 启用安全检查
}

export interface OrphanCleanupResult {
  success: boolean;
  scannedFiles: number;       // 扫描的文件数
  orphanFiles: number;        // 发现的孤儿文件数
  deletedFiles: number;       // 删除的文件数
  savedSpace: number;         // 释放的空间（字节）
  errors: string[];           // 错误信息
  duration: number;           // 执行时间（毫秒）
}

export interface DiskFile {
  path: string;               // 磁盘上的完整路径
  url: string;                // 相对URL路径
  name: string;               // 文件名
}

/**
 * 孤儿文件清理器类
 */
export class OrphanCleaner {
  /**
   * 扫描并清理孤儿文件
   */
  public static async cleanupOrphanFiles(options: OrphanCleanupOptions = {}): Promise<OrphanCleanupResult> {
    const config = {
      dryRun: false,
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      batchSize: 100,
      enableSafetyCheck: true,
      ...options
    };

    console.log('🔍 开始扫描孤儿文件...');

    try {
      const result: OrphanCleanupResult = {
        success: true,
        scannedFiles: 0,
        orphanFiles: 0,
        deletedFiles: 0,
        savedSpace: 0,
        errors: [],
        duration: 0
      };

      const startTime = Date.now();

      // 扫描媒体目录
      const mediaDir = path.join(process.cwd(), 'public/uploads/media');
      const diskFiles = await this.scanMediaDirectory(mediaDir);
      result.scannedFiles = diskFiles.length;

      console.log(`📁 扫描到 ${diskFiles.length} 个磁盘文件`);

      // 获取数据库中的所有文件URL
      const dbFiles = await this.getDatabaseFileUrls();
      const dbFileSet = new Set(dbFiles);

      console.log(`💾 数据库中有 ${dbFiles.length} 个文件记录`);

      // 识别孤儿文件
      const orphanFiles = diskFiles.filter(file => {
        const relativePath = file.url.replace('/uploads/', '');
        return !dbFileSet.has(file.url) && !dbFileSet.has(`/uploads/${relativePath}`);
      });

      result.orphanFiles = orphanFiles.length;
      console.log(`🔍 发现 ${orphanFiles.length} 个孤儿文件`);

      // 清理孤儿文件
      for (const orphanFile of orphanFiles) {
        try {
          // 安全检查
          if (config.enableSafetyCheck) {
            const shouldDelete = await this.shouldDeleteOrphanFile(orphanFile, config.maxAge);
            if (!shouldDelete) {
              continue;
            }
          }

          const stats = await fs.stat(orphanFile.path);

          if (!config.dryRun) {
            await fs.unlink(orphanFile.path);
          }

          result.deletedFiles++;
          result.savedSpace += stats.size;

          console.log(`🗑️ ${config.dryRun ? '[模拟]' : ''}删除孤儿文件: ${orphanFile.url} (${Math.round(stats.size / 1024)}KB)`);

        } catch (error) {
          const errorMsg = `删除文件失败: ${orphanFile.path} - ${error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      // 记录清理结果
      await this.logOrphanCleanupResult(result, config);

      const savedMB = Math.round(result.savedSpace / 1024 / 1024);
      console.log(`✅ 孤儿文件清理完成: 删除 ${result.deletedFiles} 个文件，释放 ${savedMB}MB 空间`);

      return result;

    } catch (error) {
      console.error('❌ 孤儿文件清理失败:', error);
      throw error;
    }
  }

  /**
   * 扫描媒体目录获取所有文件
   */
  private static async scanMediaDirectory(dirPath: string): Promise<DiskFile[]> {
    const files: DiskFile[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // 递归扫描子目录
          const subFiles = await this.scanMediaDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // 生成相对URL路径
          const relativePath = path.relative(path.join(process.cwd(), 'public'), fullPath);
          const url = '/' + relativePath.replace(/\\/g, '/');

          files.push({
            path: fullPath,
            url,
            name: entry.name,
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`扫描目录失败: ${dirPath}`, error);
      }
    }

    return files;
  }

  /**
   * 获取数据库中的所有文件URL
   */
  private static async getDatabaseFileUrls(): Promise<string[]> {
    try {
      const mediaFiles = await prisma.postMedia.findMany({
        select: {
          url: true,
          smallUrl: true,
          mediumUrl: true,
          largeUrl: true,
          compressedUrl: true,
        },
      });

      const urls: string[] = [];

      mediaFiles.forEach(file => {
        if (file.url) urls.push(file.url);
        if (file.smallUrl) urls.push(file.smallUrl);
        if (file.mediumUrl) urls.push(file.mediumUrl);
        if (file.largeUrl) urls.push(file.largeUrl);
        if (file.compressedUrl) urls.push(file.compressedUrl);
      });

      // 去重
      return [...new Set(urls)];
    } catch (error) {
      console.error('获取数据库文件URL失败:', error);
      return [];
    }
  }

  /**
   * 判断是否应该删除孤儿文件
   */
  private static async shouldDeleteOrphanFile(file: DiskFile, maxAge: number): Promise<boolean> {
    try {
      const stats = await fs.stat(file.path);
      const fileAge = Date.now() - stats.mtime.getTime();

      // 检查文件年龄
      if (fileAge < maxAge) {
        console.log(`⏰ 文件太新，跳过删除: ${file.url} (年龄: ${Math.round(fileAge / 1000 / 60)}分钟)`);
        return false;
      }

      // 检查文件大小（避免删除异常大的文件）
      const maxSafeSize = 1024 * 1024 * 1024; // 1GB
      if (stats.size > maxSafeSize) {
        console.log(`⚠️ 文件过大，跳过删除: ${file.url} (大小: ${Math.round(stats.size / 1024 / 1024)}MB)`);
        return false;
      }

      // 检查文件扩展名（只删除媒体文件）
      const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.avi', '.mov', '.wmv', '.flv'];
      const ext = path.extname(file.name).toLowerCase();
      if (!mediaExtensions.includes(ext)) {
        console.log(`🚫 非媒体文件，跳过删除: ${file.url}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`检查文件安全性失败: ${file.path}`, error);
      return false;
    }
  }

  /**
   * 记录清理结果到数据库
   */
  private static async logOrphanCleanupResult(
    result: OrphanCleanupResult,
    config: OrphanCleanupOptions
  ): Promise<void> {
    try {
      // 这里可以将清理结果记录到审计日志或专门的清理日志表
      console.log('📝 记录清理结果:', {
        scannedFiles: result.scannedFiles,
        orphanFiles: result.orphanFiles,
        deletedFiles: result.deletedFiles,
        savedSpace: result.savedSpace,
        duration: result.duration,
        dryRun: config.dryRun,
      });
    } catch (error) {
      console.error('记录清理结果失败:', error);
    }
  }

  /**
   * 获取孤儿文件预览（不执行删除）
   */
  public static async previewOrphanFiles(): Promise<{
    orphanFiles: Array<{
      path: string;
      url: string;
      size: number;
      age: number;
    }>;
    totalSize: number;
    totalCount: number;
  }> {
    try {
      const mediaDir = path.join(process.cwd(), 'public/uploads/media');
      const diskFiles = await this.scanMediaDirectory(mediaDir);
      const dbFiles = await this.getDatabaseFileUrls();
      const dbFileSet = new Set(dbFiles);

      const orphanFiles = diskFiles.filter(file => {
        const relativePath = file.url.replace('/uploads/', '');
        return !dbFileSet.has(file.url) && !dbFileSet.has(`/uploads/${relativePath}`);
      });

      const orphanDetails: Array<{ path: string; url: string; size: number; age: number }> = [];
      let totalSize = 0;

      for (const file of orphanFiles) {
        try {
          const stats = await fs.stat(file.path);
          const age = Date.now() - stats.mtime.getTime();

          orphanDetails.push({
            path: file.path,
            url: file.url,
            size: stats.size,
            age,
          });

          totalSize += stats.size;
        } catch (error) {
          console.error(`获取文件信息失败: ${file.path}`, error);
        }
      }

      return {
        orphanFiles: orphanDetails,
        totalSize,
        totalCount: orphanDetails.length,
      };
    } catch (error) {
      console.error('预览孤儿文件失败:', error);
      return {
        orphanFiles: [],
        totalSize: 0,
        totalCount: 0,
      };
    }
  }
}
