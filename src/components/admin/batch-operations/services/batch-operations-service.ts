/**
 * @fileoverview 批量操作数据服务
 * @description 专门处理批量用户操作的数据管理和验证
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { z } from 'zod';

/**
 * 用户接口
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  userLevel: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string | Date;
  lastLoginAt?: string | Date;
}

/**
 * 批量操作类型枚举
 */
export enum BatchOperationType {
  UPDATE_LEVEL = 'UPDATE_LEVEL',
  ACTIVATE_USERS = 'ACTIVATE_USERS',
  DEACTIVATE_USERS = 'DEACTIVATE_USERS',
  RESET_PASSWORDS = 'RESET_PASSWORDS',
  DELETE_USERS = 'DELETE_USERS',
  VERIFY_USERS = 'VERIFY_USERS',
}

/**
 * 用户等级枚举
 */
export enum UserLevel {
  GUEST = 'GUEST',
  USER = 'USER',
  VIP = 'VIP', // VIP级别用户
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN',
}

/**
 * 批量操作配置接口
 */
export interface BatchOperationConfig {
  value: BatchOperationType;
  label: string;
  description: string;
  icon: any;
  color: string;
  requiresConfirmation: boolean;
  requiresReason: boolean;
  requiresLevel: boolean;
  dangerLevel: 'low' | 'medium' | 'high';
}

/**
 * 操作结果接口
 */
export interface OperationResult {
  success: number;
  failed: number;
  errors: Array<{
    userId: string;
    username: string;
    error: string;
  }>;
  details?: any;
}

/**
 * 表单验证模式
 */
export const batchOperationSchema = z.object({
  operation: z.nativeEnum(BatchOperationType),
  userLevel: z.nativeEnum(UserLevel).optional(),
  reason: z.string().optional(),
  confirmText: z.string().optional(),
});

export type BatchOperationFormData = z.infer<typeof batchOperationSchema>;

/**
 * 批量操作数据服务类
 */
export class BatchOperationsService {
  /**
   * 获取操作配置
   */
  static getOperationConfigs(): BatchOperationConfig[] {
    return [
      {
        value: BatchOperationType.UPDATE_LEVEL,
        label: '更新用户等级',
        description: '批量更新选中用户的等级权限',
        icon: 'UserCog',
        color: 'text-blue-600',
        requiresConfirmation: true,
        requiresReason: false,
        requiresLevel: true,
        dangerLevel: 'medium',
      },
      {
        value: BatchOperationType.ACTIVATE_USERS,
        label: '激活用户',
        description: '批量激活选中的用户账户',
        icon: 'UserCheck',
        color: 'text-green-600',
        requiresConfirmation: false,
        requiresReason: false,
        requiresLevel: false,
        dangerLevel: 'low',
      },
      {
        value: BatchOperationType.DEACTIVATE_USERS,
        label: '禁用用户',
        description: '批量禁用选中的用户账户',
        icon: 'UserX',
        color: 'text-red-600',
        requiresConfirmation: true,
        requiresReason: true,
        requiresLevel: false,
        dangerLevel: 'high',
      },
      {
        value: BatchOperationType.RESET_PASSWORDS,
        label: '重置密码',
        description: '批量重置选中用户的密码',
        icon: 'Key',
        color: 'text-orange-600',
        requiresConfirmation: true,
        requiresReason: false,
        requiresLevel: false,
        dangerLevel: 'medium',
      },
      {
        value: BatchOperationType.VERIFY_USERS,
        label: '验证用户',
        description: '批量验证选中用户的邮箱',
        icon: 'ShieldCheck',
        color: 'text-purple-600',
        requiresConfirmation: false,
        requiresReason: false,
        requiresLevel: false,
        dangerLevel: 'low',
      },
      {
        value: BatchOperationType.DELETE_USERS,
        label: '删除用户',
        description: '永久删除选中的用户账户（危险操作）',
        icon: 'Trash2',
        color: 'text-red-800',
        requiresConfirmation: true,
        requiresReason: true,
        requiresLevel: false,
        dangerLevel: 'high',
      },
    ];
  }

  /**
   * 获取单个操作配置
   */
  static getOperationConfig(operation: BatchOperationType): BatchOperationConfig | undefined {
    return this.getOperationConfigs().find(config => config.value === operation);
  }

  /**
   * 验证操作权限
   */
  static validateOperationPermission(
    operation: BatchOperationType,
    currentUserLevel: string,
    targetUsers: User[]
  ): {
    canPerform: boolean;
    reason?: string;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // 检查当前用户权限
    if (currentUserLevel !== 'SUPER_ADMIN' && currentUserLevel !== 'ADMIN') {
      return {
        canPerform: false,
        reason: '您没有执行批量操作的权限',
        warnings,
      };
    }

    // 检查目标用户
    const hasAdminUsers = targetUsers.some(user =>
      user.userLevel === 'ADMIN' || user.userLevel === 'SUPER_ADMIN'
    );

    if (hasAdminUsers && currentUserLevel !== 'SUPER_ADMIN') {
      return {
        canPerform: false,
        reason: '只有超级管理员可以操作管理员账户',
        warnings,
      };
    }

    // 危险操作警告
    const config = this.getOperationConfig(operation);
    if (config?.dangerLevel === 'high') {
      warnings.push('这是一个高风险操作，请谨慎执行');
    }

    if (operation === BatchOperationType.DELETE_USERS) {
      warnings.push('删除操作不可逆，请确保已备份重要数据');
    }

    return {
      canPerform: true,
      warnings,
    };
  }

  /**
   * 验证表单数据
   */
  static validateFormData(
    data: BatchOperationFormData,
    selectedUsers: User[]
  ): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const errors: Record<string, string> = {};

    if (selectedUsers.length === 0) {
      errors.users = '请选择要操作的用户';
    }

    const config = this.getOperationConfig(data.operation);
    if (!config) {
      errors.operation = '无效的操作类型';
      return { isValid: false, errors };
    }

    if (config.requiresLevel && !data.userLevel) {
      errors.userLevel = '请选择目标用户等级';
    }

    if (config.requiresReason && !data.reason?.trim()) {
      errors.reason = '请输入操作原因';
    }

    if (config.requiresConfirmation && data.operation === BatchOperationType.DELETE_USERS) {
      if (data.confirmText !== 'DELETE') {
        errors.confirmText = '请输入 "DELETE" 确认删除操作';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * 生成操作摘要
   */
  static generateOperationSummary(
    operation: BatchOperationType,
    selectedUsers: User[],
    formData?: Partial<BatchOperationFormData>
  ): string {
    const config = this.getOperationConfig(operation);
    const userCount = selectedUsers.length;

    if (!config) return `对 ${userCount} 个用户执行未知操作`;

    switch (operation) {
      case BatchOperationType.UPDATE_LEVEL:
        return `将 ${userCount} 个用户的等级更新为 ${formData?.userLevel || '未指定'}`;

      case BatchOperationType.ACTIVATE_USERS:
        return `激活 ${userCount} 个用户账户`;

      case BatchOperationType.DEACTIVATE_USERS:
        return `禁用 ${userCount} 个用户账户`;

      case BatchOperationType.RESET_PASSWORDS:
        return `重置 ${userCount} 个用户的密码`;

      case BatchOperationType.VERIFY_USERS:
        return `验证 ${userCount} 个用户的邮箱`;

      case BatchOperationType.DELETE_USERS:
        return `永久删除 ${userCount} 个用户账户`;

      default:
        return `对 ${userCount} 个用户执行 ${config.label}`;
    }
  }

  /**
   * 格式化操作结果
   */
  static formatOperationResult(result: OperationResult): {
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error';
  } {
    const { success, failed, errors } = result;
    const total = success + failed;

    if (failed === 0) {
      return {
        title: '操作成功',
        message: `成功处理了 ${success} 个用户`,
        type: 'success',
      };
    }

    if (success === 0) {
      return {
        title: '操作失败',
        message: `${failed} 个用户操作失败`,
        type: 'error',
      };
    }

    return {
      title: '部分成功',
      message: `${success} 个用户操作成功，${failed} 个用户操作失败`,
      type: 'warning',
    };
  }

  /**
   * 获取用户等级选项
   */
  static getUserLevelOptions(): Array<{
    value: UserLevel;
    label: string;
    description: string;
  }> {
    return [
      {
        value: UserLevel.GUEST,
        label: '游客',
        description: '基础访问权限',
      },
      {
        value: UserLevel.USER,
        label: '用户',
        description: '标准用户权限',
      },
      {
        value: UserLevel.VIP,
        label: '会员',
        description: '高级用户权限',
      },
      {
        value: UserLevel.CREATOR,
        label: '创作者',
        description: '内容创作权限',
      },
      {
        value: UserLevel.ADMIN,
        label: '管理员',
        description: '管理员权限',
      },
    ];
  }

  /**
   * 检查用户是否可以被操作
   */
  static canOperateOnUser(user: User, operation: BatchOperationType): {
    canOperate: boolean;
    reason?: string;
  } {
    switch (operation) {
      case BatchOperationType.ACTIVATE_USERS:
        if (user.isActive) {
          return { canOperate: false, reason: '用户已经是激活状态' };
        }
        break;

      case BatchOperationType.DEACTIVATE_USERS:
        if (!user.isActive) {
          return { canOperate: false, reason: '用户已经是禁用状态' };
        }
        break;

      case BatchOperationType.VERIFY_USERS:
        if (user.isVerified) {
          return { canOperate: false, reason: '用户邮箱已验证' };
        }
        break;
    }

    return { canOperate: true };
  }

  /**
   * 过滤可操作的用户
   */
  static filterOperableUsers(
    users: User[],
    operation: BatchOperationType
  ): {
    operableUsers: User[];
    skippedUsers: Array<{ user: User; reason: string }>;
  } {
    const operableUsers: User[] = [];
    const skippedUsers: Array<{ user: User; reason: string }> = [];

    users.forEach(user => {
      const check = this.canOperateOnUser(user, operation);
      if (check.canOperate) {
        operableUsers.push(user);
      } else {
        skippedUsers.push({ user, reason: check.reason || '无法操作' });
      }
    });

    return { operableUsers, skippedUsers };
  }
}

/**
 * 导出服务创建函数
 */
export const createBatchOperationsService = () => BatchOperationsService;
