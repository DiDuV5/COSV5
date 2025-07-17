/**
 * @fileoverview 用户评论查询类
 * @description 处理用户相关的评论查询功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import { TRPCErrorHandler, BusinessErrorType } from '@/lib/errors/trpc-error-handler';
import { BaseCommentQuery } from './BaseCommentQuery';
import { 
  UserCommentQueryParams,
  CommentQueryResult 
} from '../types';
import { CommentQueryUtils } from '../utils/queryUtils';
import { 
  AUTHOR_SELECT_FIELDS,
  POST_SELECT_FIELDS,
  DEFAULT_QUERY_CONFIG 
} from '../constants';

/**
 * 用户评论查询类
 */
export class UserCommentQuery extends BaseCommentQuery {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * 获取用户评论记录
   * @param params 查询参数
   * @returns 用户评论查询结果
   */
  async getUserComments(params: UserCommentQueryParams): Promise<CommentQueryResult> {
    const { 
      userId, 
      username, 
      limit, 
      cursor 
    } = params;

    if (!userId && !username) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.VALIDATION_FAILED,
        "必须提供用户ID或用户名"
      );
    }

    const validatedLimit = CommentQueryUtils.validateLimit(limit, DEFAULT_QUERY_CONFIG.MAX_LIMIT);

    let targetUserId = userId;

    try {
      // 如果提供了用户名，先查找用户ID
      if (username && !userId) {
        const user = await this.prisma.user.findUnique({
          where: { username },
          select: { id: true },
        });

        if (!user) {
          throw TRPCErrorHandler.notFound("用户不存在");
        }

        targetUserId = user.id;
      }

      const comments = await this.prisma.comment.findMany({
        where: {
          authorId: targetUserId,
          isDeleted: false,
        },
        take: validatedLimit + 1,
        cursor: cursor ? { id: cursor } : undefined,
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

      // 处理分页
      const { comments: paginatedComments, nextCursor } = this.handlePagination(
        comments,
        validatedLimit
      );

      return this.formatter.formatQueryResult(paginatedComments, nextCursor);

    } catch (error) {
      console.error('获取用户评论记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户在特定帖子下的评论
   * @param userId 用户ID
   * @param postId 帖子ID
   * @param limit 限制数量
   * @returns 用户在特定帖子下的评论列表
   */
  async getUserCommentsInPost(
    userId: string,
    postId: string,
    limit: number = DEFAULT_QUERY_CONFIG.LIMIT
  ): Promise<CommentQueryResult> {
    const validatedLimit = CommentQueryUtils.validateLimit(limit);

    try {
      const comments = await this.prisma.comment.findMany({
        where: {
          authorId: userId,
          postId,
          isDeleted: false,
        },
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
      console.error('获取用户在特定帖子下的评论失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户评论统计
   * @param userId 用户ID
   * @returns 用户评论统计
   */
  async getUserCommentStats(userId: string): Promise<{
    totalComments: number;
    approvedComments: number;
    pendingComments: number;
    rejectedComments: number;
    totalLikes: number;
    totalReplies: number;
  }> {
    try {
      const [
        totalComments,
        statusStats,
        likeStats,
        replyStats
      ] = await Promise.all([
        // 总评论数
        this.prisma.comment.count({
          where: {
            authorId: userId,
            isDeleted: false,
          },
        }),

        // 按状态统计
        this.prisma.comment.groupBy({
          by: ['status'],
          where: {
            authorId: userId,
            isDeleted: false,
          },
          _count: {
            id: true,
          },
        }),

        // 总点赞数
        this.prisma.comment.aggregate({
          where: {
            authorId: userId,
            isDeleted: false,
          },
          _sum: {
            likeCount: true,
          },
        }),

        // 总回复数
        this.prisma.comment.aggregate({
          where: {
            authorId: userId,
            isDeleted: false,
          },
          _sum: {
            replyCount: true,
          },
        }),
      ]);

      // 处理状态统计
      const statusMap = new Map(statusStats.map(stat => [stat.status, stat._count.id]));

      return {
        totalComments,
        approvedComments: statusMap.get('APPROVED') || 0,
        pendingComments: statusMap.get('PENDING') || 0,
        rejectedComments: statusMap.get('REJECTED') || 0,
        totalLikes: likeStats._sum.likeCount || 0,
        totalReplies: replyStats._sum.replyCount || 0,
      };

    } catch (error) {
      console.error('获取用户评论统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户最近的评论活动
   * @param userId 用户ID
   * @param days 天数
   * @param limit 限制数量
   * @returns 用户最近的评论活动
   */
  async getUserRecentActivity(
    userId: string,
    days: number = 30,
    limit: number = DEFAULT_QUERY_CONFIG.LIMIT
  ): Promise<CommentQueryResult> {
    const validatedLimit = CommentQueryUtils.validateLimit(limit);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const comments = await this.prisma.comment.findMany({
        where: {
          authorId: userId,
          isDeleted: false,
          createdAt: {
            gte: startDate,
          },
        },
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
      console.error('获取用户最近评论活动失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户热门评论
   * @param userId 用户ID
   * @param limit 限制数量
   * @returns 用户热门评论列表
   */
  async getUserHotComments(
    userId: string,
    limit: number = DEFAULT_QUERY_CONFIG.LIMIT
  ): Promise<CommentQueryResult> {
    const validatedLimit = CommentQueryUtils.validateLimit(limit);

    try {
      const comments = await this.prisma.comment.findMany({
        where: {
          authorId: userId,
          isDeleted: false,
          status: 'APPROVED',
        },
        take: validatedLimit,
        orderBy: [
          { likeCount: "desc" },
          { replyCount: "desc" },
          { createdAt: "desc" }
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

      return this.formatter.formatQueryResult(comments);

    } catch (error) {
      console.error('获取用户热门评论失败:', error);
      throw error;
    }
  }
}
