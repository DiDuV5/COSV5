/**
 * @fileoverview 评论查询操作 - 统一入口
 * @description 整合基础查询和高级查询功能，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 导出所有查询操作类和类型
export * from './comment-query-basic';
export * from './comment-query-advanced';

// 为了向后兼容，重新导出主要的查询操作类
export { CommentQueryBasicOperations as CommentQueryOperations } from './comment-query-basic';
