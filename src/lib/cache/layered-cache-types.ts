/**
 * @fileoverview 分层缓存类型定义
 * @description 分层缓存系统相关的所有类型、接口和枚举定义
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @performance-target
 * - L1 Cache: <1ms 响应时间
 * - L2 Cache: <10ms 响应时间
 * - L3 Cache: <100ms 响应时间
 * - 总体命中率: >85%
 */

/**
 * 缓存层级定义
 */
export enum CacheLevel {
  L1_MEMORY = 'L1_MEMORY',
  L2_REDIS = 'L2_REDIS',
  L3_DATABASE = 'L3_DATABASE'
}

/**
 * 缓存策略配置
 */
export interface LayeredCacheConfig {
  /** L1内存缓存配置 */
  l1Config: {
    maxSize: number;
    ttl: number; // 毫秒
    updateAgeOnGet: boolean;
  };
  /** L2 Redis缓存配置 */
  l2Config: {
    defaultTTL: number; // 秒
    enableCompression: boolean;
    keyPrefix: string;
  };
  /** 缓存预热配置 */
  warmupConfig: {
    enabled: boolean;
    batchSize: number;
    concurrency: number;
  };
  /** 性能监控配置 */
  monitoring: {
    enabled: boolean;
    metricsInterval: number; // 毫秒
  };
  /** 日志输出配置 */
  logging?: {
    compactMode: boolean;
    minOutputInterval: number;
    onlyLogWhenActive: boolean;
    hitRateChangeThreshold: number;
    enableDebugLogs: boolean;
    showZeroStats: boolean;
  };
}

/**
 * 缓存统计信息
 */
export interface LayeredCacheStats {
  l1Stats: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
    size?: number;
    maxSize?: number;
  };
  l2Stats: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
    memoryUsage?: number;
    keyCount?: number;
  };
  l3Stats: {
    hits: number;
    misses: number;
    hitRate: number;
    avgResponseTime: number;
    slowQueries?: number;
    totalQueries?: number;
  };
  overall: {
    totalRequests: number;
    totalHits: number;
    overallHitRate: number;
    avgResponseTime: number;
  };
}

/**
 * 缓存项接口
 */
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  level: CacheLevel;
}

/**
 * 缓存操作结果
 */
export interface CacheOperationResult<T> {
  success: boolean;
  data?: T;
  level?: CacheLevel;
  responseTime: number;
  error?: string;
}

/**
 * 缓存预热选项
 */
export interface WarmupOptions {
  keys: string[];
  dataLoader: (key: string) => Promise<any>;
  batchSize?: number;
  concurrency?: number;
}

/**
 * 缓存清理选项
 */
export interface ClearOptions {
  level?: CacheLevel | CacheLevel[];
  pattern?: string;
  force?: boolean;
}
