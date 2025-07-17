/**
 * @fileoverview 评论查询路由统一导出
 * @description 提供向后兼容的统一导出接口
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 *
 * @refactored 2025-07-08
 * - 重构为模块化结构
 * - 保持100%向后兼容性
 * - 文件大小从520行减少到<100行
 */

// 导出所有类型定义
export * from './types';

// 导出核心功能模块
export { CommentQueryBuilder } from './query-builders';
export { PublicCommentQueries } from './public-queries';
export { AdminCommentQueries } from './admin-queries';
export { UserCommentQueries } from './user-queries';
export { CommentQueryUtils } from './utils';

// 导出tRPC过程
export { getComments } from './public-queries';
export { 
  getPendingComments, 
  getLatestComments, 
  getHotComments, 
  getMostDislikedComments 
} from './admin-queries';
export { getUserComments } from './user-queries';

// 创建向后兼容的路由对象
import { getComments } from './public-queries';
import { 
  getPendingComments, 
  getLatestComments, 
  getHotComments, 
  getMostDislikedComments 
} from './admin-queries';
import { getUserComments } from './user-queries';

/**
 * 评论查询路由（重构后的向后兼容版本）
 * 提供所有评论查询功能的统一接口
 */
export const commentQueryRouter = {
  // 公开查询
  getComments,
  
  // 管理员查询
  getPendingComments,
  getLatestComments,
  getHotComments,
  getMostDislikedComments,
  
  // 用户查询
  getUserComments,
};

// 默认导出（保持向后兼容）
export default commentQueryRouter;
