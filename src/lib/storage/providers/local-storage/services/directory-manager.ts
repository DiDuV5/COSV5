/**
 * @fileoverview 目录管理服务
 * @description 处理本地文件系统的目录操作和文件列表
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  FileInfo,
  ListParams,
  ListResult,
} from '@/lib/storage/object-storage/base-storage-provider';
import {
  type DirectoryScanOptions,
  type FileStats,
  type CleanupOptions,
  type CleanupResult,
  generateETag,
  sanitizePath,
  isPathSafe,
  getDirectorySize,
  cleanupTempFiles,
} from '../types/local-storage-types';

/**
 * 目录管理服务
 */
export class DirectoryManager {
  constructor(private basePath: string) {}

  /**
   * 确保目录存在
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 列出文件
   */
  async listFiles(params?: ListParams): Promise<ListResult> {
    try {
      const searchPath = params?.prefix
        ? path.join(this.basePath, params.prefix)
        : this.basePath;

      const files: FileInfo[] = [];
      const commonPrefixes: string[] = [];

      await this.scanDirectory(searchPath, files, commonPrefixes, params);

      // 应用分页
      const maxKeys = params?.maxKeys || 1000;
      const startIndex = params?.nextContinuationToken ? parseInt(params.nextContinuationToken) : 0;
      const endIndex = startIndex + maxKeys;

      const paginatedFiles = files.slice(startIndex, endIndex);
      const isTruncated = endIndex < files.length;
      const nextContinuationToken = isTruncated ? endIndex.toString() : undefined;

      return {
        files: paginatedFiles,
        isTruncated,
        nextContinuationToken,
        commonPrefixes,
      };
    } catch (error) {
      console.error('❌ 本地文件列表获取失败:', error);
      throw new Error(`获取文件列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 扫描目录
   */
  async scanDirectory(
    searchPath: string,
    files: FileInfo[],
    commonPrefixes: string[],
    params?: ListParams,
    options?: DirectoryScanOptions
  ): Promise<void> {
    try {
      // 检查路径是否存在
      try {
        await fs.access(searchPath);
      } catch {
        return; // 路径不存在，直接返回
      }

      const items = await fs.readdir(searchPath);

      for (const item of items) {
        const itemPath = path.join(searchPath, item);
        const relativePath = path.relative(this.basePath, itemPath);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          // 处理目录
          if (options?.includeDirectories) {
            commonPrefixes.push(relativePath + '/');
          }

          // 递归扫描子目录
          if (options?.recursive !== false) {
            const currentDepth = relativePath.split(path.sep).length;
            if (!options?.maxDepth || currentDepth < options.maxDepth) {
              await this.scanDirectory(itemPath, files, commonPrefixes, params, options);
            }
          }
        } else if (stats.isFile()) {
          // 处理文件
          if (options?.filter && !options.filter(relativePath)) {
            continue;
          }

          // 应用前缀过滤
          if (params?.prefix && !relativePath.startsWith(params.prefix)) {
            continue;
          }

          // 计算ETag
          const buffer = await fs.readFile(itemPath);
          const etag = generateETag(buffer);

          files.push({
            key: relativePath.replace(/\\/g, '/'), // 统一使用正斜杠
            size: stats.size,
            lastModified: stats.mtime,
            etag,
            storageClass: 'STANDARD',
          });
        }
      }
    } catch (error) {
      console.warn('扫描目录失败:', searchPath, error);
    }
  }

  /**
   * 获取目录统计信息
   */
  async getDirectoryStats(dirPath?: string): Promise<FileStats> {
    const targetPath = dirPath ? path.join(this.basePath, dirPath) : this.basePath;

    const files: FileInfo[] = [];
    await this.scanDirectory(targetPath, files, [], undefined, { recursive: true });

    if (files.length === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        averageSize: 0,
        largestFile: { key: '', size: 0 },
        oldestFile: { key: '', lastModified: new Date() },
        newestFile: { key: '', lastModified: new Date() },
      };
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalSize / files.length;

    const largestFile = files.reduce((largest, file) =>
      file.size > largest.size ? file : largest
    );

    const oldestFile = files.reduce((oldest, file) =>
      file.lastModified < oldest.lastModified ? file : oldest
    );

    const newestFile = files.reduce((newest, file) =>
      file.lastModified > newest.lastModified ? file : newest
    );

    return {
      totalFiles: files.length,
      totalSize,
      averageSize,
      largestFile: {
        key: largestFile.key,
        size: largestFile.size,
      },
      oldestFile: {
        key: oldestFile.key,
        lastModified: oldestFile.lastModified,
      },
      newestFile: {
        key: newestFile.key,
        lastModified: newestFile.lastModified,
      },
    };
  }

  /**
   * 清理文件
   */
  async cleanupFiles(options: CleanupOptions): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedFiles: [],
      deletedSize: 0,
      errors: [],
    };

    const files: FileInfo[] = [];
    await this.scanDirectory(this.basePath, files, [], undefined, { recursive: true });

    for (const file of files) {
      try {
        let shouldDelete = false;

        // 检查文件年龄
        if (options.olderThan && file.lastModified < options.olderThan) {
          shouldDelete = true;
        }

        // 检查文件大小
        if (options.largerThan && file.size > options.largerThan) {
          shouldDelete = true;
        }

        // 检查文件名模式
        if (options.pattern && options.pattern.test(file.key)) {
          shouldDelete = true;
        }

        if (shouldDelete) {
          if (!options.dryRun) {
            const filePath = path.join(this.basePath, file.key);
            await fs.unlink(filePath);
          }

          result.deletedFiles.push(file.key);
          result.deletedSize += file.size;
        }
      } catch (error) {
        result.errors.push({
          key: file.key,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return result;
  }

  /**
   * 创建目录结构
   */
  async createDirectoryStructure(structure: Record<string, any>): Promise<void> {
    for (const [dirName, content] of Object.entries(structure)) {
      const dirPath = path.join(this.basePath, dirName);

      if (typeof content === 'object' && content !== null) {
        // 创建子目录
        await this.ensureDirectory(dirPath);

        // 递归创建子结构
        const subManager = new DirectoryManager(dirPath);
        await subManager.createDirectoryStructure(content);
      } else {
        // 创建文件
        await this.ensureDirectory(path.dirname(dirPath));

        if (typeof content === 'string') {
          await fs.writeFile(dirPath, content);
        }
      }
    }
  }

  /**
   * 获取目录树
   */
  async getDirectoryTree(maxDepth: number = 3): Promise<any> {
    const buildTree = async (currentPath: string, depth: number): Promise<any> => {
      if (depth >= maxDepth) {
        return null;
      }

      try {
        const items = await fs.readdir(currentPath);
        const tree: any = {};

        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          const stats = await fs.stat(itemPath);

          if (stats.isDirectory()) {
            const subtree = await buildTree(itemPath, depth + 1);
            if (subtree) {
              tree[item] = subtree;
            } else {
              tree[item] = { type: 'directory' };
            }
          } else {
            tree[item] = {
              type: 'file',
              size: stats.size,
              lastModified: stats.mtime,
            };
          }
        }

        return tree;
      } catch (error) {
        console.warn('构建目录树失败:', currentPath, error);
        return null;
      }
    };

    return await buildTree(this.basePath, 0);
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(maxAge: number = 3600000): Promise<number> {
    const tempDir = path.join(this.basePath, '.temp');

    try {
      await fs.access(tempDir);
      return await cleanupTempFiles(tempDir, maxAge);
    } catch {
      // 临时目录不存在
      return 0;
    }
  }

  /**
   * 获取磁盘使用情况
   */
  async getDiskUsage(): Promise<{
    used: number;
    available: number;
    total: number;
    percentage: number;
  }> {
    try {
      const used = await getDirectorySize(this.basePath);

      // 在实际环境中，这里应该调用系统API获取磁盘信息
      // 这里返回模拟数据
      const total = 1000 * 1024 * 1024 * 1024; // 1TB
      const available = total - used;
      const percentage = (used / total) * 100;

      return {
        used,
        available,
        total,
        percentage,
      };
    } catch (error) {
      console.error('获取磁盘使用情况失败:', error);
      throw new Error('无法获取磁盘使用情况');
    }
  }
}
