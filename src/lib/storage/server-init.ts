/**
 * @fileoverview 服务端存储服务初始化
 * @description 在服务端启动时初始化存储监控和清理服务
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/lib/storage/storage-service-manager: 存储服务管理器
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，支持服务端存储服务初始化
 */

import { storageServiceManager } from './storage-service-manager';

let isInitialized = false;

/**
 * 初始化存储服务（仅在服务端）
 */
export async function initializeStorageServices(): Promise<void> {
  // 只在服务端环境中运行
  if (typeof window !== 'undefined') {
    return;
  }

  // 避免重复初始化
  if (isInitialized) {
    return;
  }

  try {
    console.log('🚀 服务端存储服务初始化开始...');
    
    // 延迟初始化，确保应用完全启动
    setTimeout(async () => {
      try {
        await storageServiceManager.initialize();
        isInitialized = true;
        console.log('✅ 服务端存储服务初始化完成');
      } catch (error) {
        console.error('❌ 服务端存储服务初始化失败:', error);
      }
    }, 5000); // 5秒后初始化

  } catch (error) {
    console.error('❌ 存储服务初始化设置失败:', error);
  }
}

/**
 * 获取存储服务状态
 */
export function getStorageServiceStatus() {
  if (typeof window !== 'undefined') {
    return { initialized: false, available: false };
  }

  try {
    const status = storageServiceManager.getStatus();
    return {
      ...status,
      initialized: isInitialized,
      available: true,
    };
  } catch (error) {
    return {
      initialized: false,
      available: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 执行健康检查
 */
export async function performHealthCheck() {
  if (typeof window !== 'undefined') {
    return { status: 'error', details: { message: '只能在服务端运行' } };
  }

  try {
    return await storageServiceManager.healthCheck();
  } catch (error) {
    return {
      status: 'error' as const,
      details: { error: error instanceof Error ? error.message : '未知错误' },
    };
  }
}

// 存储服务初始化现在由全局服务管理器统一管理
// 不再在模块级别自动初始化
