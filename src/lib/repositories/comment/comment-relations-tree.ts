/**
 * @fileoverview 评论树结构管理
 * @description 提供评论的树结构构建和管理功能
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { QueryOptions, PaginatedResult, PaginationParams } from '../base-repository';
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache/cache-keys';
import {
  CommentWithDetails,
  CommentTreeNode,
  CommentOperationContext,
} from './comment-types';

/**
 * 评论树结构管理操作类
 */
export class CommentRelationsTreeOperations {
  constructor(private db: PrismaClient) {}

  /**
   * 处理错误
   */
  protected handleError(error: any, operation: string): void {
    console.error(`CommentRelationsTreeOperations.${operation} error:`, error);
  }

  /**
   * 获取评论的回复列表
   */
  async findReplies(
    parentId: string,
    pagination: PaginationParams = {},
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<CommentWithDetails>> {
    const cacheKey = CACHE_KEYS.COMMENT.REPLIES(parentId);

    try {
      const limit = Math.min(pagination.limit || 20, 100);
      const skip = ((pagination.page || 1) - 1) * limit;

      const replies = await this.db.comment.findMany({
        where: {
          parentId,
          isDeleted: false,
        },
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
              replies: {
                where: { isDeleted: false },
              },
              likes: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit + 1,
      });

      const hasMore = replies.length > limit;
      const items = hasMore ? replies.slice(0, -1) : replies;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      // 添加用户点赞状态
      const repliesWithLikes = await this.addUserLikeStatus(
        items as CommentWithDetails[],
        currentUserId
      );

      return {
        items: repliesWithLikes,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      this.handleError(error, 'findReplies');
      throw error;
    }
  }

  /**
   * 获取评论的所有回复（递归）
   */
  async findAllReplies(
    parentId: string,
    maxDepth: number = 5,
    currentUserId?: string
  ): Promise<CommentWithDetails[]> {
    try {
      const replies = await this.findRepliesRecursive(parentId, maxDepth, 1, currentUserId);
      return replies;
    } catch (error) {
      this.handleError(error, 'findAllReplies');
      throw error;
    }
  }

  /**
   * 递归获取回复
   */
  private async findRepliesRecursive(
    parentId: string,
    maxDepth: number,
    currentDepth: number,
    currentUserId?: string
  ): Promise<CommentWithDetails[]> {
    if (currentDepth > maxDepth) {
      return [];
    }

    const directReplies = await this.db.comment.findMany({
      where: {
        parentId,
        isDeleted: false,
      },
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
            replies: {
              where: { isDeleted: false },
            },
            likes: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const allReplies: CommentWithDetails[] = [];

    for (const reply of directReplies) {
      const replyWithDetails = reply as CommentWithDetails;
      allReplies.push(replyWithDetails);

      // 递归获取子回复
      const subReplies = await this.findRepliesRecursive(
        reply.id,
        maxDepth,
        currentDepth + 1,
        currentUserId
      );
      allReplies.push(...subReplies);
    }

    // 添加用户点赞状态
    return await this.addUserLikeStatus(allReplies, currentUserId);
  }

  /**
   * 构建评论树结构
   */
  async buildCommentTree(
    postId: string,
    maxDepth: number = 5,
    currentUserId?: string,
    options: QueryOptions = {}
  ): Promise<CommentTreeNode[]> {
    try {
      // 获取所有评论
      const allComments = await this.db.comment.findMany({
        where: {
          postId,
          isDeleted: false,
        },
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
              replies: {
                where: { isDeleted: false },
              },
              likes: true,
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'asc' },
        ],
      });

      // 添加用户点赞状态
      const commentsWithLikes = await this.addUserLikeStatus(
        allComments as CommentWithDetails[],
        currentUserId
      );

      // 构建树结构
      const commentMap = new Map<string, CommentTreeNode>();
      const rootComments: CommentTreeNode[] = [];

      // 初始化所有评论节点
      commentsWithLikes.forEach(comment => {
        commentMap.set(comment.id, {
          ...comment,
          children: [],
          depth: 0,
        });
      });

      // 构建父子关系
      commentsWithLikes.forEach(comment => {
        const node = commentMap.get(comment.id)!;

        if (!comment.parentId) {
          // 根评论
          rootComments.push(node);
        } else {
          // 子评论
          const parent = commentMap.get(comment.parentId);
          if (parent && parent.depth < maxDepth) {
            node.depth = parent.depth + 1;
            parent.children.push(node);
          }
        }
      });

      return rootComments;
    } catch (error) {
      this.handleError(error, 'buildCommentTree');
      throw error;
    }
  }

  /**
   * 获取评论的父级链
   */
  async getCommentParentChain(commentId: string): Promise<CommentWithDetails[]> {
    try {
      const chain: CommentWithDetails[] = [];
      let currentId = commentId;

      while (currentId) {
        const comment = await this.db.comment.findUnique({
          where: { id: currentId },
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
                replies: {
                  where: { isDeleted: false },
                },
                likes: true,
              },
            },
          },
        });

        if (!comment) break;

        chain.unshift(comment as CommentWithDetails);
        currentId = comment.parentId || '';
      }

      return chain;
    } catch (error) {
      this.handleError(error, 'getCommentParentChain');
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
}
