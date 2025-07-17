/**
 * @fileoverview 性能报告常量和配置
 * @description 性能报告系统使用的常量定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { ReportConfig } from './types';

/**
 * 默认报告配置
 */
export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  timeRangeHours: 24,
  slowQueryThreshold: process.env.NODE_ENV === 'development' ? 2000 : 1000, // 开发环境2秒
  includeDetails: true,
  maxSlowQueries: 50,
  maxFrequentQueries: 20,
};

/**
 * 告警阈值常量
 */
export const ALERT_THRESHOLDS = {
  CRITICAL_SLOW_QUERY: 5000, // 5秒
  HIGH_SLOW_QUERY_RATIO: 20, // 20%
  WARNING_SLOW_QUERY_RATIO: 10, // 10%
  HIGH_QUERY_FREQUENCY: 200, // 200/秒
  WARNING_QUERY_FREQUENCY: 100, // 100/秒
  LONG_AVERAGE_DURATION: 1000, // 1秒
  WARNING_AVERAGE_DURATION: 500, // 500ms
} as const;

/**
 * 告警表情符号映射
 */
export const ALERT_EMOJIS = {
  critical: '🔴',
  error: '🟠',
  warning: '🟡',
  info: '🔵',
  default: '⚪',
} as const;
