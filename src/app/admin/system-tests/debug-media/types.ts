/**
 * @fileoverview 媒体调试类型定义
 * @description 媒体调试页面相关的接口和类型
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 媒体调试信息接口
 */
export interface MediaDebugInfo {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  isProcessed: boolean;
  processingStatus: string;
  createdAt: string;
  urlAccessible?: boolean;
  thumbnailAccessible?: boolean;
}

/**
 * URL测试结果接口
 */
export interface UrlTestResults {
  [url: string]: boolean;
}

/**
 * 媒体调试状态接口
 */
export interface MediaDebugState {
  mediaFiles: MediaDebugInfo[];
  selectedFile: MediaDebugInfo | null;
  searchQuery: string;
  isLoading: boolean;
  testResults: UrlTestResults;
}

/**
 * 媒体调试操作接口
 */
export interface MediaDebugActions {
  setMediaFiles: (files: MediaDebugInfo[]) => void;
  setSelectedFile: (file: MediaDebugInfo | null) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;
  setTestResults: (results: UrlTestResults) => void;
  fetchMediaFiles: () => Promise<void>;
  testUrlAccess: (url: string) => Promise<boolean>;
  testSelectedFileUrls: () => Promise<void>;
}
