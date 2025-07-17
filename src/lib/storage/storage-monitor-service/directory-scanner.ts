/**
 * @fileoverview 目录扫描器
 * @description 负责扫描目录并获取空间使用情况
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { DirectorySpaceInfo, FileScanOptions, DirectoryStats } from './types';
import { calculateDirectorySize, getLatestModificationTime } from './utils';

/**
 * 目录扫描器
 */
export class DirectoryScanner {
  /**
   * 获取目录空间使用情况
   */
  public async getDirectorySpaceInfo(
    dirPath: string,
    options: FileScanOptions = {}
  ): Promise<DirectorySpaceInfo> {
    try {
      const stats = await this.scanDirectory(dirPath, options);
      
      return {
        path: dirPath,
        size: stats.totalSize,
        fileCount: stats.totalFiles,
        lastModified: stats.newestFile?.modified || new Date(0),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`扫描目录 ${dirPath} 失败:`, error);
      return {
        path: dirPath,
        size: 0,
        fileCount: 0,
        lastModified: new Date(0),
        timestamp: new Date(),
      };
    }
  }

  /**
   * 批量获取多个目录的空间信息
   */
  public async getBatchDirectorySpaceInfo(
    dirPaths: string[],
    options: FileScanOptions = {}
  ): Promise<DirectorySpaceInfo[]> {
    const results: DirectorySpaceInfo[] = [];
    
    const promises = dirPaths.map(async (dirPath) => {
      try {
        const info = await this.getDirectorySpaceInfo(dirPath, options);
        results.push(info);
      } catch (error) {
        console.warn(`获取目录 ${dirPath} 信息失败:`, error);
        results.push({
          path: dirPath,
          size: 0,
          fileCount: 0,
          lastModified: new Date(0),
          timestamp: new Date(),
        });
      }
    });

    await Promise.all(promises);
    return results.sort((a, b) => b.size - a.size); // 按大小排序
  }

  /**
   * 扫描目录获取详细统计信息
   */
  public async scanDirectory(
    dirPath: string,
    options: FileScanOptions = {}
  ): Promise<DirectoryStats> {
    const {
      includeHidden = false,
      maxDepth = 10,
      excludePatterns = [],
    } = options;

    const stats: DirectoryStats = {
      totalSize: 0,
      totalFiles: 0,
      largestFile: null,
      oldestFile: null,
      newestFile: null,
    };

    await this.scanDirectoryRecursive(
      dirPath,
      stats,
      0,
      maxDepth,
      includeHidden,
      excludePatterns
    );

    return stats;
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectoryRecursive(
    dirPath: string,
    stats: DirectoryStats,
    currentDepth: number,
    maxDepth: number,
    includeHidden: boolean,
    excludePatterns: string[]
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      return;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // 跳过隐藏文件（如果不包含）
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // 跳过排除的模式
        if (excludePatterns.some(pattern => entry.name.includes(pattern))) {
          continue;
        }

        try {
          const fileStat = await fs.stat(fullPath);

          if (entry.isFile()) {
            stats.totalFiles++;
            stats.totalSize += fileStat.size;

            // 更新最大文件
            if (!stats.largestFile || fileStat.size > stats.largestFile.size) {
              stats.largestFile = {
                path: fullPath,
                size: fileStat.size,
              };
            }

            // 更新最旧文件
            if (!stats.oldestFile || fileStat.mtime < stats.oldestFile.modified) {
              stats.oldestFile = {
                path: fullPath,
                modified: fileStat.mtime,
              };
            }

            // 更新最新文件
            if (!stats.newestFile || fileStat.mtime > stats.newestFile.modified) {
              stats.newestFile = {
                path: fullPath,
                modified: fileStat.mtime,
              };
            }
          } else if (entry.isDirectory()) {
            // 递归扫描子目录
            await this.scanDirectoryRecursive(
              fullPath,
              stats,
              currentDepth + 1,
              maxDepth,
              includeHidden,
              excludePatterns
            );
          }
        } catch (error) {
          // 跳过无法访问的文件/目录
          console.warn(`无法访问 ${fullPath}:`, error);
        }
      }
    } catch (error) {
      console.error(`读取目录 ${dirPath} 失败:`, error);
    }
  }

  /**
   * 获取目录中的大文件列表
   */
  public async getLargeFiles(
    dirPath: string,
    minSizeBytes: number = 100 * 1024 * 1024, // 默认100MB
    limit: number = 10
  ): Promise<Array<{ path: string; size: number; modified: Date }>> {
    const largeFiles: Array<{ path: string; size: number; modified: Date }> = [];

    await this.findLargeFilesRecursive(dirPath, minSizeBytes, largeFiles);

    // 按大小排序并限制数量
    return largeFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  /**
   * 递归查找大文件
   */
  private async findLargeFilesRecursive(
    dirPath: string,
    minSizeBytes: number,
    largeFiles: Array<{ path: string; size: number; modified: Date }>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        try {
          if (entry.isFile()) {
            const fileStat = await fs.stat(fullPath);
            if (fileStat.size >= minSizeBytes) {
              largeFiles.push({
                path: fullPath,
                size: fileStat.size,
                modified: fileStat.mtime,
              });
            }
          } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await this.findLargeFilesRecursive(fullPath, minSizeBytes, largeFiles);
          }
        } catch (error) {
          // 跳过无法访问的文件/目录
        }
      }
    } catch (error) {
      console.error(`扫描目录 ${dirPath} 查找大文件失败:`, error);
    }
  }

  /**
   * 获取旧文件列表
   */
  public async getOldFiles(
    dirPath: string,
    olderThanDays: number = 30,
    limit: number = 10
  ): Promise<Array<{ path: string; size: number; modified: Date }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const oldFiles: Array<{ path: string; size: number; modified: Date }> = [];

    await this.findOldFilesRecursive(dirPath, cutoffDate, oldFiles);

    // 按修改时间排序（最旧的在前）并限制数量
    return oldFiles
      .sort((a, b) => a.modified.getTime() - b.modified.getTime())
      .slice(0, limit);
  }

  /**
   * 递归查找旧文件
   */
  private async findOldFilesRecursive(
    dirPath: string,
    cutoffDate: Date,
    oldFiles: Array<{ path: string; size: number; modified: Date }>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        try {
          if (entry.isFile()) {
            const fileStat = await fs.stat(fullPath);
            if (fileStat.mtime < cutoffDate) {
              oldFiles.push({
                path: fullPath,
                size: fileStat.size,
                modified: fileStat.mtime,
              });
            }
          } else if (entry.isDirectory() && !entry.name.startsWith('.')) {
            await this.findOldFilesRecursive(fullPath, cutoffDate, oldFiles);
          }
        } catch (error) {
          // 跳过无法访问的文件/目录
        }
      }
    } catch (error) {
      console.error(`扫描目录 ${dirPath} 查找旧文件失败:`, error);
    }
  }

  /**
   * 检查目录是否存在且可访问
   */
  public async isDirectoryAccessible(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 获取目录的快速概览
   */
  public async getDirectoryOverview(dirPath: string): Promise<{
    exists: boolean;
    accessible: boolean;
    estimatedSize: number;
    fileCount: number;
    error?: string;
  }> {
    try {
      const accessible = await this.isDirectoryAccessible(dirPath);
      
      if (!accessible) {
        return {
          exists: false,
          accessible: false,
          estimatedSize: 0,
          fileCount: 0,
          error: '目录不存在或无法访问',
        };
      }

      // 快速扫描（只扫描第一层）
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      let estimatedSize = 0;
      let fileCount = 0;

      for (const entry of entries) {
        if (entry.isFile()) {
          try {
            const fileStat = await fs.stat(path.join(dirPath, entry.name));
            estimatedSize += fileStat.size;
            fileCount++;
          } catch {
            // 跳过无法访问的文件
          }
        }
      }

      return {
        exists: true,
        accessible: true,
        estimatedSize,
        fileCount,
      };
    } catch (error) {
      return {
        exists: false,
        accessible: false,
        estimatedSize: 0,
        fileCount: 0,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }
}
