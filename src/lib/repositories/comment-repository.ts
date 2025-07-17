/**
 * @fileoverview 评论仓储类 - 向后兼容入口
 * @description 重构后的评论仓储统一入口，保持100%向后兼容性
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 - 模块化重构版本
 */

// 导出所有类型和类，保持向后兼容性
export * from './comment';

// 导出主要的CommentRepository类作为默认导出
export { CommentRepository as default } from './comment';
