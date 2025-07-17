/**
 * @fileoverview 数据库测试工具函数
 * @description 数据库测试相关的工具函数
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { DatabaseTest, DatabaseTestStatus } from '../types';
import { TEST_CONFIG } from '../constants';

/**
 * 模拟运行单个数据库测试
 * @param test 测试项目
 * @returns 测试结果
 */
export const simulateTest = async (test: DatabaseTest): Promise<{
  status: DatabaseTestStatus;
  duration: number;
  result?: string;
  error?: string;
}> => {
  const startTime = Date.now();
  
  // 模拟测试延迟
  const delay = TEST_CONFIG.MIN_DELAY + Math.random() * (TEST_CONFIG.MAX_DELAY - TEST_CONFIG.MIN_DELAY);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const duration = Date.now() - startTime;
  const success = Math.random() > (1 - TEST_CONFIG.SUCCESS_RATE);
  
  if (success) {
    return {
      status: 'success',
      duration,
      result: `查询成功，耗时 ${duration}ms`
    };
  } else {
    return {
      status: 'error',
      duration,
      error: '连接超时或查询失败'
    };
  }
};

/**
 * 获取测试状态统计
 * @param tests 测试列表
 * @returns 状态统计
 */
export const getTestStatusStats = (tests: DatabaseTest[]) => {
  return {
    success: tests.filter(t => t.status === 'success').length,
    error: tests.filter(t => t.status === 'error').length,
    running: tests.filter(t => t.status === 'running').length,
    idle: tests.filter(t => t.status === 'idle').length,
  };
};

/**
 * 检查是否有测试正在运行
 * @param tests 测试列表
 * @returns 是否有测试正在运行
 */
export const hasRunningTests = (tests: DatabaseTest[]): boolean => {
  return tests.some(test => test.status === 'running');
};
