/**
 * @fileoverview 邮件错误类型定义
 * @description 定义邮件发送过程中可能出现的各种错误类型和处理机制
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

/**
 * 邮件错误类型枚举
 */
export enum EmailErrorType {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  DNS_RESOLUTION_FAILED = 'DNS_RESOLUTION_FAILED',
  
  // SMTP服务器错误
  SMTP_AUTH_FAILED = 'SMTP_AUTH_FAILED',
  SMTP_CONNECTION_REFUSED = 'SMTP_CONNECTION_REFUSED',
  SMTP_SERVER_ERROR = 'SMTP_SERVER_ERROR',
  SMTP_RATE_LIMITED = 'SMTP_RATE_LIMITED',
  
  // 邮箱地址相关错误
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  EMAIL_NOT_EXISTS = 'EMAIL_NOT_EXISTS',
  MAILBOX_FULL = 'MAILBOX_FULL',
  EMAIL_REJECTED = 'EMAIL_REJECTED',
  
  // 配置错误
  MISSING_CONFIG = 'MISSING_CONFIG',
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  
  // 内容相关错误
  CONTENT_TOO_LARGE = 'CONTENT_TOO_LARGE',
  INVALID_ATTACHMENT = 'INVALID_ATTACHMENT',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  
  // 其他错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * 邮件发送结果接口
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: EmailError;
  attempts: number;
  totalTime: number;
}

/**
 * 邮件错误详情接口
 */
export interface EmailError {
  type: EmailErrorType;
  message: string;
  originalError?: Error;
  code?: string;
  details?: Record<string, any>;
  userMessage: string;
  recoveryActions: string[];
  retryable: boolean;
}

/**
 * 用户友好的错误消息映射
 */
export const EMAIL_ERROR_MESSAGES: Record<EmailErrorType, {
  userMessage: string;
  recoveryActions: string[];
  retryable: boolean;
}> = {
  [EmailErrorType.NETWORK_ERROR]: {
    userMessage: '网络连接异常，邮件发送失败',
    recoveryActions: [
      '请检查网络连接',
      '稍后重试',
      '如问题持续，请联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: true,
  },
  [EmailErrorType.CONNECTION_TIMEOUT]: {
    userMessage: '邮件服务连接超时',
    recoveryActions: [
      '请稍后重试',
      '检查网络连接是否稳定',
      '如问题持续，请联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: true,
  },
  [EmailErrorType.DNS_RESOLUTION_FAILED]: {
    userMessage: '邮件服务器地址解析失败',
    recoveryActions: [
      '请稍后重试',
      '检查网络DNS设置',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: true,
  },
  [EmailErrorType.SMTP_AUTH_FAILED]: {
    userMessage: '邮件服务认证失败',
    recoveryActions: [
      '请稍后重试',
      '如问题持续，请联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: false,
  },
  [EmailErrorType.SMTP_CONNECTION_REFUSED]: {
    userMessage: '邮件服务器拒绝连接',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: true,
  },
  [EmailErrorType.SMTP_SERVER_ERROR]: {
    userMessage: '邮件服务器内部错误',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: true,
  },
  [EmailErrorType.SMTP_RATE_LIMITED]: {
    userMessage: '邮件发送频率过高，请稍后重试',
    recoveryActions: [
      '请等待几分钟后重试',
      '避免频繁发送邮件',
    ],
    retryable: true,
  },
  [EmailErrorType.INVALID_EMAIL_FORMAT]: {
    userMessage: '邮箱地址格式不正确',
    recoveryActions: [
      '请检查邮箱地址格式',
      '在个人设置中更新正确的邮箱地址',
    ],
    retryable: false,
  },
  [EmailErrorType.EMAIL_NOT_EXISTS]: {
    userMessage: '邮箱地址不存在或无效',
    recoveryActions: [
      '请检查邮箱地址是否正确',
      '在个人设置中更新有效的邮箱地址',
    ],
    retryable: false,
  },
  [EmailErrorType.MAILBOX_FULL]: {
    userMessage: '邮箱存储空间已满',
    recoveryActions: [
      '请清理邮箱存储空间',
      '稍后重试',
      '或使用其他邮箱地址',
    ],
    retryable: true,
  },
  [EmailErrorType.EMAIL_REJECTED]: {
    userMessage: '邮件被收件方拒绝',
    recoveryActions: [
      '请检查邮箱地址是否正确',
      '检查垃圾邮件设置',
      '尝试使用其他邮箱地址',
    ],
    retryable: false,
  },
  [EmailErrorType.MISSING_CONFIG]: {
    userMessage: '邮件服务配置缺失',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: false,
  },
  [EmailErrorType.INVALID_CONFIG]: {
    userMessage: '邮件服务配置错误',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: false,
  },
  [EmailErrorType.MISSING_CREDENTIALS]: {
    userMessage: '邮件服务认证信息缺失',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: false,
  },
  [EmailErrorType.CONTENT_TOO_LARGE]: {
    userMessage: '邮件内容过大',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: false,
  },
  [EmailErrorType.INVALID_ATTACHMENT]: {
    userMessage: '邮件附件无效',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: false,
  },
  [EmailErrorType.TEMPLATE_ERROR]: {
    userMessage: '邮件模板处理错误',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: false,
  },
  [EmailErrorType.SERVICE_UNAVAILABLE]: {
    userMessage: '邮件服务暂时不可用',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: true,
  },
  [EmailErrorType.UNKNOWN_ERROR]: {
    userMessage: '邮件发送遇到未知错误',
    recoveryActions: [
      '请稍后重试',
      '联系运营 (https://t.me/CoserYYbot)',
    ],
    retryable: true,
  },
};

/**
 * 邮件发送上下文接口
 */
export interface EmailSendContext {
  emailType: 'verification' | 'password_reset' | 'welcome' | 'notification' | 'approval';
  recipientEmail: string;
  recipientName?: string;
  attemptNumber: number;
  maxAttempts: number;
  timestamp: Date;
}

/**
 * 邮件发送日志接口
 */
export interface EmailSendLog {
  id: string;
  context: EmailSendContext;
  result: EmailSendResult;
  createdAt: Date;
}

/**
 * 邮件错误分析器接口
 */
export interface EmailErrorAnalyzer {
  analyzeError(error: Error, context: EmailSendContext): EmailError;
  shouldRetry(error: EmailError, attemptNumber: number): boolean;
  getRetryDelay(error: EmailError, attemptNumber: number): number;
}
