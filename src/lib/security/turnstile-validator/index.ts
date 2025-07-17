/**
 * @fileoverview Turnstile验证器模块统一导出
 * @description 统一导出所有Turnstile验证器功能，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { TurnstileValidatorCore } from './validator-core';
import type { TurnstileFeatureId } from '@/types/turnstile';
import type { TurnstileValidationResult } from './types';

// 导出核心验证器
export { TurnstileValidatorCore } from './validator-core';

// 导出子模块（供高级用户使用）
export { ValidationNetwork } from './validation-network';
export { ValidationUtils } from './validation-utils';
export { ValidationLogger } from './validation-logger';
export { ValidationErrorHandler } from './validation-error-handler';
export { VerificationSessionManager, verificationSessionManager } from './session-manager';

// 导出类型定义
export type {
  TurnstileValidationResult,
  HealthCheckResult,
  ValidationLogData,
  IValidationNetwork,
  IValidationErrorHandler,
  IValidationLogger,
  IValidationUtils,
  TokenFormatValidation
} from './types';
export type { VerificationSession } from './session-manager';

/**
 * 向后兼容的TurnstileValidator类
 */
export class TurnstileValidator {
  private static instance: TurnstileValidator;
  private core: TurnstileValidatorCore;

  private constructor() {
    this.core = TurnstileValidatorCore.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): TurnstileValidator {
    if (!TurnstileValidator.instance) {
      TurnstileValidator.instance = new TurnstileValidator();
    }
    return TurnstileValidator.instance;
  }

  /**
   * 验证Turnstile token
   */
  public async validateToken(
    token: string,
    remoteIp?: string,
    featureId?: TurnstileFeatureId
  ): Promise<TurnstileValidationResult> {
    return this.core.validateToken(token, remoteIp, featureId);
  }

  /**
   * 批量验证tokens
   */
  public async validateTokens(
    tokens: string[],
    remoteIp?: string,
    featureId?: TurnstileFeatureId
  ): Promise<TurnstileValidationResult[]> {
    return this.core.validateTokens(tokens, remoteIp, featureId);
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    responseTime: number;
  }> {
    return this.core.healthCheck();
  }
}

// 创建并导出单例实例
export const turnstileValidator = TurnstileValidator.getInstance();

/**
 * 便捷的验证函数
 */
export async function validateTurnstileToken(
  token: string,
  remoteIp?: string,
  featureId?: TurnstileFeatureId
): Promise<TurnstileValidationResult> {
  return turnstileValidator.validateToken(token, remoteIp, featureId);
}

/**
 * tRPC中间件辅助函数
 */
export function createTurnstileValidationError(
  result: TurnstileValidationResult
): never {
  throw TRPCErrorHandler.validationError(
    result.errorMessage || '人机验证失败'
  );
}
