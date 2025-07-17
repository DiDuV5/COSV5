/**
 * @fileoverview 增强查询优化器类型定义
 * @description 查询优化器相关的所有类型、接口和枚举定义
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @performance-target
 * - 90%查询 <100ms 响应时间
 * - 缓存命中率 >80%
 * - 慢查询检测和优化建议
 */

/**
 * 查询优化配置
 */
export interface QueryOptimizerConfig {
  /** 启用查询缓存 */
  enableQueryCache: boolean;
  /** 默认缓存TTL（秒） */
  defaultCacheTTL: number;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 启用查询分析 */
  enableQueryAnalysis: boolean;
  /** 最大缓存键数量 */
  maxCacheKeys: number;
  /** 启用索引建议 */
  enableIndexSuggestions: boolean;
}

/**
 * 查询性能指标
 */
export interface QueryMetrics {
  /** 查询总数 */
  totalQueries: number;
  /** 缓存命中数 */
  cacheHits: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 平均查询时间 */
  avgQueryTime: number;
  /** 慢查询数量 */
  slowQueryCount: number;
  /** 最慢查询时间 */
  slowestQueryTime: number;
  /** 查询类型分布 */
  queryTypeDistribution: Record<string, number>;
}

/**
 * 慢查询信息
 */
export interface SlowQuery {
  /** 查询SQL */
  sql: string;
  /** 执行时间 */
  duration: number;
  /** 执行时间戳 */
  timestamp: Date;
  /** 查询参数 */
  params?: any;
  /** 优化建议 */
  suggestions: string[];
}

/**
 * 索引建议
 */
export interface IndexSuggestion {
  /** 表名 */
  table: string;
  /** 建议的索引列 */
  columns: string[];
  /** 建议原因 */
  reason: string;
  /** 预期性能提升 */
  expectedImprovement: string;
  /** 建议的SQL */
  suggestedSQL: string;
}

/**
 * 查询执行选项
 */
export interface QueryExecutionOptions {
  /** 缓存TTL */
  ttl?: number;
  /** 缓存标签 */
  tags?: string[];
  /** 跳过缓存 */
  skipCache?: boolean;
}

/**
 * 时间范围类型
 */
export type TimeRange = 'day' | 'week' | 'month';

/**
 * 默认查询优化配置
 */
export const DEFAULT_QUERY_OPTIMIZER_CONFIG: QueryOptimizerConfig = {
  enableQueryCache: true,
  defaultCacheTTL: 300,
  slowQueryThreshold: 100,
  enableQueryAnalysis: true,
  maxCacheKeys: 10000,
  enableIndexSuggestions: true
};
