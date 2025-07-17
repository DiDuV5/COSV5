/**
 * @fileoverview Comment路由的主入口文件
 * @description 组合所有Comment相关的子路由
 */

import { createTRPCRouter } from "@/server/api/trpc";
import { commentQueryRouter } from "./comment-query";
import { commentCreateRouter } from "./comment-create";
import { commentAdminRouter } from "./comment-admin";
import { commentInteractionRouter } from "./comment-interaction";
import { commentInteractionExtendedRouter } from "./comment-interaction-extended";
import { commentStatsRouter } from "./comment-stats";
import { commentConfigRouter } from "./comment-config";

/**
 * Comment路由器 - 组合所有评论相关功能
 */
export const commentRouter = createTRPCRouter({
  // 查询相关
  query: commentQueryRouter,

  // 创建相关
  create: commentCreateRouter,

  // 管理相关
  admin: commentAdminRouter,

  // 互动相关
  interaction: commentInteractionRouter,
  interactionExtended: commentInteractionExtendedRouter,

  // 统计相关
  stats: commentStatsRouter,

  // 配置相关
  config: commentConfigRouter,

  // 向后兼容的方法 - 直接暴露常用的查询方法到根级别
  getComments: commentQueryRouter.getComments,
  getPendingComments: commentQueryRouter.getPendingComments,
  getLatestComments: commentQueryRouter.getLatestComments,
  getHotComments: commentQueryRouter.getHotComments,
  getUserComments: commentQueryRouter.getUserComments,

  // 向后兼容的互动方法
  toggleLike: commentInteractionExtendedRouter.toggleLike,
});
