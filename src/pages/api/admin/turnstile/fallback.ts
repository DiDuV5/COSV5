/**
 * @fileoverview Turnstile降级管理API端点
 * @description 提供管理员控制Turnstile降级状态的API接口
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { turnstileFallbackManager, FallbackReason } from '@/lib/security/turnstile-fallback-manager';
import { turnstileMonitor } from '@/lib/security/turnstile-monitoring';
import { turnstileTelegramAlerts } from '@/lib/security/turnstile-telegram-alerts';
import type { TurnstileFeatureId } from '@/types/turnstile';

/**
 * API响应接口
 */
interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * 降级操作请求接口
 */
interface FallbackActionRequest {
  action: 'trigger' | 'recover' | 'status' | 'test-telegram';
  featureId?: TurnstileFeatureId;
  reason?: FallbackReason;
  errorMessage?: string;
}

/**
 * 处理降级管理请求
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // 验证用户权限
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
        timestamp: new Date().toISOString()
      });
    }

    // 检查管理员权限
    if (session.user.userLevel !== 'SUPER_ADMIN' && session.user.userLevel !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限',
        timestamp: new Date().toISOString()
      });
    }

    // 处理不同的HTTP方法
    switch (req.method) {
      case 'GET':
        return handleGetStatus(req, res);
      case 'POST':
        return handlePostAction(req, res);
      case 'DELETE':
        return handleDeleteFallback(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: '不支持的HTTP方法',
          timestamp: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('降级管理API错误:', error);

    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 处理获取状态请求
 */
async function handleGetStatus(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const { featureId } = req.query;

  if (featureId && typeof featureId === 'string') {
    // 获取特定功能的降级状态
    const state = turnstileFallbackManager.getFallbackState(featureId as TurnstileFeatureId);
    const metrics = turnstileMonitor.getFeatureMetrics(featureId as TurnstileFeatureId);

    res.status(200).json({
      success: true,
      message: '获取功能状态成功',
      data: {
        featureId,
        fallbackState: state,
        metrics
      },
      timestamp: new Date().toISOString()
    });
  } else {
    // 获取所有降级状态
    const allStates = turnstileFallbackManager.getAllFallbackStates();
    const globalMetrics = turnstileMonitor.getGlobalMetrics();
    const health = turnstileMonitor.getHealthStatus();

    res.status(200).json({
      success: true,
      message: '获取全局状态成功',
      data: {
        fallbackStates: Array.from(allStates.entries()).map(([key, state]) => ({
          key,
          ...state
        })),
        globalMetrics,
        health
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 处理操作请求
 */
async function handlePostAction(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const { action, featureId, reason, errorMessage }: FallbackActionRequest = req.body;

  if (!action) {
    return res.status(400).json({
      success: false,
      message: '缺少操作类型',
      timestamp: new Date().toISOString()
    });
  }

  switch (action) {
    case 'trigger':
      if (!featureId || !reason) {
        return res.status(400).json({
          success: false,
          message: '触发降级需要功能ID和原因',
          timestamp: new Date().toISOString()
        });
      }

      await turnstileFallbackManager.triggerFallback(
        featureId,
        reason,
        errorMessage || '管理员手动触发'
      );

      res.status(200).json({
        success: true,
        message: `已触发功能 ${featureId} 的降级`,
        data: { featureId, reason },
        timestamp: new Date().toISOString()
      });
      break;

    case 'recover':
      if (!featureId) {
        return res.status(400).json({
          success: false,
          message: '恢复降级需要功能ID',
          timestamp: new Date().toISOString()
        });
      }

      await turnstileFallbackManager.recoverFromFallback(featureId);

      res.status(200).json({
        success: true,
        message: `已恢复功能 ${featureId} 的正常状态`,
        data: { featureId },
        timestamp: new Date().toISOString()
      });
      break;

    case 'test-telegram':
      const testResult = await turnstileTelegramAlerts.testConnection();

      res.status(200).json({
        success: testResult,
        message: testResult ? 'Telegram连接测试成功' : 'Telegram连接测试失败',
        data: { testResult },
        timestamp: new Date().toISOString()
      });
      break;

    case 'status':
      // 执行健康检查
      const healthResult = await turnstileFallbackManager.performHealthCheck();

      res.status(200).json({
        success: true,
        message: '健康检查完成',
        data: healthResult,
        timestamp: new Date().toISOString()
      });
      break;

    default:
      res.status(400).json({
        success: false,
        message: '不支持的操作类型',
        timestamp: new Date().toISOString()
      });
  }
}

/**
 * 处理删除降级状态请求
 */
async function handleDeleteFallback(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const { featureId } = req.query;

  if (!featureId || typeof featureId !== 'string') {
    return res.status(400).json({
      success: false,
      message: '缺少功能ID',
      timestamp: new Date().toISOString()
    });
  }

  await turnstileFallbackManager.recoverFromFallback(featureId as TurnstileFeatureId);

  res.status(200).json({
    success: true,
    message: `已清除功能 ${featureId} 的降级状态`,
    data: { featureId },
    timestamp: new Date().toISOString()
  });
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
