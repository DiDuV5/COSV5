/**
 * @fileoverview Post管理路由统一导出
 * @description 组合所有post管理相关的路由模块，保持向后兼容性
 */

import { createTRPCRouter } from "@/server/api/trpc";
import { postAdminCrudRouter } from "./post-admin-crud";
import { postAdminUpdateRouter } from "./post-admin-update";
import { postAdminQueryRouter } from "./post-admin-query";

/**
 * 统一的post管理路由
 * 保持与原有post-admin.ts完全相同的API接口
 */
export const postAdminRouter = createTRPCRouter({
  // CRUD操作路由
  deleteMyPost: postAdminCrudRouter.deleteMyPost,
  delete: postAdminCrudRouter.delete,
  restore: postAdminCrudRouter.restore,
  permanentDelete: postAdminCrudRouter.permanentDelete,

  // 更新操作路由
  updateMyPost: postAdminUpdateRouter.updateMyPost,
  update: postAdminUpdateRouter.update,

  // 查询和统计路由
  getDeletedPosts: postAdminQueryRouter.getDeletedPosts,
  getDeletedStats: postAdminQueryRouter.getDeletedStats,
});
