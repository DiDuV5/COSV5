/**
 * @fileoverview 重试策略服务
 * @description 专门处理重试逻辑、延迟计算和重试条件判断
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { ErrorType } from '@/lib/middleware/services/error-classification-service';

/**
 * 重试配置接口
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
  jitterEnabled?: boolean;
  exponentialBackoff?: boolean;
}

/**
 * 重试结果接口
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
  retryHistory: Array<{
    attempt: number;
    delay: number;
    error?: any;
    timestamp: number;
  }>;
}

/**
 * 重试策略服务类
 */
export class RetryStrategyService {
  /**
   * 默认重试配置
   */
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER],
    jitterEnabled: true,
    exponentialBackoff: true,
  };

  /**
   * 执行重试操作
   */
  static async retry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    const retryHistory: RetryResult<T>['retryHistory'] = [];
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 执行操作 "${operationName}" - 第 ${attempt} 次尝试`);
        
        const data = await operation();
        
        const totalTime = Date.now() - startTime;
        console.log(`✅ 操作 "${operationName}" 成功，耗时: ${totalTime}ms，尝试次数: ${attempt}`);
        
        return {
          success: true,
          data,
          attempts: attempt,
          totalTime,
          retryHistory,
        };

      } catch (error) {
        lastError = error;
        const timestamp = Date.now();
        
        console.warn(`❌ 操作 "${operationName}" 第 ${attempt} 次尝试失败:`, error);

        // 检查是否可重试
        if (!this.shouldRetry(error, attempt, finalConfig)) {
          console.log(`🚫 操作 "${operationName}" 不可重试，停止尝试`);
          break;
        }

        // 计算延迟
        const delay = this.calculateDelay(attempt, finalConfig);
        
        // 记录重试历史
        retryHistory.push({
          attempt,
          delay,
          error: this.sanitizeError(error),
          timestamp,
        });

        // 等待重试延迟
        if (attempt <= finalConfig.maxRetries) {
          console.log(`⏳ 等待 ${delay}ms 后重试...`);
          await this.sleep(delay);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    console.error(`❌ 操作 "${operationName}" 最终失败，总耗时: ${totalTime}ms，尝试次数: ${finalConfig.maxRetries + 1}`);

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxRetries + 1,
      totalTime,
      retryHistory,
    };
  }

  /**
   * 判断是否应该重试
   */
  static shouldRetry(error: any, attempt: number, config: RetryConfig): boolean {
    // 超过最大重试次数
    if (attempt > config.maxRetries) {
      return false;
    }

    // 检查错误类型是否可重试
    const errorType = this.detectErrorType(error);
    if (!config.retryableErrors.includes(errorType)) {
      console.log(`错误类型 ${errorType} 不在可重试列表中`);
      return false;
    }

    // 检查特定的不可重试条件
    if (this.isNonRetryableError(error)) {
      return false;
    }

    return true;
  }

  /**
   * 计算重试延迟
   */
  static calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    if (config.exponentialBackoff) {
      // 指数退避
      delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    } else {
      // 线性延迟
      delay = config.baseDelay * attempt;
    }

    // 应用最大延迟限制
    delay = Math.min(delay, config.maxDelay);

    // 添加抖动以避免雷群效应
    if (config.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random(); // 10% 抖动
      delay += jitter;
    }

    return Math.round(delay);
  }

  /**
   * 检测错误类型
   */
  private static detectErrorType(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    const message = (error.message || '').toLowerCase();
    const code = error.code || '';

    // 网络错误
    if (this.isNetworkError(error, message, code)) {
      return ErrorType.NETWORK;
    }

    // 服务器错误
    if (this.isServerError(error, message, code)) {
      return ErrorType.SERVER;
    }

    // 认证错误
    if (this.isAuthError(error, message, code)) {
      return ErrorType.AUTHENTICATION;
    }

    // 权限错误
    if (this.isPermissionError(error, message, code)) {
      return ErrorType.PERMISSION;
    }

    // 验证错误
    if (this.isValidationError(error, message, code)) {
      return ErrorType.VALIDATION;
    }

    // 上传错误
    if (this.isUploadError(error, message, code)) {
      return ErrorType.UPLOAD;
    }

    // 限流错误
    if (this.isRateLimitError(error, message, code)) {
      return ErrorType.RATE_LIMIT;
    }

    // 文件错误
    if (this.isFileError(error, message, code)) {
      return ErrorType.FILE;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 检查是否为网络错误
   */
  private static isNetworkError(error: any, message: string, code: string): boolean {
    const networkKeywords = ['network', 'connection', 'timeout', 'fetch failed'];
    const networkCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    
    return networkKeywords.some(keyword => message.includes(keyword)) ||
           networkCodes.includes(code) ||
           error?.name === 'NetworkError';
  }

  /**
   * 检查是否为服务器错误
   */
  private static isServerError(error: any, message: string, code: string): boolean {
    return error?.status >= 500 ||
           message.includes('internal server error') ||
           message.includes('service unavailable');
  }

  /**
   * 检查是否为认证错误
   */
  private static isAuthError(error: any, message: string, code: string): boolean {
    return error?.status === 401 ||
           message.includes('unauthorized') ||
           message.includes('authentication');
  }

  /**
   * 检查是否为权限错误
   */
  private static isPermissionError(error: any, message: string, code: string): boolean {
    return error?.status === 403 ||
           message.includes('forbidden') ||
           message.includes('permission denied');
  }

  /**
   * 检查是否为验证错误
   */
  private static isValidationError(error: any, message: string, code: string): boolean {
    return error?.status === 400 ||
           message.includes('validation') ||
           message.includes('invalid');
  }

  /**
   * 检查是否为上传错误
   */
  private static isUploadError(error: any, message: string, code: string): boolean {
    return message.includes('upload') ||
           message.includes('file size') ||
           message.includes('multipart');
  }

  /**
   * 检查是否为限流错误
   */
  private static isRateLimitError(error: any, message: string, code: string): boolean {
    return error?.status === 429 ||
           message.includes('rate limit') ||
           message.includes('too many requests');
  }

  /**
   * 检查是否为文件错误
   */
  private static isFileError(error: any, message: string, code: string): boolean {
    const fileCodes = ['ENOENT', 'EACCES', 'EISDIR', 'ENOTDIR'];
    return fileCodes.includes(code) ||
           message.includes('file not found') ||
           message.includes('permission denied');
  }

  /**
   * 检查是否为不可重试的错误
   */
  private static isNonRetryableError(error: any): boolean {
    // 客户端错误通常不应该重试
    if (error?.status >= 400 && error?.status < 500) {
      // 除了429 (Too Many Requests) 和 408 (Request Timeout)
      return error.status !== 429 && error.status !== 408;
    }

    // 特定的不可重试错误
    const nonRetryableMessages = [
      'file too large',
      'unsupported format',
      'invalid credentials',
      'account suspended',
    ];

    const message = (error?.message || '').toLowerCase();
    return nonRetryableMessages.some(msg => message.includes(msg));
  }

  /**
   * 清理错误对象（移除敏感信息）
   */
  private static sanitizeError(error: any): any {
    if (!error) return null;

    return {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      type: error.type,
    };
  }

  /**
   * 睡眠函数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取预定义的重试配置
   */
  static getPresetConfig(preset: 'fast' | 'standard' | 'aggressive' | 'conservative'): RetryConfig {
    const presets: Record<string, RetryConfig> = {
      fast: {
        maxRetries: 2,
        baseDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER],
        jitterEnabled: true,
        exponentialBackoff: true,
      },
      standard: this.DEFAULT_CONFIG,
      aggressive: {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2.5,
        retryableErrors: [ErrorType.NETWORK, ErrorType.SERVER, ErrorType.RATE_LIMIT],
        jitterEnabled: true,
        exponentialBackoff: true,
      },
      conservative: {
        maxRetries: 2,
        baseDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        retryableErrors: [ErrorType.NETWORK],
        jitterEnabled: false,
        exponentialBackoff: false,
      },
    };

    return presets[preset] || this.DEFAULT_CONFIG;
  }
}

/**
 * 导出服务创建函数
 */
export const createRetryStrategyService = () => RetryStrategyService;
