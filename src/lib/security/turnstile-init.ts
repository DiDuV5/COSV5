/**
 * @fileoverview Turnstile系统初始化脚本
 * @description 初始化Turnstile系统，设置默认配置
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

import { validateClientTurnstileConfig } from './turnstile-config';
import { turnstileFeatureManager } from './turnstile-server-config';

/**
 * 初始化Turnstile系统
 */
export async function initTurnstile(): Promise<void> {
  try {
    console.log('🔄 开始初始化Turnstile系统...');

    // 验证配置
    const validation = validateClientTurnstileConfig();

    if (!validation.isValid) {
      console.error('❌ Turnstile配置验证失败:', validation.errors);
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Turnstile配置警告:', validation.warnings);
      }
      throw new Error(`Turnstile配置错误: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Turnstile配置警告:', validation.warnings);
    }

    // 初始化系统
    await turnstileFeatureManager.initialize();

    console.log('✅ Turnstile系统初始化完成');
    console.log('📋 功能状态:');
    console.log('  - 用户注册: 启用 (P0)');
    console.log('  - 用户登录: 启用 (P0)');
    console.log('  - 密码重置: 启用 (P0)');
    console.log('  - 游客评论: 禁用 (P2) - 可在管理后台启用');

  } catch (error) {
    console.error('❌ Turnstile系统初始化失败:', error);
    throw error;
  }
}

/**
 * 检查Turnstile系统状态
 */
export async function checkTurnstileStatus(): Promise<{
  isConfigured: boolean;
  isEnabled: boolean;
  errors: string[];
  warnings: string[];
}> {
  try {
    const validation = validateClientTurnstileConfig();

    return {
      isConfigured: validation.isValid,
      isEnabled: process.env.COSEREEDEN_TURNSTILE_ENABLED !== 'false',
      errors: validation.errors,
      warnings: validation.warnings,
    };
  } catch (error) {
    return {
      isConfigured: false,
      isEnabled: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings: [],
    };
  }
}

/**
 * 注意：Turnstile初始化现在由统一的应用初始化器管理
 * 请使用 @/lib/app-initializer 或 @/lib/startup-initializer
 * 不再需要在此文件中自动初始化
 */
