/**
 * @fileoverview Turnstile验证器类型定义
 * @description 定义Turnstile验证器模块的共享类型和接口
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import type {
  TurnstileErrorCode,
  TurnstileFeatureId,
  TurnstileVerifyRequest,
  TurnstileVerifyResponse
} from '@/types/turnstile';

/**
 * Turnstile验证结果接口
 */
export interface TurnstileValidationResult {
  /** 验证是否成功 */
  success: boolean;
  /** 错误信息 */
  errorMessage?: string;
  /** 错误代码 */
  errorCode?: TurnstileErrorCode;
  /** 验证时间戳 */
  timestamp: Date;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 主机名 */
  hostname?: string;
  /** 挑战时间戳 */
  challengeTs?: string;
  /** 成功消息 */
  message?: string;
  /** 是否使用了降级模式 */
  fallbackUsed?: boolean;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message: string;
  responseTime: number;
}

/**
 * 验证日志数据
 */
export interface ValidationLogData {
  featureId: string;
  success: boolean;
  responseTime: number;
  errorCode?: TurnstileErrorCode;
  remoteIp: string;
  timestamp: Date;
}

/**
 * 网络通信接口
 */
export interface IValidationNetwork {
  sendVerifyRequest(request: TurnstileVerifyRequest): Promise<TurnstileVerifyResponse>;
  healthCheck(): Promise<HealthCheckResult>;
}

/**
 * 错误处理接口
 */
export interface IValidationErrorHandler {
  handleValidationError(
    error: unknown,
    featureId?: TurnstileFeatureId,
    remoteIp?: string,
    token?: string,
    timestamp?: Date,
    startTime?: number
  ): Promise<TurnstileValidationResult>;
  createErrorResult(
    errorCode: TurnstileErrorCode,
    startTime: number,
    timestamp: Date,
    responseTime?: number
  ): TurnstileValidationResult;
}

/**
 * 日志记录接口
 */
export interface IValidationLogger {
  logValidation(
    result: TurnstileValidationResult,
    featureId?: TurnstileFeatureId,
    remoteIp?: string,
    token?: string
  ): Promise<void>;
  logValidationError(
    error: unknown,
    featureId?: TurnstileFeatureId,
    remoteIp?: string,
    token?: string
  ): Promise<void>;
  logBatchValidationStats(
    results: TurnstileValidationResult[],
    featureId?: TurnstileFeatureId
  ): Promise<void>;
  getValidationSummary(results: TurnstileValidationResult[]): {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
    errorBreakdown: Record<string, number>;
  };
}

/**
 * 验证工具接口
 */
export interface IValidationUtils {
  validateTokenFormat(
    token: string,
    startTime: number,
    timestamp: Date
  ): { isValid: boolean; result: TurnstileValidationResult };
  processVerifyResponse(
    response: TurnstileVerifyResponse,
    timestamp: Date,
    responseTime: number
  ): TurnstileValidationResult;
}

/**
 * Token格式验证结果
 */
export interface TokenFormatValidation {
  isValid: boolean;
  result: TurnstileValidationResult;
}
