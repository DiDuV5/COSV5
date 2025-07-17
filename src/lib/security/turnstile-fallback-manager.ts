/**
 * @fileoverview Turnstile降级管理器
 * @description 管理Turnstile验证的降级策略和健康检查
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { auditLogger, AuditEventType } from '@/lib/audit-logger';
import type { TurnstileFeatureId } from '@/types/turnstile';

/**
 * 降级模式枚举
 */
export enum FallbackMode {
  SKIP = 'skip',        // 跳过验证，记录日志
  WARN = 'warn',        // 警告但允许继续
  BLOCK = 'block',      // 阻塞请求
  ADAPTIVE = 'adaptive' // 自适应模式
}

/**
 * 安全级别枚举
 */
export enum SecurityLevel {
  LOW = 'low',          // 普通操作，可以跳过验证
  MEDIUM = 'medium',    // 重要操作，警告但允许
  HIGH = 'high',        // 敏感操作，必须验证或阻塞
  CRITICAL = 'critical' // 关键操作，绝不降级
}

/**
 * 降级原因枚举
 */
export enum FallbackReason {
  API_TIMEOUT = 'api_timeout',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CONFIGURATION_ERROR = 'configuration_error'
}

/**
 * 降级状态接口
 */
export interface FallbackState {
  isActive: boolean;
  reason: FallbackReason;
  startTime: Date;
  failureCount: number;
  lastHealthCheck: Date;
  mode: FallbackMode;
  featureId?: TurnstileFeatureId;
  errorMessage?: string;
}

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

/**
 * 降级配置接口
 */
export interface FallbackConfig {
  enabled: boolean;
  mode: FallbackMode;
  timeout: number;
  maxFailures: number;
  recoveryInterval: number;
  healthCheckInterval: number;
  enableTelegramAlerts: boolean;
}

/**
 * 功能安全级别映射
 * 注意：这些安全级别仅影响降级行为，不影响功能的启用/禁用状态
 * 功能的启用/禁用完全由数据库中的turnstileConfig表控制
 */
export const FEATURE_SECURITY_LEVELS: Record<TurnstileFeatureId, SecurityLevel> = {
  USER_LOGIN: SecurityLevel.MEDIUM,
  USER_REGISTER: SecurityLevel.MEDIUM,
  PASSWORD_RESET: SecurityLevel.HIGH,
  GUEST_COMMENT: SecurityLevel.LOW,
  ADMIN_OPERATIONS: SecurityLevel.CRITICAL,
  CONTENT_PUBLISH: SecurityLevel.MEDIUM,
  FILE_UPLOAD: SecurityLevel.MEDIUM,
  PAYMENT_PROCESS: SecurityLevel.CRITICAL
};

/**
 * Turnstile降级管理器
 */
export class TurnstileFallbackManager {
  private static instance: TurnstileFallbackManager;
  private fallbackStates: Map<string, FallbackState> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private config: FallbackConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.startHealthCheckTimer();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): TurnstileFallbackManager {
    if (!TurnstileFallbackManager.instance) {
      TurnstileFallbackManager.instance = new TurnstileFallbackManager();
    }
    return TurnstileFallbackManager.instance;
  }

  /**
   * 加载降级配置
   */
  private loadConfig(): FallbackConfig {
    return {
      enabled: process.env.COSEREEDEN_TURNSTILE_ENABLE_FALLBACK === 'true',
      mode: (process.env.COSEREEDEN_TURNSTILE_FALLBACK_MODE as FallbackMode) || FallbackMode.SKIP,
      timeout: parseInt(process.env.COSEREEDEN_TURNSTILE_FALLBACK_TIMEOUT || '10000'),
      maxFailures: parseInt(process.env.COSEREEDEN_TURNSTILE_FALLBACK_MAX_FAILURES || '3'),
      recoveryInterval: parseInt(process.env.COSEREEDEN_TURNSTILE_FALLBACK_RECOVERY_INTERVAL || '60000'),
      healthCheckInterval: parseInt(process.env.COSEREEDEN_TURNSTILE_FALLBACK_HEALTH_CHECK_INTERVAL || '30000'),
      enableTelegramAlerts: process.env.COSEREEDEN_TURNSTILE_FALLBACK_TELEGRAM_ALERTS === 'true'
    };
  }

  /**
   * 检查是否应该降级
   */
  public shouldFallback(featureId: TurnstileFeatureId): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const key = this.getStateKey(featureId);
    const state = this.fallbackStates.get(key);

    if (!state || !state.isActive) {
      return false;
    }

    // 检查安全级别
    const securityLevel = FEATURE_SECURITY_LEVELS[featureId] || SecurityLevel.MEDIUM;

    // CRITICAL级别的功能绝不降级
    if (securityLevel === SecurityLevel.CRITICAL) {
      return false;
    }

    return true;
  }

  /**
   * 触发降级
   */
  public async triggerFallback(
    featureId: TurnstileFeatureId,
    reason: FallbackReason,
    errorMessage?: string
  ): Promise<void> {
    const key = this.getStateKey(featureId);
    const existingState = this.fallbackStates.get(key);

    const state: FallbackState = {
      isActive: true,
      reason,
      startTime: existingState?.startTime || new Date(),
      failureCount: (existingState?.failureCount || 0) + 1,
      lastHealthCheck: new Date(),
      mode: this.config.mode,
      featureId,
      errorMessage
    };

    this.fallbackStates.set(key, state);

    // 记录审计日志
    await this.logFallbackEvent(featureId, reason, errorMessage);

    // 发送告警
    if (this.config.enableTelegramAlerts) {
      await this.sendTelegramAlert(featureId, reason, errorMessage);
    }

    console.warn(`🔄 Turnstile降级已激活: ${featureId}, 原因: ${reason}, 失败次数: ${state.failureCount}`);
  }

  /**
   * 恢复正常状态
   */
  public async recoverFromFallback(featureId: TurnstileFeatureId): Promise<void> {
    const key = this.getStateKey(featureId);
    const state = this.fallbackStates.get(key);

    if (state && state.isActive) {
      this.fallbackStates.delete(key);

      // 记录恢复日志
      await this.logRecoveryEvent(featureId);

      console.log(`✅ Turnstile已从降级状态恢复: ${featureId}`);
    }
  }

  /**
   * 获取降级状态
   */
  public getFallbackState(featureId: TurnstileFeatureId): FallbackState | null {
    const key = this.getStateKey(featureId);
    return this.fallbackStates.get(key) || null;
  }

  /**
   * 获取所有降级状态
   */
  public getAllFallbackStates(): Map<string, FallbackState> {
    return new Map(this.fallbackStates);
  }

  /**
   * 执行健康检查
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 简单的健康检查：尝试验证一个测试token
      // 创建超时控制器
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: 'test',
          response: 'test'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      return {
        isHealthy: response.status < 500, // 4xx是预期的，5xx才是服务问题
        responseTime,
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheckTimer(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkAndRecover();
    }, this.config.healthCheckInterval);
  }

  /**
   * 检查并恢复服务
   */
  private async checkAndRecover(): Promise<void> {
    if (this.fallbackStates.size === 0) {
      return;
    }

    const healthResult = await this.performHealthCheck();

    if (healthResult.isHealthy) {
      // 服务恢复，尝试恢复所有降级状态
      const featuresToRecover: TurnstileFeatureId[] = [];

      for (const [key, state] of this.fallbackStates) {
        if (state.featureId) {
          featuresToRecover.push(state.featureId);
        }
      }

      for (const featureId of featuresToRecover) {
        await this.recoverFromFallback(featureId);
      }
    }
  }

  /**
   * 获取状态键
   */
  private getStateKey(featureId: TurnstileFeatureId): string {
    return `fallback:${featureId}`;
  }

  /**
   * 记录降级事件
   */
  private async logFallbackEvent(
    featureId: TurnstileFeatureId,
    reason: FallbackReason,
    errorMessage?: string
  ): Promise<void> {
    try {
      await auditLogger.logSecurityViolation(
        AuditEventType.SECURITY_VIOLATION,
        `Turnstile降级激活: ${featureId}`,
        {
          url: `/${featureId}`,
          headers: new Map([
            ['x-fallback-reason', reason],
            ['x-error-message', errorMessage || '']
          ])
        } as any
      );
    } catch (error) {
      console.error('记录降级事件失败:', error);
    }
  }

  /**
   * 记录恢复事件
   */
  private async logRecoveryEvent(featureId: TurnstileFeatureId): Promise<void> {
    try {
      await auditLogger.logSecurityViolation(
        AuditEventType.SECURITY_VIOLATION,
        `Turnstile从降级状态恢复: ${featureId}`,
        {
          url: `/${featureId}`,
          headers: new Map([['x-recovery-event', 'true']])
        } as any
      );
    } catch (error) {
      console.error('记录恢复事件失败:', error);
    }
  }

  /**
   * 发送Telegram告警
   */
  private async sendTelegramAlert(
    featureId: TurnstileFeatureId,
    reason: FallbackReason,
    errorMessage?: string
  ): Promise<void> {
    try {
      // TODO: 集成Telegram Bot告警
      console.log(`📱 Telegram告警: Turnstile降级 - ${featureId}, 原因: ${reason}`);
    } catch (error) {
      console.error('发送Telegram告警失败:', error);
    }
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    this.fallbackStates.clear();
  }
}

/**
 * 全局降级管理器实例
 */
export const turnstileFallbackManager = TurnstileFallbackManager.getInstance();
