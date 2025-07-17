/**
 * @fileoverview Turnstile验证网络通信
 * @description 处理与Cloudflare Turnstile API的网络通信
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import { getServerConfig } from '../turnstile-env-config';
import type {
  TurnstileVerifyRequest,
  TurnstileVerifyResponse
} from '@/types/turnstile';
import type { IValidationNetwork, HealthCheckResult } from './types';

/**
 * Turnstile验证网络通信实现
 */
export class ValidationNetwork implements IValidationNetwork {
  /**
   * 发送验证请求到Cloudflare
   */
  async sendVerifyRequest(request: TurnstileVerifyRequest): Promise<TurnstileVerifyResponse> {
    const formData = new URLSearchParams();
    formData.append('secret', request.secret);
    formData.append('response', request.response);

    if (request.remoteip) {
      formData.append('remoteip', request.remoteip);
    }

    const config = getServerConfig();

    // 使用降级配置的超时时间
    const fallbackTimeout = parseInt(process.env.COSEREEDEN_TURNSTILE_FALLBACK_TIMEOUT || '10000');

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fallbackTimeout);

    try {
      const response = await fetch(config.verifyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as TurnstileVerifyResponse;
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 使用测试token进行健康检查
      const testRequest: TurnstileVerifyRequest = {
        secret: getServerConfig().secretKey,
        response: 'test-token-for-health-check'
      };

      await this.sendVerifyRequest(testRequest);

      const responseTime = Date.now() - startTime;

      // 对于健康检查，我们期望得到一个明确的响应（即使是失败的）
      return {
        status: 'healthy',
        message: 'Turnstile服务正常',
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
   * 测试网络连接
   */
  async testConnection(): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const config = getServerConfig();
      
      // 简单的连接测试
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(config.verifyEndpoint, {
        method: 'HEAD',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        success: response.ok,
        responseTime: Date.now() - startTime,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };

    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
