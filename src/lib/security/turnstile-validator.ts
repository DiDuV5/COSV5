/**
 * @fileoverview Cloudflare Turnstile 验证器 - 重构版本
 * @description 重新导出重构后的Turnstile验证器功能，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-14
 * @version 3.0.0
 * @deprecated 此文件已重构，请使用 ./turnstile-validator/ 目录下的模块化版本
 */

// 重新导出重构后的模块
export {
  TurnstileValidator,
  TurnstileValidatorCore,
  turnstileValidator,
  validateTurnstileToken,
  createTurnstileValidationError,
  ValidationNetwork,
  ValidationUtils,
  ValidationLogger,
  ValidationErrorHandler
} from './turnstile-validator/index';

// 重新导出类型
export type {
  TurnstileValidationResult,
  HealthCheckResult,
  ValidationLogData,
  IValidationNetwork,
  IValidationErrorHandler,
  IValidationLogger,
  IValidationUtils,
  TokenFormatValidation
} from './turnstile-validator/index';
