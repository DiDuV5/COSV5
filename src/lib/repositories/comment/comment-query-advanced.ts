/**
 * @fileoverview 评论高级查询操作
 * @description 提供评论的高级查询功能：过滤查询、热门评论、最新评论
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { QueryOptions, PaginatedResult, PaginationParams } from '../base-repository';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/cache-keys';
import {
  CommentWhereInput,
  CommentWithDetails,
  CommentFilter,
  CommentPaginationParams,
} from './comment-types';

/**
 * 评论高级查询操作类
 */
export class CommentQueryAdvancedOperations {
  constructor(private db: PrismaClient) {}

  /**
   * 处理错误
   */
  protected handleError(error: any, operation: string): void {
    console.error(`CommentQueryAdvancedOperations.${operation} error:`, error);
  }

  /**
   * 根据过滤条件查询评论
   */
  async findByFilter(
    filter: CommentFilter,
    pagination: CommentPaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      const where: CommentWhereInput = {
        isDeleted: false,
        ...(filter.postId && { postId: filter.postId }),
        ...(filter.authorId && { authorId: filter.authorId }),
        ...(filter.parentId && { parentId: filter.parentId }),
        ...(filter.status && { status: filter.status }),
        ...(filter.isPinned !== undefined && { isPinned: filter.isPinned }),
        ...(filter.hasReplies !== undefined && {
          replies: filter.hasReplies
            ? { some: { isDeleted: false } }
            : { none: {} },
        }),
        ...(filter.dateRange && {
          createdAt: {
            gte: filter.dateRange.start,
            lte: filter.dateRange.end,
          },
        }),
        ...(filter.likeCountMin !== undefined && {
          likeCount: { gte: filter.likeCountMin },
        }),
        ...(filter.content && {
          content: {
            contains: filter.content,
            mode: 'insensitive',
          },
        }),
      };

      const limit = Math.min(pagination.limit || 20, 100);
      const skip = ((pagination.page || 1) - 1) * limit;

      // 构建排序条件
      const orderBy = this.buildOrderBy(filter.sortBy, filter.sortOrder);

      const comments = await this.db.comment.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              replies: {
                where: { isDeleted: false },
              },
              likes: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit + 1,
      });

      const hasMore = comments.length > limit;
      const items = hasMore ? comments.slice(0, -1) : comments;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return {
        items: items as CommentWithDetails[],
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'findByFilter');
      throw error;
    }
  }

  /**
   * 获取热门评论
   */
  async getPopularComments(
    postId?: string,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      const where: CommentWhereInput = {
        isDeleted: false,
        ...(postId && { postId }),
        // 只获取有一定点赞数的评论
        likeCount: { gte: 1 },
      };

      const limit = Math.min(pagination.limit || 20, 100);
      const skip = ((pagination.page || 1) - 1) * limit;

      const comments = await this.db.comment.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              replies: {
                where: { isDeleted: false },
              },
              likes: true,
            },
          },
        },
        orderBy: [
          { likeCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit + 1,
      });

      const hasMore = comments.length > limit;
      const items = hasMore ? comments.slice(0, -1) : comments;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return {
        items: items as CommentWithDetails[],
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'getPopularComments');
      throw error;
    }
  }

  /**
   * 获取最新评论
   */
  async getLatestComments(
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      const where: CommentWhereInput = {
        isDeleted: false,
        status: 'PUBLISHED',
      };

      const limit = Math.min(pagination.limit || 20, 100);
      const skip = ((pagination.page || 1) - 1) * limit;

      const comments = await this.db.comment.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              userLevel: true,
              isVerified: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              replies: {
                where: { isDeleted: false },
              },
              likes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit + 1,
      });

      const hasMore = comments.length > limit;
      const items = hasMore ? comments.slice(0, -1) : comments;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return {
        items: items as CommentWithDetails[],
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'getLatestComments');
      throw error;
    }
  }

  /**
   * 构建排序条件
   */
  private buildOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    switch (sortBy) {
      case 'createdAt':
        return { createdAt: sortOrder };
      case 'updatedAt':
        return { updatedAt: sortOrder };
      case 'likeCount':
        return [
          { likeCount: sortOrder },
          { createdAt: 'desc' as const },
        ];
      case 'replyCount':
        return [
          { replies: { _count: sortOrder } },
          { createdAt: 'desc' as const },
        ];
      default:
        return { createdAt: 'desc' as const };
    }
  }

  /**
   * 获取评论统计信息
   */
  async getCommentStats(postId?: string): Promise<{
    total: number;
    published: number;
    pending: number;
    rejected: number;
    deleted: number;
  }> {
    try {
      const baseWhere = postId ? { postId } : {};

      const [total, published, pending, rejected, deleted] = await Promise.all([
        this.db.comment.count({
          where: { ...baseWhere, isDeleted: false },
        }),
        this.db.comment.count({
          where: { ...baseWhere, isDeleted: false, status: 'PUBLISHED' },
        }),
        this.db.comment.count({
          where: { ...baseWhere, isDeleted: false, status: 'PENDING' },
        }),
        this.db.comment.count({
          where: { ...baseWhere, isDeleted: false, status: 'REJECTED' },
        }),
        this.db.comment.count({
          where: { ...baseWhere, isDeleted: true },
        }),
      ]);

      return {
        total,
        published,
        pending,
        rejected,
        deleted,
      };
    } catch (error) {
      this.handleError(error, 'getCommentStats');
      throw error;
    }
  }
}
