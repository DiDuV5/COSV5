/**
 * @fileoverview Turnstile验证器核心
 * @description Turnstile验证器的核心逻辑，协调各个子模块
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import { getServerConfig, type TurnstileEnvConfig } from '../turnstile-env-config';
import {
  turnstileFallbackManager,
  SecurityLevel,
  FEATURE_SECURITY_LEVELS
} from '../turnstile-fallback-manager';
import { turnstileMonitor } from '../turnstile-monitoring';
import type {
  TurnstileFeatureId,
  TurnstileVerifyRequest
} from '@/types/turnstile';
import { ValidationNetwork } from './validation-network';
import { ValidationUtils } from './validation-utils';
import { ValidationLogger } from './validation-logger';
import { ValidationErrorHandler } from './validation-error-handler';
import { verificationSessionManager } from './session-manager';
import type {
  TurnstileValidationResult,
  HealthCheckResult,
  IValidationNetwork,
  IValidationUtils,
  IValidationLogger,
  IValidationErrorHandler
} from './types';

/**
 * Turnstile验证器核心类
 */
export class TurnstileValidatorCore {
  private static instance: TurnstileValidatorCore;
  private config: TurnstileEnvConfig | null = null;

  // 子模块
  private network: IValidationNetwork;
  private utils: IValidationUtils;
  private logger: IValidationLogger;
  private errorHandler: IValidationErrorHandler;

  private constructor() {
    // 初始化子模块
    this.network = new ValidationNetwork();
    this.utils = new ValidationUtils();
    this.logger = new ValidationLogger();
    this.errorHandler = new ValidationErrorHandler();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): TurnstileValidatorCore {
    if (!TurnstileValidatorCore.instance) {
      TurnstileValidatorCore.instance = new TurnstileValidatorCore();
    }
    return TurnstileValidatorCore.instance;
  }

  /**
   * 获取配置（延迟加载）
   */
  private getConfig(): TurnstileEnvConfig {
    if (!this.config) {
      this.config = getServerConfig();
    }
    return this.config;
  }

  /**
   * 验证Turnstile token（带会话管理）
   */
  public async validateToken(
    token: string,
    remoteIp?: string,
    featureId?: TurnstileFeatureId,
    userId?: string
  ): Promise<TurnstileValidationResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      const config = this.getConfig();

      // 检查是否启用Turnstile
      if (!config.enabled) {
        console.log('🔓 Turnstile已禁用，跳过验证');
        return {
          success: true,
          timestamp,
          responseTime: Date.now() - startTime
        };
      }

      // 检查是否已有有效的验证会话
      if (featureId && verificationSessionManager.isSessionValid(featureId, userId, remoteIp)) {
        console.log(`✅ 使用现有验证会话: ${featureId}`);
        return {
          success: true,
          timestamp,
          responseTime: Date.now() - startTime,
          message: '使用现有验证会话'
        };
      }

      // 检查token是否已被验证过（防止重复验证）
      if (verificationSessionManager.isTokenVerified(token)) {
        console.log(`🔄 Token已验证过，创建新会话: ${token.substring(0, 10)}...`);
        if (featureId) {
          verificationSessionManager.createSession(featureId, token, userId, remoteIp);
        }
        return {
          success: true,
          timestamp,
          responseTime: Date.now() - startTime,
          message: 'Token已验证，创建新会话'
        };
      }

      // 检查是否应该降级
      if (featureId && turnstileFallbackManager.shouldFallback(featureId)) {
        const fallbackResult = this.handleFallbackMode(featureId, timestamp, startTime);
        if (fallbackResult) {
          return fallbackResult;
        }
      }

      // 验证token格式
      const formatValidation = this.utils.validateTokenFormat(token, startTime, timestamp);
      if (!formatValidation.isValid) {
        return formatValidation.result;
      }

      // 执行验证
      const result = await this.performTokenValidation(
        token.trim(),
        remoteIp,
        config,
        timestamp,
        startTime
      );

      // 如果验证成功，创建验证会话
      if (result.success && featureId) {
        verificationSessionManager.createSession(featureId, token, userId, remoteIp);
        console.log(`🎯 验证成功，创建会话: ${featureId}`);
      }

      // 记录验证日志
      await this.logger.logValidation(result, featureId, remoteIp, token);

      // 记录监控指标
      if (featureId) {
        turnstileMonitor.recordValidation(
          featureId,
          result.success,
          result.responseTime,
          result.fallbackUsed || false
        );
      }

      return result;

    } catch (error) {
      return this.errorHandler.handleValidationError(
        error,
        featureId,
        remoteIp,
        token,
        timestamp,
        startTime
      );
    }
  }

  /**
   * 处理降级模式
   */
  private handleFallbackMode(
    featureId: TurnstileFeatureId,
    timestamp: Date,
    startTime: number
  ): TurnstileValidationResult | null {
    const fallbackState = turnstileFallbackManager.getFallbackState(featureId);
    const securityLevel = FEATURE_SECURITY_LEVELS[featureId] || SecurityLevel.MEDIUM;

    // 根据安全级别决定降级行为
    if (securityLevel === SecurityLevel.CRITICAL) {
      // 关键操作绝不降级
      console.warn(`🔒 关键操作${featureId}不允许降级，强制验证`);
      return null;
    }

    // 记录降级使用
    console.warn(`🔄 使用Turnstile降级模式: ${featureId}, 原因: ${fallbackState?.reason}`);

    return {
      success: true,
      message: `Turnstile验证降级: ${fallbackState?.reason || 'unknown'}`,
      timestamp,
      responseTime: Date.now() - startTime,
      fallbackUsed: true
    };
  }

  /**
   * 执行token验证
   */
  private async performTokenValidation(
    token: string,
    remoteIp: string | undefined,
    config: TurnstileEnvConfig,
    timestamp: Date,
    startTime: number
  ): Promise<TurnstileValidationResult> {
    // 构建验证请求
    const verifyRequest: TurnstileVerifyRequest = {
      secret: config.secretKey,
      response: token,
      ...(remoteIp && { remoteip: remoteIp })
    };

    // 发送验证请求
    const verifyResponse = await this.network.sendVerifyRequest(verifyRequest);
    const responseTime = Date.now() - startTime;

    // 处理验证结果
    return this.utils.processVerifyResponse(verifyResponse, timestamp, responseTime);
  }

  /**
   * 批量验证tokens
   */
  public async validateTokens(
    tokens: string[],
    remoteIp?: string,
    featureId?: TurnstileFeatureId
  ): Promise<TurnstileValidationResult[]> {
    const results: TurnstileValidationResult[] = [];

    for (const token of tokens) {
      const result = await this.validateToken(token, remoteIp, featureId);
      results.push(result);

      // 如果有验证失败，可以选择立即停止或继续
      if (!result.success) {
        console.warn(`批量验证中发现失败token: ${result.errorMessage}`);
      }
    }

    // 记录批量验证统计
    await this.logger.logBatchValidationStats(results, featureId);

    return results;
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 使用测试token进行健康检查
      const testToken = 'test-token-for-health-check';
      const result = await this.validateToken(testToken);

      const responseTime = Date.now() - startTime;

      // 对于健康检查，我们期望得到一个明确的响应（即使是失败的）
      if (result.errorCode === 'invalid-input-response') {
        return {
          status: 'healthy',
          message: 'Turnstile服务正常',
          responseTime
        };
      }

      return {
        status: 'unhealthy',
        message: `意外的响应: ${result.errorMessage}`,
        responseTime
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: `健康检查失败: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 获取验证统计信息
   */
  public getValidationStats(results: TurnstileValidationResult[]): {
    total: number;
    successful: number;
    failed: number;
    avgResponseTime: number;
    errorBreakdown: Record<string, number>;
  } {
    return this.logger.getValidationSummary(results);
  }

  /**
   * 重置配置缓存
   */
  public resetConfig(): void {
    this.config = null;
  }
}
