/**
 * @fileoverview Turnstile验证错误处理
 * @description 处理Turnstile验证过程中的错误和降级逻辑
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import {
  turnstileFallbackManager,
  FallbackReason,
  SecurityLevel,
  FEATURE_SECURITY_LEVELS
} from '../turnstile-fallback-manager';
import {
  TURNSTILE_ERROR_MESSAGES,
  type TurnstileFeatureId,
  type TurnstileErrorCode
} from '@/types/turnstile';
import type {
  IValidationErrorHandler,
  TurnstileValidationResult
} from './types';

/**
 * Turnstile验证错误处理实现
 */
export class ValidationErrorHandler implements IValidationErrorHandler {
  /**
   * 处理验证错误
   */
  async handleValidationError(
    error: unknown,
    featureId?: TurnstileFeatureId,
    remoteIp?: string,
    token?: string,
    timestamp?: Date,
    startTime?: number
  ): Promise<TurnstileValidationResult> {
    const responseTime = startTime ? Date.now() - startTime : 0;
    console.error('❌ Turnstile验证异常:', error);

    // 触发降级机制
    if (featureId) {
      const fallbackReason = this.determineFallbackReason(error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 触发降级
      await turnstileFallbackManager.triggerFallback(featureId, fallbackReason, errorMessage);

      // 检查是否可以降级
      if (turnstileFallbackManager.shouldFallback(featureId)) {
        const securityLevel = FEATURE_SECURITY_LEVELS[featureId] || SecurityLevel.MEDIUM;

        if (securityLevel !== SecurityLevel.CRITICAL) {
          console.warn(`🔄 验证失败，使用降级模式: ${featureId}`);
          return {
            success: true,
            message: `验证服务不可用，已使用降级模式: ${fallbackReason}`,
            timestamp: timestamp || new Date(),
            responseTime,
            fallbackUsed: true
          };
        }
      }
    }

    return {
      success: false,
      errorMessage: '验证服务暂时不可用，请稍后重试',
      errorCode: 'internal-error',
      timestamp: timestamp || new Date(),
      responseTime
    };
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
   * 根据错误类型确定降级原因
   */
  private determineFallbackReason(error: unknown): FallbackReason {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      return FallbackReason.API_TIMEOUT;
    } else if (errorMessage.includes('network') || errorMessage.includes('NETWORK')) {
      return FallbackReason.NETWORK_ERROR;
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT')) {
      return FallbackReason.RATE_LIMIT_EXCEEDED;
    } else if (errorMessage.includes('abort') || errorMessage.includes('AbortError')) {
      return FallbackReason.API_TIMEOUT;
    } else if (errorMessage.includes('fetch') || errorMessage.includes('FETCH')) {
      return FallbackReason.NETWORK_ERROR;
    }

    return FallbackReason.API_ERROR;
  }

  /**
   * 检查错误是否可以重试
   */
  isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 网络错误通常可以重试
    if (errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('abort')) {
      return true;
    }

    // HTTP 5xx 错误可以重试
    if (errorMessage.includes('HTTP 5')) {
      return true;
    }

    // HTTP 429 (Rate Limit) 可以重试
    if (errorMessage.includes('HTTP 429') || errorMessage.includes('rate limit')) {
      return true;
    }

    return false;
  }

  /**
   * 获取错误的严重程度
   */
  getErrorSeverity(error: unknown): 'low' | 'medium' | 'high' | 'critical' {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 配置错误是严重的
    if (errorMessage.includes('secret') || errorMessage.includes('config')) {
      return 'critical';
    }

    // 网络超时是中等严重
    if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
      return 'medium';
    }

    // 网络错误是中等严重
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'medium';
    }

    // 限流是低严重
    if (errorMessage.includes('rate limit')) {
      return 'low';
    }

    // 服务器错误是高严重
    if (errorMessage.includes('HTTP 5')) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * 创建降级结果
   */
  createFallbackResult(
    featureId: TurnstileFeatureId,
    reason: FallbackReason,
    timestamp: Date,
    responseTime: number
  ): TurnstileValidationResult {
    return {
      success: true,
      message: `Turnstile验证降级: ${reason}`,
      timestamp,
      responseTime,
      fallbackUsed: true
    };
  }

  /**
   * 检查是否应该使用降级模式
   */
  shouldUseFallback(
    featureId: TurnstileFeatureId,
    error: unknown
  ): boolean {
    // 检查功能的安全级别
    const securityLevel = FEATURE_SECURITY_LEVELS[featureId] || SecurityLevel.MEDIUM;

    // 关键操作绝不降级
    if (securityLevel === SecurityLevel.CRITICAL) {
      return false;
    }

    // 检查是否为可降级的错误
    if (!this.isRetryableError(error)) {
      return false;
    }

    // 检查降级管理器的状态
    return turnstileFallbackManager.shouldFallback(featureId);
  }

  /**
   * 格式化错误信息用于用户显示
   */
  formatErrorForUser(result: TurnstileValidationResult): string {
    if (result.success) {
      return result.message || '验证成功';
    }

    // 根据错误代码返回用户友好的消息
    switch (result.errorCode) {
      case 'missing-input-response':
        return '请完成人机验证';

      case 'invalid-input-response':
        return '验证失败，请重新验证';

      case 'timeout-or-duplicate':
        return '验证已过期，请重新验证';

      case 'internal-error':
        return '验证服务暂时不可用，请稍后重试';

      default:
        return result.errorMessage || '验证失败，请重试';
    }
  }
}
