/**
 * @fileoverview 管理员评论查询类
 * @description 处理管理员专用的评论查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { BaseCommentQuery } from './BaseCommentQuery';
import { 
  AdminCommentQueryParams,
  CommentQueryResult,
  CommentStatus,
  UserLevel 
} from '../types';
import { CommentQueryUtils } from '../utils/queryUtils';
import { CommentFormatUtils } from '../utils/formatUtils';
import { 
  COMMENT_SELECT_FIELDS,
  AUTHOR_SELECT_FIELDS,
  POST_SELECT_FIELDS,
  REVIEWER_SELECT_FIELDS,
  DEFAULT_QUERY_CONFIG 
} from '../constants';

/**
 * 管理员评论查询类
 */
export class AdminCommentQuery extends BaseCommentQuery {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * 获取待审核评论列表
   * @param params 查询参数
   * @returns 待审核评论查询结果
   */
  async getPendingComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    const { 
      limit, 
      cursor, 
      status = 'PENDING' 
    } = params;

    const validatedLimit = CommentQueryUtils.validateLimit(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);

    try {
      const comments = await this.prisma.comment.findMany({
        take: validatedLimit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          status,
          isDeleted: false,
        },
        include: {
          author: {
            select: AUTHOR_SELECT_FIELDS,
          },
          post: {
            select: POST_SELECT_FIELDS,
          },
          reviewer: {
            select: REVIEWER_SELECT_FIELDS,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // 处理分页
      const { comments: paginatedComments, nextCursor } = this.handlePagination(
        comments,
        validatedLimit
      );

      // 获取总数
      const total = await this.getCommentsCount({
        status,
        isDeleted: false,
      });

      return this.formatter.formatQueryResult(paginatedComments, nextCursor, total);

    } catch (error) {
      console.error('获取待审核评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取最新评论列表
   * @param params 查询参数
   * @returns 最新评论查询结果
   */
  async getLatestComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    const { 
      limit, 
      userLevel, 
      includeGuests = DEFAULT_QUERY_CONFIG.INCLUDE_GUESTS 
    } = params;

    const validatedLimit = CommentQueryUtils.validateLimit(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);

    const whereCondition: any = {
      isDeleted: false,
    };

    // 构建用户级别条件
    const userLevelCondition = this.conditionBuilder.buildUserLevelCondition(userLevel, includeGuests);
    Object.assign(whereCondition, userLevelCondition);

    try {
      const comments = await this.prisma.comment.findMany({
        where: whereCondition,
        take: validatedLimit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: AUTHOR_SELECT_FIELDS,
          },
          post: {
            select: POST_SELECT_FIELDS,
          },
        },
      });

      return this.formatter.formatQueryResult(comments);

    } catch (error) {
      console.error('获取最新评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取热门评论列表
   * @param params 查询参数
   * @returns 热门评论查询结果
   */
  async getHotComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    const { 
      limit, 
      userLevel, 
      includeGuests = DEFAULT_QUERY_CONFIG.INCLUDE_GUESTS 
    } = params;

    const validatedLimit = CommentQueryUtils.validateLimit(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);

    const whereCondition: any = {
      isDeleted: false,
    };

    // 构建用户级别条件
    const userLevelCondition = this.conditionBuilder.buildUserLevelCondition(userLevel, includeGuests);
    Object.assign(whereCondition, userLevelCondition);

    try {
      // 获取评论，按点赞数排序（简化版热度算法）
      const comments = await this.prisma.comment.findMany({
        where: whereCondition,
        take: validatedLimit,
        orderBy: [
          { likeCount: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          author: {
            select: AUTHOR_SELECT_FIELDS,
          },
          post: {
            select: POST_SELECT_FIELDS,
          },
        },
      });

      // 为每个评论添加热度分数
      const commentsWithHotScore = CommentFormatUtils.addHotScore(comments);

      return this.formatter.formatQueryResult(commentsWithHotScore);

    } catch (error) {
      console.error('获取热门评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取最多点踩评论列表
   * @param params 查询参数
   * @returns 最多点踩评论查询结果
   */
  async getMostDislikedComments(params: AdminCommentQueryParams): Promise<CommentQueryResult> {
    const { 
      limit, 
      userLevel, 
      includeGuests = DEFAULT_QUERY_CONFIG.INCLUDE_GUESTS 
    } = params;

    const validatedLimit = CommentQueryUtils.validateLimit(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);

    const whereCondition: any = {
      isDeleted: false,
      likes: {
        some: {
          reactionType: "DISLIKE",
        },
      },
    };

    // 构建用户级别条件
    const userLevelCondition = this.conditionBuilder.buildUserLevelCondition(userLevel, includeGuests);
    Object.assign(whereCondition, userLevelCondition);

    try {
      // 获取有点踩反应的评论
      const commentsWithDislikes = await this.prisma.comment.findMany({
        where: whereCondition,
        include: {
          author: {
            select: AUTHOR_SELECT_FIELDS,
          },
          post: {
            select: POST_SELECT_FIELDS,
          },
          likes: {
            where: {
              reactionType: "DISLIKE",
            },
          },
        },
        take: validatedLimit * 2, // 获取更多数据以便排序
      });

      // 计算点踩数并排序
      const commentsWithDislikeCount = commentsWithDislikes
        .map((comment: any) => ({
          ...comment,
          dislikeCount: comment.likes.length,
        }))
        .sort((a: any, b: any) => b.dislikeCount - a.dislikeCount)
        .slice(0, validatedLimit);

      return this.formatter.formatQueryResult(commentsWithDislikeCount);

    } catch (error) {
      console.error('获取最多点踩评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取按状态分组的评论统计
   * @returns 评论状态统计
   */
  async getCommentStatusStats(): Promise<Record<CommentStatus, number>> {
    try {
      const stats = await this.prisma.comment.groupBy({
        by: ['status'],
        where: {
          isDeleted: false,
        },
        _count: {
          id: true,
        },
      });

      const result: Record<CommentStatus, number> = {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
      };

      stats.forEach(stat => {
        result[stat.status as CommentStatus] = stat._count.id;
      });

      return result;

    } catch (error) {
      console.error('获取评论状态统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取按用户级别分组的评论统计
   * @returns 用户级别评论统计
   */
  async getCommentUserLevelStats(): Promise<Record<string, number>> {
    try {
      const stats = await this.prisma.comment.groupBy({
        by: ['authorId'],
        where: {
          isDeleted: false,
          authorId: { not: null },
        },
        _count: {
          id: true,
        },
      });

      // 获取用户级别信息
      const userIds = stats.map(stat => stat.authorId!);
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: {
          id: true,
          userLevel: true,
        },
      });

      const userLevelMap = new Map(users.map(user => [user.id, user.userLevel]));

      // 按用户级别统计
      const result: Record<string, number> = {};
      stats.forEach(stat => {
        const userLevel = userLevelMap.get(stat.authorId!) || 'UNKNOWN';
        result[userLevel] = (result[userLevel] || 0) + stat._count.id;
      });

      // 添加游客评论统计
      const guestCommentCount = await this.prisma.comment.count({
        where: {
          isDeleted: false,
          authorId: null,
        },
      });

      if (guestCommentCount > 0) {
        result['GUEST'] = guestCommentCount;
      }

      return result;

    } catch (error) {
      console.error('获取用户级别评论统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取评论活动统计
   * @param days 统计天数
   * @returns 评论活动统计
   */
  async getCommentActivityStats(days: number = 30): Promise<Array<{
    date: string;
    count: number;
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await this.prisma.$queryRaw`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM Comment
        WHERE createdAt >= ${startDate} AND isDeleted = false
        GROUP BY DATE(createdAt)
        ORDER BY date
      ` as any[];

      return stats.map(stat => ({
        date: stat.date,
        count: Number(stat.count),
      }));

    } catch (error) {
      console.error('获取评论活动统计失败:', error);
      throw error;
    }
  }
}
