/**
 * @fileoverview 统一错误处理中间件（重构版）
 * @description 提供统一的错误处理、分类、恢复和日志记录功能，采用模块化架构
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

import { TRPCError } from '@trpc/server';
import type { NextRequest } from 'next/server';

// 导入重构后的服务
import {
  errorClassificationService,
  errorRecoveryService,
  errorLoggingService,
  ErrorType,
  ErrorSeverity,
  type StandardError,
  type ErrorHandlerOptions,
  type RecoveryAction,
} from './services';

/**
 * 统一错误处理器（重构版）
 */
export class ErrorHandler {
  private static classificationService = errorClassificationService();
  private static recoveryService = errorRecoveryService();
  private static loggingService = errorLoggingService();

  /**
   * 处理错误（重构版 - 使用服务）
   */
  static async handleError(
    error: any,
    request?: NextRequest,
    options: ErrorHandlerOptions = {}
  ): Promise<StandardError> {
    try {
      // 1. 错误分类（使用分类服务）
      const errorType = this.classificationService.detectErrorType(error);
      const severity = this.classificationService.determineSeverity(error, errorType);
      const errorCode = this.classificationService.generateErrorCode(errorType, error);

      // 2. 错误恢复建议（使用恢复服务）
      const recoveryActions = this.recoveryService.getRecoveryActions(errorType, error);
      const isRetryable = this.recoveryService.isRetryable(errorType, error);

      // 3. 生成标准错误对象
      const standardError: StandardError = {
        type: errorType,
        severity,
        code: errorCode,
        message: this.extractErrorMessage(error),
        userMessage: this.generateUserMessage(errorType, severity),
        details: this.loggingService.extractErrorDetails(error),
        timestamp: new Date().toISOString(),
        requestId: options.requestId || this.loggingService.generateRequestId(),
        userId: options.userId,
        retryable: isRetryable,
        recoveryActions: this.recoveryService.getUserFriendlyActions(recoveryActions),
      };

      // 4. 记录错误日志（使用日志服务）
      await this.loggingService.logError(standardError, request, options);

      return standardError;

    } catch (handlingError) {
      console.error('❌ 错误处理失败:', handlingError);

      // 返回基础错误对象
      return this.createFallbackError(error, options);
    }
  }

  /**
   * 处理tRPC错误（重构版 - 使用服务）
   */
  static async handleTRPCError(
    error: any,
    options: ErrorHandlerOptions = {}
  ): Promise<TRPCError> {
    const standardError = await this.handleError(error, undefined, options);

    const trpcCode = this.classificationService.mapToTrpcCode(standardError.type);

    // 使用TRPCErrorHandler创建错误
    const { TRPCErrorHandler, BusinessErrorType } = await import('@/lib/errors/trpc-error-handler');
    return TRPCErrorHandler.businessError(
      BusinessErrorType.INTERNAL_SERVER_ERROR,
      standardError.userMessage,
      { context: { originalError: error } }
    );
  }

  /**
   * 处理API错误（重构版 - 使用服务）
   */
  static async handleAPIError(
    error: any,
    request: NextRequest,
    options: ErrorHandlerOptions = {}
  ): Promise<{
    status: number;
    body: any;
  }> {
    const standardError = await this.handleError(error, request, options);

    const status = this.classificationService.getHttpStatus(
      standardError.type,
      standardError.severity
    );

    const body: {
      error: {
        code: string;
        message: string;
        type: ErrorType;
        severity: ErrorSeverity;
        retryable: boolean;
        recoveryActions: any[];
        requestId: string;
        timestamp: string;
        details?: any;
        originalMessage?: string;
      };
    } = {
      error: {
        code: standardError.code,
        message: standardError.userMessage,
        type: standardError.type,
        severity: standardError.severity,
        retryable: standardError.retryable,
        recoveryActions: standardError.recoveryActions,
        requestId: standardError.requestId,
        timestamp: standardError.timestamp,
      },
    };

    // 在开发环境或管理员用户时包含详细信息
    if (this.shouldIncludeDetails(standardError, options)) {
      body.error.details = standardError.details;
      body.error.originalMessage = standardError.message;
    }

    return { status, body };
  }

  /**
   * 异步错误处理（重构版 - 使用服务）
   */
  static async handleErrorAsync(
    error: any,
    options: ErrorHandlerOptions = {}
  ): Promise<void> {
    try {
      const errorType = this.classificationService.detectErrorType(error);
      const severity = this.classificationService.determineSeverity(error, errorType);
      const errorCode = this.classificationService.generateErrorCode(errorType, error);

      const standardError: StandardError = {
        type: errorType,
        severity,
        code: errorCode,
        message: this.extractErrorMessage(error),
        userMessage: this.generateUserMessage(errorType, severity),
        details: this.loggingService.extractErrorDetails(error),
        timestamp: new Date().toISOString(),
        requestId: options.requestId || this.loggingService.generateRequestId(),
        userId: options.userId,
        retryable: this.recoveryService.isRetryable(errorType, error),
        recoveryActions: [],
      };

      // 异步记录日志
      await this.loggingService.logErrorAsync(standardError, options);

    } catch (handlingError) {
      console.error('异步错误处理失败:', handlingError);
    }
  }

  /**
   * 提取错误消息
   */
  private static extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.toString) return error.toString();
    return '未知错误';
  }

  /**
   * 生成用户友好的错误消息
   */
  private static generateUserMessage(type: ErrorType, severity: ErrorSeverity): string {
    const messages: Record<ErrorType, Record<ErrorSeverity, string>> = {
      [ErrorType.NETWORK]: {
        [ErrorSeverity.LOW]: '网络连接不稳定，请稍后重试',
        [ErrorSeverity.MEDIUM]: '网络连接失败，请检查网络设置',
        [ErrorSeverity.HIGH]: '网络服务暂时不可用，请稍后重试',
        [ErrorSeverity.CRITICAL]: '网络服务严重故障，请联系技术支持',
      },
      [ErrorType.AUTHENTICATION]: {
        [ErrorSeverity.LOW]: '登录状态已过期，请重新登录',
        [ErrorSeverity.MEDIUM]: '身份验证失败，请重新登录',
        [ErrorSeverity.HIGH]: '账户安全验证失败，请联系管理员',
        [ErrorSeverity.CRITICAL]: '严重的身份验证错误，账户可能被锁定',
      },
      [ErrorType.PERMISSION]: {
        [ErrorSeverity.LOW]: '权限不足，请联系管理员',
        [ErrorSeverity.MEDIUM]: '您没有执行此操作的权限',
        [ErrorSeverity.HIGH]: '访问被拒绝，权限验证失败',
        [ErrorSeverity.CRITICAL]: '严重的权限违规，操作已被记录',
      },
      [ErrorType.VALIDATION]: {
        [ErrorSeverity.LOW]: '输入格式不正确，请检查后重试',
        [ErrorSeverity.MEDIUM]: '数据验证失败，请确认输入内容',
        [ErrorSeverity.HIGH]: '数据格式严重错误，无法处理',
        [ErrorSeverity.CRITICAL]: '数据验证严重失败，可能存在安全风险',
      },
      [ErrorType.UPLOAD]: {
        [ErrorSeverity.LOW]: '文件上传失败，请重试',
        [ErrorSeverity.MEDIUM]: '文件上传错误，请检查文件格式和大小',
        [ErrorSeverity.HIGH]: '文件上传严重失败，请联系技术支持',
        [ErrorSeverity.CRITICAL]: '文件上传系统故障，服务暂时不可用',
      },
      [ErrorType.RATE_LIMIT]: {
        [ErrorSeverity.LOW]: '请求过于频繁，请稍后重试',
        [ErrorSeverity.MEDIUM]: '已达到请求限制，请稍后重试',
        [ErrorSeverity.HIGH]: '请求频率过高，请降低请求频率',
        [ErrorSeverity.CRITICAL]: '严重超出请求限制，账户可能被暂时限制',
      },
      [ErrorType.FILE]: {
        [ErrorSeverity.LOW]: '文件操作失败，请重试',
        [ErrorSeverity.MEDIUM]: '文件处理错误，请检查文件状态',
        [ErrorSeverity.HIGH]: '文件系统错误，请联系技术支持',
        [ErrorSeverity.CRITICAL]: '严重的文件系统故障，数据可能受影响',
      },
      [ErrorType.SERVER]: {
        [ErrorSeverity.LOW]: '服务器处理失败，请重试',
        [ErrorSeverity.MEDIUM]: '服务器错误，请稍后重试',
        [ErrorSeverity.HIGH]: '服务器故障，技术团队正在处理',
        [ErrorSeverity.CRITICAL]: '严重的服务器故障，服务暂时不可用',
      },
      [ErrorType.UNKNOWN]: {
        [ErrorSeverity.LOW]: '操作失败，请重试',
        [ErrorSeverity.MEDIUM]: '系统错误，请稍后重试',
        [ErrorSeverity.HIGH]: '未知错误，请联系技术支持',
        [ErrorSeverity.CRITICAL]: '严重的系统错误，请立即联系技术支持',
      },
    };

    return messages[type]?.[severity] || '系统错误，请稍后重试';
  }

  /**
   * 创建备用错误对象
   */
  private static createFallbackError(error: any, options: ErrorHandlerOptions): StandardError {
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      code: 'FALLBACK_ERROR',
      message: this.extractErrorMessage(error),
      userMessage: '系统错误，请稍后重试',
      details: { originalError: error },
      timestamp: new Date().toISOString(),
      requestId: options.requestId || this.loggingService.generateRequestId(),
      userId: options.userId,
      retryable: false,
      recoveryActions: ['刷新页面重试', '联系技术支持'],
    };
  }

  /**
   * 是否应该包含详细信息
   */
  private static shouldIncludeDetails(
    error: StandardError,
    options: ErrorHandlerOptions
  ): boolean {
    // 开发环境总是包含详情
    if (process.env.NODE_ENV === 'development') return true;

    // 管理员用户可以看到详情
    if (options.userLevel === 'ADMIN' || options.userLevel === 'SUPER_ADMIN') return true;

    // 低严重程度错误可以显示详情
    if (error.severity === ErrorSeverity.LOW) return true;

    return false;
  }

  /**
   * 获取错误统计信息
   */
  static getErrorStats() {
    return this.loggingService.getErrorStats();
  }

  /**
   * 清理旧的错误日志
   */
  static async cleanupOldLogs(maxAge?: number) {
    return await this.loggingService.cleanupOldLogs(maxAge);
  }
}

/**
 * 导出类型
 */
export type {
  ErrorType,
  ErrorSeverity,
  StandardError,
  ErrorHandlerOptions,
  RecoveryAction,
} from './services';

/**
 * 导出服务创建函数
 */
export const createErrorHandler = () => ErrorHandler;
