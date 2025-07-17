/**
 * @fileoverview Turnstile监控和告警系统
 * @description 提供Turnstile降级状态监控、指标收集和告警功能
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { turnstileFallbackManager, FallbackReason } from './turnstile-fallback-manager';
import type { TurnstileFeatureId } from '@/types/turnstile';

/**
 * 监控指标接口
 */
export interface TurnstileMetrics {
  /** 总验证次数 */
  totalValidations: number;
  /** 成功验证次数 */
  successfulValidations: number;
  /** 失败验证次数 */
  failedValidations: number;
  /** 降级使用次数 */
  fallbackUsages: number;
  /** 平均响应时间 */
  averageResponseTime: number;
  /** 当前降级状态数量 */
  activeFallbacks: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 功能级别指标接口
 */
export interface FeatureMetrics {
  featureId: TurnstileFeatureId;
  validations: number;
  successes: number;
  failures: number;
  fallbacks: number;
  averageResponseTime: number;
  lastValidation: Date;
}

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 告警事件接口
 */
export interface AlertEvent {
  level: AlertLevel;
  title: string;
  message: string;
  featureId?: TurnstileFeatureId;
  reason?: FallbackReason;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Turnstile监控管理器
 */
export class TurnstileMonitor {
  private static instance: TurnstileMonitor;
  private metrics: Map<string, FeatureMetrics> = new Map();
  private globalMetrics: TurnstileMetrics;
  private alertHandlers: Array<(event: AlertEvent) => Promise<void>> = [];

  private constructor() {
    this.globalMetrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      fallbackUsages: 0,
      averageResponseTime: 0,
      activeFallbacks: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): TurnstileMonitor {
    if (!TurnstileMonitor.instance) {
      TurnstileMonitor.instance = new TurnstileMonitor();
    }
    return TurnstileMonitor.instance;
  }

  /**
   * 记录验证事件
   */
  public recordValidation(
    featureId: TurnstileFeatureId,
    success: boolean,
    responseTime: number,
    fallbackUsed: boolean = false
  ): void {
    // 更新功能级别指标
    const key = `feature:${featureId}`;
    const existing = this.metrics.get(key) || {
      featureId,
      validations: 0,
      successes: 0,
      failures: 0,
      fallbacks: 0,
      averageResponseTime: 0,
      lastValidation: new Date()
    };

    existing.validations++;
    if (success) {
      existing.successes++;
    } else {
      existing.failures++;
    }
    if (fallbackUsed) {
      existing.fallbacks++;
    }

    // 更新平均响应时间
    existing.averageResponseTime = (
      (existing.averageResponseTime * (existing.validations - 1) + responseTime) /
      existing.validations
    );
    existing.lastValidation = new Date();

    this.metrics.set(key, existing);

    // 更新全局指标
    this.updateGlobalMetrics(success, responseTime, fallbackUsed);

    // 检查是否需要告警
    this.checkAlerts(featureId, existing);
  }

  /**
   * 更新全局指标
   */
  private updateGlobalMetrics(success: boolean, responseTime: number, fallbackUsed: boolean): void {
    this.globalMetrics.totalValidations++;

    if (success) {
      this.globalMetrics.successfulValidations++;
    } else {
      this.globalMetrics.failedValidations++;
    }

    if (fallbackUsed) {
      this.globalMetrics.fallbackUsages++;
    }

    // 更新平均响应时间
    this.globalMetrics.averageResponseTime = (
      (this.globalMetrics.averageResponseTime * (this.globalMetrics.totalValidations - 1) + responseTime) /
      this.globalMetrics.totalValidations
    );

    // 更新活跃降级数量
    this.globalMetrics.activeFallbacks = turnstileFallbackManager.getAllFallbackStates().size;
    this.globalMetrics.lastUpdated = new Date();
  }

  /**
   * 检查告警条件
   */
  private async checkAlerts(featureId: TurnstileFeatureId, metrics: FeatureMetrics): Promise<void> {
    const successRate = metrics.successes / metrics.validations;
    const fallbackRate = metrics.fallbacks / metrics.validations;

    // 成功率过低告警
    if (successRate < 0.8 && metrics.validations >= 10) {
      await this.sendAlert({
        level: AlertLevel.WARNING,
        title: 'Turnstile验证成功率过低',
        message: `功能 ${featureId} 的验证成功率为 ${(successRate * 100).toFixed(1)}%`,
        featureId,
        timestamp: new Date(),
        metadata: { successRate, totalValidations: metrics.validations }
      });
    }

    // 降级使用率过高告警
    if (fallbackRate > 0.5 && metrics.validations >= 5) {
      await this.sendAlert({
        level: AlertLevel.ERROR,
        title: 'Turnstile降级使用率过高',
        message: `功能 ${featureId} 的降级使用率为 ${(fallbackRate * 100).toFixed(1)}%`,
        featureId,
        timestamp: new Date(),
        metadata: { fallbackRate, totalValidations: metrics.validations }
      });
    }

    // 响应时间过长告警
    if (metrics.averageResponseTime > 5000) {
      await this.sendAlert({
        level: AlertLevel.WARNING,
        title: 'Turnstile响应时间过长',
        message: `功能 ${featureId} 的平均响应时间为 ${metrics.averageResponseTime.toFixed(0)}ms`,
        featureId,
        timestamp: new Date(),
        metadata: { averageResponseTime: metrics.averageResponseTime }
      });
    }
  }

  /**
   * 发送告警
   */
  private async sendAlert(event: AlertEvent): Promise<void> {
    console.warn(`🚨 Turnstile告警 [${event.level.toUpperCase()}]: ${event.title} - ${event.message}`);

    // 执行所有告警处理器
    for (const handler of this.alertHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('告警处理器执行失败:', error);
      }
    }
  }

  /**
   * 添加告警处理器
   */
  public addAlertHandler(handler: (event: AlertEvent) => Promise<void>): void {
    this.alertHandlers.push(handler);
  }

  /**
   * 获取全局指标
   */
  public getGlobalMetrics(): TurnstileMetrics {
    // 更新活跃降级数量
    this.globalMetrics.activeFallbacks = turnstileFallbackManager.getAllFallbackStates().size;
    return { ...this.globalMetrics };
  }

  /**
   * 获取功能指标
   */
  public getFeatureMetrics(featureId: TurnstileFeatureId): FeatureMetrics | null {
    const key = `feature:${featureId}`;
    const metrics = this.metrics.get(key);
    return metrics ? { ...metrics } : null;
  }

  /**
   * 获取所有功能指标
   */
  public getAllFeatureMetrics(): FeatureMetrics[] {
    return Array.from(this.metrics.values()).map(m => ({ ...m }));
  }

  /**
   * 获取健康状态
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      successRate: number;
      fallbackRate: number;
      activeFallbacks: number;
      averageResponseTime: number;
    };
  } {
    const metrics = this.getGlobalMetrics();
    const successRate = metrics.totalValidations > 0 ?
      metrics.successfulValidations / metrics.totalValidations : 1;
    const fallbackRate = metrics.totalValidations > 0 ?
      metrics.fallbackUsages / metrics.totalValidations : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (successRate < 0.5 || fallbackRate > 0.8) {
      status = 'unhealthy';
    } else if (successRate < 0.8 || fallbackRate > 0.3 || metrics.activeFallbacks > 0) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        successRate,
        fallbackRate,
        activeFallbacks: metrics.activeFallbacks,
        averageResponseTime: metrics.averageResponseTime
      }
    };
  }

  /**
   * 重置指标
   */
  public resetMetrics(): void {
    this.metrics.clear();
    this.globalMetrics = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      fallbackUsages: 0,
      averageResponseTime: 0,
      activeFallbacks: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * 生成监控报告
   */
  public generateReport(): {
    summary: TurnstileMetrics;
    features: FeatureMetrics[];
    health: {
      status: 'healthy' | 'degraded' | 'critical';
      issues: string[];
      uptime: number;
      lastCheck: Date;
    };
    fallbackStates: Array<{
      featureId: string;
      reason: string;
      startTime: Date;
      failureCount: number;
    }>;
  } {
    const fallbackStates = Array.from(turnstileFallbackManager.getAllFallbackStates().entries())
      .map(([key, state]) => ({
        featureId: key,
        reason: state.reason,
        startTime: state.startTime,
        failureCount: state.failureCount
      }));

    const healthStatus = this.getHealthStatus();
    return {
      summary: this.getGlobalMetrics(),
      features: this.getAllFeatureMetrics(),
      health: {
        status: healthStatus.status === 'unhealthy' ? 'critical' : healthStatus.status,
        issues: healthStatus.status === 'healthy' ? [] : [
          `成功率: ${(healthStatus.details.successRate * 100).toFixed(1)}%`,
          `降级率: ${(healthStatus.details.fallbackRate * 100).toFixed(1)}%`,
          `活跃降级: ${healthStatus.details.activeFallbacks}`,
          `平均响应时间: ${healthStatus.details.averageResponseTime.toFixed(0)}ms`
        ],
        uptime: Date.now() - this.globalMetrics.lastUpdated.getTime(),
        lastCheck: new Date()
      },
      fallbackStates
    };
  }
}

/**
 * 全局监控实例
 */
export const turnstileMonitor = TurnstileMonitor.getInstance();
