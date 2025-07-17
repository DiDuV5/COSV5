/**
 * @fileoverview Turnstile健康检查API端点
 * @description 提供Turnstile系统健康状态和监控指标的API接口
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { turnstileMonitor } from '@/lib/security/turnstile-monitoring';
import { turnstileFallbackManager } from '@/lib/security/turnstile-fallback-manager';
import { turnstileTelegramAlerts } from '@/lib/security/turnstile-telegram-alerts';
import { turnstileFeatureManager } from '@/lib/security/turnstile-server-config';
import { isAppInitialized, getCacheSystemStatus } from '@/lib/app-initializer';

/**
 * 健康检查响应接口
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  initialization: {
    appInitialized: boolean;
    turnstileInitialized: boolean;
    initializationStatus: string;
  };
  turnstile: {
    enabled: boolean;
    fallbackEnabled: boolean;
    health: ReturnType<typeof turnstileMonitor.getHealthStatus>;
    metrics: ReturnType<typeof turnstileMonitor.getGlobalMetrics>;
    activeFallbacks: number;
    telegramAlertsEnabled: boolean;
    featureStates?: Record<string, boolean>;
    batchOperations?: {
      lastEnableAll?: string;
      lastDisableAll?: string;
      totalOperations: number;
    };
  };
  details?: any;
}

/**
 * 错误响应接口
 */
interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

/**
 * 处理健康检查请求
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse | ErrorResponse>
) {
  try {
    // 只允许GET请求
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: '只支持GET请求',
        timestamp: new Date().toISOString()
      });
    }

    // 检查是否需要详细信息
    const includeDetails = req.query.details === 'true';
    const includeMetrics = req.query.metrics === 'true';

    // 获取初始化状态
    const appInitialized = isAppInitialized();
    const turnstileInitialized = turnstileFeatureManager.isInitialized();

    // 简化初始化状态检查
    let initializationStatus = 'not_started';
    if (appInitialized && turnstileInitialized) {
      initializationStatus = 'completed';
    } else if (turnstileInitialized) {
      initializationStatus = 'partial';
    }

    // 获取基本配置信息
    const turnstileEnabled = process.env.COSEREEDEN_TURNSTILE_ENABLED === 'true';
    const fallbackEnabled = process.env.COSEREEDEN_TURNSTILE_ENABLE_FALLBACK === 'true';
    const telegramAlertsEnabled = process.env.COSEREEDEN_TURNSTILE_FALLBACK_TELEGRAM_ALERTS === 'true';

    // 获取健康状态和指标
    const health = turnstileMonitor.getHealthStatus();
    const metrics = turnstileMonitor.getGlobalMetrics();
    const activeFallbacks = turnstileFallbackManager.getAllFallbackStates().size;

    // 获取功能状态（可选，避免在健康检查中执行耗时操作）
    let featureStates: Record<string, boolean> | undefined;
    try {
      if (turnstileInitialized) {
        featureStates = await turnstileFeatureManager.getAllFeatureStates();
      }
    } catch (error) {
      console.warn('获取功能状态失败:', error);
    }

    // 构建响应
    const response: HealthCheckResponse = {
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      initialization: {
        appInitialized,
        turnstileInitialized,
        initializationStatus
      },
      turnstile: {
        enabled: turnstileEnabled,
        fallbackEnabled,
        health,
        metrics,
        activeFallbacks,
        telegramAlertsEnabled,
        featureStates,
        batchOperations: {
          totalOperations: metrics.totalValidations // 使用现有指标作为操作计数
        }
      }
    };

    // 添加详细信息（如果请求）
    if (includeDetails) {
      const fallbackStates = Array.from(turnstileFallbackManager.getAllFallbackStates().entries())
        .map(([key, state]) => ({
          key,
          featureId: state.featureId,
          reason: state.reason,
          startTime: state.startTime,
          failureCount: state.failureCount,
          mode: state.mode
        }));

      response.details = {
        fallbackStates,
        config: {
          timeout: process.env.COSEREEDEN_TURNSTILE_FALLBACK_TIMEOUT,
          maxFailures: process.env.COSEREEDEN_TURNSTILE_FALLBACK_MAX_FAILURES,
          recoveryInterval: process.env.COSEREEDEN_TURNSTILE_FALLBACK_RECOVERY_INTERVAL,
          healthCheckInterval: process.env.COSEREEDEN_TURNSTILE_FALLBACK_HEALTH_CHECK_INTERVAL,
          mode: process.env.COSEREEDEN_TURNSTILE_FALLBACK_MODE
        }
      };
    }

    // 添加功能级别指标（如果请求）
    if (includeMetrics) {
      const featureMetrics = turnstileMonitor.getAllFeatureMetrics();
      response.details = {
        ...response.details,
        featureMetrics
      };
    }

    // 设置适当的HTTP状态码
    let statusCode = 200;
    if (health.status === 'degraded') {
      statusCode = 200; // 降级状态仍然返回200，但在响应中标明
    } else if (health.status === 'unhealthy') {
      statusCode = 503; // 服务不可用
    }

    // 设置缓存头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(statusCode).json(response);

  } catch (error) {
    console.error('健康检查API错误:', error);

    return res.status(500).json({
      error: 'Internal Server Error',
      message: '健康检查失败',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * API路由配置
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
