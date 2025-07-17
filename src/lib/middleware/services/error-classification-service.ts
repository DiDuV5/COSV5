/**
 * @fileoverview 错误分类服务
 * @description 专门处理错误类型检测、严重程度评估和错误代码生成
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { TRPCError } from '@trpc/server';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  FILE = 'FILE',
  PERMISSION = 'PERMISSION',
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION',
  UPLOAD = 'UPLOAD',
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * 错误分类服务类
 */
export class ErrorClassificationService {
  /**
   * 检测错误类型
   */
  static detectErrorType(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    // 检查错误消息中的关键词
    const message = (error.message || '').toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    const errorString = `${message} ${stack}`;

    // 网络相关错误
    if (this.isNetworkError(error, errorString)) {
      return ErrorType.NETWORK;
    }

    // 文件相关错误
    if (this.isFileError(error, errorString)) {
      return ErrorType.FILE;
    }

    // 权限相关错误
    if (this.isPermissionError(error, errorString)) {
      return ErrorType.PERMISSION;
    }

    // 验证相关错误
    if (this.isValidationError(error, errorString)) {
      return ErrorType.VALIDATION;
    }

    // 上传相关错误
    if (this.isUploadError(error, errorString)) {
      return ErrorType.UPLOAD;
    }

    // 认证相关错误
    if (this.isAuthenticationError(error, errorString)) {
      return ErrorType.AUTHENTICATION;
    }

    // 限流相关错误
    if (this.isRateLimitError(error, errorString)) {
      return ErrorType.RATE_LIMIT;
    }

    // 服务器相关错误
    if (this.isServerError(error, errorString)) {
      return ErrorType.SERVER;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 确定错误严重程度
   */
  static determineSeverity(error: any, errorType: ErrorType): ErrorSeverity {
    // 检查是否有明确的严重程度标记
    if (error?.severity) {
      return error.severity as ErrorSeverity;
    }

    // 根据错误类型确定严重程度
    switch (errorType) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.PERMISSION:
        return ErrorSeverity.HIGH;

      case ErrorType.SERVER:
        return this.isSystemCritical(error) ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH;

      case ErrorType.UPLOAD:
      case ErrorType.FILE:
        return this.isDataLoss(error) ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;

      case ErrorType.NETWORK:
        return this.isServiceUnavailable(error) ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;

      case ErrorType.VALIDATION:
      case ErrorType.RATE_LIMIT:
        return ErrorSeverity.LOW;

      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * 生成错误代码
   */
  static generateErrorCode(errorType: ErrorType, error: any): string {
    const timestamp = Date.now().toString(36);
    const typePrefix = this.getTypePrefix(errorType);
    
    // 如果错误已有代码，使用它
    if (error?.code && typeof error.code === 'string') {
      return `${typePrefix}_${error.code}`;
    }

    // 根据错误类型和内容生成代码
    const contentHash = this.generateContentHash(error);
    return `${typePrefix}_${contentHash}_${timestamp}`;
  }

  /**
   * 检查是否为网络错误
   */
  private static isNetworkError(error: any, errorString: string): boolean {
    const networkKeywords = [
      'network', 'connection', 'timeout', 'econnrefused', 'enotfound',
      'econnreset', 'etimedout', 'socket', 'dns', 'fetch failed'
    ];

    return networkKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.code === 'NETWORK_ERROR' ||
           error?.name === 'NetworkError';
  }

  /**
   * 检查是否为文件错误
   */
  private static isFileError(error: any, errorString: string): boolean {
    const fileKeywords = [
      'enoent', 'eacces', 'eisdir', 'enotdir', 'emfile', 'enfile',
      'file not found', 'permission denied', 'directory', 'path'
    ];

    return fileKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.code?.startsWith('E') && error?.path ||
           error?.name === 'FileSystemError';
  }

  /**
   * 检查是否为权限错误
   */
  private static isPermissionError(error: any, errorString: string): boolean {
    const permissionKeywords = [
      'permission', 'unauthorized', 'forbidden', 'access denied',
      'insufficient privileges', 'not allowed', 'restricted'
    ];

    return permissionKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.status === 403 ||
           error?.code === 'FORBIDDEN';
  }

  /**
   * 检查是否为验证错误
   */
  private static isValidationError(error: any, errorString: string): boolean {
    const validationKeywords = [
      'validation', 'invalid', 'required', 'format', 'schema',
      'constraint', 'type error', 'parse error'
    ];

    return validationKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.name === 'ValidationError' ||
           error?.code === 'VALIDATION_ERROR';
  }

  /**
   * 检查是否为上传错误
   */
  private static isUploadError(error: any, errorString: string): boolean {
    const uploadKeywords = [
      'upload', 'multipart', 'file size', 'chunk', 'stream',
      'buffer', 'mime type', 'file type'
    ];

    return uploadKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.code === 'UPLOAD_ERROR';
  }

  /**
   * 检查是否为认证错误
   */
  private static isAuthenticationError(error: any, errorString: string): boolean {
    const authKeywords = [
      'authentication', 'login', 'token', 'session', 'credential',
      'password', 'expired', 'invalid token'
    ];

    return authKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.status === 401 ||
           error?.code === 'UNAUTHORIZED';
  }

  /**
   * 检查是否为限流错误
   */
  private static isRateLimitError(error: any, errorString: string): boolean {
    const rateLimitKeywords = [
      'rate limit', 'too many requests', 'quota', 'throttle',
      'limit exceeded', 'rate exceeded'
    ];

    return rateLimitKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.status === 429 ||
           error?.code === 'RATE_LIMIT_EXCEEDED';
  }

  /**
   * 检查是否为服务器错误
   */
  private static isServerError(error: any, errorString: string): boolean {
    const serverKeywords = [
      'internal server error', 'database', 'connection pool',
      'out of memory', 'stack overflow', 'segmentation fault'
    ];

    return serverKeywords.some(keyword => errorString.includes(keyword)) ||
           error?.status >= 500 ||
           error?.name === 'InternalServerError';
  }

  /**
   * 检查是否为系统关键错误
   */
  private static isSystemCritical(error: any): boolean {
    const criticalKeywords = [
      'out of memory', 'disk full', 'database connection',
      'service unavailable', 'system overload'
    ];

    const errorString = (error?.message || '').toLowerCase();
    return criticalKeywords.some(keyword => errorString.includes(keyword));
  }

  /**
   * 检查是否为数据丢失错误
   */
  private static isDataLoss(error: any): boolean {
    const dataLossKeywords = [
      'data loss', 'corruption', 'truncated', 'incomplete',
      'checksum mismatch', 'integrity violation'
    ];

    const errorString = (error?.message || '').toLowerCase();
    return dataLossKeywords.some(keyword => errorString.includes(keyword));
  }

  /**
   * 检查是否为服务不可用错误
   */
  private static isServiceUnavailable(error: any): boolean {
    return error?.status === 503 ||
           error?.code === 'SERVICE_UNAVAILABLE' ||
           (error?.message || '').toLowerCase().includes('service unavailable');
  }

  /**
   * 获取错误类型前缀
   */
  private static getTypePrefix(errorType: ErrorType): string {
    const prefixMap: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'NET',
      [ErrorType.FILE]: 'FILE',
      [ErrorType.PERMISSION]: 'PERM',
      [ErrorType.SERVER]: 'SRV',
      [ErrorType.VALIDATION]: 'VAL',
      [ErrorType.UPLOAD]: 'UPL',
      [ErrorType.AUTHENTICATION]: 'AUTH',
      [ErrorType.RATE_LIMIT]: 'RATE',
      [ErrorType.UNKNOWN]: 'UNK',
    };

    return prefixMap[errorType] || 'UNK';
  }

  /**
   * 生成内容哈希
   */
  private static generateContentHash(error: any): string {
    const content = JSON.stringify({
      message: error?.message,
      name: error?.name,
      code: error?.code,
    });

    // 简单哈希算法
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }

    return Math.abs(hash).toString(36).substring(0, 6);
  }

  /**
   * 映射到tRPC错误代码
   */
  static mapToTrpcCode(errorType: ErrorType): TRPCError['code'] {
    const codeMap: Record<ErrorType, TRPCError['code']> = {
      [ErrorType.AUTHENTICATION]: 'UNAUTHORIZED',
      [ErrorType.PERMISSION]: 'FORBIDDEN',
      [ErrorType.VALIDATION]: 'BAD_REQUEST',
      [ErrorType.RATE_LIMIT]: 'TOO_MANY_REQUESTS',
      [ErrorType.NETWORK]: 'INTERNAL_SERVER_ERROR',
      [ErrorType.FILE]: 'INTERNAL_SERVER_ERROR',
      [ErrorType.UPLOAD]: 'BAD_REQUEST',
      [ErrorType.SERVER]: 'INTERNAL_SERVER_ERROR',
      [ErrorType.UNKNOWN]: 'INTERNAL_SERVER_ERROR',
    };

    return codeMap[errorType] || 'INTERNAL_SERVER_ERROR';
  }

  /**
   * 获取HTTP状态码
   */
  static getHttpStatus(errorType: ErrorType, severity: ErrorSeverity): number {
    // 首先根据错误类型确定基础状态码
    const baseStatus = this.getBaseHttpStatus(errorType);
    
    // 根据严重程度调整
    if (severity === ErrorSeverity.CRITICAL && baseStatus < 500) {
      return 500;
    }

    return baseStatus;
  }

  /**
   * 获取基础HTTP状态码
   */
  private static getBaseHttpStatus(errorType: ErrorType): number {
    const statusMap: Record<ErrorType, number> = {
      [ErrorType.AUTHENTICATION]: 401,
      [ErrorType.PERMISSION]: 403,
      [ErrorType.VALIDATION]: 400,
      [ErrorType.RATE_LIMIT]: 429,
      [ErrorType.NETWORK]: 502,
      [ErrorType.FILE]: 500,
      [ErrorType.UPLOAD]: 400,
      [ErrorType.SERVER]: 500,
      [ErrorType.UNKNOWN]: 500,
    };

    return statusMap[errorType] || 500;
  }
}

/**
 * 导出服务创建函数
 */
export const createErrorClassificationService = () => ErrorClassificationService;
