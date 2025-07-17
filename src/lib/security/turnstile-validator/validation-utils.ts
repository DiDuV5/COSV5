/**
 * @fileoverview Turnstile验证工具函数
 * @description 提供token格式验证和响应处理的工具函数
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import {
  TURNSTILE_ERROR_MESSAGES,
  type TurnstileVerifyResponse,
  type TurnstileErrorCode
} from '@/types/turnstile';
import type {
  IValidationUtils,
  TurnstileValidationResult,
  TokenFormatValidation
} from './types';

/**
 * Turnstile验证工具函数实现
 */
export class ValidationUtils implements IValidationUtils {
  /**
   * 验证token格式
   */
  validateTokenFormat(
    token: string,
    startTime: number,
    timestamp: Date
  ): TokenFormatValidation {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        isValid: false,
        result: this.createErrorResult('missing-input-response', startTime, timestamp)
      };
    }

    // 检查token长度（Turnstile token通常有一定的长度范围）
    const trimmedToken = token.trim();
    if (trimmedToken.length < 10) {
      return {
        isValid: false,
        result: this.createErrorResult('invalid-input-response', startTime, timestamp)
      };
    }

    // 检查token格式（基本的字符检查）
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedToken)) {
      return {
        isValid: false,
        result: this.createErrorResult('invalid-input-response', startTime, timestamp)
      };
    }

    return {
      isValid: true,
      result: {} as TurnstileValidationResult
    };
  }

  /**
   * 处理验证响应
   */
  processVerifyResponse(
    response: TurnstileVerifyResponse,
    timestamp: Date,
    responseTime: number
  ): TurnstileValidationResult {
    if (response.success) {
      return {
        success: true,
        timestamp,
        responseTime,
        hostname: response.hostname,
        challengeTs: response.challenge_ts
      };
    }

    // 处理验证失败
    const errorCodes = response['error-codes'] || [];
    const primaryError = errorCodes[0] as TurnstileErrorCode;

    return this.createErrorResult(
      primaryError || 'internal-error',
      Date.now() - responseTime,
      timestamp,
      responseTime
    );
  }

  /**
   * 创建错误结果
   */
  createErrorResult(
    errorCode: TurnstileErrorCode,
    startTime: number,
    timestamp: Date,
    responseTime?: number
  ): TurnstileValidationResult {
    return {
      success: false,
      errorCode,
      errorMessage: TURNSTILE_ERROR_MESSAGES[errorCode] || '未知错误',
      timestamp,
      responseTime: responseTime || (Date.now() - startTime)
    };
  }

  /**
   * 检查是否为临时错误（可重试）
   */
  isTemporaryError(errorCode: TurnstileErrorCode): boolean {
    const temporaryErrors: TurnstileErrorCode[] = [
      'timeout-or-duplicate',
      'internal-error'
    ];
    return temporaryErrors.includes(errorCode);
  }

  /**
   * 检查是否为客户端错误（不可重试）
   */
  isClientError(errorCode: TurnstileErrorCode): boolean {
    const clientErrors: TurnstileErrorCode[] = [
      'missing-input-secret',
      'invalid-input-secret',
      'missing-input-response',
      'invalid-input-response',
      'bad-request'
    ];
    return clientErrors.includes(errorCode);
  }

  /**
   * 获取错误的严重程度
   */
  getErrorSeverity(errorCode: TurnstileErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'missing-input-secret':
      case 'invalid-input-secret':
        return 'critical';

      case 'missing-input-response':
      case 'invalid-input-response':
        return 'medium';

      case 'timeout-or-duplicate':
        return 'low';

      case 'internal-error':
        return 'high';

      default:
        return 'medium';
    }
  }

  /**
   * 格式化验证结果用于日志
   */
  formatResultForLog(result: TurnstileValidationResult): Record<string, any> {
    return {
      success: result.success,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      responseTime: result.responseTime,
      timestamp: result.timestamp.toISOString(),
      fallbackUsed: result.fallbackUsed || false
    };
  }
}
