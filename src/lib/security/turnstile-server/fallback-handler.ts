/**
 * @fileoverview Turnstile降级处理器
 * @description 处理Turnstile功能的降级逻辑和错误恢复
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

import type { TurnstileFeatureId } from '@/types/turnstile';
import { getServerConfig } from '../turnstile-env-config';
import {
  turnstileFallbackManager,
  FallbackReason
} from '../turnstile-fallback-manager';
import type { IFallbackHandler } from './types';

/**
 * Turnstile降级处理器实现
 */
export class TurnstileFallbackHandler implements IFallbackHandler {
  /**
   * 获取降级时的功能状态
   */
  getFallbackFeatureStatus(featureId: TurnstileFeatureId): boolean {
    const envConfig = getServerConfig();

    // 如果全局禁用，返回false
    if (!envConfig.enabled) {
      return false;
    }

    // 检查是否启用降级
    const fallbackEnabled = process.env.COSEREEDEN_TURNSTILE_ENABLE_FALLBACK === 'true';
    if (!fallbackEnabled) {
      return false;
    }

    // 在降级模式下，所有功能默认禁用，确保安全
    // 只有在数据库完全不可用时才使用此降级逻辑
    // 管理员需要通过管理界面明确启用功能
    console.warn(`🔄 数据库不可用，使用降级配置: ${featureId} = false (默认禁用)`);

    return false; // 降级状态下默认禁用所有功能，确保安全
  }

  /**
   * 检查是否应该使用降级模式
   */
  shouldUseFallback(): boolean {
    const envConfig = getServerConfig();

    // 如果全局禁用，不需要降级
    if (!envConfig.enabled) {
      return false;
    }

    // 检查环境变量配置
    return process.env.COSEREEDEN_TURNSTILE_ENABLE_FALLBACK === 'true';
  }

  /**
   * 处理数据库错误
   */
  async handleDatabaseError(featureId: TurnstileFeatureId, error: Error): Promise<boolean> {
    try {
      console.error(`数据库操作失败 ${featureId}:`, error);

      // 触发降级管理器
      await turnstileFallbackManager.triggerFallback(
        featureId,
        FallbackReason.DATABASE_ERROR,
        error.message
      );

      // 返回降级状态
      return this.getFallbackFeatureStatus(featureId);
    } catch (fallbackError) {
      console.error(`降级处理失败 ${featureId}:`, fallbackError);
      // 最终降级：返回false确保安全
      return false;
    }
  }

  /**
   * 检查降级配置的有效性
   */
  validateFallbackConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const envConfig = getServerConfig();

      // 检查基础配置
      if (!envConfig.enabled) {
        warnings.push('Turnstile全局禁用，降级配置不会生效');
      }

      // 检查降级开关
      const fallbackEnabled = process.env.COSEREEDEN_TURNSTILE_ENABLE_FALLBACK;
      if (fallbackEnabled === undefined) {
        warnings.push('未设置COSEREEDEN_TURNSTILE_ENABLE_FALLBACK环境变量');
      } else if (fallbackEnabled !== 'true' && fallbackEnabled !== 'false') {
        errors.push('COSEREEDEN_TURNSTILE_ENABLE_FALLBACK必须为true或false');
      }

      // 检查降级管理器配置
      if (!turnstileFallbackManager) {
        errors.push('降级管理器未正确初始化');
      }

    } catch (error) {
      errors.push(`降级配置验证失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取降级状态报告
   */
  getFallbackStatusReport(): {
    enabled: boolean;
    globalTurnstileEnabled: boolean;
    fallbackManagerAvailable: boolean;
    configValidation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  } {
    const envConfig = getServerConfig();

    return {
      enabled: this.shouldUseFallback(),
      globalTurnstileEnabled: envConfig.enabled,
      fallbackManagerAvailable: !!turnstileFallbackManager,
      configValidation: this.validateFallbackConfig()
    };
  }
}
