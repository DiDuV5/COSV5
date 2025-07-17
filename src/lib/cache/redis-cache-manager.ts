/**
 * @fileoverview Redis缓存管理器 - 向后兼容导出
 * @description 重构后的Redis缓存管理器，保持原有API兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0
 * @since 1.0.0
 *
 * @example
 * import { redisCacheManager } from './redis-cache-manager'
 * await redisCacheManager.set('user:123', userData, 3600)
 * const user = await redisCacheManager.get('user:123')
 *
 * @dependencies
 * - ioredis: ^5.3.2
 * - TypeScript 5.0+
 *
 * @changelog
 * - 2025-07-06: 重构为模块化架构，保持向后兼容
 * - 2025-06-16: 初始版本创建，支持分层缓存和批量操作
 */

// 重新导出新的模块化实现，保持完全向后兼容
export {
  RedisCacheManager,
  redisCacheManager
} from './redis-cache-manager-new';

// 重新导出类型定义
export type {
  CacheConfig,
  CacheStats,
  WarmupConfig,
  BatchSetItem,
  ICacheManager
} from './types';

export type { CacheItem } from './types';

// 向后兼容：重新导出默认实例，保持原有导入路径有效
export { redisCacheManager as default } from './redis-cache-manager-new';
