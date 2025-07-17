/**
 * @fileoverview 数据库连接管理器 - 统一导出
 * @description 重构后的数据库连接管理器，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 重新导出所有模块，保持向后兼容性
export * from './types';
export * from './config';
export * from './client-factory';
export * from './monitor';
export * from './health-check';

// 所有导出都通过 export * from 完成，避免重复
