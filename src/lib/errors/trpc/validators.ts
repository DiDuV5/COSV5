/**
 * @fileoverview tRPC错误验证器
 * @description 提供资源检查、权限验证等功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { UserLevel } from '@/types/user-level';
import { TRPCErrorCore } from './core';
import { 
  TRPCErrorContext, 
  BusinessErrorType,
  USER_LEVEL_HIERARCHY 
} from './types';

/**
 * tRPC错误验证器类
 */
export class TRPCErrorValidators {
  /**
   * 检查资源是否存在，不存在则抛出错误
   */
  static requireResource<T>(
    resource: T | null | undefined,
    resourceName: string,
    resourceId?: string | number,
    context?: TRPCErrorContext
  ): asserts resource is T {
    if (!resource) {
      throw TRPCErrorCore.notFound(
        `${resourceName}不存在${resourceId ? ` (ID: ${resourceId})` : ''}`,
        context
      );
    }
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
    if (!hasPermission) {
      throw TRPCErrorCore.forbidden(`权限不足：需要${permissionName}`, {
        ...context,
        userLevel: userLevel || context?.userLevel,
        context: {
          ...context?.context,
          requiredPermission: permissionName,
          userLevel,
        },
      });
    }
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
    const userIndex = USER_LEVEL_HIERARCHY.indexOf(userLevel);
    const requiredIndex = USER_LEVEL_HIERARCHY.indexOf(requiredLevel);

    if (userIndex < requiredIndex) {
      throw TRPCErrorCore.forbidden(`需要${requiredLevel}级别权限才能${operation}`, {
        ...context,
        userLevel,
        context: {
          ...context?.context,
          currentLevel: userLevel,
          requiredLevel,
          operation,
        },
      });
    }
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
    throw TRPCErrorCore.businessError(
      BusinessErrorType.QUOTA_EXCEEDED,
      `${quotaType}配额已超出限制。当前：${current}，限制：${limit}`,
      {
        ...context,
        context: {
          ...context?.context,
          quotaType,
          current,
          limit,
        },
      }
    );
  }

  /**
   * 验证必填字段
   */
  static requireField<T>(
    value: T | null | undefined,
    fieldName: string,
    context?: TRPCErrorContext
  ): asserts value is T {
    if (value === null || value === undefined || value === '') {
      throw TRPCErrorCore.businessError(
        BusinessErrorType.REQUIRED_FIELD,
        `${fieldName}是必填字段`,
        {
          ...context,
          context: {
            ...context?.context,
            fieldName,
          },
        }
      );
    }
  }

  /**
   * 验证字符串长度
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    maxLength: number,
    minLength: number = 0,
    context?: TRPCErrorContext
  ): void {
    if (value.length < minLength) {
      throw TRPCErrorCore.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        `${fieldName}长度不能少于${minLength}个字符`,
        {
          ...context,
          context: {
            ...context?.context,
            fieldName,
            currentLength: value.length,
            minLength,
          },
        }
      );
    }

    if (value.length > maxLength) {
      throw TRPCErrorCore.businessError(
        BusinessErrorType.CONTENT_TOO_LONG,
        `${fieldName}长度不能超过${maxLength}个字符`,
        {
          ...context,
          context: {
            ...context?.context,
            fieldName,
            currentLength: value.length,
            maxLength,
          },
        }
      );
    }
  }

  /**
   * 验证数值范围
   */
  static validateNumberRange(
    value: number,
    fieldName: string,
    min: number,
    max: number,
    context?: TRPCErrorContext
  ): void {
    if (value < min || value > max) {
      throw TRPCErrorCore.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        `${fieldName}必须在${min}到${max}之间`,
        {
          ...context,
          context: {
            ...context?.context,
            fieldName,
            value,
            min,
            max,
          },
        }
      );
    }
  }

  /**
   * 验证邮箱格式
   */
  static validateEmail(
    email: string,
    context?: TRPCErrorContext
  ): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw TRPCErrorCore.businessError(
        BusinessErrorType.INVALID_FORMAT,
        '邮箱格式不正确',
        {
          ...context,
          context: {
            ...context?.context,
            email,
          },
        }
      );
    }
  }

  /**
   * 验证用户名格式
   */
  static validateUsername(
    username: string,
    context?: TRPCErrorContext
  ): void {
    // 用户名只能包含字母、数字、下划线，长度3-20
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      throw TRPCErrorCore.businessError(
        BusinessErrorType.INVALID_FORMAT,
        '用户名只能包含字母、数字、下划线，长度3-20个字符',
        {
          ...context,
          context: {
            ...context?.context,
            username,
          },
        }
      );
    }
  }

  /**
   * 验证操作状态
   */
  static validateOperationState(
    currentState: string,
    allowedStates: string[],
    operation: string,
    context?: TRPCErrorContext
  ): void {
    if (!allowedStates.includes(currentState)) {
      throw TRPCErrorCore.businessError(
        BusinessErrorType.INVALID_STATE,
        `当前状态(${currentState})不允许执行${operation}操作`,
        {
          ...context,
          context: {
            ...context?.context,
            currentState,
            allowedStates,
            operation,
          },
        }
      );
    }
  }
}
