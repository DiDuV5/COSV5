/**
 * @fileoverview 用户审核路由 - 向后兼容包装器
 * @description 保持向后兼容性的包装器，重新导出模块化架构
 * @author Augment AI
 * @date 2025-07-06
 * @version 3.0.0 - 向后兼容包装器
 * @since 1.0.0
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，用户审核API
 * - 2025-06-22: 重构为模块化架构，拆分大文件
 * - 2025-07-06: 进一步模块化重构，创建向后兼容包装器
 */

// 重新导出所有功能以保持向后兼容性
export * from './index';

// 重新导出主路由器
export { userApprovalRouter } from './index';

// 重新导出类型以保持向后兼容
export type * from './types';
