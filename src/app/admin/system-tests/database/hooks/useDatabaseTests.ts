/**
 * @fileoverview 数据库测试Hook
 * @description 数据库测试页面的状态管理和业务逻辑Hook
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState, useCallback } from 'react';
import { DatabaseTest } from '../types';
import { DEFAULT_DATABASE_TESTS, TEST_CONFIG } from '../constants';
import { simulateTest, hasRunningTests } from '../utils/testUtils';

/**
 * 数据库测试Hook
 * @returns 数据库测试状态和操作方法
 */
export const useDatabaseTests = () => {
  const [tests, setTests] = useState<DatabaseTest[]>(DEFAULT_DATABASE_TESTS);

  /**
   * 运行单个测试
   */
  const runSingleTest = useCallback(async (testName: string) => {
    // 设置测试状态为运行中
    setTests(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status: 'running', result: undefined, error: undefined }
        : test
    ));

    try {
      const testToRun = tests.find(t => t.name === testName);
      if (!testToRun) return;

      const result = await simulateTest(testToRun);
      
      // 更新测试结果
      setTests(prev => prev.map(test => 
        test.name === testName 
          ? { 
              ...test, 
              status: result.status,
              duration: result.duration,
              result: result.result,
              error: result.error
            }
          : test
      ));
    } catch (error) {
      // 处理测试错误
      setTests(prev => prev.map(test => 
        test.name === testName 
          ? { 
              ...test, 
              status: 'error',
              error: error instanceof Error ? error.message : '未知错误'
            }
          : test
      ));
    }
  }, [tests]);

  /**
   * 运行所有测试
   */
  const runAllTests = useCallback(async () => {
    // 重置所有测试状态
    setTests(prev => prev.map(test => ({
      ...test,
      status: 'idle',
      result: undefined,
      error: undefined,
      duration: undefined
    })));

    // 依次运行每个测试
    for (const test of tests) {
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.TEST_INTERVAL));
      await runSingleTest(test.name);
    }
  }, [tests, runSingleTest]);

  /**
   * 重置所有测试
   */
  const resetTests = useCallback(() => {
    setTests(DEFAULT_DATABASE_TESTS);
  }, []);

  /**
   * 检查是否有测试正在运行
   */
  const isRunning = hasRunningTests(tests);

  return {
    tests,
    isRunning,
    runSingleTest,
    runAllTests,
    resetTests,
  };
};
