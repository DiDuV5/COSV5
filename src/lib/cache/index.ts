/**
 * @fileoverview Redis缓存管理器统一导出
 * @description 提供向后兼容的API导出，保持原有导入路径有效
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0
 */

// 导出新的模块化组件
export { CacheConfigManager, DEFAULT_CACHE_CONFIG, createInitialStats } from './config';
export { CoreCacheOperations } from './core-operations';
export { AdvancedCacheOperations } from './advanced-operations';
export { CacheStatsMonitoring } from './stats-monitoring';
export { CacheOptimization } from './optimization';

// 导出主要的缓存管理器类和实例
export { RedisCacheManager, redisCacheManager } from './redis-cache-manager-new';

// 导出所有类型定义
export type {
  CacheConfig,
  CacheItem,
  CacheStats,
  WarmupConfig,
  BatchSetItem,
  CacheOperationResult,
  ICacheManager
} from './types';

// 为了向后兼容，重新导出原有的导入路径
// 这样现有的 import { redisCacheManager } from '@/lib/cache/redis-cache-manager' 仍然有效
export { redisCacheManager as default } from './redis-cache-manager-new';
