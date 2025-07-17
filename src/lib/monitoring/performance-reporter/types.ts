/**
 * @fileoverview 性能报告类型定义
 * @description 性能报告系统相关的接口和类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { PerformanceStats, ModelStats } from '../database-performance-monitor';

/**
 * 性能报告配置
 */
export interface ReportConfig {
  /** 报告时间范围（小时） */
  timeRangeHours: number;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 包含详细信息 */
  includeDetails: boolean;
  /** 最大慢查询数量 */
  maxSlowQueries: number;
  /** 最大频繁查询数量 */
  maxFrequentQueries: number;
}

/**
 * 性能报告
 */
export interface PerformanceReport {
  /** 报告生成时间 */
  generatedAt: Date;
  /** 报告时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** 总体统计 */
  overview: PerformanceStats;
  /** 模型统计 */
  modelStats: ModelStats;
  /** 慢查询列表 */
  slowQueries: any[];
  /** 频繁查询列表 */
  frequentQueries: any[];
  /** 性能建议 */
  recommendations: string[];
  /** 告警信息 */
  alerts: PerformanceAlert[];
}

/**
 * 性能告警
 */
export interface PerformanceAlert {
  /** 告警级别 */
  level: 'info' | 'warning' | 'error' | 'critical';
  /** 告警类型 */
  type: 'slow_query' | 'high_frequency' | 'poor_performance' | 'connection_issue';
  /** 告警消息 */
  message: string;
  /** 相关数据 */
  data?: any;
  /** 建议操作 */
  suggestion?: string;
}

/**
 * 实时性能指标
 */
export interface RealTimeMetrics {
  currentQPS: number;
  recentSlowQueries: number;
  averageResponseTime: number;
  activeConnections: number;
  cacheHitRate: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  redisConnected: boolean;
  databaseConnected: boolean;
  cacheStats?: CacheStats;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  isConnected: boolean;
  penetrationPrevented: number;
  warmupExecuted: number;
  lastOptimization: string | null;
}
