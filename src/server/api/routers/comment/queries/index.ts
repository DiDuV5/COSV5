/**
 * @fileoverview 评论查询模块统一导出
 * @description 重构后的模块化评论查询系统入口
 * @author Augment AI
 * @date 2025-07-06
 * @version 2.0.0 (重构版本，保持向后兼容)
 */

// 导出所有类型定义
export * from './types';

// 导出常量
export * from './constants';

// 导出工具函数
export { CommentQueryConditionBuilderImpl, CommentQueryUtils } from './utils/queryUtils';
export { CommentDataFormatterImpl, CommentFormatUtils } from './utils/formatUtils';

// 导出查询类
export { BaseCommentQuery } from './queries/BaseCommentQuery';
export { PublicCommentQuery } from './queries/PublicCommentQuery';
export { AdminCommentQuery } from './queries/AdminCommentQuery';
export { UserCommentQuery } from './queries/UserCommentQuery';
export { StatsCommentQuery } from './queries/StatsCommentQuery';

// 导入依赖
import type { PrismaClient } from '@prisma/client';
import { BaseCommentQuery } from './queries/BaseCommentQuery';
import { PublicCommentQuery } from './queries/PublicCommentQuery';
import { AdminCommentQuery } from './queries/AdminCommentQuery';
import { UserCommentQuery } from './queries/UserCommentQuery';
import { StatsCommentQuery } from './queries/StatsCommentQuery';
import { 
  PublicCommentQueryParams,
  AdminCommentQueryParams,
  UserCommentQueryParams,
  CommentQueryResult 
} from './types';

/**
 * 向后兼容的评论查询类
 * 
 * 这是为了保持向后兼容性而提供的包装类
 * 内部使用重构后的模块化架构
 */
export class CommentQuery {
  private static publicQuery: PublicCommentQuery;
  private static adminQuery: AdminCommentQuery;
  private static userQuery: UserCommentQuery;
  private static statsQuery: StatsCommentQuery;

  /**
   * 初始化查询实例
   * @param prisma Prisma客户端
   */
  static init(prisma: PrismaClient): void {
    this.publicQuery = new PublicCommentQuery(prisma);
    this.adminQuery = new AdminCommentQuery(prisma);
    this.userQuery = new UserCommentQuery(prisma);
    this.statsQuery = new StatsCommentQuery(prisma);
  }

  /**
   * 获取评论列表 (向后兼容方法)
   */
  static async getComments(
    params: PublicCommentQueryParams,
    userId?: string,
    userLevel?: string
  ): Promise<CommentQueryResult> {
    return await this.publicQuery.getComments(params, userId, userLevel);
  }

  /**
   * 获取待审核评论列表 (向后兼容方法)
   */
  static async getPendingComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    return await this.adminQuery.getPendingComments(params);
  }

  /**
   * 获取最新评论列表 (向后兼容方法)
   */
  static async getLatestComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    return await this.adminQuery.getLatestComments(params);
  }

  /**
   * 获取热门评论列表 (向后兼容方法)
   */
  static async getHotComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    return await this.adminQuery.getHotComments(params);
  }

  /**
   * 获取最多点踩评论列表 (向后兼容方法)
   */
  static async getMostDislikedComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    return await this.adminQuery.getMostDislikedComments(params);
  }

  /**
   * 获取用户评论记录 (向后兼容方法)
   */
  static async getUserComments(params: UserCommentQueryParams): Promise<CommentQueryResult> {
    return await this.userQuery.getUserComments(params);
  }
}

/**
 * 新的模块化查询接口 - 推荐使用
 */
export class ModularCommentQuery {
  /**
   * 公开评论查询
   */
  static createPublicQuery(prisma: PrismaClient) {
    return new PublicCommentQuery(prisma);
  }

  /**
   * 管理员评论查询
   */
  static createAdminQuery(prisma: PrismaClient) {
    return new AdminCommentQuery(prisma);
  }

  /**
   * 用户评论查询
   */
  static createUserQuery(prisma: PrismaClient) {
    return new UserCommentQuery(prisma);
  }

  /**
   * 评论统计查询
   */
  static createStatsQuery(prisma: PrismaClient) {
    return new StatsCommentQuery(prisma);
  }

  /**
   * 基础评论查询
   */
  static createBaseQuery(prisma: PrismaClient) {
    return new BaseCommentQuery(prisma);
  }
}

/**
 * 快速创建函数 - 新增便利方法
 */
export const createPublicCommentQuery = (prisma: PrismaClient) => new PublicCommentQuery(prisma);
export const createAdminCommentQuery = (prisma: PrismaClient) => new AdminCommentQuery(prisma);
export const createUserCommentQuery = (prisma: PrismaClient) => new UserCommentQuery(prisma);
export const createStatsCommentQuery = (prisma: PrismaClient) => new StatsCommentQuery(prisma);
export const createBaseCommentQuery = (prisma: PrismaClient) => new BaseCommentQuery(prisma);

// 默认导出
export default CommentQuery;
