/**
 * @fileoverview 性能监控页面常量和配置
 * @description 性能监控相关的常量定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { TimeRange, UpdateInterval } from './types';

/**
 * 时间范围选项
 */
export const TIME_RANGES: TimeRange[] = [
  { label: "1小时", value: 1 },
  { label: "24小时", value: 24 },
  { label: "7天", value: 168 },
  { label: "30天", value: 720 },
];

/**
 * 更新间隔选项
 */
export const UPDATE_INTERVALS: Array<{ label: string; value: UpdateInterval }> = [
  { label: "5秒", value: 5000 },
  { label: "10秒", value: 10000 },
  { label: "30秒", value: 30000 },
  { label: "1分钟", value: 60000 },
];

/**
 * 默认配置
 */
export const DEFAULT_CONFIG = {
  TIME_RANGE: 24,
  UPDATE_INTERVAL: 5000 as UpdateInterval,
  ENABLE_REAL_TIME: true,
  ENABLE_WEBSOCKET: false,
  AUTO_REFRESH: true,
} as const;

/**
 * 刷新间隔配置（毫秒）
 */
export const REFRESH_INTERVALS = {
  REAL_TIME_METRICS: 5000,    // 实时指标每5秒刷新
  PERFORMANCE_STATS: 30000,   // 性能统计每30秒刷新
  PERFORMANCE_REPORT: 60000,  // 性能报告每分钟刷新
  MODEL_STATS: 30000,         // 模型统计每30秒刷新
} as const;

/**
 * 标签页配置
 */
export const TABS_CONFIG = [
  { value: 'overview', label: '实时概览' },
  { value: 'enhanced', label: 'P1级优化' },
  { value: 'system', label: '系统监控' },
  { value: 'charts', label: '性能图表' },
  { value: 'reports', label: '详细报告' },
  { value: 'queries', label: '慢查询分析' },
] as const;

/**
 * 导出文件名模板
 */
export const EXPORT_FILENAME_TEMPLATES = {
  PERFORMANCE_REPORT_MD: 'performance-report-{date}.md',
  PERFORMANCE_DATA_JSON: 'performance-data-{date}.json',
} as const;

/**
 * MIME类型
 */
export const MIME_TYPES = {
  MARKDOWN: 'text/markdown',
  JSON: 'application/json',
} as const;

/**
 * 模拟系统监控数据
 */
export const MOCK_SYSTEM_DATA = {
  cpu: {
    usage: 45.2,
    cores: 8,
    temperature: 65,
  },
  memory: {
    used: 6442450944, // 6GB
    total: 17179869184, // 16GB
    usage: 37.5,
  },
  disk: {
    used: 107374182400, // 100GB
    total: 536870912000, // 500GB
    usage: 20.0,
  },
  network: {
    bytesIn: 1073741824, // 1GB
    bytesOut: 536870912, // 512MB
    packetsIn: 1000000,
    packetsOut: 800000,
  },
  uptime: 2592000, // 30天
  loadAverage: [1.2, 1.5, 1.8],
} as const;

/**
 * 模拟缓存性能数据
 */
export const MOCK_CACHE_PERFORMANCE_DATA = [
  { 
    timestamp: new Date(Date.now() - 3600000).toISOString(), 
    hitRate: 88, 
    responseTime: 12, 
    penetrationPrevented: 5 
  },
  { 
    timestamp: new Date(Date.now() - 1800000).toISOString(), 
    hitRate: 91, 
    responseTime: 8, 
    penetrationPrevented: 3 
  },
  { 
    timestamp: new Date().toISOString(), 
    hitRate: 90, 
    responseTime: 6, 
    penetrationPrevented: 2 
  },
] as const;

/**
 * 模拟权限性能数据
 */
export const MOCK_PERMISSION_PERFORMANCE_DATA = [
  { 
    timestamp: new Date(Date.now() - 3600000).toISOString(), 
    checkTime: 15, 
    totalChecks: 1200, 
    cacheHits: 800 
  },
  { 
    timestamp: new Date(Date.now() - 1800000).toISOString(), 
    checkTime: 10, 
    totalChecks: 1500, 
    cacheHits: 1200 
  },
  { 
    timestamp: new Date().toISOString(), 
    checkTime: 8, 
    totalChecks: 1800, 
    cacheHits: 1600 
  },
] as const;

/**
 * 性能优化对比数据
 */
export const PERFORMANCE_COMPARISON_DATA = {
  beforeOptimization: {
    cacheHitRate: 65,
    permissionCheckTime: 25,
    systemResponseTime: 150,
  },
  afterOptimization: {
    cacheHitRate: 90,
    permissionCheckTime: 8,
    systemResponseTime: 85,
  },
} as const;
