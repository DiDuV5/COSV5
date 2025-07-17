/**
 * @fileoverview 本地存储提供商
 * @description 基于本地文件系统的存储实现，适用于开发环境和备用存储
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const localProvider = new LocalStorageProvider({
 *   basePath: '/path/to/storage',
 *   baseUrl: '/api/static',
 *   cdnDomain: 'https://cdn.example.com'
 * });
 *
 * @dependencies
 * - fs/promises: 文件系统操作
 * - path: 路径处理
 * - crypto: 哈希计算
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，继承现有本地存储逻辑
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  BaseStorageProvider,
  UploadOptions,
  UploadResult,
  DownloadResult,
  HealthStatus,
  StorageStats,
  FileInfo
} from '../base-storage-provider';

/**
 * 本地存储配置接口
 */
export interface LocalConfig {
  /** 基础存储路径 */
  basePath: string;
  /** 基础URL路径 */
  baseUrl: string;
  /** CDN域名 (可选) */
  cdnDomain?: string;
  /** 是否创建目录结构 */
  createDirectories?: boolean;
  /** 文件权限 */
  fileMode?: number;
  /** 目录权限 */
  dirMode?: number;
}

/**
 * 本地存储提供商
 */
export class LocalStorageProvider extends BaseStorageProvider {
  readonly name = 'local';
  readonly type = 'local' as const;

  private config: LocalConfig;

  constructor(config: LocalConfig) {
    super();
    this.config = {
      createDirectories: true,
      fileMode: 0o644,
      dirMode: 0o755,
      ...config
    };

    // 确保基础路径存在
    this.ensureBaseDirectory();
  }

  /**
   * 确保基础目录存在
   */
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.access(this.config.basePath);
    } catch {
      if (this.config.createDirectories) {
        await fs.mkdir(this.config.basePath, {
          recursive: true,
          mode: this.config.dirMode
        });
      }
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      if (this.config.createDirectories) {
        await fs.mkdir(dirPath, {
          recursive: true,
          mode: this.config.dirMode
        });
      }
    }
  }

  /**
   * 上传文件到本地存储
   */
  async upload(file: Buffer, key: string, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      // 生成安全的存储键
      const safeKey = this.generateSafeKey(key);
      const filePath = path.join(this.config.basePath, safeKey);
      const fileDir = path.dirname(filePath);

      // 确保目录存在
      await this.ensureDirectory(fileDir);

      // 写入文件
      await fs.writeFile(filePath, file, { mode: this.config.fileMode });

      // 计算ETag (MD5哈希)
      const etag = this.generateFileHash(file, 'md5');

      // 写入元数据文件 (如果有元数据)
      if (options.metadata && Object.keys(options.metadata).length > 0) {
        const metadataPath = filePath + '.meta';
        const metadataContent = JSON.stringify({
          contentType: options.contentType || this.getMimeType(key),
          metadata: options.metadata,
          uploadedAt: new Date().toISOString(),
          etag
        }, null, 2);

        await fs.writeFile(metadataPath, metadataContent, { mode: this.config.fileMode });
      }

      return {
        success: true,
        key: safeKey,
        url: this.getUrl(safeKey),
        cdnUrl: this.getCdnUrl(safeKey) || undefined,
        size: file.length,
        etag,
        metadata: options.metadata,
        uploadedAt: new Date()
      };

    } catch (error) {
      console.error('Local upload failed:', error);
      return {
        success: false,
        key,
        url: '',
        size: file.length,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * 从本地存储下载文件
   */
  async download(key: string): Promise<DownloadResult> {
    try {
      const filePath = path.join(this.config.basePath, key);

      // 检查文件是否存在
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // 读取文件
      const buffer = await fs.readFile(filePath);

      // 尝试读取元数据
      let metadata: any = {};
      let contentType = this.getMimeType(key);

      try {
        const metadataPath = filePath + '.meta';
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadataObj = JSON.parse(metadataContent);
        metadata = metadataObj.metadata || {};
        contentType = metadataObj.contentType || contentType;
      } catch {
        // 元数据文件不存在或读取失败，使用默认值
      }

      // 计算ETag
      const etag = this.generateFileHash(buffer, 'md5');

      return {
        buffer,
        contentType,
        size: buffer.length,
        lastModified: stats.mtime,
        etag,
        metadata
      };

    } catch (error) {
      console.error('Local download failed:', error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 从本地存储删除文件
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.config.basePath, key);
      const metadataPath = filePath + '.meta';

      // 删除主文件
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // 删除元数据文件
      try {
        await fs.unlink(metadataPath);
      } catch {
        // 元数据文件可能不存在，忽略错误
      }

    } catch (error) {
      console.error('Local delete failed:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath, key);
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * 获取文件访问URL (继承现有修复的URL生成逻辑)
   */
  getUrl(key: string): string {
    // 使用相对路径，确保与现有修复保持一致
    const encodedKey = encodeURIComponent(key);
    return `${this.config.baseUrl}/${encodedKey}`;
  }

  /**
   * 获取CDN URL
   */
  getCdnUrl(key: string): string | null {
    if (!this.config.cdnDomain) {
      return null;
    }

    const domain = this.config.cdnDomain.replace(/\/$/, '');
    const encodedKey = encodeURIComponent(key);
    return `${domain}/${encodedKey}`;
  }

  /**
   * 本地存储健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // 检查基础目录是否可访问
      await fs.access(this.config.basePath, fs.constants.R_OK | fs.constants.W_OK);

      // 尝试写入测试文件
      const testFile = path.join(this.config.basePath, '.health-check');
      const testData = Buffer.from('health-check-' + Date.now());

      await fs.writeFile(testFile, testData);
      const readData = await fs.readFile(testFile);

      if (!testData.equals(readData)) {
        throw new Error('Data integrity check failed');
      }

      // 清理测试文件
      await fs.unlink(testFile);

      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        lastCheck: new Date(),
        details: {
          basePath: this.config.basePath,
          baseUrl: this.config.baseUrl,
          cdnDomain: this.config.cdnDomain
        }
      };

    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        lastCheck: new Date(),
        details: {
          basePath: this.config.basePath
        }
      };
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<StorageStats> {
    try {
      let totalFiles = 0;
      let totalSize = 0;

      // 递归扫描目录
      const scanDirectory = async (dirPath: string): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && !entry.name.endsWith('.meta')) {
            // 排除元数据文件
            const stats = await fs.stat(fullPath);
            totalFiles++;
            totalSize += stats.size;
          }
        }
      };

      await scanDirectory(this.config.basePath);

      // 获取可用空间 (如果可能)
      let availableSpace: number | undefined;
      try {
        const stats = await fs.statfs(this.config.basePath);
        availableSpace = stats.bavail * stats.bsize;
      } catch {
        // statfs可能不可用，忽略错误
      }

      return {
        totalFiles,
        totalSize,
        availableSpace,
        usagePercentage: availableSpace ? (totalSize / (totalSize + availableSpace)) * 100 : undefined,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Failed to get local storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * 获取文件信息 (优化版本)
   */
  override async getFileInfo(key: string): Promise<FileInfo> {
    try {
      const filePath = path.join(this.config.basePath, key);
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // 读取文件计算ETag
      const buffer = await fs.readFile(filePath);
      const etag = this.generateFileHash(buffer, 'md5');

      // 尝试读取元数据
      let metadata: any = {};
      let contentType = this.getMimeType(key);

      try {
        const metadataPath = filePath + '.meta';
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadataObj = JSON.parse(metadataContent);
        metadata = metadataObj.metadata || {};
        contentType = metadataObj.contentType || contentType;
      } catch {
        // 元数据文件不存在，使用默认值
      }

      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
        etag,
        contentType,
        metadata
      };

    } catch (error) {
      throw new Error(`Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 复制文件
   */
  async copyFile(sourceKey: string, destKey: string): Promise<UploadResult> {
    try {
      const sourcePath = path.join(this.config.basePath, sourceKey);
      const destPath = path.join(this.config.basePath, destKey);
      const destDir = path.dirname(destPath);

      // 确保目标目录存在
      await this.ensureDirectory(destDir);

      // 复制主文件
      await fs.copyFile(sourcePath, destPath);

      // 复制元数据文件 (如果存在)
      try {
        const sourceMetaPath = sourcePath + '.meta';
        const destMetaPath = destPath + '.meta';
        await fs.copyFile(sourceMetaPath, destMetaPath);
      } catch {
        // 元数据文件可能不存在，忽略错误
      }

      // 获取文件信息
      const fileInfo = await this.getFileInfo(destKey);

      return {
        success: true,
        key: destKey,
        url: this.getUrl(destKey),
        cdnUrl: this.getCdnUrl(destKey) || undefined,
        size: fileInfo.size,
        etag: fileInfo.etag,
        uploadedAt: new Date()
      };

    } catch (error) {
      return {
        success: false,
        key: destKey,
        url: '',
        size: 0,
        error: error instanceof Error ? error.message : 'Copy failed'
      };
    }
  }
}
