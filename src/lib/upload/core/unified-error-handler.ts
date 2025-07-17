/**
 * @fileoverview 统一上传错误处理器
 * @description 整合所有上传相关的错误处理逻辑，提供统一的错误处理和重试机制
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { BusinessErrorType, TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';

/**
 * 上传错误类型
 */
export enum UploadErrorType {
  // 文件相关错误
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID = 'FILE_INVALID',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',

  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  UPLOAD_INTERRUPTED = 'UPLOAD_INTERRUPTED',

  // 服务器相关错误
  SERVER_ERROR = 'SERVER_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // 权限相关错误
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  USER_LEVEL_INSUFFICIENT = 'USER_LEVEL_INSUFFICIENT',

  // 处理相关错误
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  TRANSCODING_FAILED = 'TRANSCODING_FAILED',
  THUMBNAIL_GENERATION_FAILED = 'THUMBNAIL_GENERATION_FAILED',

  // 系统相关错误
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  DISK_SPACE_INSUFFICIENT = 'DISK_SPACE_INSUFFICIENT',
  SYSTEM_OVERLOAD = 'SYSTEM_OVERLOAD',
}

/**
 * 错误恢复动作
 */
export interface ErrorRecoveryAction {
  action: string;
  description: string;
  automated: boolean;
  userRequired: boolean;
}

/**
 * 上传错误信息
 */
export interface UploadErrorInfo {
  type: UploadErrorType;
  message: string;
  userMessage: string;
  retryable: boolean;
  maxRetries: number;
  retryDelay: number;
  recoveryActions: ErrorRecoveryAction[];
  context?: Record<string, any>;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: UploadErrorType[];
}

/**
 * 统一上传错误处理器
 */
export class UnifiedUploadErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: [
      UploadErrorType.NETWORK_ERROR,
      UploadErrorType.CONNECTION_TIMEOUT,
      UploadErrorType.UPLOAD_INTERRUPTED,
      UploadErrorType.SERVER_ERROR,
      UploadErrorType.SYSTEM_OVERLOAD,
    ],
  };

  /**
   * 分析错误并返回错误信息
   */
  static analyzeError(error: any, context?: Record<string, any>): UploadErrorInfo {
    console.log('🔍 分析上传错误:', error);

    // 如果已经是TRPCError，直接处理
    if (error?.name === 'TRPCError') {
      return this.handleTRPCError(error, context);
    }

    // 根据错误消息和类型分析
    const errorMessage = error?.message || String(error);
    const errorType = this.classifyError(errorMessage, error, context);

    return this.createErrorInfo(errorType, errorMessage, context);
  }

  /**
   * 处理TRPCError
   */
  private static handleTRPCError(error: any, context?: Record<string, any>): UploadErrorInfo {
    const cause = error.cause;
    const errorType = cause?.type ? this.mapBusinessErrorToUploadError(cause.type) : UploadErrorType.SERVER_ERROR;

    return this.createErrorInfo(errorType, error.message, {
      ...context,
      trpcCode: error.code,
      originalCause: cause,
    });
  }

  /**
   * 分类错误类型
   */
  private static classifyError(message: string, error: any, context?: Record<string, any>): UploadErrorType {
    const lowerMessage = message.toLowerCase();

    // 文件相关错误
    if (lowerMessage.includes('file too large') || lowerMessage.includes('文件过大')) {
      return UploadErrorType.FILE_TOO_LARGE;
    }
    if (lowerMessage.includes('unsupported') || lowerMessage.includes('不支持')) {
      return UploadErrorType.UNSUPPORTED_FORMAT;
    }
    if (lowerMessage.includes('corrupted') || lowerMessage.includes('损坏')) {
      return UploadErrorType.FILE_CORRUPTED;
    }

    // 网络相关错误
    if (lowerMessage.includes('network') || lowerMessage.includes('网络') ||
      lowerMessage.includes('connection') || lowerMessage.includes('连接')) {
      return UploadErrorType.NETWORK_ERROR;
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('超时')) {
      return UploadErrorType.CONNECTION_TIMEOUT;
    }
    if (lowerMessage.includes('interrupted') || lowerMessage.includes('中断')) {
      return UploadErrorType.UPLOAD_INTERRUPTED;
    }

    // 权限相关错误
    if (lowerMessage.includes('permission') || lowerMessage.includes('权限') ||
      lowerMessage.includes('forbidden') || lowerMessage.includes('禁止')) {
      return UploadErrorType.PERMISSION_DENIED;
    }

    // 处理相关错误
    if (lowerMessage.includes('transcoding') || lowerMessage.includes('转码')) {
      return UploadErrorType.TRANSCODING_FAILED;
    }
    if (lowerMessage.includes('thumbnail') || lowerMessage.includes('缩略图')) {
      return UploadErrorType.THUMBNAIL_GENERATION_FAILED;
    }

    // 系统相关错误
    if (lowerMessage.includes('memory') || lowerMessage.includes('内存')) {
      return UploadErrorType.MEMORY_LIMIT_EXCEEDED;
    }
    if (lowerMessage.includes('quota') || lowerMessage.includes('配额')) {
      return UploadErrorType.QUOTA_EXCEEDED;
    }

    // 默认为服务器错误
    return UploadErrorType.SERVER_ERROR;
  }

  /**
   * 创建错误信息
   */
  private static createErrorInfo(
    type: UploadErrorType,
    message: string,
    context?: Record<string, any>
  ): UploadErrorInfo {
    const userMessage = this.generateUserFriendlyMessage(type, context);
    const retryable = this.DEFAULT_RETRY_CONFIG.retryableErrors.includes(type);
    const recoveryActions = this.generateRecoveryActions(type, context);

    return {
      type,
      message,
      userMessage,
      retryable,
      maxRetries: retryable ? this.DEFAULT_RETRY_CONFIG.maxRetries : 0,
      retryDelay: this.DEFAULT_RETRY_CONFIG.baseDelay,
      recoveryActions,
      context,
    };
  }

  /**
   * 生成用户友好的错误消息
   */
  private static generateUserFriendlyMessage(
    type: UploadErrorType,
    context?: Record<string, any>
  ): string {
    switch (type) {
      case UploadErrorType.FILE_TOO_LARGE:
        const maxSize = context?.maxSize ? `${Math.round(context.maxSize / 1024 / 1024)}MB` : '1000MB';
        return `文件大小超出限制，最大支持${maxSize}。请压缩文件后重新上传。`;

      case UploadErrorType.UNSUPPORTED_FORMAT:
        return '文件格式不受支持。请使用JPG、PNG图片或H.264编码的MP4视频。';

      case UploadErrorType.NETWORK_ERROR:
        return '网络连接异常，请检查网络状态后重试。';

      case UploadErrorType.CONNECTION_TIMEOUT:
        return '上传超时，请检查网络连接或稍后重试。';

      case UploadErrorType.PERMISSION_DENIED:
        const userLevel = context?.userLevel || 'USER';
        return `当前用户等级(${userLevel})无上传权限，请联系管理员升级账户。`;

      case UploadErrorType.TRANSCODING_FAILED:
        return '视频转码失败，请确保视频文件完整且格式正确。建议使用H.264编码的MP4格式。';

      case UploadErrorType.MEMORY_LIMIT_EXCEEDED:
        return '文件过大导致内存不足，请使用较小的文件或联系管理员。';

      case UploadErrorType.QUOTA_EXCEEDED:
        return '存储配额已满，请清理旧文件或联系管理员扩容。';

      default:
        return '上传失败，请稍后重试。如问题持续存在，请联系技术支持。';
    }
  }

  /**
   * 生成恢复动作
   */
  private static generateRecoveryActions(
    type: UploadErrorType,
    context?: Record<string, any>
  ): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    switch (type) {
      case UploadErrorType.FILE_TOO_LARGE:
        actions.push({
          action: 'compress_file',
          description: '压缩文件大小',
          automated: false,
          userRequired: true,
        });
        break;

      case UploadErrorType.NETWORK_ERROR:
      case UploadErrorType.CONNECTION_TIMEOUT:
        actions.push({
          action: 'retry_upload',
          description: '自动重试上传',
          automated: true,
          userRequired: false,
        });
        actions.push({
          action: 'check_network',
          description: '检查网络连接',
          automated: false,
          userRequired: true,
        });
        break;

      case UploadErrorType.UNSUPPORTED_FORMAT:
        actions.push({
          action: 'convert_format',
          description: '转换文件格式',
          automated: false,
          userRequired: true,
        });
        break;

      case UploadErrorType.TRANSCODING_FAILED:
        actions.push({
          action: 'use_h264',
          description: '使用H.264编码的MP4文件',
          automated: false,
          userRequired: true,
        });
        break;
    }

    return actions;
  }

  /**
   * 映射业务错误到上传错误
   */
  private static mapBusinessErrorToUploadError(businessType: BusinessErrorType): UploadErrorType {
    switch (businessType) {
      case BusinessErrorType.FILE_TOO_LARGE:
        return UploadErrorType.FILE_TOO_LARGE;
      case BusinessErrorType.UNSUPPORTED_FILE_TYPE:
        return UploadErrorType.UNSUPPORTED_FORMAT;
      case BusinessErrorType.INSUFFICIENT_PERMISSIONS:
        return UploadErrorType.PERMISSION_DENIED;
      default:
        return UploadErrorType.SERVER_ERROR;
    }
  }

  /**
   * 抛出统一的上传错误
   */
  static throwUploadError(
    type: UploadErrorType,
    message?: string,
    context?: Record<string, any>
  ): never {
    const errorInfo = this.createErrorInfo(type, message || '', context);

    // 映射到对应的TRPCErrorHandler方法
    switch (type) {
      case UploadErrorType.FILE_TOO_LARGE:
        throw TRPCErrorHandler.uploadError('FILE_TOO_LARGE', errorInfo.userMessage, {
          context: errorInfo.context,
          recoveryActions: errorInfo.recoveryActions.map(a => a.description),
        });

      case UploadErrorType.UNSUPPORTED_FORMAT:
        throw TRPCErrorHandler.uploadError('UNSUPPORTED_FILE_TYPE', errorInfo.userMessage, {
          context: errorInfo.context,
          recoveryActions: errorInfo.recoveryActions.map(a => a.description),
        });

      case UploadErrorType.PERMISSION_DENIED:
        throw TRPCErrorHandler.forbidden(errorInfo.userMessage, {
          context: errorInfo.context,
          recoveryActions: errorInfo.recoveryActions.map(a => a.description),
        });

      default:
        throw TRPCErrorHandler.uploadError('UPLOAD_FAILED', errorInfo.userMessage, {
          context: errorInfo.context,
          recoveryActions: errorInfo.recoveryActions.map(a => a.description),
        });
    }
  }

  /**
   * 执行带重试的操作
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...customRetryConfig };
    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 执行操作: ${operationName} (尝试 ${attempt}/${retryConfig.maxRetries + 1})`);
        const result = await operation();

        if (attempt > 1) {
          console.log(`✅ 操作成功: ${operationName} (重试 ${attempt - 1} 次后成功)`);
        }

        return result;
      } catch (error) {
        lastError = error;
        const errorInfo = this.analyzeError(error, context);

        console.error(`❌ 操作失败: ${operationName} (尝试 ${attempt}/${retryConfig.maxRetries + 1})`, {
          error: errorInfo.message,
          type: errorInfo.type,
          retryable: errorInfo.retryable,
          context,
        });

        // 如果是最后一次尝试或错误不可重试，直接抛出
        if (attempt > retryConfig.maxRetries || !errorInfo.retryable) {
          console.error(`💥 操作最终失败: ${operationName}`, {
            totalAttempts: attempt,
            finalError: errorInfo.message,
            type: errorInfo.type,
          });
          throw error;
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

    // 这里不应该到达，但为了类型安全
    throw lastError;
  }

  /**
   * 包装上传操作，提供统一的错误处理
   */
  static async wrapUploadOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorInfo = this.analyzeError(error, context);

      console.error(`❌ 上传操作失败: ${operationName}`, {
        error: errorInfo.message,
        type: errorInfo.type,
        userMessage: errorInfo.userMessage,
        context: errorInfo.context,
      });

      // 重新抛出统一格式的错误
      this.throwUploadError(errorInfo.type, errorInfo.message, errorInfo.context);
    }
  }
}
