/**
 * @fileoverview 服务器端初始化
 * @description 在应用启动时执行必要的初始化操作，使用Next.js官方推荐的global对象模式
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0
 *
 * @changelog
 * - 2025-07-08: 重构为Next.js官方推荐的global对象模式，解决重复初始化问题
 */

import { initializeApp } from './app-initializer';

/**
 * 全局初始化状态类型定义
 */
const globalForServerInit = globalThis as unknown as {
  isServerInitialized: boolean | undefined;
  initializationPromise: Promise<void> | undefined;
};

/**
 * 服务器端初始化（使用Next.js官方推荐的global对象单例模式）
 * 确保在应用启动时只执行一次，避免重复初始化
 */
export async function initializeServer(): Promise<void> {
  // 只在服务器端执行
  if (typeof window !== 'undefined') {
    return;
  }

  // 避免重复初始化
  if (globalForServerInit.isServerInitialized) {
    return;
  }

  // 如果正在初始化，等待现有的初始化完成
  if (globalForServerInit.initializationPromise) {
    return globalForServerInit.initializationPromise;
  }

  // 创建初始化Promise
  globalForServerInit.initializationPromise = (async () => {
    try {
      console.log('🌟 开始服务器端初始化...');

      // 执行应用初始化
      await initializeApp();

      globalForServerInit.isServerInitialized = true;
      console.log('🎉 服务器端初始化完成');

    } catch (error) {
      console.error('❌ 服务器端初始化失败:', error);
      // 重置初始化状态，允许重试
      globalForServerInit.isServerInitialized = false;
      globalForServerInit.initializationPromise = undefined;
      // 不抛出错误，允许应用继续启动
    }
  })();

  return globalForServerInit.initializationPromise;
}

/**
 * 获取初始化状态
 */
export function isServerReady(): boolean {
  return globalForServerInit.isServerInitialized ?? false;
}

/**
 * 重置初始化状态（用于测试）
 */
export function resetServerInitialization(): void {
  globalForServerInit.isServerInitialized = false;
  globalForServerInit.initializationPromise = undefined;
}

// 立即执行初始化（当模块被导入时）
// 使用Next.js官方推荐的模式：在模块加载时进行一次性初始化
if (typeof window === 'undefined') {
  // 使用 setTimeout 确保在下一个事件循环中执行，避免阻塞模块加载
  setTimeout(() => {
    initializeServer().catch(error => {
      console.error('服务器初始化异步执行失败:', error);
    });
  }, 0);
}
