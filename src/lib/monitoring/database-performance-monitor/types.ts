/**
 * @fileoverview 数据库性能监控类型定义
 * @description 性能监控系统相关的接口和类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 查询性能指标
 */
export interface QueryMetrics {
  /** 查询ID */
  queryId: string;
  /** 模型名称 */
  model: string;
  /** 操作类型 */
  action: string;
  /** 执行时间（毫秒） */
  duration: number;
  /** 查询参数 */
  params: any;
  /** 执行时间戳 */
  timestamp: Date;
  /** 是否为慢查询 */
  isSlow: boolean;
  /** 查询哈希（用于去重） */
  queryHash: string;
}

/**
 * 性能统计信息
 */
export interface PerformanceStats {
  /** 总查询数 */
  totalQueries: number;
  /** 慢查询数 */
  slowQueries: number;
  /** 平均执行时间 */
  averageDuration: number;
  /** 最长执行时间 */
  maxDuration: number;
  /** 最短执行时间 */
  minDuration: number;
  /** 查询频率（每秒） */
  queriesPerSecond: number;
  /** 错误查询数 */
  errorQueries: number;
}

/**
 * 模型性能统计
 */
export interface ModelStats {
  [modelName: string]: {
    queries: number;
    averageDuration: number;
    slowQueries: number;
    actions: {
      [action: string]: {
        count: number;
        averageDuration: number;
      };
    };
  };
}

/**
 * 频繁查询信息
 */
export interface FrequentQuery {
  queryHash: string;
  model: string;
  action: string;
  count: number;
  averageDuration: number;
  totalDuration: number;
}

/**
 * 时间范围
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * 监控器配置选项
 */
export interface MonitorConfig {
  slowQueryThreshold?: number;
  maxMetricsSize?: number;
  enabled?: boolean;
}
