/**
 * @fileoverview 用户审批系统统一错误处理中间件
 * @description 提供统一的错误处理逻辑，减少重复代码
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import {
  DEFAULT_APPROVAL_CONFIG,
  type ApprovalErrorType as _ApprovalErrorType,
  type ErrorRecoveryActions as _ErrorRecoveryActions,
  type ApprovalContext as _ApprovalContext,
} from '../types';

/**
 * 审批错误处理器类
 */
export class ApprovalErrorHandler {
  /**
   * 处理获取待审核用户列表的错误
   */
  static handleGetPendingUsersError(
    error: unknown,
    context: {
      limit: number;
      cursor?: string;
      sortBy?: string;
      sortOrder?: string;
      search?: string;
    }
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 数据库连接错误
    if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      throw TRPCErrorHandler.businessError(
        'SERVICE_UNAVAILABLE' as any,
        '数据库连接异常，无法获取待审核用户列表',
        {
          context: {
            error: errorMessage,
            operation: 'getPendingUsers',
            timestamp: new Date().toISOString(),
            searchParams: context
          },
          recoveryActions: [
            '检查数据库连接状态',
            '稍后重试操作',
            '联系技术支持'
          ]
        }
      );
    }

    // 通用错误
    throw TRPCErrorHandler.businessError(
      'INTERNAL_SERVER_ERROR' as any,
      '获取待审核用户列表失败，请稍后重试',
      {
        context: {
          error: errorMessage,
          operation: 'getPendingUsers',
          searchParams: context
        },
        recoveryActions: [
          '刷新页面重试',
          '检查搜索条件是否正确',
          '联系管理员处理'
        ]
      }
    );
  }

  /**
   * 处理单个用户审批错误
   */
  static handleApproveUserError(
    error: unknown,
    context: {
      userId: string;
      action: string;
      reason?: string;
      notifyUser?: boolean;
      adminId: string;
      adminLevel?: string;
    }
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是业务逻辑错误（已经是TRPCError）
    if (error instanceof Error && 'code' in error) {
      throw error; // 重新抛出已处理的业务错误
    }

    // 用户不存在错误
    if (errorMessage.includes('用户不存在')) {
      throw TRPCErrorHandler.businessError(
        'NOT_FOUND' as any,
        '要审核的用户不存在或已被删除',
        {
          context: {
            userId: context.userId,
            action: context.action,
            adminId: context.adminId,
            operation: 'approveUser',
            timestamp: new Date().toISOString()
          },
          recoveryActions: [
            '刷新用户列表',
            '确认用户ID是否正确',
            '检查用户是否已被其他管理员处理'
          ]
        }
      );
    }

    // 权限错误
    if (errorMessage.includes('权限') || errorMessage.includes('permission')) {
      throw TRPCErrorHandler.businessError(
        'FORBIDDEN' as any,
        '权限不足，无法执行用户审核操作',
        {
          context: {
            userId: context.userId,
            action: context.action,
            adminId: context.adminId,
            adminLevel: context.adminLevel,
            operation: 'approveUser'
          },
          recoveryActions: [
            '确认管理员权限等级',
            '联系超级管理员获取权限',
            '重新登录后重试'
          ]
        }
      );
    }

    // 通用错误
    throw TRPCErrorHandler.businessError(
      'INTERNAL_SERVER_ERROR' as any,
      '用户审核操作失败，请稍后重试',
      {
        context: {
          error: errorMessage,
          ...context,
          operation: 'approveUser'
        },
        recoveryActions: [
          '稍后重试审核操作',
          '检查网络连接',
          '联系技术支持'
        ]
      }
    );
  }

  /**
   * 处理批量审批错误
   */
  static handleBatchApprovalError(
    error: unknown,
    context: {
      userIds: string[];
      action: string;
      reason?: string;
      notifyUsers?: boolean;
      adminId: string;
    }
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是业务逻辑错误（已经是TRPCError）
    if (error instanceof Error && 'code' in error) {
      throw error; // 重新抛出已处理的业务错误
    }

    // 批量操作限制错误
    if (errorMessage.includes('批量操作限制') || errorMessage.includes('batch limit')) {
      const maxAllowed = DEFAULT_APPROVAL_CONFIG.BATCH_SIZE_LIMIT;
      throw TRPCErrorHandler.businessError(
        'BAD_REQUEST' as any,
        `批量操作超出限制，最多可同时处理${maxAllowed}个用户`,
        {
          context: {
            userIds: context.userIds,
            action: context.action,
            requestCount: context.userIds.length,
            maxAllowed,
            adminId: context.adminId,
            operation: 'batchApproveUsers'
          },
          recoveryActions: [
            '减少选择的用户数量',
            '分批次进行审核操作',
            '联系管理员调整批量限制'
          ]
        }
      );
    }

    // 事务错误
    if (errorMessage.includes('事务') || errorMessage.includes('transaction')) {
      throw TRPCErrorHandler.businessError(
        'INTERNAL_SERVER_ERROR' as any,
        '批量审核过程中发生数据库事务错误，部分用户可能未处理成功',
        {
          context: {
            error: errorMessage,
            ...context,
            operation: 'batchApproveUsers',
            timestamp: new Date().toISOString()
          },
          recoveryActions: [
            '检查哪些用户已成功处理',
            '对未处理的用户重新执行操作',
            '联系技术支持检查数据一致性'
          ]
        }
      );
    }

    // 通用错误
    throw TRPCErrorHandler.businessError(
      'INTERNAL_SERVER_ERROR' as any,
      '批量审核用户失败，请检查选择的用户并重试',
      {
        context: {
          error: errorMessage,
          ...context,
          operation: 'batchApproveUsers'
        },
        recoveryActions: [
          '检查选择的用户是否都处于待审核状态',
          '尝试单个审核用户',
          '稍后重试批量操作'
        ]
      }
    );
  }

  /**
   * 处理配置更新错误
   */
  static handleConfigUpdateError(
    error: unknown,
    context: {
      configInput: any;
      adminId: string;
      operation: string;
    }
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是业务逻辑错误（已经是TRPCError）
    if (error instanceof Error && 'code' in error) {
      throw error; // 重新抛出已处理的业务错误
    }

    throw TRPCErrorHandler.businessError(
      'INTERNAL_SERVER_ERROR' as any,
      '更新审批配置失败，请检查配置参数并重试',
      {
        context: {
          error: errorMessage,
          ...context,
          timestamp: new Date().toISOString()
        },
        recoveryActions: [
          '检查配置参数是否在有效范围内',
          '确认管理员权限',
          '稍后重试配置更新'
        ]
      }
    );
  }

  /**
   * 处理审批历史查询错误
   */
  static handleApprovalHistoryError(
    error: unknown,
    context: {
      queryParams: any;
      operation: string;
    }
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是业务逻辑错误（已经是TRPCError）
    if (error instanceof Error && 'code' in error) {
      throw error; // 重新抛出已处理的业务错误
    }

    throw TRPCErrorHandler.businessError(
      'INTERNAL_SERVER_ERROR' as any,
      '获取审批历史记录失败，请稍后重试',
      {
        context: {
          error: errorMessage,
          ...context,
          timestamp: new Date().toISOString()
        },
        recoveryActions: [
          '检查查询参数是否正确',
          '调整时间范围重新查询',
          '联系管理员处理'
        ]
      }
    );
  }

  /**
   * 处理超时审批错误
   */
  static handleTimeoutProcessingError(
    error: unknown,
    context: {
      adminId: string;
      operation: string;
    }
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是业务逻辑错误（已经是TRPCError）
    if (error instanceof Error && 'code' in error) {
      throw error; // 重新抛出已处理的业务错误
    }

    throw TRPCErrorHandler.businessError(
      'INTERNAL_SERVER_ERROR' as any,
      '处理超时审批失败，请稍后重试',
      {
        context: {
          error: errorMessage,
          ...context,
          timestamp: new Date().toISOString()
        },
        recoveryActions: [
          '检查系统时间设置',
          '确认审批超时配置',
          '联系技术支持处理'
        ]
      }
    );
  }

  /**
   * 处理通用错误
   */
  static handleGenericError(
    error: unknown,
    operation: string,
    message: string = '操作失败，请稍后重试'
  ): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 检查是否是业务逻辑错误（已经是TRPCError）
    if (error instanceof Error && 'code' in error) {
      throw error; // 重新抛出已处理的业务错误
    }

    throw TRPCErrorHandler.internalError(
      message,
      {
        context: {
          error: errorMessage,
          operation,
          timestamp: new Date().toISOString()
        }
      }
    );
  }
}
