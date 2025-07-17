/**
 * @fileoverview 评论关系管理操作 - 统一入口
 * @description 整合树结构管理和关系操作功能，保持向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 导出所有关系操作类和类型
export * from "./comment-relations-tree";
export * from "./comment-relations-operations";

// 为了向后兼容，重新导出主要的关系操作类
export { CommentRelationsTreeOperations as CommentRelationsOperations } from "./comment-relations-tree";
