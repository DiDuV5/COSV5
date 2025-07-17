/**
 * @fileoverview Turnstile服务端模块统一导出
 * @description 统一导出所有Turnstile服务端功能，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-14
 * @version 1.0.0
 */

// 导出核心功能管理器
export { TurnstileFeatureManager } from './feature-manager';

// 导出子模块（供高级用户使用）
export { TurnstileCacheManager } from './cache-manager';
export { TurnstileDatabaseOperations } from './database-operations';
export { TurnstileFallbackHandler } from './fallback-handler';
export { TurnstileBatchOperations } from './batch-operations';

// 导出类型定义
export type {
  ICacheManager,
  IDatabaseOperations,
  IFallbackHandler,
  IBatchOperations,
  FeatureStatusCacheEntry,
  BatchOperationResult,
  CacheStatus
} from './types';

// 创建并导出单例实例
import { TurnstileFeatureManager } from './feature-manager';
export const turnstileFeatureManager = TurnstileFeatureManager.getInstance();
