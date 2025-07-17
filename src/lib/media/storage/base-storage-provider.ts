/**
 * @fileoverview 存储提供商基础抽象类
 * @description 定义统一的存储接口，支持多云存储抽象
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * class MyStorageProvider extends BaseStorageProvider {
 *   async upload(file: Buffer, key: string) {
 *     // 实现具体的上传逻辑
 *   }
 * }
 *
 * @dependencies
 * - crypto: 哈希计算
 * - path: 路径处理
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，定义存储抽象接口
 */

import crypto from 'crypto';
import path from 'path';

/**
 * 上传选项接口
 */
export interface UploadOptions {
  /** 内容类型 */
  contentType?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
  /** 缓存控制 */
  cacheControl?: string;
  /** 访问控制列表 */
  acl?: 'public-read' | 'private';
  /** 是否启用加密 */
  encryption?: boolean;
  /** 自定义头部 */
  customHeaders?: Record<string, string>;
}

/**
 * 上传结果接口
 */
export interface UploadResult {
  /** 是否成功 */
  success: boolean;
  /** 存储键 */
  key: string;
  /** 访问URL */
  url: string;
  /** CDN URL */
  cdnUrl?: string;
  /** 文件大小 */
  size: number;
  /** ETag */
  etag?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
  /** 错误信息 */
  error?: string;
  /** 上传时间 */
  uploadedAt?: Date;
}

/**
 * 下载结果接口
 */
export interface DownloadResult {
  /** 文件内容 */
  buffer: Buffer;
  /** 内容类型 */
  contentType?: string;
  /** 文件大小 */
  size: number;
  /** 最后修改时间 */
  lastModified?: Date;
  /** ETag */
  etag?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 健康状态接口
 */
export interface HealthStatus {
  /** 是否健康 */
  healthy: boolean;
  /** 延迟时间 (毫秒) */
  latency?: number;
  /** 错误信息 */
  error?: string;
  /** 检查时间 */
  lastCheck: Date;
  /** 额外信息 */
  details?: Record<string, any>;
}

/**
 * 存储统计接口
 */
export interface StorageStats {
  /** 总文件数 */
  totalFiles: number;
  /** 总大小 (字节) */
  totalSize: number;
  /** 可用空间 (字节) */
  availableSpace?: number;
  /** 使用率 (百分比) */
  usagePercentage?: number;
  /** 统计时间 */
  timestamp: Date;
}

/**
 * 批量操作结果接口
 */
export interface BatchResult {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
  /** 成功的键列表 */
  successKeys: string[];
  /** 失败的键列表 */
  failureKeys: string[];
  /** 错误详情 */
  errors: Array<{ key: string; error: string }>;
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  /** 存储键 */
  key: string;
  /** 文件大小 */
  size: number;
  /** 最后修改时间 */
  lastModified: Date;
  /** ETag */
  etag?: string;
  /** 内容类型 */
  contentType?: string;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 存储提供商基础抽象类
 */
export abstract class BaseStorageProvider {
  /** 提供商名称 */
  abstract readonly name: string;
  
  /** 提供商类型 */
  abstract readonly type: 'local' | 'r2' | 's3' | 'azure' | 'gcs';

  /**
   * 上传文件
   * @param file 文件内容
   * @param key 存储键
   * @param options 上传选项
   * @returns 上传结果
   */
  abstract upload(file: Buffer, key: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * 下载文件
   * @param key 存储键
   * @returns 下载结果
   */
  abstract download(key: string): Promise<DownloadResult>;

  /**
   * 删除文件
   * @param key 存储键
   */
  abstract delete(key: string): Promise<void>;

  /**
   * 检查文件是否存在
   * @param key 存储键
   * @returns 是否存在
   */
  abstract exists(key: string): Promise<boolean>;

  /**
   * 获取文件访问URL
   * @param key 存储键
   * @returns 访问URL
   */
  abstract getUrl(key: string): string;

  /**
   * 获取CDN URL
   * @param key 存储键
   * @returns CDN URL或null
   */
  abstract getCdnUrl(key: string): string | null;

  /**
   * 健康检查
   * @returns 健康状态
   */
  abstract healthCheck(): Promise<HealthStatus>;

  /**
   * 获取存储统计信息
   * @returns 存储统计
   */
  abstract getStats(): Promise<StorageStats>;

  /**
   * 获取文件信息
   * @param key 存储键
   * @returns 文件信息
   */
  async getFileInfo(key: string): Promise<FileInfo> {
    // 默认实现，子类可以重写以提供更高效的实现
    const exists = await this.exists(key);
    if (!exists) {
      throw new Error(`File not found: ${key}`);
    }

    const result = await this.download(key);
    return {
      key,
      size: result.size,
      lastModified: result.lastModified || new Date(),
      etag: result.etag,
      contentType: result.contentType,
      metadata: result.metadata
    };
  }

  /**
   * 批量上传文件
   * @param files 文件列表
   * @returns 批量操作结果
   */
  async batchUpload(files: Array<{ buffer: Buffer; key: string; options?: UploadOptions }>): Promise<BatchResult> {
    const result: BatchResult = {
      successCount: 0,
      failureCount: 0,
      successKeys: [],
      failureKeys: [],
      errors: []
    };

    for (const file of files) {
      try {
        const uploadResult = await this.upload(file.buffer, file.key, file.options);
        if (uploadResult.success) {
          result.successCount++;
          result.successKeys.push(file.key);
        } else {
          result.failureCount++;
          result.failureKeys.push(file.key);
          result.errors.push({ key: file.key, error: uploadResult.error || 'Upload failed' });
        }
      } catch (error) {
        result.failureCount++;
        result.failureKeys.push(file.key);
        result.errors.push({ 
          key: file.key, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return result;
  }

  /**
   * 批量删除文件
   * @param keys 存储键列表
   * @returns 批量操作结果
   */
  async batchDelete(keys: string[]): Promise<BatchResult> {
    const result: BatchResult = {
      successCount: 0,
      failureCount: 0,
      successKeys: [],
      failureKeys: [],
      errors: []
    };

    for (const key of keys) {
      try {
        await this.delete(key);
        result.successCount++;
        result.successKeys.push(key);
      } catch (error) {
        result.failureCount++;
        result.failureKeys.push(key);
        result.errors.push({ 
          key, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return result;
  }

  /**
   * 生成安全的存储键
   * @param filename 原始文件名
   * @param prefix 前缀 (默认: 'media')
   * @returns 安全的存储键
   */
  protected generateSafeKey(filename: string, prefix: string = 'media'): string {
    // 继承现有的文件名处理逻辑，确保特殊字符正确处理
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(4).toString('hex');
    
    // 提取文件扩展名
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    
    // 清理文件名，保留中文字符和常见符号
    const safeName = baseName.replace(/[<>:"/\\|?*]/g, '_');
    
    return `${prefix}/${safeName}_${timestamp}_${randomId}${ext}`;
  }

  /**
   * 生成文件哈希
   * @param buffer 文件内容
   * @param algorithm 哈希算法 (默认: 'md5')
   * @returns 文件哈希
   */
  protected generateFileHash(buffer: Buffer, algorithm: string = 'md5'): string {
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  }

  /**
   * 根据文件扩展名获取MIME类型
   * @param filename 文件名
   * @returns MIME类型
   */
  protected getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      // 图片格式
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
      
      // 视频格式
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.mkv': 'video/x-matroska',
      '.3gp': 'video/3gpp',
      
      // 音频格式
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
      
      // 文档格式
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * 验证文件类型是否被允许
   * @param filename 文件名
   * @param allowedTypes 允许的MIME类型列表
   * @returns 是否允许
   */
  protected isFileTypeAllowed(filename: string, allowedTypes: string[]): boolean {
    const mimeType = this.getMimeType(filename);
    return allowedTypes.includes(mimeType);
  }

  /**
   * 格式化文件大小
   * @param bytes 字节数
   * @returns 格式化的大小字符串
   */
  protected formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}
