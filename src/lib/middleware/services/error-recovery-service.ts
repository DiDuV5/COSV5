/**
 * @fileoverview 错误恢复服务
 * @description 专门处理错误恢复建议、重试逻辑和用户指导
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { ErrorType, ErrorSeverity } from './error-classification-service';

/**
 * 恢复动作接口
 */
export interface RecoveryAction {
  action: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  automated: boolean;
  userFriendly: boolean;
}

/**
 * 错误恢复服务类
 */
export class ErrorRecoveryService {
  /**
   * 检查错误是否可重试
   */
  static isRetryable(errorType: ErrorType, error: any): boolean {
    // 检查错误对象中的重试标记
    if (typeof error?.retryable === 'boolean') {
      return error.retryable;
    }

    // 根据错误类型判断
    switch (errorType) {
      case ErrorType.NETWORK:
        return this.isNetworkRetryable(error);
      
      case ErrorType.SERVER:
        return this.isServerRetryable(error);
      
      case ErrorType.UPLOAD:
        return this.isUploadRetryable(error);
      
      case ErrorType.RATE_LIMIT:
        return true; // 限流错误通常可以重试
      
      case ErrorType.FILE:
        return this.isFileRetryable(error);
      
      case ErrorType.AUTHENTICATION:
      case ErrorType.PERMISSION:
      case ErrorType.VALIDATION:
        return false; // 这些错误通常不应该重试
      
      default:
        return false;
    }
  }

  /**
   * 获取恢复建议
   */
  static getRecoveryActions(errorType: ErrorType, error: any): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (errorType) {
      case ErrorType.NETWORK:
        actions.push(...this.getNetworkRecoveryActions(error));
        break;
      
      case ErrorType.AUTHENTICATION:
        actions.push(...this.getAuthRecoveryActions(error));
        break;
      
      case ErrorType.PERMISSION:
        actions.push(...this.getPermissionRecoveryActions(error));
        break;
      
      case ErrorType.VALIDATION:
        actions.push(...this.getValidationRecoveryActions(error));
        break;
      
      case ErrorType.UPLOAD:
        actions.push(...this.getUploadRecoveryActions(error));
        break;
      
      case ErrorType.FILE:
        actions.push(...this.getFileRecoveryActions(error));
        break;
      
      case ErrorType.RATE_LIMIT:
        actions.push(...this.getRateLimitRecoveryActions(error));
        break;
      
      case ErrorType.SERVER:
        actions.push(...this.getServerRecoveryActions(error));
        break;
      
      default:
        actions.push(...this.getGenericRecoveryActions(error));
    }

    return actions;
  }

  /**
   * 网络错误恢复建议
   */
  private static getNetworkRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'check_connection',
        description: '检查网络连接',
        priority: 'high',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'retry_request',
        description: '重试请求',
        priority: 'high',
        automated: true,
        userFriendly: true,
      },
      {
        action: 'switch_network',
        description: '尝试切换网络',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 认证错误恢复建议
   */
  private static getAuthRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'relogin',
        description: '重新登录',
        priority: 'high',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'clear_cache',
        description: '清除浏览器缓存',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'reset_password',
        description: '重置密码',
        priority: 'low',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 权限错误恢复建议
   */
  private static getPermissionRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'check_login',
        description: '检查登录状态',
        priority: 'high',
        automated: true,
        userFriendly: true,
      },
      {
        action: 'contact_admin',
        description: '联系管理员',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'upgrade_account',
        description: '升级账户权限',
        priority: 'low',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 验证错误恢复建议
   */
  private static getValidationRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'check_input',
        description: '检查输入格式',
        priority: 'high',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'review_requirements',
        description: '查看格式要求',
        priority: 'high',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'use_example',
        description: '参考示例格式',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 上传错误恢复建议
   */
  private static getUploadRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'check_file_size',
        description: '检查文件大小',
        priority: 'high',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'check_file_format',
        description: '确认文件格式支持',
        priority: 'high',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'try_chunked_upload',
        description: '尝试分片上传',
        priority: 'medium',
        automated: true,
        userFriendly: true,
      },
      {
        action: 'compress_file',
        description: '压缩文件后重试',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 文件错误恢复建议
   */
  private static getFileRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'check_file_exists',
        description: '检查文件是否存在',
        priority: 'high',
        automated: true,
        userFriendly: false,
      },
      {
        action: 'check_permissions',
        description: '检查文件权限',
        priority: 'high',
        automated: true,
        userFriendly: false,
      },
      {
        action: 'retry_operation',
        description: '重试文件操作',
        priority: 'medium',
        automated: true,
        userFriendly: true,
      },
    ];
  }

  /**
   * 限流错误恢复建议
   */
  private static getRateLimitRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'wait_and_retry',
        description: '稍后重试',
        priority: 'high',
        automated: true,
        userFriendly: true,
      },
      {
        action: 'reduce_frequency',
        description: '减少请求频率',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'upgrade_plan',
        description: '升级服务计划',
        priority: 'low',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 服务器错误恢复建议
   */
  private static getServerRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'retry_later',
        description: '稍后重试',
        priority: 'high',
        automated: true,
        userFriendly: true,
      },
      {
        action: 'contact_support',
        description: '联系技术支持',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'check_status_page',
        description: '查看服务状态',
        priority: 'low',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 通用错误恢复建议
   */
  private static getGenericRecoveryActions(error: any): RecoveryAction[] {
    return [
      {
        action: 'refresh_page',
        description: '刷新页面重试',
        priority: 'high',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'clear_cache',
        description: '清除浏览器缓存',
        priority: 'medium',
        automated: false,
        userFriendly: true,
      },
      {
        action: 'contact_support',
        description: '联系技术支持',
        priority: 'low',
        automated: false,
        userFriendly: true,
      },
    ];
  }

  /**
   * 检查网络错误是否可重试
   */
  private static isNetworkRetryable(error: any): boolean {
    const retryableNetworkErrors = [
      'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'
    ];
    
    return retryableNetworkErrors.includes(error?.code) ||
           error?.status >= 500 ||
           (error?.message || '').toLowerCase().includes('timeout');
  }

  /**
   * 检查服务器错误是否可重试
   */
  private static isServerRetryable(error: any): boolean {
    // 5xx错误通常可以重试，但502/503/504更适合重试
    const retryableStatuses = [502, 503, 504];
    return retryableStatuses.includes(error?.status) ||
           error?.status === 500; // 500也可以重试，但要限制次数
  }

  /**
   * 检查上传错误是否可重试
   */
  private static isUploadRetryable(error: any): boolean {
    const nonRetryableUploadErrors = [
      'file too large', 'unsupported format', 'invalid file type'
    ];
    
    const errorMessage = (error?.message || '').toLowerCase();
    return !nonRetryableUploadErrors.some(msg => errorMessage.includes(msg));
  }

  /**
   * 检查文件错误是否可重试
   */
  private static isFileRetryable(error: any): boolean {
    const retryableFileCodes = ['EMFILE', 'ENFILE', 'EBUSY'];
    return retryableFileCodes.includes(error?.code);
  }

  /**
   * 获取用户友好的恢复建议
   */
  static getUserFriendlyActions(actions: RecoveryAction[]): string[] {
    return actions
      .filter(action => action.userFriendly)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .map(action => action.description);
  }

  /**
   * 获取自动化恢复建议
   */
  static getAutomatedActions(actions: RecoveryAction[]): RecoveryAction[] {
    return actions.filter(action => action.automated);
  }
}

/**
 * 导出服务创建函数
 */
export const createErrorRecoveryService = () => ErrorRecoveryService;
