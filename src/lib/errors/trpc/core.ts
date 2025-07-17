/**
 * @fileoverview tRPC错误处理核心
 * @description 核心错误处理功能和基础错误创建方法
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TRPCError } from '@trpc/server';
import { getErrorMessage, type ErrorContext } from '@/lib/errors/error-messages';
import { UserLevel } from '@/types/user-level';
import { 
  BusinessErrorType, 
  TRPCErrorContext, 
  BUSINESS_ERROR_TO_TRPC_CODE_MAP,
  TRPC_CODE_TO_BUSINESS_ERROR_MAP,
  ErrorHandleOptions
} from './types';

/**
 * tRPC错误处理核心类
 */
export class TRPCErrorCore {
  /**
   * 创建业务错误
   */
  static businessError(
    type: BusinessErrorType,
    message?: string,
    context?: TRPCErrorContext
  ): TRPCError {
    const errorContext: ErrorContext = {
      userLevel: context?.userLevel || 'USER',
      environment: context?.environment || (process.env.NODE_ENV as any) || 'development',
      context: type,
    };

    const userMessage = message || getErrorMessage(type, errorContext);
    const trpcCode = this.mapBusinessErrorToTRPCCode(type);

    // eslint-disable-next-line no-restricted-syntax
    return new TRPCError({
      code: trpcCode,
      message: userMessage,
      cause: {
        type,
        originalMessage: message,
        context: context?.context,
        recoveryActions: context?.recoveryActions,
      },
    });
  }

  /**
   * 将业务错误类型映射到tRPC错误代码
   */
  private static mapBusinessErrorToTRPCCode(type: BusinessErrorType): any {
    return BUSINESS_ERROR_TO_TRPC_CODE_MAP[type] || 'INTERNAL_SERVER_ERROR';
  }

  /**
   * 创建未找到错误
   */
  static notFound(message?: string, context?: TRPCErrorContext): TRPCError {
    return this.businessError(
      BusinessErrorType.RESOURCE_NOT_FOUND,
      message || '请求的资源不存在',
      context
    );
  }

  /**
   * 创建权限不足错误
   */
  static forbidden(message?: string, context?: TRPCErrorContext): TRPCError {
    return this.businessError(
      BusinessErrorType.INSUFFICIENT_PERMISSIONS,
      message || '权限不足',
      context
    );
  }

  /**
   * 创建未认证错误
   */
  static unauthorized(message?: string, context?: TRPCErrorContext): TRPCError {
    return this.businessError(
      BusinessErrorType.NOT_AUTHENTICATED, 
      message || '请先登录', 
      context
    );
  }

  /**
   * 创建验证失败错误
   */
  static validationError(message?: string, context?: TRPCErrorContext): TRPCError {
    return this.businessError(
      BusinessErrorType.VALIDATION_FAILED,
      message || '输入验证失败',
      context
    );
  }

  /**
   * 创建内部服务器错误
   */
  static internalError(message?: string, context?: TRPCErrorContext): TRPCError {
    return this.businessError(
      BusinessErrorType.INTERNAL_SERVER_ERROR,
      message || '服务器内部错误',
      context
    );
  }

  /**
   * 创建速率限制错误
   */
  static rateLimitError(message?: string, context?: TRPCErrorContext): TRPCError {
    return this.businessError(
      BusinessErrorType.RATE_LIMIT_EXCEEDED,
      message || '操作过于频繁，请稍后重试',
      context
    );
  }

  /**
   * 创建配置错误
   */
  static configurationError(message?: string, context?: TRPCErrorContext): TRPCError {
    return this.businessError(
      BusinessErrorType.INTERNAL_SERVER_ERROR,
      message || '系统配置错误',
      context
    );
  }

  /**
   * 通用错误处理方法
   */
  static handleError(
    error: Error | any,
    options?: ErrorHandleOptions
  ): TRPCError {
    // 如果已经是TRPCError，直接返回
    if (error instanceof TRPCError) {
      return error;
    }

    // 根据错误类型和选项创建适当的TRPCError
    const message = options?.message || error.message || '操作失败';
    const code = options?.code || 'INTERNAL_SERVER_ERROR';

    // 映射常见的错误代码到业务错误类型
    const businessErrorType = TRPC_CODE_TO_BUSINESS_ERROR_MAP[code] || 
                              BusinessErrorType.INTERNAL_SERVER_ERROR;

    return this.businessError(businessErrorType, message, options?.context);
  }
}
