/**
 * @fileoverview 评论关系操作
 * @description 提供评论的关系操作功能：计数、检查、移动等
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';
import { QueryOptions } from '../base-repository';
import {
  CommentWithDetails,
  CommentOperationContext,
} from './comment-types';

/**
 * 评论关系操作类
 */
export class CommentRelationsOperationsClass {
  constructor(private db: PrismaClient) {}

  /**
   * 处理错误
   */
  protected handleError(error: any, operation: string): void {
    console.error(`CommentRelationsOperationsClass.${operation} error:`, error);
  }

  /**
   * 获取评论的直接回复数量
   */
  async getDirectRepliesCount(commentId: string): Promise<number> {
    try {
      return await this.db.comment.count({
        where: {
          parentId: commentId,
          isDeleted: false,
        },
      });
    } catch (error) {
      this.handleError(error, 'getDirectRepliesCount');
      throw error;
    }
  }

  /**
   * 获取评论的所有回复数量（递归）
   */
  async getTotalRepliesCount(commentId: string): Promise<number> {
    try {
      let totalCount = 0;
      const directReplies = await this.db.comment.findMany({
        where: {
          parentId: commentId,
          isDeleted: false,
        },
        select: { id: true },
      });

      totalCount += directReplies.length;

      // 递归计算子回复数量
      for (const reply of directReplies) {
        totalCount += await this.getTotalRepliesCount(reply.id);
      }

      return totalCount;
    } catch (error) {
      this.handleError(error, 'getTotalRepliesCount');
      throw error;
    }
  }

  /**
   * 检查评论是否为另一个评论的回复
   */
  async isReplyOf(childId: string, parentId: string): Promise<boolean> {
    try {
      const child = await this.db.comment.findUnique({
        where: { id: childId },
        select: { parentId: true },
      });

      if (!child) return false;
      if (child.parentId === parentId) return true;

      if (child.parentId) {
        return await this.isReplyOf(child.parentId, parentId);
      }

      return false;
    } catch (error) {
      this.handleError(error, 'isReplyOf');
      throw error;
    }
  }

  /**
   * 获取评论的根评论
   */
  async getRootComment(commentId: string): Promise<CommentWithDetails | null> {
    try {
      let currentId = commentId;
      let rootComment: CommentWithDetails | null = null;

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

        rootComment = comment as CommentWithDetails;

        if (!comment.parentId) {
          break; // 找到根评论
        }

        currentId = comment.parentId;
      }

      return rootComment;
    } catch (error) {
      this.handleError(error, 'getRootComment');
      throw error;
    }
  }

  /**
   * 获取评论的嵌套深度
   */
  async getCommentDepth(commentId: string): Promise<number> {
    try {
      let depth = 0;
      let currentId = commentId;

      while (currentId) {
        const comment = await this.db.comment.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });

        if (!comment || !comment.parentId) break;

        depth++;
        currentId = comment.parentId;
      }

      return depth;
    } catch (error) {
      this.handleError(error, 'getCommentDepth');
      throw error;
    }
  }

  /**
   * 移动评论到新的父评论下
   */
  async moveComment(
    commentId: string,
    newParentId: string | null,
    context?: CommentOperationContext
  ): Promise<CommentWithDetails> {
    try {
      // 验证新父评论存在（如果不为null）
      if (newParentId) {
        const parentExists = await this.db.comment.findUnique({
          where: { id: newParentId },
          select: { id: true, isDeleted: true },
        });

        if (!parentExists || parentExists.isDeleted) {
          throw new Error('Parent comment not found or deleted');
        }

        // 检查是否会造成循环引用
        const wouldCreateCycle = await this.isReplyOf(newParentId, commentId);
        if (wouldCreateCycle) {
          throw new Error('Moving comment would create a circular reference');
        }
      }

      // 更新评论的父级
      const updatedComment = await this.db.comment.update({
        where: { id: commentId },
        data: {
          parentId: newParentId,
          updatedAt: new Date(),
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
      });

      return updatedComment as CommentWithDetails;
    } catch (error) {
      this.handleError(error, 'moveComment');
      throw error;
    }
  }

  /**
   * 获取评论的兄弟评论
   */
  async getSiblingComments(
    commentId: string,
    options: QueryOptions = {}
  ): Promise<CommentWithDetails[]> {
    try {
      const comment = await this.db.comment.findUnique({
        where: { id: commentId },
        select: { parentId: true },
      });

      if (!comment) {
        throw new Error('Comment not found');
      }

      const siblings = await this.db.comment.findMany({
        where: {
          parentId: comment.parentId,
          id: { not: commentId },
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

      return siblings as CommentWithDetails[];
    } catch (error) {
      this.handleError(error, 'getSiblingComments');
      throw error;
    }
  }

  /**
   * 检查评论是否有回复
   */
  async hasReplies(commentId: string): Promise<boolean> {
    try {
      const count = await this.getDirectRepliesCount(commentId);
      return count > 0;
    } catch (error) {
      this.handleError(error, 'hasReplies');
      throw error;
    }
  }

  /**
   * 获取评论的最大深度
   */
  async getMaxDepthInThread(rootCommentId: string): Promise<number> {
    try {
      let maxDepth = 0;

      const calculateDepth = async (commentId: string, currentDepth: number): Promise<void> => {
        maxDepth = Math.max(maxDepth, currentDepth);

        const replies = await this.db.comment.findMany({
          where: {
            parentId: commentId,
            isDeleted: false,
          },
          select: { id: true },
        });

        for (const reply of replies) {
          await calculateDepth(reply.id, currentDepth + 1);
        }
      };

      await calculateDepth(rootCommentId, 0);
      return maxDepth;
    } catch (error) {
      this.handleError(error, 'getMaxDepthInThread');
      throw error;
    }
  }
}
