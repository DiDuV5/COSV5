/**
 * @fileoverview 文件操作服务
 * @description 处理本地文件系统的基础文件操作
 */

import { promises as fs } from 'fs';
import path from 'path';
import type {
  UploadParams,
  UploadResult,
  DownloadResult,
  FileInfo,
} from '@/lib/storage/object-storage/base-storage-provider';
import {
  type FileOperationResult,
  type LocalStorageConfig,
  generateETag,
  sanitizePath,
  isPathSafe,
  getMimeType,
  isAllowedExtension,
  ensureDirectoryExists,
} from '../types/local-storage-types';

/**
 * 文件操作服务
 */
export class FileOperationsService {
  constructor(
    private config: LocalStorageConfig,
    private basePath: string
  ) {}

  /**
   * 上传文件
   */
  async uploadFile(params: UploadParams): Promise<UploadResult> {
    try {
      const sanitizedKey = sanitizePath(params.key);

      // 安全检查
      if (!isPathSafe(sanitizedKey, this.basePath)) {
        throw new Error('不安全的文件路径');
      }

      // 文件扩展名检查
      if (this.config.allowedExtensions && !isAllowedExtension(params.key, this.config.allowedExtensions)) {
        throw new Error('不支持的文件类型');
      }

      const filePath = path.join(this.basePath, sanitizedKey);
      const fileDir = path.dirname(filePath);

      // 确保目录存在
      await ensureDirectoryExists(fileDir);

      // 写入文件
      let buffer: Buffer;
      if (params.buffer instanceof Buffer) {
        buffer = params.buffer;
      } else if (typeof params.buffer === 'string') {
        buffer = Buffer.from(params.buffer);
      } else {
        // 处理 Uint8Array 或其他类型
        buffer = Buffer.from(params.buffer as any);
      }

      // 文件大小检查
      if (this.config.maxFileSize && buffer.length > this.config.maxFileSize) {
        throw new Error(`文件大小超过限制 (${this.config.maxFileSize} bytes)`);
      }

      await fs.writeFile(filePath, buffer);

      // 生成ETag
      const etag = generateETag(buffer);

      return {
        key: sanitizedKey,
        etag,
        size: buffer.length,
        url: this.generateUrl(sanitizedKey),
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('❌ 本地文件上传失败:', error);
      throw new Error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(key: string): Promise<DownloadResult> {
    try {
      const sanitizedKey = sanitizePath(key);

      // 安全检查
      if (!isPathSafe(sanitizedKey, this.basePath)) {
        throw new Error('不安全的文件路径');
      }

      const filePath = path.join(this.basePath, sanitizedKey);

      // 检查文件是否存在
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('文件不存在');
      }

      // 读取文件
      const buffer = await fs.readFile(filePath);
      const etag = generateETag(buffer);

      return {
        buffer: buffer,
        contentType: getMimeType(key),
        size: buffer.length,
        etag,
        lastModified: stats.mtime,
      };
    } catch (error) {
      console.error('❌ 本地文件下载失败:', error);
      throw new Error(`文件下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const sanitizedKey = sanitizePath(key);

      // 安全检查
      if (!isPathSafe(sanitizedKey, this.basePath)) {
        throw new Error('不安全的文件路径');
      }

      const filePath = path.join(this.basePath, sanitizedKey);

      // 检查文件是否存在
      try {
        await fs.access(filePath);
      } catch {
        // 文件不存在，视为删除成功
        return;
      }

      await fs.unlink(filePath);

      // 尝试删除空目录
      await this.cleanupEmptyDirectories(path.dirname(filePath));
    } catch (error) {
      console.error('❌ 本地文件删除失败:', error);
      throw new Error(`文件删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(keys: string[]): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = [];

    for (const key of keys) {
      try {
        await this.deleteFile(key);
        results.push({
          success: true,
          key,
        });
      } catch (error) {
        results.push({
          success: false,
          key,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return results;
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const sanitizedKey = sanitizePath(key);

      // 安全检查
      if (!isPathSafe(sanitizedKey, this.basePath)) {
        return false;
      }

      const filePath = path.join(this.basePath, sanitizedKey);
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const sanitizedKey = sanitizePath(key);

      // 安全检查
      if (!isPathSafe(sanitizedKey, this.basePath)) {
        throw new Error('不安全的文件路径');
      }

      const filePath = path.join(this.basePath, sanitizedKey);
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error('指定路径不是文件');
      }

      // 计算ETag
      const buffer = await fs.readFile(filePath);
      const etag = generateETag(buffer);

      return {
        key: sanitizedKey,
        size: stats.size,
        lastModified: stats.mtime,
        etag,
        storageClass: 'STANDARD',
      };
    } catch (error) {
      console.error('❌ 获取本地文件信息失败:', error);
      throw new Error(`获取文件信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 复制文件
   */
  async copyFile(sourceKey: string, destKey: string): Promise<FileOperationResult> {
    try {
      const sanitizedSourceKey = sanitizePath(sourceKey);
      const sanitizedDestKey = sanitizePath(destKey);

      // 安全检查
      if (!isPathSafe(sanitizedSourceKey, this.basePath) || !isPathSafe(sanitizedDestKey, this.basePath)) {
        throw new Error('不安全的文件路径');
      }

      const sourcePath = path.join(this.basePath, sanitizedSourceKey);
      const destPath = path.join(this.basePath, sanitizedDestKey);

      // 确保目标目录存在
      await ensureDirectoryExists(path.dirname(destPath));

      // 复制文件
      await fs.copyFile(sourcePath, destPath);

      // 获取文件信息
      const stats = await fs.stat(destPath);
      const buffer = await fs.readFile(destPath);
      const etag = generateETag(buffer);

      return {
        success: true,
        key: sanitizedDestKey,
        size: stats.size,
        etag,
      };
    } catch (error) {
      console.error('❌ 文件复制失败:', error);
      return {
        success: false,
        key: destKey,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 移动文件
   */
  async moveFile(sourceKey: string, destKey: string): Promise<FileOperationResult> {
    try {
      const copyResult = await this.copyFile(sourceKey, destKey);

      if (copyResult.success) {
        await this.deleteFile(sourceKey);
      }

      return copyResult;
    } catch (error) {
      console.error('❌ 文件移动失败:', error);
      return {
        success: false,
        key: destKey,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 生成文件URL
   */
  generateUrl(key: string): string {
    if (this.config.cdnDomain) {
      return `${this.config.cdnDomain}/${key}`;
    }

    // 返回相对路径URL
    return `/uploads/${key}`;
  }

  /**
   * 清理空目录
   */
  private async cleanupEmptyDirectories(dirPath: string): Promise<void> {
    try {
      // 不要删除基础目录
      if (dirPath === this.basePath || !dirPath.startsWith(this.basePath)) {
        return;
      }

      const items = await fs.readdir(dirPath);

      // 如果目录为空，删除它
      if (items.length === 0) {
        await fs.rmdir(dirPath);

        // 递归检查父目录
        await this.cleanupEmptyDirectories(path.dirname(dirPath));
      }
    } catch (error) {
      // 忽略清理错误
      console.debug('清理空目录失败:', error);
    }
  }
}
