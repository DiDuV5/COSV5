/**
 * @fileoverview 文件处理工具函数
 * @description 提供文件转换、验证和处理相关的工具函数
 */

import {
  isImageFile,
  isVideoFile,
  getFileSizeLimit,
  formatFileSize,
} from '@/lib/upload/core/upload-utils';
import {
  UploadError,
  UploadErrorType,
  DEFAULT_UPLOAD_CONFIG,
} from "@/lib/upload/core/index";

/**
 * 将文件转换为Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * 验证文件类型
 */
export function validateFileType(file: File): UploadError | null {
  const { type: mimeType } = file;

  if (!isImageFile(mimeType) && !isVideoFile(mimeType)) {
    return {
      type: UploadErrorType.INVALID_FILE_TYPE,
      message: `不支持的文件类型: ${mimeType}`,
      filename: file.name,
      retryable: false,
    };
  }

  return null;
}

/**
 * 验证文件大小
 */
export function validateFileSize(file: File): UploadError | null {
  const limit = getFileSizeLimit(file.type);

  if (file.size > limit) {
    return {
      type: UploadErrorType.FILE_TOO_LARGE,
      message: `文件大小超出限制。当前: ${formatFileSize(file.size)}, 限制: ${formatFileSize(limit)}`,
      filename: file.name,
      retryable: false,
    };
  }

  return null;
}

/**
 * 综合文件验证
 */
export function validateFile(file: File): UploadError | null {
  // 检查文件类型
  const typeError = validateFileType(file);
  if (typeError) return typeError;

  // 检查文件大小
  const sizeError = validateFileSize(file);
  if (sizeError) return sizeError;

  return null;
}

/**
 * 批量验证文件
 */
export function validateFiles(files: File[]): { validFiles: File[]; errors: UploadError[] } {
  const validFiles: File[] = [];
  const errors: UploadError[] = [];

  files.forEach(file => {
    const error = validateFile(file);
    if (error) {
      errors.push(error);
    } else {
      validFiles.push(file);
    }
  });

  return { validFiles, errors };
}

/**
 * 检查是否为网络错误
 */
export function isNetworkError(error: Error | string): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('ERR_NETWORK_CHANGED') ||
    errorMessage.includes('net::ERR_') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('timeout');
}

/**
 * 创建上传错误对象
 */
export function createUploadError(
  error: Error | string,
  filename: string,
  type?: UploadErrorType
): UploadError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const originalError = typeof error === 'string' ? undefined : error;

  // 自动检测错误类型
  let errorType = type;
  if (!errorType) {
    if (isNetworkError(errorMessage)) {
      errorType = UploadErrorType.NETWORK_ERROR;
    } else if (errorMessage.includes('transcoding') || errorMessage.includes('转码')) {
      errorType = UploadErrorType.TRANSCODING_ERROR;
    } else if (errorMessage.includes('processing') || errorMessage.includes('处理')) {
      errorType = UploadErrorType.PROCESSING_ERROR;
    } else {
      errorType = UploadErrorType.UNKNOWN_ERROR;
    }
  }

  return {
    type: errorType,
    message: errorMessage,
    filename,
    originalError,
    retryable: errorType === UploadErrorType.NETWORK_ERROR,
  };
}

/**
 * 获取友好的错误消息
 */
export function getFriendlyErrorMessage(error: UploadError): string {
  switch (error.type) {
    case UploadErrorType.NETWORK_ERROR:
      return '网络连接超时，但文件可能已经成功上传。请刷新页面查看结果，或稍后重试。';
    case UploadErrorType.FILE_TOO_LARGE:
      return `文件过大，无法上传。${error.message}`;
    case UploadErrorType.INVALID_FILE_TYPE:
      return `不支持的文件格式。请选择图片或视频文件。`;
    case UploadErrorType.PROCESSING_ERROR:
      return '文件处理失败，请稍后重试。';
    case UploadErrorType.TRANSCODING_ERROR:
      return '视频转码失败，请检查视频格式或稍后重试。';
    default:
      return error.message || '上传失败，请稍后重试。';
  }
}

/**
 * 计算重试延迟时间
 */
export function calculateRetryDelay(retryCount: number): number {
  // 指数退避算法：基础延迟 * 2^重试次数
  const baseDelay = DEFAULT_UPLOAD_CONFIG.retryConfig.baseDelay;
  return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // 最大30秒
}

/**
 * 生成唯一的文件ID
 */
export function generateFileId(file: File): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const nameHash = file.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  return `${nameHash}_${timestamp}_${random}`;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
}

/**
 * 检查文件名是否安全
 */
export function isSafeFilename(filename: string): boolean {
  // 检查文件名是否包含危险字符
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  return !dangerousChars.test(filename) && filename.length <= 255;
}

/**
 * 清理文件名
 */
export function sanitizeFilename(filename: string): string {
  // 移除或替换危险字符
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

/**
 * 检查文件是否为图片
 */
export function checkIsImage(file: File): boolean {
  return isImageFile(file.type);
}

/**
 * 检查文件是否为视频
 */
export function checkIsVideo(file: File): boolean {
  return isVideoFile(file.type);
}

/**
 * 获取文件的媒体类型
 */
export function getMediaType(file: File): 'IMAGE' | 'VIDEO' | 'UNKNOWN' {
  if (checkIsImage(file)) return 'IMAGE';
  if (checkIsVideo(file)) return 'VIDEO';
  return 'UNKNOWN';
}

/**
 * 创建文件预览URL
 */
export function createFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * 释放文件预览URL
 */
export function revokeFilePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * 计算文件哈希（简单版本）
 */
export async function calculateSimpleFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 检查浏览器是否支持文件API
 */
export function checkFileApiSupport(): boolean {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
}

/**
 * 检查浏览器是否支持拖拽上传
 */
export function checkDragDropSupport(): boolean {
  const div = document.createElement('div');
  return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
}

/**
 * 格式化上传速度
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) {
    return `${bytesPerSecond.toFixed(0)} B/s`;
  } else if (bytesPerSecond < 1024 * 1024) {
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  } else {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`;
  } else {
    return `${Math.round(seconds / 3600)}小时`;
  }
}
