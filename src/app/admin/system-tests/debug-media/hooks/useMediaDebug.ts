/**
 * @fileoverview 媒体调试Hook
 * @description 媒体调试页面的状态管理和业务逻辑Hook
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { MediaDebugInfo, MediaDebugState, UrlTestResults } from '../types';
import { MOCK_MEDIA_FILES } from '../constants';
import { filterMediaFiles } from '../utils/mediaUtils';

/**
 * 媒体调试Hook
 * @returns 媒体调试状态和操作方法
 */
export const useMediaDebug = () => {
  const [state, setState] = useState<MediaDebugState>({
    mediaFiles: [],
    selectedFile: null,
    searchQuery: '',
    isLoading: false,
    testResults: {},
  });

  /**
   * 设置媒体文件列表
   */
  const setMediaFiles = useCallback((files: MediaDebugInfo[]) => {
    setState(prev => ({ ...prev, mediaFiles: files }));
  }, []);

  /**
   * 设置选中的文件
   */
  const setSelectedFile = useCallback((file: MediaDebugInfo | null) => {
    setState(prev => ({ 
      ...prev, 
      selectedFile: file,
      testResults: {} // 清空之前的测试结果
    }));
  }, []);

  /**
   * 设置搜索查询
   */
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  /**
   * 设置加载状态
   */
  const setIsLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  /**
   * 设置测试结果
   */
  const setTestResults = useCallback((results: UrlTestResults) => {
    setState(prev => ({ ...prev, testResults: results }));
  }, []);

  /**
   * 获取媒体文件数据
   */
  const fetchMediaFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 这里应该调用实际的API
      // const response = await fetch('/api/admin/media/debug');
      // const data = await response.json();
      
      // 使用模拟数据
      setMediaFiles(MOCK_MEDIA_FILES);
    } catch (error) {
      console.error('获取媒体文件失败:', error);
      // 可以在这里添加错误处理，比如显示错误消息
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setMediaFiles]);

  /**
   * 测试URL可访问性
   */
  const testUrlAccess = useCallback(async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  /**
   * 测试选中文件的URL
   */
  const testSelectedFileUrls = useCallback(async () => {
    if (!state.selectedFile) return;
    
    const results: UrlTestResults = {};
    
    // 测试主文件URL
    results[state.selectedFile.url] = await testUrlAccess(state.selectedFile.url);
    
    // 测试缩略图URL
    if (state.selectedFile.thumbnailUrl) {
      results[state.selectedFile.thumbnailUrl] = await testUrlAccess(state.selectedFile.thumbnailUrl);
    }
    
    setTestResults(results);
  }, [state.selectedFile, testUrlAccess, setTestResults]);

  /**
   * 获取过滤后的文件列表
   */
  const filteredFiles = filterMediaFiles(state.mediaFiles, state.searchQuery);

  // 初始化时获取数据
  useEffect(() => {
    fetchMediaFiles();
  }, [fetchMediaFiles]);

  return {
    // 状态
    mediaFiles: state.mediaFiles,
    selectedFile: state.selectedFile,
    searchQuery: state.searchQuery,
    isLoading: state.isLoading,
    testResults: state.testResults,
    filteredFiles,
    
    // 操作方法
    setMediaFiles,
    setSelectedFile,
    setSearchQuery,
    setIsLoading,
    setTestResults,
    fetchMediaFiles,
    testUrlAccess,
    testSelectedFileUrls,
  };
};
