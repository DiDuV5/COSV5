/**
 * @fileoverview 上传服务工具函数
 * @description 提供上传服务相关的工具函数
 * @author Augment AI
 * @date 2025-07-03
 */

/**
 * 生成上传ID
 */
export function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 生成会话ID
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化处理时间
 */
export function formatProcessingTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * 计算上传进度百分比
 */
export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

/**
 * 验证MIME类型
 */
export function isValidMimeType(mimeType: string): boolean {
  const validMimeTypes = [
    // 图片
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // 视频
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    
    // 文档
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // 音频
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ];
  
  return validMimeTypes.includes(mimeType);
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 生成安全的文件名
 */
export function generateSafeFilename(originalFilename: string): string {
  const extension = getFileExtension(originalFilename);
  const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
  
  // 移除特殊字符，只保留字母、数字、下划线和连字符
  const safeName = nameWithoutExt
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${safeName}_${timestamp}_${randomSuffix}.${extension}`;
}

/**
 * 检查文件是否为图片
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * 检查文件是否为视频
 */
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * 检查文件是否为文档
 */
export function isDocumentFile(mimeType: string): boolean {
  const documentMimeTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  return documentMimeTypes.includes(mimeType);
}

/**
 * 创建进度报告函数
 */
export function createProgressReporter(
  onProgress?: (progress: any) => void
): (stage: string, percentage: number, message: string) => void {
  return (stage: string, percentage: number, message: string) => {
    onProgress?.({
      stage,
      percentage: Math.min(100, Math.max(0, percentage)),
      message,
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试执行函数
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      console.warn(`操作失败，第 ${attempt} 次重试 (共 ${maxRetries} 次):`, lastError.message);
      await delay(delayMs * attempt); // 指数退避
    }
  }
  
  throw lastError!;
}

/**
 * 创建超时Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = '操作超时'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * 获取当前时间戳
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number, format: 'datetime' | 'date' | 'time' = 'datetime'): string {
  const date = new Date(timestamp);
  
  switch (format) {
    case 'date':
      return date.toLocaleDateString('zh-CN');
    case 'time':
      return date.toLocaleTimeString('zh-CN');
    case 'datetime':
    default:
      return date.toLocaleString('zh-CN');
  }
}

/**
 * 检查对象是否为空
 */
export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * 合并对象
 */
export function mergeObjects<T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = { ...target };
  
  for (const source of sources) {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  
  return result;
}
