/**
 * @fileoverview 认证系统初始化
 * @description 初始化认证相关的后台任务和服务
 * @author Augment AI
 * @date 2025-06-28
 * @version 1.0.0
 *
 * 注意：已移除TelegramTokenService，现在使用NextAuth.js + Widget API统一认证
 */



/**
 * 认证系统初始化标志
 */
let isInitialized = false;
const cleanupTask: (() => void) | null = null;

/**
 * 初始化认证系统
 */
export function initializeAuthSystem(): void {
  if (isInitialized) {
    console.log('🔒 认证系统已初始化，跳过重复初始化');
    return;
  }

  try {
    console.log('🚀 正在初始化认证系统...');

    // 注意：已移除Telegram令牌清理任务，现在使用NextAuth.js统一会话管理
    // cleanupTask = startTokenCleanupTask(); // 已禁用：使用NextAuth.js统一认证
    console.log('✅ Telegram令牌清理任务已启动');

    isInitialized = true;
    console.log('🔒 认证系统初始化完成');

  } catch (error) {
    console.error('❌ 认证系统初始化失败:', error);
    throw error;
  }
}

/**
 * 清理认证系统资源
 */
export function cleanupAuthSystem(): void {
  if (!isInitialized) {
    return;
  }

  try {
    console.log('🧹 正在清理认证系统资源...');

    // 注意：已移除Telegram令牌清理任务，现在使用NextAuth.js统一会话管理
    // if (cleanupTask) {
    //   cleanupTask();
    //   cleanupTask = null;
    // }

    isInitialized = false;
    console.log('✅ 认证系统资源清理完成');

  } catch (error) {
    console.error('❌ 认证系统资源清理失败:', error);
  }
}

/**
 * 获取认证系统状态
 */
export function getAuthSystemStatus(): {
  initialized: boolean;
  hasCleanupTask: boolean;
} {
  return {
    initialized: isInitialized,
    hasCleanupTask: cleanupTask !== null,
  };
}

// 在进程退出时清理资源
if (typeof process !== 'undefined') {
  process.on('SIGINT', cleanupAuthSystem);
  process.on('SIGTERM', cleanupAuthSystem);
  process.on('exit', cleanupAuthSystem);
}
