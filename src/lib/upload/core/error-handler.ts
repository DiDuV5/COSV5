/**
 * @fileoverview 统一错误处理器
 * @description 统一处理上传系统中的各类异常，提供一致的错误处理和资源清理
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { StructuredLogger } from './structured-logger';
import { tempFileManager } from './temp-file-manager';
import { uploadSessionManager } from './upload-session-manager';

/**
 * 错误类型枚举
 */
export enum UploadErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

/**
 * 上传上下文接口
 */
export interface UploadContext {
  /** 会话ID */
  sessionId?: string;
  /** 用户ID */
  userId?: string;
  /** 文件名 */
  filename?: string;
  /** 文件大小 */
  fileSize?: number;
  /** 处理器名称 */
  processorName?: string;
  /** 临时文件路径列表 */
  tempFiles?: string[];
  /** 清理函数 */
  cleanup?: () => Promise<void>;
  /** 额外的上下文数据 */
  metadata?: Record<string, any>;
}

/**
 * 错误详情接口
 */
export interface ErrorDetails {
  /** 错误类型 */
  type: UploadErrorType;
  /** 错误代码 */
  code: string;
  /** 用户友好的错误消息 */
  userMessage: string;
  /** 技术错误消息 */
  technicalMessage: string;
  /** 是否可重试 */
  retryable: boolean;
  /** 建议的重试延迟（毫秒） */
  retryDelay?: number;
  /** 错误上下文 */
  context?: Record<string, any>;
}

/**
 * 自定义错误类
 */
export class UploadError extends Error {
  public readonly type: UploadErrorType;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly retryable: boolean;
  public readonly retryDelay?: number;
  public readonly context?: Record<string, any>;

  constructor(details: ErrorDetails, originalError?: Error) {
    super(details.technicalMessage);
    this.name = 'UploadError';
    this.type = details.type;
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.retryable = details.retryable;
    this.retryDelay = details.retryDelay;
    this.context = details.context;

    // 保留原始错误的堆栈信息
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}

/**
 * 统一错误处理器
 */
export class ErrorHandler {
  private logger: StructuredLogger;

  constructor(logger?: StructuredLogger) {
    this.logger = logger || new StructuredLogger({ service: 'error-handler' });
  }

  /**
   * 处理上传错误
   */
  async handleUploadError(
    error: Error,
    context: UploadContext,
    logger?: StructuredLogger
  ): Promise<never> {
    const errorLogger = logger || this.logger;
    const errorDetails = this.analyzeError(error);

    // 记录错误
    errorLogger.error('Upload error occurred', error, {
      errorType: errorDetails.type,
      errorCode: errorDetails.code,
      retryable: errorDetails.retryable,
      ...context,
      ...errorDetails.context
    });

    // 执行清理操作
    await this.performCleanup(context, errorLogger);

    // 抛出适当的TRPC错误
    this.throwTRPCError(errorDetails, context);
  }

  /**
   * 分析错误类型
   */
  private analyzeError(error: Error): ErrorDetails {
    // 如果已经是UploadError，直接返回详情
    if (error instanceof UploadError) {
      return {
        type: error.type,
        code: error.code,
        userMessage: error.userMessage,
        technicalMessage: error.message,
        retryable: error.retryable,
        retryDelay: error.retryDelay,
        context: error.context
      };
    }

    // 根据错误消息和类型分析
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // 验证错误
    if (errorMessage.includes('validation') ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('不支持') ||
        errorMessage.includes('格式错误')) {
      return {
        type: UploadErrorType.VALIDATION_ERROR,
        code: 'VALIDATION_FAILED',
        userMessage: '文件验证失败，请检查文件格式和大小',
        technicalMessage: error.message,
        retryable: false
      };
    }

    // 存储错误
    if (errorMessage.includes('storage') ||
        errorMessage.includes('upload') ||
        errorMessage.includes('s3') ||
        errorMessage.includes('r2')) {
      return {
        type: UploadErrorType.STORAGE_ERROR,
        code: 'STORAGE_FAILED',
        userMessage: '文件存储失败，请稍后重试',
        technicalMessage: error.message,
        retryable: true,
        retryDelay: 5000
      };
    }

    // 处理错误（转码、缩略图等）
    if (errorMessage.includes('ffmpeg') ||
        errorMessage.includes('transcode') ||
        errorMessage.includes('thumbnail') ||
        errorMessage.includes('processing')) {
      return {
        type: UploadErrorType.PROCESSING_ERROR,
        code: 'PROCESSING_FAILED',
        userMessage: '文件处理失败，请检查文件是否损坏',
        technicalMessage: error.message,
        retryable: true,
        retryDelay: 3000
      };
    }

    // 网络错误
    if (errorName.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('econnreset')) {
      return {
        type: UploadErrorType.NETWORK_ERROR,
        code: 'NETWORK_FAILED',
        userMessage: '网络连接失败，请检查网络后重试',
        technicalMessage: error.message,
        retryable: true,
        retryDelay: 2000
      };
    }

    // 超时错误
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('超时')) {
      return {
        type: UploadErrorType.TIMEOUT_ERROR,
        code: 'TIMEOUT',
        userMessage: '操作超时，请稍后重试',
        technicalMessage: error.message,
        retryable: true,
        retryDelay: 10000
      };
    }

    // 资源错误
    if (errorMessage.includes('memory') ||
        errorMessage.includes('disk') ||
        errorMessage.includes('space') ||
        errorMessage.includes('limit')) {
      return {
        type: UploadErrorType.RESOURCE_ERROR,
        code: 'RESOURCE_EXHAUSTED',
        userMessage: '系统资源不足，请稍后重试',
        technicalMessage: error.message,
        retryable: true,
        retryDelay: 30000
      };
    }

    // 权限错误
    if (errorMessage.includes('permission') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('权限')) {
      return {
        type: UploadErrorType.PERMISSION_ERROR,
        code: 'PERMISSION_DENIED',
        userMessage: '权限不足，无法执行此操作',
        technicalMessage: error.message,
        retryable: false
      };
    }

    // 默认系统错误
    return {
      type: UploadErrorType.SYSTEM_ERROR,
      code: 'SYSTEM_ERROR',
      userMessage: '系统内部错误，请联系技术支持',
      technicalMessage: error.message,
      retryable: false
    };
  }

  /**
   * 执行清理操作
   */
  private async performCleanup(
    context: UploadContext,
    logger: StructuredLogger
  ): Promise<void> {
    const cleanupTasks: Promise<void>[] = [];

    try {
      // 清理会话
      if (context.sessionId) {
        cleanupTasks.push(
          uploadSessionManager.cancelSession(context.sessionId)
            .catch(error => logger.warn('清理会话失败', { sessionId: context.sessionId, error }))
        );
      }

      // 清理临时文件
      if (context.tempFiles && context.tempFiles.length > 0) {
        for (const filepath of context.tempFiles) {
          cleanupTasks.push(
            tempFileManager.cleanupFile(filepath)
              .then(() => undefined)
              .catch(error => {
                logger.warn('清理临时文件失败', { filepath, error });
                return undefined;
              })
          );
        }
      }

      // 清理会话相关的临时文件
      if (context.sessionId) {
        cleanupTasks.push(
          tempFileManager.cleanupSessionFiles(context.sessionId)
            .then(count => logger.debug('清理会话临时文件', { sessionId: context.sessionId, count }))
            .catch(error => logger.warn('清理会话临时文件失败', { sessionId: context.sessionId, error }))
        );
      }

      // 执行自定义清理函数
      if (context.cleanup) {
        cleanupTasks.push(
          context.cleanup()
            .catch(error => logger.warn('执行自定义清理失败', { error }))
        );
      }

      // 等待所有清理任务完成
      await Promise.allSettled(cleanupTasks);

      logger.debug('错误清理完成', {
        sessionId: context.sessionId,
        tempFilesCount: context.tempFiles?.length || 0,
        hasCustomCleanup: !!context.cleanup
      });

    } catch (error) {
      logger.error('清理操作失败', error as Error, context);
    }
  }

  /**
   * 抛出适当的TRPC错误
   */
  private throwTRPCError(details: ErrorDetails, context: UploadContext): never {
    const errorContext = {
      context: {
        type: details.type,
        code: details.code,
        retryable: details.retryable,
        retryDelay: details.retryDelay,
        sessionId: context.sessionId,
        filename: context.filename,
        ...details.context
      }
    };

    switch (details.type) {
      case UploadErrorType.VALIDATION_ERROR:
        throw TRPCErrorHandler.validationError(details.userMessage, errorContext);

      case UploadErrorType.PERMISSION_ERROR:
        throw TRPCErrorHandler.forbidden(details.userMessage, errorContext);

      case UploadErrorType.STORAGE_ERROR:
      case UploadErrorType.PROCESSING_ERROR:
      case UploadErrorType.NETWORK_ERROR:
      case UploadErrorType.TIMEOUT_ERROR:
      case UploadErrorType.RESOURCE_ERROR:
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.UPLOAD_FAILED,
          details.userMessage,
          { context: errorContext }
        );

      case UploadErrorType.SYSTEM_ERROR:
      default:
        throw TRPCErrorHandler.internalError(details.userMessage, errorContext);
    }
  }

  /**
   * 创建上传错误
   */
  static createUploadError(
    type: UploadErrorType,
    code: string,
    userMessage: string,
    technicalMessage: string,
    retryable: boolean = false,
    retryDelay?: number,
    context?: Record<string, any>
  ): UploadError {
    return new UploadError({
      type,
      code,
      userMessage,
      technicalMessage,
      retryable,
      retryDelay,
      context
    });
  }

  /**
   * 包装异步操作，自动处理错误
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context: UploadContext,
    logger?: StructuredLogger
  ): Promise<T> {
    const errorHandler = new ErrorHandler(logger);

    try {
      return await operation();
    } catch (error) {
      await errorHandler.handleUploadError(error as Error, context, logger);
      throw error; // 确保函数有返回值或抛出错误
    }
  }
}

/**
 * 导出默认错误处理器实例
 */
export const defaultErrorHandler = new ErrorHandler();
