/**
 * @fileoverview 文件扫描器
 * @description 扫描目录和文件，提供文件信息和过滤功能
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { pathManager } from './path-manager-mock';

import {
  type FileInfo,
  type ScanOptions,
  FileType
} from '../types';

/**
 * 文件扫描器
 */
export class FileScanner {
  private static instance: FileScanner;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): FileScanner {
    if (!FileScanner.instance) {
      FileScanner.instance = new FileScanner();
    }
    return FileScanner.instance;
  }

  /**
   * 扫描目录获取所有文件
   */
  public async scanDirectory(
    dirPath: string,
    options: ScanOptions = {}
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      await this.scanDirectoryRecursive(dirPath, files, options, 0);
    } catch (error) {
      console.warn(`扫描目录 ${dirPath} 失败:`, error);
    }

    return files;
  }

  /**
   * 获取文件详细信息
   */
  public async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);

      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        mtime: stats.mtime,
        ctime: stats.ctime,
        isDirectory: stats.isDirectory(),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 批量获取文件信息
   */
  public async getFilesInfo(filePaths: string[]): Promise<FileInfo[]> {
    const results = await Promise.allSettled(
      filePaths.map(filePath => this.getFileInfo(filePath))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<FileInfo> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }

  /**
   * 检测文件类型
   */
  public detectFileType(filePath: string): FileType {
    const filename = path.basename(filePath);
    const dirname = path.dirname(filePath);

    // 分片文件
    if (dirname.includes('chunks') || filename.includes('chunk')) {
      return FileType.CHUNK;
    }

    // 日志文件
    if (dirname.includes('logs') || filename.match(/\.(log|txt)$/i)) {
      return FileType.LOG;
    }

    // 备份文件
    if (dirname.includes('backup') || filename.includes('backup')) {
      return FileType.BACKUP;
    }

    // 临时处理文件
    if (this.isTempProcessingFile(filename)) {
      return FileType.TEMP_PROCESSING;
    }

    // 失败上传文件
    if (dirname.includes('temp') && filename.includes('upload')) {
      return FileType.FAILED_UPLOAD;
    }

    return FileType.UNKNOWN;
  }

  /**
   * 过滤过期文件
   */
  public filterExpiredFiles(
    files: FileInfo[],
    maxAge: number
  ): FileInfo[] {
    const cutoffTime = new Date(Date.now() - maxAge);

    return files.filter(file => file.mtime < cutoffTime);
  }

  /**
   * 按修改时间排序文件
   */
  public sortFilesByModTime(
    files: FileInfo[],
    ascending: boolean = false
  ): FileInfo[] {
    return [...files].sort((a, b) => {
      const diff = a.mtime.getTime() - b.mtime.getTime();
      return ascending ? diff : -diff;
    });
  }

  /**
   * 按文件大小排序
   */
  public sortFilesBySize(
    files: FileInfo[],
    ascending: boolean = false
  ): FileInfo[] {
    return [...files].sort((a, b) => {
      const diff = a.size - b.size;
      return ascending ? diff : -diff;
    });
  }

  /**
   * 获取目录大小
   */
  public async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const files = await this.scanDirectory(dirPath);
      const filesInfo = await this.getFilesInfo(files);

      totalSize = filesInfo.reduce((sum, file) => sum + file.size, 0);
    } catch (error) {
      console.warn(`计算目录大小失败 ${dirPath}:`, error);
    }

    return totalSize;
  }

  /**
   * 查找大文件
   */
  public async findLargeFiles(
    dirPath: string,
    minSize: number
  ): Promise<FileInfo[]> {
    const files = await this.scanDirectory(dirPath);
    const filesInfo = await this.getFilesInfo(files);

    return filesInfo.filter(file => file.size >= minSize);
  }

  /**
   * 查找重复文件（基于大小和名称）
   */
  public async findDuplicateFiles(dirPath: string): Promise<FileInfo[][]> {
    const files = await this.scanDirectory(dirPath);
    const filesInfo = await this.getFilesInfo(files);

    const groups = new Map<string, FileInfo[]>();

    filesInfo.forEach(file => {
      const key = `${file.name}_${file.size}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(file);
    });

    return Array.from(groups.values()).filter(group => group.length > 1);
  }

  /**
   * 检查是否为临时处理文件
   */
  public isTempProcessingFile(filename: string): boolean {
    const tempPatterns = [
      /^temp_/,           // 以 temp_ 开头
      /^processing_/,     // 以 processing_ 开头
      /^transcode_/,      // 以 transcode_ 开头
      /\.tmp$/,           // 以 .tmp 结尾
      /\.temp$/,          // 以 .temp 结尾
      /\.processing$/,    // 以 .processing 结尾
    ];

    return tempPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * 检查文件是否安全删除
   */
  public isSafeToDelete(filePath: string): boolean {
    const filename = path.basename(filePath);

    // 不删除重要的系统文件
    const protectedPatterns = [
      /^\./, // 隐藏文件
      /^index\./,
      /^readme\./i,
      /^license\./i,
      /^package\.json$/,
      /^yarn\.lock$/,
      /^package-lock\.json$/,
    ];

    return !protectedPatterns.some(pattern => pattern.test(filename));
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectoryRecursive(
    dirPath: string,
    files: string[],
    options: ScanOptions,
    currentDepth: number
  ): Promise<void> {
    // 检查最大深度
    if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) {
      return;
    }

    try {
      await pathManager.ensureDir(dirPath);
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // 跳过隐藏文件（如果配置不包含）
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        if (entry.isDirectory()) {
          // 目录过滤
          if (options.dirFilter) {
            const dirInfo = await this.getFileInfo(fullPath);
            if (dirInfo && !options.dirFilter(dirInfo)) {
              continue;
            }
          }

          // 递归扫描子目录
          if (options.recursive !== false) {
            await this.scanDirectoryRecursive(
              fullPath,
              files,
              options,
              currentDepth + 1
            );
          }
        } else if (entry.isFile()) {
          // 文件过滤
          if (options.fileFilter) {
            const fileInfo = await this.getFileInfo(fullPath);
            if (fileInfo && !options.fileFilter(fileInfo)) {
              continue;
            }
          }

          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`扫描目录 ${dirPath} 失败:`, error);
    }
  }

  /**
   * 格式化文件大小
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 格式化文件修改时间
   */
  public formatModTime(mtime: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - mtime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}周前`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months}个月前`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years}年前`;
    }
  }

  /**
   * 生成文件扫描报告
   */
  public generateScanReport(files: FileInfo[]): string {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const avgSize = files.length > 0 ? totalSize / files.length : 0;

    const oldestFile = files.reduce((oldest, file) =>
      file.mtime < oldest.mtime ? file : oldest, files[0]
    );

    const newestFile = files.reduce((newest, file) =>
      file.mtime > newest.mtime ? file : newest, files[0]
    );

    return `
文件扫描报告:
- 总文件数: ${files.length}
- 总大小: ${this.formatFileSize(totalSize)}
- 平均大小: ${this.formatFileSize(avgSize)}
- 最旧文件: ${oldestFile?.name} (${this.formatModTime(oldestFile?.mtime)})
- 最新文件: ${newestFile?.name} (${this.formatModTime(newestFile?.mtime)})
    `.trim();
  }
}
