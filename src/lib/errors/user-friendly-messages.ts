/**
 * @fileoverview 用户友好错误消息映射
 * @description 将技术错误转换为用户友好的中文提示
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { TRPCError } from '@trpc/server';

/**
 * 错误消息类型
 */
export interface UserFriendlyMessage {
  title: string;
  description: string;
  action?: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * 通用错误消息映射
 */
export const COMMON_ERROR_MESSAGES: Record<string, UserFriendlyMessage> = {
  // 网络相关错误
  NETWORK_ERROR: {
    title: '网络连接失败',
    description: '请检查您的网络连接，然后重试',
    action: '重试',
    severity: 'error',
  },
  TIMEOUT: {
    title: '请求超时',
    description: '服务器响应时间过长，请稍后重试',
    action: '重试',
    severity: 'warning',
  },

  // 认证相关错误
  UNAUTHORIZED: {
    title: '请先登录',
    description: '您需要登录后才能执行此操作',
    action: '去登录',
    severity: 'warning',
  },
  FORBIDDEN: {
    title: '权限不足',
    description: '您没有权限执行此操作',
    action: '了解更多',
    severity: 'error',
  },
  SESSION_EXPIRED: {
    title: '登录已过期',
    description: '您的登录状态已过期，请重新登录',
    action: '重新登录',
    severity: 'warning',
  },

  // 验证相关错误
  VALIDATION_ERROR: {
    title: '输入信息有误',
    description: '请检查您输入的信息是否正确',
    action: '检查输入',
    severity: 'warning',
  },
  INVALID_EMAIL: {
    title: '邮箱格式不正确',
    description: '请输入有效的邮箱地址',
    action: '重新输入',
    severity: 'warning',
  },
  INVALID_PASSWORD: {
    title: '密码格式不正确',
    description: '密码长度至少8位，包含字母和数字',
    action: '重新设置',
    severity: 'warning',
  },

  // 资源相关错误
  NOT_FOUND: {
    title: '内容不存在',
    description: '您访问的内容可能已被删除或不存在',
    action: '返回首页',
    severity: 'error',
  },
  RESOURCE_EXISTS: {
    title: '内容已存在',
    description: '该内容已经存在，请勿重复操作',
    action: '查看现有内容',
    severity: 'warning',
  },

  // 文件上传相关错误
  FILE_TOO_LARGE: {
    title: '文件过大',
    description: '上传的文件超出大小限制，请选择较小的文件',
    action: '重新选择',
    severity: 'warning',
  },
  INVALID_FILE_TYPE: {
    title: '文件格式不支持',
    description: '请上传支持的文件格式',
    action: '查看支持格式',
    severity: 'warning',
  },
  UPLOAD_FAILED: {
    title: '上传失败',
    description: '文件上传过程中出现错误，请重试',
    action: '重新上传',
    severity: 'error',
  },

  // 业务逻辑错误
  RATE_LIMIT_EXCEEDED: {
    title: '操作过于频繁',
    description: '您的操作过于频繁，请稍后再试',
    action: '稍后重试',
    severity: 'warning',
  },
  QUOTA_EXCEEDED: {
    title: '配额已用完',
    description: '您的使用配额已达上限，请升级账户或等待重置',
    action: '查看配额',
    severity: 'warning',
  },

  // 服务器错误
  INTERNAL_SERVER_ERROR: {
    title: '服务器错误',
    description: '服务器出现临时故障，我们正在修复中',
    action: '稍后重试',
    severity: 'error',
  },
  SERVICE_UNAVAILABLE: {
    title: '服务暂不可用',
    description: '服务正在维护中，请稍后再试',
    action: '查看公告',
    severity: 'error',
  },

  // 默认错误
  UNKNOWN_ERROR: {
    title: '未知错误',
    description: '出现了意外错误，请联系客服',
    action: '联系客服',
    severity: 'error',
  },
};

/**
 * 业务特定错误消息映射
 */
export const BUSINESS_ERROR_MESSAGES: Record<string, UserFriendlyMessage> = {
  // 用户注册相关
  USERNAME_TAKEN: {
    title: '用户名已被使用',
    description: '该用户名已被其他用户注册，请选择其他用户名',
    action: '重新输入',
    severity: 'warning',
  },
  EMAIL_TAKEN: {
    title: '邮箱已被注册',
    description: '该邮箱已被其他用户使用，请使用其他邮箱或找回密码',
    action: '找回密码',
    severity: 'warning',
  },
  REGISTRATION_CONFLICT: {
    title: '注册冲突',
    description: '注册过程中出现冲突，请稍后重试',
    action: '重新注册',
    severity: 'warning',
  },

  // 邮箱验证相关
  INVALID_VERIFICATION_TOKEN: {
    title: '验证链接无效',
    description: '验证链接已失效或不正确，请重新发送验证邮件',
    action: '重新发送',
    severity: 'warning',
  },
  EXPIRED_VERIFICATION_TOKEN: {
    title: '验证链接已过期',
    description: '验证链接已过期，请重新发送验证邮件',
    action: '重新发送',
    severity: 'warning',
  },
  TOKEN_ALREADY_USED: {
    title: '验证链接已使用',
    description: '该验证链接已被使用，请勿重复验证',
    action: '查看状态',
    severity: 'info',
  },

  // 权限相关
  PERMISSION_DENIED: {
    title: '权限不足',
    description: '您的账户权限不足以执行此操作',
    action: '联系管理员',
    severity: 'warning',
  },
  ACCOUNT_INACTIVE: {
    title: '账户未激活',
    description: '您的账户尚未激活，请先完成账户激活',
    action: '激活账户',
    severity: 'warning',
  },
  ACCOUNT_SUSPENDED: {
    title: '账户已被暂停',
    description: '您的账户因违规行为被暂停使用',
    action: '申诉',
    severity: 'error',
  },

  // 内容相关
  CONTENT_TOO_LONG: {
    title: '内容过长',
    description: '您输入的内容超出长度限制，请适当缩减',
    action: '重新编辑',
    severity: 'warning',
  },
  INAPPROPRIATE_CONTENT: {
    title: '内容不当',
    description: '您的内容包含不当信息，请修改后重新提交',
    action: '修改内容',
    severity: 'warning',
  },
};

/**
 * 将tRPC错误转换为用户友好消息
 */
export function convertTRPCErrorToUserMessage(error: TRPCError | Error): UserFriendlyMessage {
  // 如果是TRPCError
  if (error instanceof TRPCError) {
    const { code, message } = error;

    // 首先尝试匹配具体的错误消息
    if (BUSINESS_ERROR_MESSAGES[message]) {
      return BUSINESS_ERROR_MESSAGES[message];
    }

    // 然后根据错误代码匹配
    switch (code) {
      case 'UNAUTHORIZED':
        return COMMON_ERROR_MESSAGES.UNAUTHORIZED;
      case 'FORBIDDEN':
        return COMMON_ERROR_MESSAGES.FORBIDDEN;
      case 'NOT_FOUND':
        return COMMON_ERROR_MESSAGES.NOT_FOUND;
      case 'BAD_REQUEST':
        // 对于BAD_REQUEST，先检查是否是业务错误
        if (BUSINESS_ERROR_MESSAGES[message]) {
          return BUSINESS_ERROR_MESSAGES[message];
        }
        return COMMON_ERROR_MESSAGES.VALIDATION_ERROR;
      case 'TIMEOUT':
        return COMMON_ERROR_MESSAGES.TIMEOUT;
      case 'TOO_MANY_REQUESTS':
        return COMMON_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
      case 'INTERNAL_SERVER_ERROR':
        return COMMON_ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      default:
        return COMMON_ERROR_MESSAGES.UNKNOWN_ERROR;
    }
  }

  // 如果是普通Error，检查错误消息内容
  const errorMessage = error.message.toLowerCase();

  // 网络相关错误
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return COMMON_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (errorMessage.includes('timeout')) {
    return COMMON_ERROR_MESSAGES.TIMEOUT;
  }

  // 检查是否是业务错误消息
  if (BUSINESS_ERROR_MESSAGES[error.message]) {
    return BUSINESS_ERROR_MESSAGES[error.message];
  }

  // 默认返回未知错误
  return COMMON_ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * 获取错误的严重程度颜色
 */
export function getErrorSeverityColor(severity: UserFriendlyMessage['severity']): string {
  switch (severity) {
    case 'error':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'info':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

/**
 * 获取错误图标
 */
export function getErrorIcon(severity: UserFriendlyMessage['severity']): string {
  switch (severity) {
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '❓';
  }
}
