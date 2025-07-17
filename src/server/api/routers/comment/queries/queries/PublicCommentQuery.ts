/**
 * @fileoverview 公开评论查询类
 * @description 处理公开的评论查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { BaseCommentQuery } from './BaseCommentQuery';
import {
  PublicCommentQueryParams,
  CommentQueryResult,
  CommentSortBy
} from '../types';
import { CommentQueryUtils } from '../utils/queryUtils';
import { CommentFormatUtils } from '../utils/formatUtils';
import { COMMENT_SELECT_FIELDS, DEFAULT_QUERY_CONFIG } from '../constants';

/**
 * 公开评论查询类
 */
export class PublicCommentQuery extends BaseCommentQuery {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * 获取评论列表
   * @param params 查询参数
   * @param userId 当前用户ID
   * @param userLevel 用户级别
   * @returns 评论查询结果
   */
  async getComments(
    params: PublicCommentQueryParams,
    userId?: string,
    userLevel?: string
  ): Promise<CommentQueryResult> {
    const {
      contentId,
      limit,
      cursor,
      parentId,
      includeOwn = DEFAULT_QUERY_CONFIG.INCLUDE_OWN,
      guestSessionId,
      sortBy = DEFAULT_QUERY_CONFIG.DEFAULT_SORT_BY
    } = params;

    // 验证参数
    const validatedLimit = CommentQueryUtils.validateLimit(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);
    const isAdmin = CommentQueryUtils.isAdmin(userLevel);

    // 构建基础查询条件
    const whereCondition: any = {
      postId: contentId,
      isDeleted: false,
    };

    // 如果指定了parentId，则只查询该父评论的回复
    if (parentId) {
      whereCondition.parentId = parentId;
    }

    // 构建权限相关的查询条件
    const permissionCondition = this.conditionBuilder.buildPermissionWhereCondition(
      { contentId, includeOwn, guestSessionId } as PublicCommentQueryParams,
      userId,
      isAdmin
    );

    // 合并查询条件
    Object.assign(whereCondition, permissionCondition);

    // 构建排序条件
    const orderBy = this.conditionBuilder.buildOrderByCondition(sortBy);

    try {
      // 获取评论基本信息
      const comments = await this.prisma.comment.findMany({
        take: validatedLimit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: whereCondition,
        select: COMMENT_SELECT_FIELDS,
        orderBy,
      });

      // 处理分页
      const { comments: paginatedComments, nextCursor } = this.handlePagination(
        comments,
        validatedLimit
      );

      // 批量加载作者信息
      const commentsWithAuthors = await this.loadAuthorsForComments(paginatedComments);

      // 格式化并返回结果
      return this.formatter.formatQueryResult(commentsWithAuthors, nextCursor);

    } catch (error) {
      console.error('获取评论列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论回复
   * @param parentId 父评论ID
   * @param limit 限制数量
   * @param cursor 游标
   * @param userId 当前用户ID
   * @param userLevel 用户级别
   * @returns 回复列表
   */
  async getCommentReplies(
    parentId: string,
    limit: number = DEFAULT_QUERY_CONFIG.LIMIT,
    cursor?: string,
    userId?: string,
    userLevel?: string
  ): Promise<CommentQueryResult> {
    const validatedLimit = CommentQueryUtils.validateLimit(limit);
    const isAdmin = CommentQueryUtils.isAdmin(userLevel);

    const whereCondition: any = {
      parentId,
      isDeleted: false,
    };

    // 非管理员只能看到已审核的回复
    if (!isAdmin) {
      whereCondition.status = "APPROVED";
    }

    try {
      const replies = await this.prisma.comment.findMany({
        take: validatedLimit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: whereCondition,
        select: COMMENT_SELECT_FIELDS,
        orderBy: [{ createdAt: "asc" }], // 回复按时间正序排列
      });

      // 处理分页
      const { comments: paginatedReplies, nextCursor } = this.handlePagination(
        replies,
        validatedLimit
      );

      // 批量加载作者信息
      const repliesWithAuthors = await this.loadAuthorsForComments(paginatedReplies);

      return this.formatter.formatQueryResult(repliesWithAuthors, nextCursor);

    } catch (error) {
      console.error('获取评论回复失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门评论
   * @param contentId 内容ID
   * @param limit 限制数量
   * @param userId 当前用户ID
   * @param userLevel 用户级别
   * @returns 热门评论列表
   */
  async getHotComments(
    contentId: string,
    limit: number = DEFAULT_QUERY_CONFIG.LIMIT,
    userId?: string,
    userLevel?: string
  ): Promise<CommentQueryResult> {
    const validatedLimit = CommentQueryUtils.validateLimit(limit);
    const isAdmin = CommentQueryUtils.isAdmin(userLevel);

    const whereCondition: any = {
      postId: contentId,
      isDeleted: false,
      parentId: null, // 只获取顶级评论
    };

    // 非管理员只能看到已审核的评论
    if (!isAdmin) {
      whereCondition.status = "APPROVED";
    }

    try {
      const comments = await this.prisma.comment.findMany({
        where: whereCondition,
        take: validatedLimit,
        select: COMMENT_SELECT_FIELDS,
        orderBy: [
          { isPinned: "desc" },
          { likeCount: "desc" },
          { replyCount: "desc" },
          { createdAt: "desc" }
        ],
      });

      // 批量加载作者信息
      const commentsWithAuthors = await this.loadAuthorsForComments(comments);

      // 添加热度分数
      const commentsWithHotScore = CommentFormatUtils.addHotScore(commentsWithAuthors);

      return this.formatter.formatQueryResult(commentsWithHotScore);

    } catch (error) {
      console.error('获取热门评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取最新评论
   * @param contentId 内容ID
   * @param limit 限制数量
   * @param userId 当前用户ID
   * @param userLevel 用户级别
   * @returns 最新评论列表
   */
  async getLatestComments(
    contentId: string,
    limit: number = DEFAULT_QUERY_CONFIG.LIMIT,
    userId?: string,
    userLevel?: string
  ): Promise<CommentQueryResult> {
    const validatedLimit = CommentQueryUtils.validateLimit(limit);
    const isAdmin = CommentQueryUtils.isAdmin(userLevel);

    const whereCondition: any = {
      postId: contentId,
      isDeleted: false,
    };

    // 非管理员只能看到已审核的评论
    if (!isAdmin) {
      whereCondition.status = "APPROVED";
    }

    try {
      const comments = await this.prisma.comment.findMany({
        where: whereCondition,
        take: validatedLimit,
        select: COMMENT_SELECT_FIELDS,
        orderBy: [
          { isPinned: "desc" },
          { createdAt: "desc" }
        ],
      });

      // 批量加载作者信息
      const commentsWithAuthors = await this.loadAuthorsForComments(comments);

      return this.formatter.formatQueryResult(commentsWithAuthors);

    } catch (error) {
      console.error('获取最新评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论数量
   * @param contentId 内容ID
   * @param parentId 父评论ID（可选）
   * @param userId 当前用户ID
   * @param userLevel 用户级别
   * @returns 评论数量
   */
  override async getCommentsCount(
    contentId: string,
    parentId?: string,
    userId?: string,
    userLevel?: string
  ): Promise<number> {
    const isAdmin = CommentQueryUtils.isAdmin(userLevel);

    const whereCondition: any = {
      postId: contentId,
      isDeleted: false,
    };

    if (parentId) {
      whereCondition.parentId = parentId;
    }

    // 非管理员只能看到已审核的评论
    if (!isAdmin) {
      whereCondition.status = "APPROVED";
    }

    try {
      return await this.prisma.comment.count({
        where: whereCondition,
      });

    } catch (error) {
      console.error('获取评论数量失败:', error);
      throw error;
    }
  }
}
