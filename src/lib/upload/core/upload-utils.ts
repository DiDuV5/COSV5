/**
 * @fileoverview 上传工具函数 - CoserEden平台
 * @description 上传服务的通用工具函数和辅助方法
 *
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 * @since 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { createHash } from 'crypto';
import path from 'path';
import type { ProgressCallback, RetryConfig, UploadProgress } from './index';

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffFactor: 2,
};

/**
 * 生成存储键
 *
 * @param filename - 原始文件名
 * @param userId - 用户ID
 * @param fileHash - 文件哈希值
 * @returns 存储键路径
 *
 * @example
 * ```typescript
 * const key = generateStorageKey('photo.jpg', 'user123', 'abc12345');
 * // 返回: uploads/2025/07/02/user123/1719936000000_abc12345.jpg
 * ```
 */
export function generateStorageKey(filename: string, userId: string, fileHash: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const timestamp = Date.now();
  const ext = path.extname(filename);

  return `uploads/${year}/${month}/${day}/${userId}/${timestamp}_${fileHash}${ext}`;
}

/**
 * 生成文件哈希值
 *
 * @param buffer - 文件缓冲区
 * @param length - 哈希长度（默认8位）
 * @returns 文件哈希值
 */
export function generateFileHash(buffer: Buffer, length: number = 8): string {
  return createHash('md5').update(buffer).digest('hex').substring(0, length);
}

/**
 * 报告上传进度
 *
 * @param stage - 当前阶段
 * @param progress - 进度百分比（0-100）
 * @param message - 进度消息
 * @param callback - 进度回调函数
 */
export function reportProgress(
  stage: UploadProgress['stage'],
  progress: number,
  message: string,
  callback?: ProgressCallback
): void {
  const progressInfo: UploadProgress = {
    stage,
    progress: Math.min(100, Math.max(0, progress)),
    message,
    timestamp: Date.now(),
  };

  console.log(`📊 上传进度: ${progressInfo.stage} - ${progressInfo.progress}% - ${progressInfo.message}`);

  if (callback) {
    try {
      callback(progressInfo);
    } catch (error) {
      console.error('进度回调执行失败:', error);
    }
  }
}

/**
 * 执行带重试的操作
 *
 * @param operation - 要执行的操作
 * @param operationName - 操作名称（用于日志）
 * @param context - 上下文信息
 * @param retryConfig - 重试配置
 * @returns 操作结果
 *
 * @example
 * ```typescript
 * const result = await executeWithRetry(
 *   () => uploadToR2(file),
 *   'R2文件上传',
 *   { filename: 'test.jpg' }
 * );
 * ```
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: Record<string, any>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      console.log(`🔄 执行操作: ${operationName} (尝试 ${attempt}/${retryConfig.maxAttempts})`);
      const result = await operation();

      if (attempt > 1) {
        console.log(`✅ 操作成功: ${operationName} (重试 ${attempt - 1} 次后成功)`);
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error(`❌ 操作失败: ${operationName} (尝试 ${attempt}/${retryConfig.maxAttempts})`, {
        error: lastError.message,
        context,
        attempt,
      });

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === retryConfig.maxAttempts) {
        break;
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
        retryConfig.maxDelay
      );

      console.log(`⏳ 等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 抛出最后的错误
  throw TRPCErrorHandler.internalError(
    `操作失败: ${operationName} (已重试 ${retryConfig.maxAttempts} 次)`,
    {
      context: {
        operationName,
        attempts: retryConfig.maxAttempts,
        lastError: lastError?.message,
        ...context,
      }
    }
  );
}

/**
 * 格式化文件大小
 *
 * @param bytes - 字节数
 * @returns 格式化的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证文件名安全性
 *
 * @param filename - 文件名
 * @returns 是否安全
 */
export function isFilenameSafe(filename: string): boolean {
  // 检查可疑字符
  const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
  if (suspiciousChars.test(filename)) {
    return false;
  }

  // 检查双重扩展名
  const doubleExtension = /\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/;
  if (doubleExtension.test(filename)) {
    return false;
  }

  // 检查保留名称（Windows）
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) {
    return false;
  }

  return true;
}

/**
 * 清理文件名
 *
 * @param filename - 原始文件名
 * @returns 清理后的文件名
 */
export function sanitizeFilename(filename: string): string {
  // 移除或替换危险字符
  return filename
    .replace(/[<>:"|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .trim();
}

/**
 * 获取文件扩展名
 *
 * @param filename - 文件名
 * @returns 文件扩展名（小写，包含点）
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * 检查是否为支持的图片类型
 *
 * @param mimeType - MIME类型
 * @returns 是否为支持的图片类型
 */
export function isSupportedImageType(mimeType: string): boolean {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * 检查是否为支持的视频类型
 *
 * @param mimeType - MIME类型
 * @returns 是否为支持的视频类型
 */
export function isSupportedVideoType(mimeType: string): boolean {
  const supportedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'];
  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * 检查是否为支持的文档类型
 *
 * @param mimeType - MIME类型
 * @returns 是否为支持的文档类型
 */
export function isSupportedDocumentType(mimeType: string): boolean {
  const supportedTypes = ['application/pdf', 'text/plain'];
  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * 别名函数 - 为了兼容性
 */
export const isImageFile = isSupportedImageType;
export const isVideoFile = isSupportedVideoType;

/**
 * 获取文件大小限制
 */
export function getFileSizeLimit(mimeType: string): number {
  if (isSupportedImageType(mimeType)) {
    return 50 * 1024 * 1024; // 50MB for images
  }
  if (isSupportedVideoType(mimeType)) {
    return 500 * 1024 * 1024; // 500MB for videos
  }
  if (isSupportedDocumentType(mimeType)) {
    return 10 * 1024 * 1024; // 10MB for documents
  }
  return 1024 * 1024; // 1MB default
}
