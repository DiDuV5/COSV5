/**
 * @fileoverview 评论仓储模块统一导出
 * @description 提供评论系统的所有功能模块的统一入口
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

// 导出类型定义
export * from './comment-types';

// 导出功能模块
export { CommentCrudOperations } from './comment-crud';
export { CommentQueryOperations } from './comment-query';
export { CommentQueryBasicOperations } from './comment-query-basic';
export { CommentQueryAdvancedOperations } from './comment-query-advanced';
export { CommentRelationsOperations } from './comment-relations';
export { CommentRelationsTreeOperations } from './comment-relations-tree';
export { CommentRelationsOperationsClass } from './comment-relations-operations';
export { CommentManagementOperations } from './comment-management';

// 导出统一的CommentRepository类（向后兼容）
export { CommentRepository } from './comment-repository-unified';
