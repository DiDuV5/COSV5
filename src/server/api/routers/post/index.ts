/**
 * @fileoverview Post路由主入口
 * @description 组合所有Post相关的子路由
 */

import { createTRPCRouter } from "@/server/api/trpc";
import { postQueryRouter } from "./post-query";
import { postQueryExtendedRouter } from "./post-query-extended";
import { postStatsRouter } from "./post-stats";
import { postCreateRouter } from "./post-create";
import { postInteractionRouter } from "./post-interaction";
import { postAdminRouter } from "./post-admin";



export const postRouter = createTRPCRouter({
  // 查询相关端点
  getPosts: postQueryRouter.getPosts,
  getAll: postQueryRouter.getAll,
  getByTag: postQueryRouter.getByTag,
  getById: postQueryRouter.getById,
  getUserPosts: postQueryRouter.getUserPosts,
  getUserLikedPosts: postQueryRouter.getUserLikedPosts,
  getTestPosts: postQueryRouter.getTestPosts,

  // 扩展查询端点
  getRecommended: postQueryExtendedRouter.getRecommended,
  getFollowing: postQueryExtendedRouter.getFollowing,
  getTrending: postQueryExtendedRouter.getTrending,
  getLatest: postQueryExtendedRouter.getLatest,
  getInfinite: postQueryExtendedRouter.getInfinite,

  // 统计和搜索端点
  getHomeStats: postStatsRouter.getHomeStats,
  getTrendingStats: postStatsRouter.getTrendingStats,
  search: postStatsRouter.search,

  // 创建相关端点
  create: postCreateRouter.create,
  createMoment: postCreateRouter.createMoment,

  // 互动相关端点
  react: postInteractionRouter.react,
  like: postInteractionRouter.like,
  unlike: postInteractionRouter.unlike,
  getLikeStatus: postInteractionRouter.getLikeStatus,
  getReactionStats: postInteractionRouter.getReactionStats,

  // 管理相关端点
  deleteMyPost: postAdminRouter.deleteMyPost,
  delete: postAdminRouter.delete,
  update: postAdminRouter.update,
  updateMyPost: postAdminRouter.updateMyPost,

  // 软删除管理端点
  getDeletedPosts: postAdminRouter.getDeletedPosts,
  getDeletedStats: postAdminRouter.getDeletedStats,
  restore: postAdminRouter.restore,
  permanentDelete: postAdminRouter.permanentDelete,
});
