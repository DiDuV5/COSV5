/**
 * @fileoverview tRPC错误处理器 - 统一导出
 * @description 重构后的tRPC错误处理器，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 重新导出所有模块，保持向后兼容性
export * from './types';
export * from './core';
export * from './validators';
export * from './specialized';

// 为了完全向后兼容，创建TRPCErrorHandler类
import { TRPCError } from '@trpc/server';
import { UserLevel } from '@/types/user-level';
import { TRPCErrorCore } from './core';
import { TRPCErrorValidators } from './validators';
import { TRPCSpecializedErrors } from './specialized';
import { 
  BusinessErrorType, 
  TRPCErrorContext, 
  FileUploadErrorType,
  FileUploadErrorContext,
  ErrorHandleOptions
} from './types';

/**
 * tRPC错误处理器 - 向后兼容包装器
 */
export class TRPCErrorHandler {
  /**
   * 检查资源是否存在，不存在则抛出错误
   */
  static requireResource<T>(
    resource: T | null | undefined,
    resourceName: string,
    resourceId?: string | number,
    context?: TRPCErrorContext
  ): asserts resource is T {
    return TRPCErrorValidators.requireResource(resource, resourceName, resourceId, context);
  }

  /**
   * 检查权限，权限不足则抛出错误
   */
  static requirePermission(
    hasPermission: boolean,
    permissionName: string,
    userLevel?: UserLevel,
    context?: TRPCErrorContext
  ): void {
    return TRPCErrorValidators.requirePermission(hasPermission, permissionName, userLevel, context);
  }

  /**
   * 创建业务错误
   */
  static businessError(
    type: BusinessErrorType,
    message?: string,
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCErrorCore.businessError(type, message, context);
  }

  /**
   * 创建未找到错误
   */
  static notFound(message?: string, context?: TRPCErrorContext): TRPCError {
    return TRPCErrorCore.notFound(message, context);
  }

  /**
   * 创建权限不足错误
   */
  static forbidden(message?: string, context?: TRPCErrorContext): TRPCError {
    return TRPCErrorCore.forbidden(message, context);
  }

  /**
   * 创建未认证错误
   */
  static unauthorized(message?: string, context?: TRPCErrorContext): TRPCError {
    return TRPCErrorCore.unauthorized(message, context);
  }

  /**
   * 创建验证失败错误
   */
  static validationError(message?: string, context?: TRPCErrorContext): TRPCError {
    return TRPCErrorCore.validationError(message, context);
  }

  /**
   * 创建内部服务器错误
   */
  static internalError(message?: string, context?: TRPCErrorContext): TRPCError {
    return TRPCErrorCore.internalError(message, context);
  }

  /**
   * 创建速率限制错误
   */
  static rateLimitError(message?: string, context?: TRPCErrorContext): TRPCError {
    return TRPCErrorCore.rateLimitError(message, context);
  }

  /**
   * 创建配置错误
   */
  static configurationError(message?: string, context?: TRPCErrorContext): TRPCError {
    return TRPCErrorCore.configurationError(message, context);
  }

  /**
   * 创建文件上传相关错误
   */
  static uploadError(
    type: FileUploadErrorType,
    message?: string,
    context?: FileUploadErrorContext
  ): TRPCError {
    return TRPCSpecializedErrors.uploadError(type, message, context);
  }

  /**
   * 创建文件安全错误
   */
  static fileSecurityError(
    fileName: string,
    fileType: string,
    reason: string,
    message?: string,
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCSpecializedErrors.fileSecurityError(fileName, fileType, reason, message, context);
  }

  /**
   * 创建视频编码错误
   */
  static videoEncodingError(
    currentCodec: string,
    message?: string,
    context?: TRPCErrorContext
  ): TRPCError {
    return TRPCSpecializedErrors.videoEncodingError(currentCodec, message, context);
  }

  /**
   * 验证用户权限级别
   */
  static validateUserLevel(
    userLevel: UserLevel,
    requiredLevel: UserLevel,
    operation: string,
    context?: TRPCErrorContext
  ): void {
    return TRPCErrorValidators.validateUserLevel(userLevel, requiredLevel, operation, context);
  }

  /**
   * 创建配额超出错误
   */
  static quotaExceededError(
    quotaType: string,
    current: number,
    limit: number,
    context?: TRPCErrorContext
  ): never {
    return TRPCErrorValidators.quotaExceededError(quotaType, current, limit, context);
  }

  /**
   * 通用错误处理方法
   */
  static handleError(
    error: Error | any,
    options?: ErrorHandleOptions
  ): TRPCError {
    return TRPCErrorCore.handleError(error, options);
  }
}

/**
 * 便捷导出 - 保持向后兼容性
 */
export const {
  requireResource,
  requirePermission,
  businessError,
  notFound,
  forbidden,
  unauthorized,
  validationError,
  internalError,
  rateLimitError,
} = TRPCErrorHandler;

/**
 * 默认导出
 */
export default TRPCErrorHandler;
