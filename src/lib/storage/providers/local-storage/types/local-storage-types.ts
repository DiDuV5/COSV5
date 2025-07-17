/**
 * @fileoverview 本地存储类型定义
 * @description 定义本地存储相关的所有类型和接口
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

import type {
  StorageConfig,
  UploadParams,
  UploadResult,
  DownloadResult,
  FileInfo,
  ListParams,
  ListResult,
  InitiateMultipartParams,
  InitiateMultipartResult,
  UploadPartParams,
  UploadPartResult,
  CompleteMultipartParams,
} from '@/lib/storage/object-storage/base-storage-provider';

/**
 * 本地存储配置
 */
export interface LocalStorageConfig extends StorageConfig {
  provider: 'local';
  basePath: string;
  cdnDomain?: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
  enableCache?: boolean;
  cacheMaxAge?: number;
}

/**
 * 分片上传会话信息
 */
export interface MultipartSession {
  uploadId: string;
  key: string;
  parts: Map<number, PartInfo>;
  createdAt: Date;
  lastAccessed: Date;
  metadata?: Record<string, string>;
}

/**
 * 分片信息
 */
export interface PartInfo {
  etag: string;
  path: string;
  size: number;
  partNumber: number;
  uploadedAt: Date;
}

/**
 * 文件操作结果
 */
export interface FileOperationResult {
  success: boolean;
  key: string;
  error?: string;
  size?: number;
  etag?: string;
}

/**
 * 目录扫描选项
 */
export interface DirectoryScanOptions {
  recursive?: boolean;
  includeDirectories?: boolean;
  maxDepth?: number;
  filter?: (path: string) => boolean;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  maxAge: number;
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lfu';
}

/**
 * 文件统计信息
 */
export interface FileStats {
  totalFiles: number;
  totalSize: number;
  averageSize: number;
  largestFile: {
    key: string;
    size: number;
  };
  oldestFile: {
    key: string;
    lastModified: Date;
  };
  newestFile: {
    key: string;
    lastModified: Date;
  };
}

/**
 * 清理选项
 */
export interface CleanupOptions {
  olderThan?: Date;
  largerThan?: number;
  pattern?: RegExp;
  dryRun?: boolean;
}

/**
 * 清理结果
 */
export interface CleanupResult {
  deletedFiles: string[];
  deletedSize: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

/**
 * 本地存储事件类型
 */
export type LocalStorageEventType =
  | 'initialized'
  | 'fileUploaded'
  | 'fileDownloaded'
  | 'fileDeleted'
  | 'filesDeleted'
  | 'multipartInitiated'
  | 'multipartCompleted'
  | 'multipartAborted'
  | 'cacheHit'
  | 'cacheMiss'
  | 'error';

/**
 * 本地存储事件数据
 */
export interface LocalStorageEventData {
  initialized: { provider: string; basePath: string };
  fileUploaded: { key: string; size: number; etag: string };
  fileDownloaded: { key: string; size: number };
  fileDeleted: { key: string };
  filesDeleted: { keys: string[]; errors: string[] };
  multipartInitiated: { uploadId: string; key: string };
  multipartCompleted: { uploadId: string; key: string; size: number };
  multipartAborted: { uploadId: string; key: string };
  cacheHit: { key: string };
  cacheMiss: { key: string };
  error: { operation: string; error: string; key?: string };
}

/**
 * 默认配置
 */
export const DEFAULT_LOCAL_CONFIG: Partial<LocalStorageConfig> = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi'],
  enableCache: true,
  cacheMaxAge: 3600, // 1小时
};

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  maxAge: 3600,
  maxSize: 100 * 1024 * 1024, // 100MB
  strategy: 'lru',
};

/**
 * 工具函数：验证文件扩展名
 */
export function isAllowedExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return allowedExtensions.includes(ext);
}

/**
 * 工具函数：生成ETag
 */
export function generateETag(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * 工具函数：格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * 工具函数：生成唯一ID
 */
export function generateUniqueId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * 工具函数：安全路径处理
 */
export function sanitizePath(inputPath: string): string {

  // 移除危险字符
  const sanitized = inputPath
    .replace(/[<>:"|?*]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');

  // 确保路径安全
  return path.normalize(sanitized);
}

/**
 * 工具函数：检查路径是否安全
 */
export function isPathSafe(inputPath: string, basePath: string): boolean {
  const resolvedPath = path.resolve(basePath, inputPath);
  const resolvedBasePath = path.resolve(basePath);

  return resolvedPath.startsWith(resolvedBasePath);
}

/**
 * 工具函数：获取MIME类型
 */
export function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 工具函数：计算文件哈希
 */
export async function calculateFileHash(filePath: string, algorithm: string = 'md5'): Promise<string> {

  const buffer = await fs.readFile(filePath);
  return crypto.createHash(algorithm).update(buffer).digest('hex');
}

/**
 * 工具函数：创建目录结构
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {

  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 工具函数：获取目录大小
 */
export async function getDirectorySize(dirPath: string): Promise<number> {

  let totalSize = 0;

  try {
    const items = await fs.readdir(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);

      if (stats.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.warn('获取目录大小失败:', error);
  }

  return totalSize;
}

/**
 * 工具函数：清理临时文件
 */
export async function cleanupTempFiles(tempDir: string, maxAge: number = 3600000): Promise<number> {

  let cleanedCount = 0;
  const cutoffTime = Date.now() - maxAge;

  try {
    const items = await fs.readdir(tempDir);

    for (const item of items) {
      const itemPath = path.join(tempDir, item);
      const stats = await fs.stat(itemPath);

      if (stats.mtime.getTime() < cutoffTime) {
        await fs.unlink(itemPath);
        cleanedCount++;
      }
    }
  } catch (error) {
    console.warn('清理临时文件失败:', error);
  }

  return cleanedCount;
}
