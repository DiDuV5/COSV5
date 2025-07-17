/**
 * @fileoverview 存储管理器工具函数
 * @description 提供存储管理器相关的工具函数
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

/**
 * 确保已初始化
 */
export function ensureInitialized(isInitialized: boolean): void {
  if (!isInitialized) {
    throw new Error('存储管理器未初始化，请先调用 initialize() 方法');
  }
}

/**
 * 创建默认配置
 */
export function createDefaultConfig(config: any): any {
  return {
    enableFailover: true,
    failoverTimeout: 30000, // 增加到30秒，适应R2网络延迟
    healthCheckInterval: 60000, // 1分钟
    enableCache: true,
    cacheTtl: 300000, // 5分钟
    ...config,
  };
}
