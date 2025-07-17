/**
 * @fileoverview Redis缓存管理器类型定义
 * @description 缓存相关的接口和类型定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
  maxRetries: number;
  retryDelayOnFailover: number;
  lazyConnect?: boolean;
  enableOfflineQueue?: boolean;
  connectTimeout?: number;
  commandTimeout?: number;
  // 新增配置项
  enableDynamicTTL: boolean;
  enableCacheWarmup: boolean;
  enablePenetrationProtection: boolean;
  hitRateThreshold: number;
  warmupBatchSize: number;
  penetrationCacheTTL: number;
}

/**
 * 缓存项接口
 */
export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  // 新增统计项
  penetrationPrevented: number;
  warmupExecuted: number;
  dynamicTTLAdjustments: number;
  lastOptimization: Date | null;
  // 连接状态
  isConnected?: boolean;
  redisStatus?: string;
  internalConnected?: boolean;
  redisConnected?: boolean;
}

/**
 * 缓存预热配置接口
 */
export interface WarmupConfig {
  keys: string[];
  dataLoader: (key: string) => Promise<any>;
  ttl?: number;
  batchSize?: number;
}

/**
 * 批量设置项接口
 */
export interface BatchSetItem {
  key: string;
  value: any;
  ttl?: number;
}

/**
 * 缓存操作结果接口
 */
export interface CacheOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * 缓存管理器接口
 */
export interface ICacheManager {
  // 基础操作
  initialize(): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<boolean>;
  
  // 批量操作
  mget<T>(keys: string[]): Promise<Array<T | null>>;
  mset(items: BatchSetItem[]): Promise<boolean>;
  
  // 高级操作
  deletePattern(pattern: string): Promise<number>;
  clearByTag(tag: string): Promise<number>;
  
  // 统计和监控
  getStats(): CacheStats;
  resetStats(): void;
  
  // 连接管理
  disconnect(): Promise<void>;
  isRedisConnected(): boolean;
  
  // 优化功能
  warmupCache(config: WarmupConfig): Promise<void>;
  autoOptimize(): Promise<void>;
  flush(): Promise<boolean>;
}
