/**
 * @fileoverview 评论基础查询操作
 * @description 提供评论的基础查询功能：按帖子查询、按作者查询、搜索评论
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
  CommentSearchParams,
  CommentSortBy,
} from './comment-types';

/**
 * 评论基础查询操作类
 */
export class CommentQueryBasicOperations {
  constructor(private db: PrismaClient) {}

  /**
   * 处理错误
   */
  protected handleError(error: any, operation: string): void {
    console.error(`CommentQueryBasicOperations.${operation} error:`, error);
  }

  /**
   * 获取帖子的评论列表
   */
  async findByPost(
    postId: string,
    pagination: PaginationParams = {},
    currentUserId?: string,
    options: QueryOptions & { includeReplies?: boolean } = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    const cacheKey = CACHE_KEYS.POST.COMMENTS(postId, pagination.page || 1);

    try {
      const where: CommentWhereInput = {
        postId,
        isDeleted: false,
        parentId: null, // 只获取顶级评论
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
          ...(options.includeReplies && {
            replies: {
              where: { isDeleted: false },
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
                _count: {
                  select: {
                    likes: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
              take: 5, // 限制回复数量
            },
          }),
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit + 1,
      });

      const hasMore = comments.length > limit;
      const items = hasMore ? comments.slice(0, -1) : comments;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      // 添加用户点赞状态
      const commentsWithLikes = await this.addUserLikeStatus(
        items as unknown as CommentWithDetails[],
        currentUserId
      );

      return {
        items: commentsWithLikes,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'findByPost');
      throw error;
    }
  }

  /**
   * 获取用户的评论列表
   */
  async findByAuthor(
    authorId: string,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    try {
      const where: CommentWhereInput = {
        authorId,
        isDeleted: false,
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
      this.handleError(error, 'findByAuthor');
      throw error;
    }
  }

  /**
   * 搜索评论
   */
  async searchComments(
    params: CommentSearchParams,
    pagination: PaginationParams = {},
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    const { postId, authorId, parentId, status, sortBy = 'latest' } = params;

    try {
      const where: CommentWhereInput = {
        isDeleted: false,
        ...(postId && { postId }),
        ...(authorId && { authorId }),
        ...(parentId && { parentId }),
        ...(status && { status }),
      };

      const limit = Math.min(pagination.limit || 20, 100);
      const skip = ((pagination.page || 1) - 1) * limit;

      // 根据排序方式设置orderBy
      const orderBy = this.getOrderByFromSortBy(sortBy);

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
      this.handleError(error, 'searchComments');
      throw error;
    }
  }

  /**
   * 添加用户点赞状态
   */
  private async addUserLikeStatus(
    comments: CommentWithDetails[],
    currentUserId?: string
  ): Promise<CommentWithDetails[]> {
    if (!currentUserId || comments.length === 0) {
      return comments.map(comment => ({
        ...comment,
        isLikedByUser: false,
      }));
    }

    const commentIds = comments.map(c => c.id);
    const userLikes = await this.db.commentLike.findMany({
      where: {
        commentId: { in: commentIds },
        userId: currentUserId,
      },
      select: { commentId: true },
    });

    const likedCommentIds = new Set(userLikes.map(like => like.commentId));

    return comments.map(comment => ({
      ...comment,
      isLikedByUser: likedCommentIds.has(comment.id),
    }));
  }

  /**
   * 根据排序方式获取orderBy配置
   */
  private getOrderByFromSortBy(sortBy: CommentSortBy) {
    switch (sortBy) {
      case 'latest':
        return { createdAt: 'desc' as const };
      case 'oldest':
        return { createdAt: 'asc' as const };
      case 'popular':
        return [
          { likeCount: 'desc' as const },
          { createdAt: 'desc' as const },
        ];
      default:
        return { createdAt: 'desc' as const };
    }
  }
}
