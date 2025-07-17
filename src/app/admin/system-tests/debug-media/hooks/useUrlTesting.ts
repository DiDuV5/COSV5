/**
 * @fileoverview URL测试Hook
 * @description URL可访问性测试的Hook
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState, useCallback } from 'react';
import { isValidUrl } from '../utils/mediaUtils';

/**
 * URL测试状态接口
 */
interface UrlTestState {
  testUrl: string;
  isTestingUrl: boolean;
  testResult: boolean | null;
  testError: string | null;
}

/**
 * URL测试Hook
 * @returns URL测试状态和操作方法
 */
export const useUrlTesting = () => {
  const [state, setState] = useState<UrlTestState>({
    testUrl: '',
    isTestingUrl: false,
    testResult: null,
    testError: null,
  });

  /**
   * 设置测试URL
   */
  const setTestUrl = useCallback((url: string) => {
    setState(prev => ({
      ...prev,
      testUrl: url,
      testResult: null,
      testError: null
    }));
  }, []);

  /**
   * 测试URL可访问性
   */
  const testUrl = useCallback(async () => {
    if (!state.testUrl.trim()) {
      setState(prev => ({
        ...prev,
        testError: '请输入要测试的URL'
      }));
      return;
    }

    if (!isValidUrl(state.testUrl)) {
      setState(prev => ({
        ...prev,
        testError: 'URL格式不正确'
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isTestingUrl: true,
      testError: null
    }));

    try {
      const response = await fetch(state.testUrl, {
        method: 'HEAD',
        mode: 'no-cors' // 避免CORS问题
      });

      const isAccessible = response.ok || response.type === 'opaque';

      setState(prev => ({
        ...prev,
        testResult: isAccessible,
        isTestingUrl: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        testResult: false,
        testError: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        isTestingUrl: false
      }));
    }
  }, [state.testUrl]);

  /**
   * 清除测试结果
   */
  const clearTestResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      testResult: null,
      testError: null
    }));
  }, []);

  /**
   * 重置所有状态
   */
  const resetUrlTest = useCallback(() => {
    setState({
      testUrl: '',
      isTestingUrl: false,
      testResult: null,
      testError: null,
    });
  }, []);

  return {
    // 状态
    testUrl: state.testUrl,
    isTestingUrl: state.isTestingUrl,
    testResult: state.testResult,
    testError: state.testError,

    // 操作方法
    setTestUrl,
    clearTestResult,
    resetUrlTest,
  };
};
