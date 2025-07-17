/**
 * @fileoverview 数据库测试类型定义
 * @description 数据库测试页面相关的接口和类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 数据库测试状态
 */
export type DatabaseTestStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * 数据库测试接口
 */
export interface DatabaseTest {
  name: string;
  description: string;
  status: DatabaseTestStatus;
  result?: string;
  duration?: number;
  error?: string;
}

/**
 * 数据库统计信息接口
 */
export interface DatabaseStats {
  totalUsers: number;
  totalPosts: number;
  totalMedia: number;
  totalComments: number;
  dbSize: string;
  lastBackup?: string;
}

/**
 * 数据库测试状态统计接口
 */
export interface TestStatusStats {
  success: number;
  error: number;
  running: number;
  idle: number;
}
