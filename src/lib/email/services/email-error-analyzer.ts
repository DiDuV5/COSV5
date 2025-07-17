/**
 * @fileoverview 邮件错误分析器
 * @description 智能分析邮件发送错误，提供准确的错误分类和用户友好的错误信息
 * @author Augment AI
 * @date 2025-07-02
 * @version 1.0.0
 */

import {
  EmailErrorType,
  EmailError,
  EmailSendContext,
  EMAIL_ERROR_MESSAGES,
  type EmailErrorAnalyzer,
} from '../types/email-error-types';

/**
 * 邮件错误分析器实现
 */
export class EmailErrorAnalyzerService implements EmailErrorAnalyzer {
  /**
   * 分析错误并返回结构化的错误信息
   */
  analyzeError(error: Error, context: EmailSendContext): EmailError {
    const errorType = this.classifyError(error);
    const errorConfig = EMAIL_ERROR_MESSAGES[errorType];

    return {
      type: errorType,
      message: error.message,
      originalError: error,
      code: this.extractErrorCode(error),
      details: this.extractErrorDetails(error, context),
      userMessage: errorConfig.userMessage,
      recoveryActions: errorConfig.recoveryActions,
      retryable: errorConfig.retryable,
    };
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error: EmailError, attemptNumber: number): boolean {
    // 不可重试的错误类型
    if (!error.retryable) {
      return false;
    }

    // 超过最大重试次数
    if (attemptNumber >= 3) {
      return false;
    }

    // 特定错误类型的重试逻辑
    switch (error.type) {
      case EmailErrorType.SMTP_RATE_LIMITED:
        return attemptNumber <= 2; // 限流错误最多重试2次
      case EmailErrorType.NETWORK_ERROR:
      case EmailErrorType.CONNECTION_TIMEOUT:
        return attemptNumber <= 3; // 网络错误最多重试3次
      case EmailErrorType.SMTP_SERVER_ERROR:
        return attemptNumber <= 2; // 服务器错误最多重试2次
      default:
        return attemptNumber <= 2;
    }
  }

  /**
   * 计算重试延迟时间（毫秒）
   */
  getRetryDelay(error: EmailError, attemptNumber: number): number {
    const baseDelay = 1000; // 基础延迟1秒

    switch (error.type) {
      case EmailErrorType.SMTP_RATE_LIMITED:
        // 限流错误使用指数退避，最长等待60秒
        return Math.min(baseDelay * Math.pow(4, attemptNumber), 60000);
      case EmailErrorType.NETWORK_ERROR:
      case EmailErrorType.CONNECTION_TIMEOUT:
        // 网络错误使用线性增长
        return baseDelay * (attemptNumber + 1);
      case EmailErrorType.SMTP_SERVER_ERROR:
        // 服务器错误使用指数退避
        return baseDelay * Math.pow(2, attemptNumber);
      default:
        return baseDelay * attemptNumber;
    }
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: Error): EmailErrorType {
    const message = error.message.toLowerCase();
    const errorString = error.toString().toLowerCase();

    // 邮箱地址相关错误 - 优先检查，因为它们可能包含SMTP关键词
    if (this.isEmailAddressError(message, errorString)) {
      return this.classifyEmailAddressError(message, errorString);
    }

    // 网络相关错误
    if (this.isNetworkError(message, errorString)) {
      return this.classifyNetworkError(message, errorString);
    }

    // SMTP相关错误
    if (this.isSMTPError(message, errorString)) {
      return this.classifySMTPError(message, errorString);
    }

    // 配置相关错误
    if (this.isConfigError(message, errorString)) {
      return this.classifyConfigError(message, errorString);
    }

    // 内容相关错误
    if (this.isContentError(message, errorString)) {
      return this.classifyContentError(message, errorString);
    }

    return EmailErrorType.UNKNOWN_ERROR;
  }

  /**
   * 判断是否为网络错误
   */
  private isNetworkError(message: string, errorString: string): boolean {
    const networkKeywords = [
      'network', 'connection', 'timeout', 'dns', 'resolve',
      'enotfound', 'econnrefused', 'econnreset', 'etimedout'
    ];
    return networkKeywords.some(keyword =>
      message.includes(keyword) || errorString.includes(keyword)
    );
  }

  /**
   * 分类网络错误
   */
  private classifyNetworkError(message: string, errorString: string): EmailErrorType {
    if (message.includes('timeout') || message.includes('etimedout')) {
      return EmailErrorType.CONNECTION_TIMEOUT;
    }
    if (message.includes('dns') || message.includes('enotfound')) {
      return EmailErrorType.DNS_RESOLUTION_FAILED;
    }
    return EmailErrorType.NETWORK_ERROR;
  }

  /**
   * 判断是否为SMTP错误
   */
  private isSMTPError(message: string, errorString: string): boolean {
    const smtpKeywords = [
      'smtp', 'auth', 'authentication', 'login', 'password',
      'refused', 'rejected', 'rate limit', 'too many'
    ];
    return smtpKeywords.some(keyword =>
      message.includes(keyword) || errorString.includes(keyword)
    );
  }

  /**
   * 分类SMTP错误
   */
  private classifySMTPError(message: string, errorString: string): EmailErrorType {
    if (message.includes('auth') || message.includes('authentication') ||
      message.includes('login') || message.includes('password')) {
      return EmailErrorType.SMTP_AUTH_FAILED;
    }
    if (message.includes('refused') || message.includes('econnrefused')) {
      return EmailErrorType.SMTP_CONNECTION_REFUSED;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return EmailErrorType.SMTP_RATE_LIMITED;
    }
    return EmailErrorType.SMTP_SERVER_ERROR;
  }

  /**
   * 判断是否为邮箱地址错误
   */
  private isEmailAddressError(message: string, errorString: string): boolean {
    const emailKeywords = [
      'invalid email', 'invalid address', 'mailbox', 'recipient',
      'user unknown', 'no such user', 'address rejected', 'user not found'
    ];
    return emailKeywords.some(keyword =>
      message.includes(keyword) || errorString.includes(keyword)
    );
  }

  /**
   * 分类邮箱地址错误
   */
  private classifyEmailAddressError(message: string, errorString: string): EmailErrorType {
    if (message.includes('invalid email') || message.includes('invalid address')) {
      return EmailErrorType.INVALID_EMAIL_FORMAT;
    }
    if (message.includes('user unknown') || message.includes('no such user')) {
      return EmailErrorType.EMAIL_NOT_EXISTS;
    }
    if (message.includes('mailbox full') || message.includes('quota exceeded')) {
      return EmailErrorType.MAILBOX_FULL;
    }
    if (message.includes('rejected') || message.includes('refused')) {
      return EmailErrorType.EMAIL_REJECTED;
    }
    return EmailErrorType.EMAIL_NOT_EXISTS;
  }

  /**
   * 判断是否为配置错误
   */
  private isConfigError(message: string, errorString: string): boolean {
    const configKeywords = [
      'config', 'configuration', 'missing', 'undefined',
      'credentials', 'environment', 'env'
    ];
    return configKeywords.some(keyword =>
      message.includes(keyword) || errorString.includes(keyword)
    );
  }

  /**
   * 分类配置错误
   */
  private classifyConfigError(message: string, errorString: string): EmailErrorType {
    if (message.includes('missing') || message.includes('undefined')) {
      if (message.includes('credentials') || message.includes('password') || message.includes('auth')) {
        return EmailErrorType.MISSING_CREDENTIALS;
      }
      return EmailErrorType.MISSING_CONFIG;
    }
    return EmailErrorType.INVALID_CONFIG;
  }

  /**
   * 判断是否为内容错误
   */
  private isContentError(message: string, errorString: string): boolean {
    const contentKeywords = [
      'too large', 'size limit', 'attachment', 'template',
      'content', 'body', 'message size'
    ];
    return contentKeywords.some(keyword =>
      message.includes(keyword) || errorString.includes(keyword)
    );
  }

  /**
   * 分类内容错误
   */
  private classifyContentError(message: string, errorString: string): EmailErrorType {
    if (message.includes('too large') || message.includes('size limit')) {
      return EmailErrorType.CONTENT_TOO_LARGE;
    }
    if (message.includes('attachment')) {
      return EmailErrorType.INVALID_ATTACHMENT;
    }
    if (message.includes('template')) {
      return EmailErrorType.TEMPLATE_ERROR;
    }
    return EmailErrorType.UNKNOWN_ERROR;
  }

  /**
   * 提取错误代码
   */
  private extractErrorCode(error: Error): string | undefined {
    // 尝试从错误对象中提取错误代码
    const errorObj = error as any;
    return errorObj.code || errorObj.errno || errorObj.status || undefined;
  }

  /**
   * 提取错误详情
   */
  private extractErrorDetails(error: Error, context: EmailSendContext): Record<string, any> {
    const errorObj = error as any;

    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: errorObj.code,
      errorErrno: errorObj.errno,
      errorSyscall: errorObj.syscall,
      errorHostname: errorObj.hostname,
      errorPort: errorObj.port,
      emailType: context.emailType,
      recipientEmail: context.recipientEmail,
      attemptNumber: context.attemptNumber,
      timestamp: context.timestamp.toISOString(),
    };
  }
}

/**
 * 单例邮件错误分析器
 */
export const emailErrorAnalyzer = new EmailErrorAnalyzerService();
