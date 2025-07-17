/**
 * @fileoverview 数据库测试常量和配置
 * @description 数据库测试页面使用的常量定义
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { DatabaseTest } from './types';

/**
 * 默认数据库测试项目
 */
export const DEFAULT_DATABASE_TESTS: DatabaseTest[] = [
  {
    name: '数据库连接',
    description: '测试基本数据库连接',
    status: 'idle'
  },
  {
    name: '用户表查询',
    description: '查询用户表数据',
    status: 'idle'
  },
  {
    name: '内容表查询',
    description: '查询内容表数据',
    status: 'idle'
  },
  {
    name: '媒体表查询',
    description: '查询媒体文件表数据',
    status: 'idle'
  },
  {
    name: '复杂关联查询',
    description: '测试多表关联查询性能',
    status: 'idle'
  },
  {
    name: '索引性能测试',
    description: '测试数据库索引效果',
    status: 'idle'
  }
];

/**
 * 测试配置常量
 */
export const TEST_CONFIG = {
  MIN_DELAY: 1000,
  MAX_DELAY: 3000,
  SUCCESS_RATE: 0.9,
  TEST_INTERVAL: 500,
} as const;

/**
 * 性能阈值常量
 */
export const PERFORMANCE_THRESHOLDS = {
  GOOD: 1000,
  WARNING: 3000,
} as const;
