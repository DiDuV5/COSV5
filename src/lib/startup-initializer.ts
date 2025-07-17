/**
 * @fileoverview 应用启动初始化器
 * @description 在Next.js应用启动时自动执行初始化，确保所有系统组件就绪
 * @author Augment AI
 * @date 2025-07-11
 * @version 1.0.0
 */

import { initializeApp, isAppInitialized, getCacheSystemStatus } from '@/lib/app-initializer';

/**
 * 初始化状态跟踪
 */
let initializationPromise: Promise<void> | null = null;
let initializationStarted = false;

/**
 * 启动时自动初始化
 * 这个函数会在应用启动时被调用，确保所有系统组件就绪
 */
export async function startupInitialize(): Promise<void> {
  // 如果已经初始化完成，直接返回
  if (isAppInitialized()) {
    return;
  }

  // 如果正在初始化，等待现有的初始化完成
  if (initializationPromise) {
    return initializationPromise;
  }

  // 如果还没开始初始化，启动初始化过程
  if (!initializationStarted) {
    initializationStarted = true;
    initializationPromise = performStartupInitialization();
  }

  return initializationPromise || Promise.resolve();
}

/**
 * 执行启动初始化
 */
async function performStartupInitialization(): Promise<void> {
  try {
    console.log('🌟 开始应用启动初始化...');
    const startTime = Date.now();

    // 执行应用初始化
    await initializeApp();

    const duration = Date.now() - startTime;
    console.log(`🎉 应用启动初始化完成，耗时: ${duration}ms`);

  } catch (error) {
    console.error('❌ 应用启动初始化失败:', error);

    // 重置状态，允许重试
    initializationStarted = false;
    initializationPromise = null;

    throw error;
  }
}

/**
 * 检查初始化状态
 */
export function getInitializationStatus(): {
  isInitialized: boolean;
  isInitializing: boolean;
  hasStarted: boolean;
} {
  return {
    isInitialized: isAppInitialized(),
    isInitializing: initializationStarted && !isAppInitialized(),
    hasStarted: initializationStarted
  };
}

/**
 * 等待初始化完成
 */
export async function waitForInitialization(): Promise<void> {
  if (isAppInitialized()) {
    return;
  }

  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  // 如果还没开始初始化，启动初始化
  await startupInitialize();
}

/**
 * 重置初始化状态（仅用于测试）
 */
export function resetStartupInitialization(): void {
  initializationStarted = false;
  initializationPromise = null;
}

// 在模块加载时自动启动初始化（仅在服务器端）
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  // 使用 setImmediate 确保在下一个事件循环中执行
  setImmediate(() => {
    startupInitialize().catch(error => {
      console.error('自动启动初始化失败:', error);
    });
  });
}
