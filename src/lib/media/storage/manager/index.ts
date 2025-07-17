/**
 * @fileoverview 存储管理器统一导出
 * @description 统一导出所有存储管理相关的类型、函数和类，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

// 导出所有类型和接口
export * from './storage-types';

// 导出核心管理器类
export { StorageManager } from './storage-manager-core';

// 导出子管理器类
export { StorageProviderManager } from './storage-providers';
export { FailoverManager } from './failover-manager';
export { StorageStatsManager } from './storage-stats';

// 创建全局存储管理器实例，保持向后兼容性
import { StorageManager } from './storage-manager-core';

export const globalStorageManager = new StorageManager();

// 为了保持完全的向后兼容性，创建默认导出
export default StorageManager;
