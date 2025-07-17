/**
 * @fileoverview 数据库性能监控常量和配置
 * @description 性能监控系统使用的常量定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 默认配置常量
 */
export const DEFAULT_CONFIG = {
  /** 慢查询阈值（毫秒） - 开发环境使用2000ms减少误报 */
  SLOW_QUERY_THRESHOLD: process.env.NODE_ENV === 'development' ? 2000 : 1000,
  /** 最大指标数量 */
  MAX_METRICS_SIZE: 10000,
  /** 是否启用监控 */
  ENABLED: true,
} as const;

/**
 * 敏感字段列表
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'auth',
  'credential',
] as const;

/**
 * 模拟数据配置
 */
export const MOCK_DATA_CONFIG = {
  /** 模拟数据模型 */
  MODELS: ['User', 'Post', 'Comment', 'Category', 'Tag'],
  /** 模拟数据操作 */
  ACTIONS: ['findMany', 'findUnique', 'create', 'update', 'delete'],
  /** 模拟数据数量 */
  COUNT: 100,
  /** 时间范围（小时） */
  TIME_RANGE_HOURS: 24,
  /** 成功率 */
  SUCCESS_RATE: 0.95,
} as const;
