/**
 * @fileoverview 全局加载状态管理
 * @description 统一管理应用的加载状态，提供更好的用户体验
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * 加载状态类型
 */
export interface LoadingState {
  /** 加载标识符 */
  id: string;
  /** 加载描述 */
  message: string;
  /** 加载进度 (0-100) */
  progress?: number;
  /** 是否可取消 */
  cancelable?: boolean;
  /** 取消回调 */
  onCancel?: () => void;
  /** 开始时间 */
  startTime: number;
  /** 预估完成时间 */
  estimatedDuration?: number;
}

/**
 * 全局加载状态
 */
interface GlobalLoadingState {
  /** 当前活跃的加载状态 */
  loadingStates: Map<string, LoadingState>;
  /** 是否有任何加载中的操作 */
  isLoading: boolean;
  /** 主要加载状态（显示在全局加载指示器中） */
  primaryLoading: LoadingState | null;
}

/**
 * 全局加载状态操作
 */
interface GlobalLoadingActions {
  /** 开始加载 */
  startLoading: (config: Omit<LoadingState, 'startTime'>) => void;
  /** 更新加载状态 */
  updateLoading: (id: string, updates: Partial<LoadingState>) => void;
  /** 结束加载 */
  stopLoading: (id: string) => void;
  /** 清除所有加载状态 */
  clearAll: () => void;
  /** 设置主要加载状态 */
  setPrimaryLoading: (id: string | null) => void;
}

/**
 * 全局加载状态管理器
 */
export const useGlobalLoading = create<GlobalLoadingState & GlobalLoadingActions>()(
  subscribeWithSelector((set, get) => ({
    loadingStates: new Map(),
    isLoading: false,
    primaryLoading: null,

    startLoading: (config) => {
      const loadingState: LoadingState = {
        ...config,
        startTime: Date.now(),
      };

      set((state) => {
        const newLoadingStates = new Map(state.loadingStates);
        newLoadingStates.set(config.id, loadingState);

        return {
          loadingStates: newLoadingStates,
          isLoading: newLoadingStates.size > 0,
          primaryLoading: state.primaryLoading || loadingState,
        };
      });
    },

    updateLoading: (id, updates) => {
      set((state) => {
        const newLoadingStates = new Map(state.loadingStates);
        const existingState = newLoadingStates.get(id);

        if (existingState) {
          newLoadingStates.set(id, { ...existingState, ...updates });
        }

        return {
          loadingStates: newLoadingStates,
          primaryLoading: state.primaryLoading?.id === id
            ? { ...state.primaryLoading, ...updates }
            : state.primaryLoading,
        };
      });
    },

    stopLoading: (id) => {
      set((state) => {
        const newLoadingStates = new Map(state.loadingStates);
        newLoadingStates.delete(id);

        let newPrimaryLoading = state.primaryLoading;
        if (state.primaryLoading?.id === id) {
          // 如果停止的是主要加载，选择下一个作为主要加载
          const remainingStates = Array.from(newLoadingStates.values());
          newPrimaryLoading = remainingStates.length > 0 ? remainingStates[0] : null;
        }

        return {
          loadingStates: newLoadingStates,
          isLoading: newLoadingStates.size > 0,
          primaryLoading: newPrimaryLoading,
        };
      });
    },

    clearAll: () => {
      set({
        loadingStates: new Map(),
        isLoading: false,
        primaryLoading: null,
      });
    },

    setPrimaryLoading: (id) => {
      set((state) => {
        const loadingState = id ? state.loadingStates.get(id) : null;
        return {
          primaryLoading: loadingState || null,
        };
      });
    },
  }))
);

/**
 * 加载状态Hook
 */
export function useLoadingState(id?: string) {
  const { loadingStates, isLoading, primaryLoading } = useGlobalLoading();

  if (id) {
    return loadingStates.get(id) || null;
  }

  return {
    isLoading,
    primaryLoading,
    allLoadingStates: Array.from(loadingStates.values()),
  };
}

/**
 * 加载操作Hook
 */
export function useLoadingActions() {
  const { startLoading, updateLoading, stopLoading, clearAll, setPrimaryLoading } = useGlobalLoading();

  return {
    startLoading,
    updateLoading,
    stopLoading,
    clearAll,
    setPrimaryLoading,
  };
}

/**
 * 自动加载管理Hook
 */
export function useAutoLoading(
  id: string,
  isLoading: boolean,
  message: string,
  options?: {
    progress?: number;
    cancelable?: boolean;
    onCancel?: () => void;
    estimatedDuration?: number;
  }
) {
  const { startLoading, updateLoading, stopLoading } = useLoadingActions();

  React.useEffect(() => {
    if (isLoading) {
      startLoading({
        id,
        message,
        ...options,
      });
    } else {
      stopLoading(id);
    }

    return () => {
      stopLoading(id);
    };
  }, [isLoading, id, message, startLoading, stopLoading]);

  React.useEffect(() => {
    if (isLoading && options) {
      updateLoading(id, options);
    }
  }, [isLoading, id, options, updateLoading]);
}

/**
 * 异步操作加载包装器
 */
export async function withLoading<T>(
  id: string,
  message: string,
  operation: () => Promise<T>,
  options?: {
    onProgress?: (progress: number) => void;
    estimatedDuration?: number;
  }
): Promise<T> {
  const { startLoading, updateLoading, stopLoading } = useGlobalLoading.getState();

  try {
    startLoading({
      id,
      message,
      progress: 0,
      estimatedDuration: options?.estimatedDuration,
    });

    // 如果提供了进度回调，设置进度更新
    if (options?.onProgress) {
      const progressCallback = (progress: number) => {
        updateLoading(id, { progress });
        options.onProgress?.(progress);
      };

      // 这里可以根据需要实现进度跟踪逻辑
    }

    const result = await operation();
    return result;
  } finally {
    stopLoading(id);
  }
}

/**
 * 预定义的加载消息
 */
export const LOADING_MESSAGES = {
  // 通用操作
  SAVING: '正在保存...',
  LOADING: '正在加载...',
  DELETING: '正在删除...',
  UPDATING: '正在更新...',
  SUBMITTING: '正在提交...',

  // 认证相关
  SIGNING_IN: '正在登录...',
  SIGNING_OUT: '正在退出...',
  REGISTERING: '正在注册...',
  VERIFYING: '正在验证...',

  // 文件操作
  UPLOADING: '正在上传文件...',
  DOWNLOADING: '正在下载文件...',
  PROCESSING: '正在处理文件...',

  // 数据操作
  FETCHING_DATA: '正在获取数据...',
  SYNCING: '正在同步数据...',
  BACKING_UP: '正在备份数据...',

  // 邮件操作
  SENDING_EMAIL: '正在发送邮件...',
  VERIFYING_EMAIL: '正在验证邮箱...',

  // 权限操作
  CHECKING_PERMISSIONS: '正在检查权限...',
  UPDATING_PERMISSIONS: '正在更新权限...',
} as const;

/**
 * 生成唯一的加载ID
 */
export function generateLoadingId(prefix: string = 'loading'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 计算加载持续时间
 */
export function getLoadingDuration(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * 格式化加载持续时间
 */
export function formatLoadingDuration(duration: number): string {
  if (duration < 1000) {
    return '不到1秒';
  } else if (duration < 60000) {
    return `${Math.round(duration / 1000)}秒`;
  } else {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.round((duration % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  }
}
