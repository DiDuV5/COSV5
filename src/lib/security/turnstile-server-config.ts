/**
 * @fileoverview Turnstile服务端配置管理器 - 重构版本
 * @description 重新导出重构后的Turnstile服务端功能，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-14
 * @version 3.0.0
 * @deprecated 此文件已重构，请使用 ./turnstile-server/ 目录下的模块化版本
 */

import { getServerConfig, type TurnstileEnvConfig } from './turnstile-env-config';

// 重新导出重构后的模块
export {
  TurnstileFeatureManager,
  turnstileFeatureManager,
  TurnstileCacheManager,
  TurnstileDatabaseOperations,
  TurnstileFallbackHandler,
  TurnstileBatchOperations
} from './turnstile-server';

// 重新导出类型
export type {
  ICacheManager,
  IDatabaseOperations,
  IFallbackHandler,
  IBatchOperations,
  FeatureStatusCacheEntry,
  BatchOperationResult,
  CacheStatus
} from './turnstile-server';





/**
 * 获取服务端环境配置
 */
export function getServerTurnstileConfig(): TurnstileEnvConfig {
  const envConfig = getServerConfig();

  // 验证必需的配置
  if (envConfig.enabled && !envConfig.secretKey) {
    throw new Error('Turnstile已启用但密钥未配置，请检查COSEREEDEN_TURNSTILE_SECRET_KEY环境变量');
  }

  return envConfig;
}
